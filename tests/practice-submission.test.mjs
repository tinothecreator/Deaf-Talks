import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const learnerId = "11111111-1111-4111-8111-111111111111";
const storyId = "22222222-2222-4222-8222-222222222222";
const signId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const path = `${learnerId}/${attemptId}.mp4`;
const input = { storyId, signId, caption: " My own test attempt. ", type: "video/mp4", size: 100, duration: 10 };

// Run the real modules with explicit session/storage doubles. No environment,
// credentials, network, database or signed URLs are used by these tests.
function harness({ role = "learner", replies = [], object = { size: 100, contentType: "video/mp4" }, infoError = null } = {}) {
  const events = [];
  const session = {
    from(table) {
      const query = { table, operation: "select", filters: [] };
      const chain = {
        select() { return chain; },
        eq(key, value) { query.filters.push([key, value]); return chain; },
        neq(key, value) { query.filters.push([key, value]); return chain; },
        order() { return chain; },
        insert(value) { query.operation = "insert"; query.value = value; return chain; },
        update(value) { query.operation = "update"; query.value = value; return chain; },
        delete() { query.operation = "delete"; return chain; },
        maybeSingle() { return execute(); },
        then(yes, no) { return execute().then(yes, no); },
      };
      async function execute() {
        events.push(query);
        assert.ok(replies.length, `Unexpected ${query.operation} on ${table}`);
        return replies.shift();
      }
      return chain;
    },
    storage: { from(bucket) {
      assert.equal(bucket, "practice");
      return {
        async info(value) { events.push("info"); assert.equal(value, path); return { data: object, error: infoError }; },
        async createSignedUploadUrl(value) { events.push(["upload sign", value]); return { data: { signedUrl: "test-upload-placeholder" }, error: null }; },
      };
    } },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const mod = { exports: {} }; cache.set(file, mod.exports);
    const source = ts.transpileModule(readFileSync(resolve(file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    runInNewContext(source, {
      module: mod, exports: mod.exports, console,
      require(name) {
        if (name === "server-only") return {};
        if (name === "next/cache") return { revalidatePath() {} };
        if (name === "@/lib/auth/session") return { getCurrentAccount: async () => ({ user: role ? { id: learnerId } : null, profile: role ? { role } : null }) };
        if (name === "@/lib/supabase/server") return { createClient: async () => session };
        if (name === "@/lib/supabase/admin") return { createAdminClient() {
          events.push("admin");
          return { storage: { from() { return { async createSignedUrl(value, seconds) {
            assert.equal(value, path); assert.equal(seconds, 300); events.push("playback sign");
            return { data: { signedUrl: "test-playback-placeholder" }, error: null };
          } }; } } };
        } };
        if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
        if (name.startsWith("./")) return load(resolve(file, "..", `${name}.ts`));
        return require(name);
      },
    });
    return mod.exports;
  }
  return { load, events };
}
const pending = { id: attemptId, video_path: path, status: "uploading", expected_size_bytes: 100, expected_content_type: "video/mp4" };
const ok = data => ({ data, error: null });

test("server rejects blank captions, excess duration, wrong types and excess size before any reads", async () => {
  const { load, events } = harness();
  const api = load("app/actions/practice.ts");
  for (const patch of [{ caption: " \n\t" }, { caption: "x".repeat(2001) }, { duration: 60.01 }, { duration: 0 }, { type: "image/png" }, { size: 52428801 }]) {
    assert.equal((await api.startPracticeUpload({ ...input, ...patch })).reasonCode, "START_INVALID_INPUT");
  }
  assert.equal(events.length, 0);
});

test("signed-out, storytellers and teachers cannot start uploads", async () => {
  for (const role of [null, "storyteller", "teacher"]) {
    const { load, events } = harness({ role });
    assert.ok((await load("app/actions/practice.ts").startPracticeUpload(input)).error);
    assert.equal(events.length, 0);
  }
});

test("an RLS-hidden story or a cross-story sign never creates or signs an upload", async () => {
  for (const replies of [[ok(null)], [ok({ id: storyId }), ok(null)]]) {
    const { load, events } = harness({ replies });
    assert.ok((await load("app/actions/practice.ts").startPracticeUpload(input)).error);
    assert.ok(!events.some(event => event.operation === "insert" || Array.isArray(event)));
    const signRead = events.find(event => event.table === "signs");
    if (signRead) assert.deepEqual(signRead.filters, [["id", signId], ["story_id", storyId]]);
  }
});

test("upload ownership and random path come from session, with trimmed caption", async () => {
  const { load, events } = harness({ replies: [ok({ id: storyId }), ok({ id: signId }), ok(null)] });
  const result = await load("app/actions/practice.ts").startPracticeUpload({ ...input, learner_id: storyId, filename: "bad.mov" });
  assert.ok(result.attemptId);
  const row = events.find(event => event.operation === "insert").value;
  assert.equal(row.learner_id, learnerId);
  assert.equal(row.caption, "My own test attempt.");
  assert.match(row.video_path, new RegExp(`^${learnerId}/[0-9a-f-]{36}\\.mp4$`));
});

test("confirmation uses top-level Storage metadata and completes only the owned pending row", async () => {
  const { load, events } = harness({ replies: [ok(pending), ok({ id: attemptId })] });
  assert.equal((await load("app/actions/practice.ts").finishPracticeUpload({ attemptId, duration: 10 })).success, true);
  const update = events.find(event => event.operation === "update");
  assert.equal(update.value.video_size_bytes, 100);
  assert.equal(update.value.duration_seconds, 10);
  assert.equal(update.value.status, "submitted");
  assert.deepEqual(update.filters, [["id", attemptId], ["learner_id", learnerId], ["status", "uploading"]]);
});

test("missing object, size mismatch, type mismatch and nested-only metadata mark attempts failed", async () => {
  for (const [object, code] of [
    [null, "CONFIRM_OBJECT_NOT_FOUND"],
    [{ size: 99, contentType: "video/mp4" }, "CONFIRM_SIZE_MISMATCH"],
    [{ size: 100, contentType: "video/webm" }, "CONFIRM_TYPE_MISMATCH"],
    [{ metadata: { size: 100, mimetype: "video/mp4" } }, "CONFIRM_SIZE_MISSING"],
  ]) {
    const { load, events } = harness({ object, replies: [ok(pending), ok(pending), ok(null)] });
    const result = await load("app/actions/practice.ts").finishPracticeUpload({ attemptId, duration: 10 });
    assert.equal(result.reasonCode, code);
    const update = events.find(event => event.operation === "update");
    assert.equal(update.value.status, "failed");
  }
});

test("attempt hidden by session RLS or session read failure never uses admin signing", async () => {
  for (const reply of [ok(null), { data: null, error: {} }]) {
    const { load, events } = harness({ replies: [reply] });
    try { assert.equal(await load("lib/practice/data.ts").loadAttemptPlayback(attemptId), null); }
    catch (error) { assert.match(error.message, /Could not load/); }
    assert.ok(!events.includes("admin"));
  }
});

test("readable completed attempt signs stored path for five minutes after session authorization", async () => {
  const row = { ...pending, status: "submitted", learner_id: learnerId, story_id: storyId, sign_id: signId,
    caption: "Test attempt", created_at: new Date().toISOString(), story: null, sign: null };
  const { load, events } = harness({ replies: [ok(row)] });
  assert.ok((await load("lib/practice/data.ts").loadAttemptPlayback(attemptId)).signedUrl);
  assert.ok(events.indexOf("admin") > 0);
  assert.ok(events.indexOf("playback sign") > events.indexOf("admin"));
});
