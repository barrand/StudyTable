import assert from "node:assert/strict";
const origin = process.env.CHECK_ORIGIN || "http://localhost:3000";
const production = process.argv.includes("--production");
if (production) {
  const response = await fetch(`${origin}/bible/john/3`, {
    redirect: "manual",
  });
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location"), /\/access\?next=/);
  const study = await fetch(`${origin}/api/study`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(study.status, 401);
  console.log(
    "Production access gate rejects unauthenticated reader and API requests.",
  );
} else {
  for (const route of [
    "/",
    "/bible",
    "/bible/matthew",
    "/bible/matthew/5",
    "/bible/genesis/1",
    "/bible/john/3?verse=16&translation=KJV",
    "/search?q=love%20one%20another",
    "/sources",
  ]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
  }
  const body = {
    reference: { work: "bible", book: "john", chapter: 3, verse: 16 },
    translation: "WEB",
    action: "context",
  };
  const post = (payload) =>
    fetch(`${origin}/api/study`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (await post({ ...body, reference: { ...body.reference, verse: 999 } }))
      .status,
    400,
  );
  assert.equal((await post({ ...body, translation: "NIV" })).status, 400);
  assert.equal(
    (await post({ ...body, action: "ask", question: "x".repeat(501) })).status,
    400,
  );
  assert.equal(
    (await post({ ...body, text: "untrusted scripture" })).status,
    400,
  );
  const crossOrigin = await fetch(`${origin}/api/study`, {
    method: "POST",
    headers: {
      Origin: "https://other.invalid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  assert.equal(crossOrigin.status, 403);
  // This pre-configuration check intentionally makes no billable model request.
  const response = await post(body);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not connected yet/);
  console.log(
    "Reader, navigation, search, sources and API validation passed. Missing-provider state is explicit.",
  );
}
