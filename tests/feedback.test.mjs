import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const userId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const learnerId = "33333333-3333-4333-8333-333333333333";

// Execute real server code against isolated session/storage doubles. No network.
function harness({ role = "storyteller", row = null, readError = null, insertError = null } = {}) {
  const events = [];
  const session = { from(table) {
    const query = { table, operation: "select", filters: [] };
    const chain = {
      select() { return chain; }, eq(key, value) { query.filters.push([key, value]); return chain; },
      order() { return chain; }, insert(value) { query.operation = "insert"; query.value = value; return chain; },
      async maybeSingle() { events.push(query); return { data: row, error: readError }; },
      then(yes, no) { events.push(query); return Promise.resolve({ data: query.operation === "insert" ? null : row, error: insertError }).then(yes, no); },
    };
    return chain;
  } };
  function load(file) {
    const mod = { exports: {} };
    const code = ts.transpileModule(readFileSync(resolve(file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const account = async () => ({ user: role ? { id: userId } : null, profile: role ? { role } : null });
    runInNewContext(code, { module: mod, exports: mod.exports, require(name) {
      if (name === "server-only") return {};
      if (name === "next/cache") return { revalidatePath(path) { events.push({ revalidate: path }); } };
      if (name === "@/lib/auth/session") return { getCurrentAccount: account, requireAccount: account };
      if (name === "@/lib/supabase/server") return { createClient: async () => session };
      if (name === "@/lib/supabase/admin") return { createAdminClient() {
        events.push("admin");
        return { storage: { from(bucket) { assert.equal(bucket, "practice"); return {
          async createSignedUrl(path, seconds) {
            events.push("sign"); assert.equal(path, row.video_path); assert.equal(seconds, 300);
            return { data: { signedUrl: "test-placeholder" }, error: null };
          },
        }; } } };
      } };
      if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
      return require(name);
    } });
    return mod.exports;
  }
  return { load, events };
}
function form(patch = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ attemptId, comment: " Good hand position. ", rating: "good", ...patch })) data.set(key, value);
  return data;
}

test("feedback rejects blank, long, invalid rating and invalid ID inputs before querying", async () => {
  const { load, events } = harness();
  const { submitFeedback } = load("app/actions/feedback.ts");
  for (const patch of [{ comment: " \n\t" }, { comment: "x".repeat(2001) }, { rating: "5" }, { attemptId: "bad" }]) {
    assert.ok((await submitFeedback({}, form(patch))).error);
  }
  assert.equal(events.length, 0);
});

test("learner cannot write feedback even for an otherwise readable attempt", async () => {
  const { load, events } = harness({ role: "learner", row: { id: attemptId, status: "submitted" } });
  assert.ok((await load("app/actions/feedback.ts").submitFeedback({}, form())).error);
  assert.equal(events.length, 0);
});

test("hidden, failed or incomplete attempts cannot receive feedback", async () => {
  for (const row of [null, { id: attemptId, status: "uploading" }, { id: attemptId, status: "failed" }]) {
    const { load, events } = harness({ row });
    assert.ok((await load("app/actions/feedback.ts").submitFeedback({}, form())).error);
    assert.ok(!events.some(event => event.operation === "insert"));
  }
});

test("storyteller and teacher insert trimmed feedback with verified author, never admin", async () => {
  for (const role of ["storyteller", "teacher"]) {
    const { load, events } = harness({ role, row: { id: attemptId, status: "submitted" } });
    assert.equal((await load("app/actions/feedback.ts").submitFeedback({}, form({ reviewer_id: learnerId, author_id: learnerId }))).success, true);
    const insert = events.find(event => event.operation === "insert");
    assert.equal(insert.value.reviewer_id, userId);
    assert.equal(insert.value.comment, "Good hand position.");
    assert.equal(insert.value.rating, "good");
    assert.equal(insert.value.attempt_id, attemptId);
    assert.ok(!events.includes("admin"));
  }
});

test("database refusal is reported without claiming success", async () => {
  const { load } = harness({ row: { id: attemptId, status: "submitted" }, insertError: {} });
  assert.ok((await load("app/actions/feedback.ts").submitFeedback({}, form())).error);
});

const playbackRow = { id: attemptId, learner_id: learnerId, story_id: attemptId, sign_id: null,
  status: "submitted", caption: "My test practice", created_at: new Date().toISOString(),
  video_path: `${learnerId}/${attemptId}.mp4`, story: null, sign: null, feedback: [] };

test("reviewer playback cannot sign a session-hidden attempt or a failed session read", async () => {
  for (const options of [{ row: null }, { row: playbackRow, readError: {} }]) {
    const { load, events } = harness(options);
    try { assert.equal(await load("lib/practice/data.ts").loadAttemptPlayback(attemptId), null); }
    catch (error) { assert.match(error.message, /Could not load/); }
    assert.ok(!events.includes("admin"));
  }
});

test("only reviewer roles sign another learner's readable submitted attempt after the session read", async () => {
  for (const role of ["storyteller", "teacher", "learner", null]) {
    const { load, events } = harness({ role, row: playbackRow });
    const result = await load("lib/practice/data.ts").loadAttemptPlayback(attemptId);
    if (role === "storyteller" || role === "teacher") {
      assert.ok(result.signedUrl);
      assert.equal(events[0].table, "practice_attempts");
      assert.ok(events.indexOf("sign") > events.indexOf("admin"));
    } else {
      assert.equal(result, null);
      assert.ok(!events.includes("admin"));
    }
  }
});


test("review queue relies on session RLS and filters only submitted status", async () => {
  for (const role of ["storyteller", "teacher"]) {
    const { load, events } = harness({ role, row: [playbackRow] });
    assert.equal((await load("lib/practice/data.ts").listReviewAttempts()).length, 1);
    assert.deepEqual(events[0].filters, [["status", "submitted"]]);
    assert.ok(!events.includes("admin"));
  }
  const { load, events } = harness({ role: "learner" });
  await assert.rejects(() => load("lib/practice/data.ts").listReviewAttempts(), /storyteller and teacher/);
  assert.equal(events.length, 0);
});

test("incomplete readable attempts are never signed for reviewers", async () => {
  const { load, events } = harness({ row: { ...playbackRow, status: "uploading" } });
  assert.equal((await load("lib/practice/data.ts").loadAttemptPlayback(attemptId)).signedUrl, null);
  assert.ok(!events.includes("admin"));
});
