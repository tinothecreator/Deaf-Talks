import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const owner = "verified-user";
const story = { id: "readable-story", video_path: "owner/story.mp4", title: "Our story", caption_en: "Visible caption", duration_seconds: 12, status: "published", storyteller: { display_name: "Storyteller" }, ownership_settings: { credit_line: "Owner credit" }, signs: [] };
function harness({ rows = [story], role = "learner", readError = null, failure = null } = {}) {
  const events = [];
  const query = {
    select(...args) { events.push(["select", ...args]); return this; },
    eq(...args) { events.push(["eq", ...args]); return this; },
    is(...args) { events.push(["is", ...args]); return this; },
    order() { return this; }, limit(n) { events.push(["limit", n]); return this; },
    then(resolve, reject) { events.push("session read"); return Promise.resolve({ data: rows, error: readError, count: rows.length }).then(resolve, reject); },
  };
  const mod = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL("../lib/home/data.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { module: mod, exports: mod.exports, require(name) {
    if (name === "server-only") return {};
    if (name === "zod") return require(name);
    if (name === "@/lib/auth/session") return { requireAccount: async () => ({ user: { id: owner }, profile: { role } }) };
    if (name === "@/lib/supabase/server") return { createClient: async () => ({ from(table) { events.push(["table", table]); return query; } }) };
    if (name === "@/lib/media/limits") return { PLAYBACK_URL_SECONDS: 300, STORY_BUCKET: "stories", PRACTICE_BUCKET: "practice" };
    if (name === "@/lib/supabase/admin") return { createAdminClient() {
      events.push("admin");
      return { storage: { from(bucket) { return { async createSignedUrls(paths, seconds) {
        events.push(["sign", bucket, [...paths], seconds]);
        if (failure === "throw") throw new Error("unavailable");
        return { error: failure === "batch" ? {} : null, data: paths.map(path => ({ path, signedUrl: `preview:${path}`, error: failure === "item" ? "unavailable" : null })) };
      } }; } } };
    } };
    throw new Error(`Unexpected import ${name}`);
  } });
  return { api: mod.exports, events };
}

test("feed batch signs only session-returned paths after the read, capped at 12 for five minutes", async () => {
  const { api, events } = harness();
  const cards = await api.listFeedStories(100);
  assert.equal(cards[0].signedUrl, `preview:${story.video_path}`);
  const sign = events.find(event => event[0] === "sign");
  assert.deepEqual(sign, ["sign", "stories", [story.video_path], 300]);
  assert.ok(events.indexOf("session read") < events.indexOf("admin"));
  assert.ok(events.some(event => event[0] === "limit" && event[1] === 12));
});

test("hidden rows, empty reads and failed session reads never sign previews", async () => {
  for (const readError of [null, {}]) {
    const { api, events } = harness({ rows: [], readError });
    if (readError) await assert.rejects(api.listFeedStories());
    else assert.equal((await api.listFeedStories()).length, 0);
    assert.ok(!events.includes("admin"));
  }
});

test("feeds and the owner rail omit null and empty video paths without signing them", async () => {
  for (const own of [false, true]) {
    for (const video_path of [null, "", "   "]) {
      const unfinished = { ...story, id: "unfinished", video_path };
      const empty = harness({ rows: [unfinished], role: "storyteller" });
      assert.equal((await empty.api.listFeedStories(8, own)).length, 0);
      assert.ok(!empty.events.includes("admin"));

      const mixed = harness({ rows: [unfinished, story], role: "storyteller" });
      const cards = await mixed.api.listFeedStories(8, own);
      assert.equal(cards.length, 1);
      assert.equal(cards[0].id, story.id);
      assert.equal(cards[0].signedUrl, `preview:${story.video_path}`);
      assert.deepEqual(mixed.events.find(event => event[0] === "sign"), ["sign", "stories", [story.video_path], 300]);
    }
  }
});

test("invalid story rows are skipped while valid feed and owner cards remain", async () => {
  for (const own of [false, true]) {
    const { api, events } = harness({ rows: [null, { ...story, storyteller: null }, story, { ...story, signs: "invalid" }], role: "storyteller" });
    const cards = await api.listFeedStories(8, own);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, story.id);
    assert.equal(cards[0].signedUrl, `preview:${story.video_path}`);
    assert.deepEqual(events.find(event => event[0] === "sign"), ["sign", "stories", [story.video_path], 300]);
  }
});

test("invalid practice rows are skipped while valid own attempts remain", async () => {
  const attempt = { id: "own-attempt", duration_seconds: 12, caption: "Practice", sign: null, learner_id: owner, video_path: "own/attempt.mp4" };
  const { api, events } = harness({ rows: [null, { ...attempt, duration_seconds: "invalid" }, attempt, { ...attempt, video_path: null }] });
  const cards = await api.listHomePractice();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].id, attempt.id);
  assert.equal(cards[0].signedUrl, `preview:${attempt.video_path}`);
  assert.deepEqual(events.find(event => event[0] === "sign"), ["sign", "practice", [attempt.video_path], 300]);
});

test("invalid review rows are skipped while valid review attempts remain", async () => {
  const review = { id: "review", caption: "Practice caption", learner: { display_name: "Learner" } };
  const { api, events } = harness({ rows: [null, { ...review, caption: null }, review], role: "teacher" });
  const result = await api.homeReviews();
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].id, review.id);
  assert.equal(result.attempts[0].caption, review.caption);
  assert.equal(result.count, 3);
  assert.ok(!events.includes("admin"));
});

test("batch, item and thrown signing failures preserve cards without video URLs", async () => {
  for (const failure of ["throw", "batch", "item"]) {
    const { api } = harness({ failure });
    const [card] = await api.listFeedStories(8);
    assert.equal(card.signedUrl, null);
    assert.equal(card.caption_en, story.caption_en);
    assert.equal(card.ownership_settings.credit_line, story.ownership_settings.credit_line);
  }
});

test("learner Home filters verified own submitted attempts and signs no other learner's paths", async () => {
  const own = { id: "own-attempt", duration_seconds: 12, caption: "Practice", sign: null, learner_id: owner, video_path: "own/attempt.mp4" };
  const { api, events } = harness({ rows: [own, { ...own, learner_id: "someone-else", video_path: "other/attempt.mp4" }] });
  const cards = await api.listHomePractice();
  assert.equal(cards.length, 1);
  assert.deepEqual(events.find(event => event[0] === "sign"), ["sign", "practice", [own.video_path], 300]);
  assert.ok(events.some(event => event[0] === "eq" && event[1] === "learner_id" && event[2] === owner));
  assert.ok(events.some(event => event[0] === "eq" && event[1] === "status" && event[2] === "submitted"));
});

test("practice signing failure keeps caption without video; reviewers never load practice previews", async () => {
  const { api } = harness({ rows: [{ id: "attempt", learner_id: owner, video_path: "own/attempt.mp4", duration_seconds: 12, sign: null, caption: "My caption" }], failure: "throw" });
  const [card] = await api.listHomePractice();
  assert.equal(card.signedUrl, null);
  assert.equal(card.caption, "My caption");
  for (const role of ["teacher", "storyteller"]) {
    const { api, events } = harness({ role });
    assert.equal((await api.listHomePractice()).length, 0);
    assert.equal(events.length, 0);
  }
});

test("owner rail filters verified storyteller; learner cannot request owner rail", async () => {
  const { api, events } = harness({ role: "storyteller" });
  await api.listFeedStories(8, true);
  assert.ok(events.some(event => event[0] === "eq" && event[1] === "storyteller_id" && event[2] === owner));
  const learner = harness();
  assert.equal((await learner.api.listFeedStories(8, true)).length, 0);
  assert.equal(learner.events.length, 0);
});

test("preview without URL renders initials and duration, with no video element", () => {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../components/stories/video-preview.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { module: mod, exports: mod.exports, require(name) {
    if (name === "@/lib/media/time") return { formatTime: () => "0:12" };
    return require(name);
  } });
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const markup = renderToStaticMarkup(React.createElement(mod.exports.VideoPreview, { signedUrl: null, name: "Test Person", duration: 12 }));
  assert.ok(!markup.includes("<video"));
  assert.ok(markup.includes("TP"));
  assert.ok(markup.includes("0:12"));
  const preview = renderToStaticMarkup(React.createElement(mod.exports.VideoPreview, { signedUrl: "test-preview", name: "Test Person", duration: 12 }));
  assert.match(preview, /test-preview#t=0.1/);
  assert.match(preview, /preload="metadata"/);
  assert.ok(!preview.includes("autoplay"));
});
