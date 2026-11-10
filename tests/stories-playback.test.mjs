import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const id = "11111111-1111-4111-8111-111111111111";
const row = {
  id, title: "Test story", caption_en: "A clearly fake test caption.",
  duration_seconds: 20, video_path: "owner/story/test.mp4",
  storyteller: { display_name: "Test storyteller" },
  ownership_settings: { credit_line: "Test credit", usage: "learning_only" },
  signs: [],
};

// Exercise the real data module with session/storage doubles. No credentials,
// database calls or signed URLs are read from the local environment.
function harness(result, { signingFails = false } = {}) {
  const events = [];
  const query = {
    select(columns) {
      assert.ok(!columns.includes("story_translations"));
      events.push("select"); return this;
    },
    eq(column, value) { events.push(["eq", column, value]); return this; },
    order() { return Promise.resolve(result); },
    maybeSingle() { events.push("session read"); return Promise.resolve(result); },
  };
  const compiledModule = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL("../lib/stories/playback.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, {
    module: compiledModule, exports: compiledModule.exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "zod") return require(name);
      if (name === "@/lib/media/limits") return { PLAYBACK_URL_SECONDS: 300, STORY_BUCKET: "stories" };
      if (name === "@/lib/supabase/server") return {
        createClient: async () => ({ from(table) { assert.equal(table, "stories"); return query; } }),
      };
      if (name === "@/lib/supabase/admin") return {
        createAdminClient() {
          events.push("admin");
          return { storage: { from(bucket) {
            assert.equal(bucket, "stories");
            return { async createSignedUrl(path, lifetime) {
              events.push("sign");
              assert.equal(path, row.video_path);
              assert.equal(lifetime, 300);
              if (signingFails) throw new Error("Storage unavailable");
              return { data: { signedUrl: "test-playback-placeholder" }, error: null };
            } };
          } } };
        },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { api: compiledModule.exports, events };
}

test("RLS-hidden or nonexistent rows never construct an admin client or sign", async () => {
  const { api, events } = harness({ data: null, error: null });
  assert.equal(await api.loadStoryPlayback(id), null);
  assert.ok(!events.includes("admin"));
  assert.ok(!events.includes("sign"));
});

test("session read errors never sign", async () => {
  const { api, events } = harness({ data: null, error: { message: "unavailable" } });
  await assert.rejects(api.loadStoryPlayback(id), /Could not load the story/);
  assert.ok(!events.includes("admin"));
});

test("readable story signs only its stored path, after the session read, for five minutes", async () => {
  const { api, events } = harness({ data: row, error: null });
  const result = await api.loadStoryPlayback(id);
  assert.ok(result.signedUrl);
  assert.ok(events.indexOf("session read") < events.indexOf("admin"));
  assert.ok(events.indexOf("admin") < events.indexOf("sign"));
});

test("signing failure preserves visible caption, storyteller and credit/terms", async () => {
  const { api } = harness({ data: row, error: null }, { signingFails: true });
  const result = await api.loadStoryPlayback(id);
  assert.equal(result.signedUrl, null);
  assert.equal(result.story.caption_en, row.caption_en);
  assert.equal(result.story.storyteller.display_name, row.storyteller.display_name);
  assert.equal(result.story.ownership_settings.credit_line, row.ownership_settings.credit_line);
});

test("watching list filters published status and leaves visibility to RLS without signing", async () => {
  const { api, events } = harness({ data: [row], error: null });
  assert.equal((await api.listWatchableStories()).length, 1);
  const filters = events.filter(Array.isArray);
  assert.equal(JSON.stringify(filters), JSON.stringify([["eq", "status", "published"]]));
  assert.ok(!events.includes("admin"));
});
