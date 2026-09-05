import test from "node:test";
import assert from "node:assert/strict";
import { generateStudy } from "../lib/gemini";
import { reserveQuota } from "../lib/quota";

test("provider uses bounded stateless structured requests and checks completion", async () => {
  const original = globalThis.fetch,
    key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "unit-test-key";
  try {
    const answer = {
      observations: ["The passage describes love."],
      interpretations: [],
      relatedReferences: [],
      cautions: ["Check this guidance."],
    };
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.previous_interaction_id, undefined);
      assert.equal(body.tools, undefined);
      assert.equal(body.generation_config.max_output_tokens, 2200);
      assert.equal(body.response_format.mime_type, "application/json");
      assert.ok(init?.signal);
      return Response.json({
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: JSON.stringify(answer) }],
          },
        ],
      });
    };
    assert.deepEqual(await generateStudy({ reference: "John 3:16" }), answer);
    globalThis.fetch = async () =>
      Response.json({ status: "in_progress", steps: [] });
    await assert.rejects(() => generateStudy({}), /incomplete/);
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: "not json" }],
          },
        ],
      });
    await assert.rejects(() => generateStudy({}));
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
  }
});

test("concurrent local reservations cannot exceed the global ceiling", async () => {
  const original = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: "development",
    LOCAL_QUOTA_MEMORY: "true",
    AI_DAILY_LIMIT: "10",
    AI_GLOBAL_DAILY_LIMIT: "3",
    RATE_LIMIT_SECRET: "unique-quota-test-secret",
  });
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        reserveQuota(new Request("http://localhost/api/study")),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
    assert.equal(results.filter((r) => r.status === "rejected").length, 17);
  } finally {
    for (const key of [
      "NODE_ENV",
      "LOCAL_QUOTA_MEMORY",
      "AI_DAILY_LIMIT",
      "AI_GLOBAL_DAILY_LIMIT",
      "RATE_LIMIT_SECRET",
    ]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
