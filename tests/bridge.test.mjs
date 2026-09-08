// Tests for the authenticated Unity bridge in extension/index.ts.
//
//   node --test --test-force-exit tests/*.test.mjs
//
// No Unity Editor is needed: the bridge is an HTTP handler over a session map,
// driven here with fake request/response objects.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  BRIDGE_TOKEN_HEADER,
  SESSION_TOKEN_HEADER,
  createBridge,
  isLoopbackAddress,
  legacyUnauthenticatedEnabled,
  tokensMatch,
} from "../extension/index.ts";

const SECRET = "b".repeat(64);
const silent = { info() {}, warn() {}, error() {} };

/** A bridge with a known secret; passing one skips the token-file write. */
function bridgeWith(env = {}) {
  return createBridge({ env, secret: SECRET, persist: false, logger: silent });
}

function makeRequest({
  method = "GET",
  url = "/unity/status",
  headers = {},
  body,
  remoteAddress = "127.0.0.1",
} = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = {};
  for (const [key, value] of Object.entries(headers)) {
    req.headers[key.toLowerCase()] = value;
  }
  req.socket = { remoteAddress };
  req.destroy = () => {};
  if (body !== undefined) {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    process.nextTick(() => {
      req.emit("data", Buffer.from(raw, "utf8"));
      req.emit("end");
    });
  }
  return req;
}

function makeResponse() {
  return {
    statusCode: 0,
    headers: {},
    payload: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(payload) {
      this.ended = true;
      this.payload = payload;
    },
  };
}

async function call(bridge, options) {
  const req = makeRequest(options);
  const res = makeResponse();
  const handled = await bridge.handleRequest(req, res);
  return {
    handled,
    status: res.statusCode,
    headers: res.headers,
    json: res.payload ? JSON.parse(res.payload) : undefined,
  };
}

/** Register an Editor the way the add-on does, and keep its credentials. */
async function register(bridge, project = "DemoProject") {
  const response = await call(bridge, {
    method: "POST",
    url: "/unity/register",
    headers: { [BRIDGE_TOKEN_HEADER]: SECRET },
    body: { project, version: "6000.0.1f1", platform: "UnityEditor", tools: 99 },
  });
  assert.equal(response.status, 200, "registration should succeed");
  return response.json;
}

// ---------------------------------------------------------------------------
// Handshake

test("register is refused without the bridge token", async () => {
  const bridge = bridgeWith();
  const response = await call(bridge, {
    method: "POST",
    url: "/unity/register",
    body: { project: "Attacker" },
  });
  assert.equal(response.status, 401);
  assert.match(response.json.error, /x-openclaw-bridge-token/i);
  assert.equal(bridge.sessions.size, 0);
});

test("register is refused with a wrong bridge token", async () => {
  const bridge = bridgeWith();
  for (const token of ["", "a".repeat(64), SECRET.slice(0, -1), SECRET + "x"]) {
    const response = await call(bridge, {
      method: "POST",
      url: "/unity/register",
      headers: { [BRIDGE_TOKEN_HEADER]: token },
      body: { project: "Attacker" },
    });
    assert.equal(response.status, 401, JSON.stringify(token));
  }
  assert.equal(bridge.sessions.size, 0);
});

test("register with the bridge token issues a session token", async () => {
  const bridge = bridgeWith();
  const session = await register(bridge);

  assert.match(session.sessionId, /^unity_[0-9a-f]{24}$/);
  assert.equal(session.sessionTokenHeader, SESSION_TOKEN_HEADER);
  assert.equal(typeof session.sessionToken, "string");
  assert.equal(session.sessionToken.length, 64);
  assert.notEqual(session.sessionToken, SECRET);
  assert.equal(bridge.sessions.size, 1);
});

test("poll, heartbeat and result need the session token", async () => {
  const bridge = bridgeWith();
  const session = await register(bridge);
  const auth = { [SESSION_TOKEN_HEADER]: session.sessionToken };

  const unauthenticated = [
    { url: `/unity/poll?sessionId=${session.sessionId}` },
    {
      method: "POST",
      url: "/unity/heartbeat",
      body: { sessionId: session.sessionId },
    },
    {
      method: "POST",
      url: "/unity/result",
      body: { sessionId: session.sessionId, toolCallId: "x", result: {} },
    },
  ];
  for (const options of unauthenticated) {
    const denied = await call(bridge, options);
    assert.equal(denied.status, 401, options.url);
    const forged = await call(bridge, {
      ...options,
      headers: { [SESSION_TOKEN_HEADER]: "c".repeat(64) },
    });
    assert.equal(forged.status, 401, options.url);
  }

  const polled = await call(bridge, {
    url: `/unity/poll?sessionId=${session.sessionId}`,
    headers: auth,
  });
  assert.equal(polled.status, 204);

  const beat = await call(bridge, {
    method: "POST",
    url: "/unity/heartbeat",
    headers: auth,
    body: { sessionId: session.sessionId },
  });
  assert.equal(beat.status, 200);
  assert.equal(beat.json.ok, true);
});

test("status needs the bridge token and never reports session tokens", async () => {
  const bridge = bridgeWith();
  await register(bridge);

  const denied = await call(bridge, { url: "/unity/status" });
  assert.equal(denied.status, 401);

  const allowed = await call(bridge, {
    url: "/unity/status",
    headers: { [BRIDGE_TOKEN_HEADER]: SECRET },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.json.sessionCount, 1);
  assert.equal(allowed.json.auth, "token");
  assert.equal(
    JSON.stringify(allowed.json).includes(bridge.sessions.values().next().value.sessionToken),
    false
  );
});

test("the bridge answers loopback peers only, and never a browser", async () => {
  const bridge = bridgeWith();

  for (const remoteAddress of ["10.0.0.4", "192.168.1.9", "::ffff:10.0.0.4", null]) {
    const response = await call(bridge, {
      method: "POST",
      url: "/unity/register",
      headers: { [BRIDGE_TOKEN_HEADER]: SECRET },
      body: {},
      remoteAddress,
    });
    assert.equal(response.status, 403, String(remoteAddress));
    assert.match(response.json.error, /127\.0\.0\.1/);
  }

  const fromPage = await call(bridge, {
    method: "POST",
    url: "/unity/register",
    headers: { [BRIDGE_TOKEN_HEADER]: SECRET, origin: "https://example.com" },
    body: {},
  });
  assert.equal(fromPage.status, 403);
  assert.match(fromPage.json.error, /Browser-originated/);

  const preflight = await call(bridge, { method: "OPTIONS", url: "/unity/register" });
  assert.equal(preflight.status, 405);
  assert.equal(preflight.headers["access-control-allow-origin"], undefined);

  assert.equal(bridge.sessions.size, 0);
});

test("paths outside /unity/ are left to the rest of the gateway", async () => {
  const bridge = bridgeWith();
  const response = await call(bridge, { url: "/health" });
  assert.equal(response.handled, false);
  assert.equal(response.status, 0);
});

// ---------------------------------------------------------------------------
// Result integrity

test("a result is dropped unless it carries the nonce of its own tool call", async () => {
  const bridge = bridgeWith();
  const session = await register(bridge);
  const live = bridge.sessions.get(session.sessionId);
  const command = bridge.queueCommand(live, "debug.hierarchy", {});
  const auth = { [SESSION_TOKEN_HEADER]: session.sessionToken };

  // The Editor polls and learns the nonce.
  const polled = await call(bridge, {
    url: `/unity/poll?sessionId=${session.sessionId}`,
    headers: auth,
  });
  assert.equal(polled.status, 200);
  assert.equal(polled.json.toolCallId, command.toolCallId);
  assert.equal(polled.json.nonce, command.nonce);

  // A third local process that stole the session token but not the nonce.
  for (const nonce of [undefined, "", "d".repeat(32), command.nonce.slice(0, -1) + "0"]) {
    const forged = await call(bridge, {
      method: "POST",
      url: "/unity/result",
      headers: auth,
      body: {
        sessionId: session.sessionId,
        toolCallId: command.toolCallId,
        nonce,
        result: { hijacked: true },
      },
    });
    assert.equal(forged.status, 409, String(nonce));
    assert.match(forged.json.error, /nonce/);
  }
  assert.equal(live.results.size, 0);

  // The real add-on echoes the nonce it was given.
  const accepted = await call(bridge, {
    method: "POST",
    url: "/unity/result",
    headers: auth,
    body: {
      sessionId: session.sessionId,
      toolCallId: command.toolCallId,
      nonce: command.nonce,
      result: { ok: true },
    },
  });
  assert.equal(accepted.status, 200);
  assert.deepEqual(live.results.get(command.toolCallId), { ok: true });
});

test("a result for a tool call that was never issued is dropped", async () => {
  const bridge = bridgeWith();
  const session = await register(bridge);
  const live = bridge.sessions.get(session.sessionId);

  const response = await call(bridge, {
    method: "POST",
    url: "/unity/result",
    headers: { [SESSION_TOKEN_HEADER]: session.sessionToken },
    body: {
      sessionId: session.sessionId,
      toolCallId: "unity_req_invented",
      nonce: "e".repeat(32),
      result: { hijacked: true },
    },
  });
  assert.equal(response.status, 409);
  assert.equal(live.results.size, 0);
});

test("the same result cannot be replayed after it is consumed", async () => {
  const bridge = bridgeWith();
  const session = await register(bridge);
  const live = bridge.sessions.get(session.sessionId);
  const command = bridge.queueCommand(live, "scene.getActive", {});
  const body = {
    sessionId: session.sessionId,
    toolCallId: command.toolCallId,
    nonce: command.nonce,
    result: { first: true },
  };
  const headers = { [SESSION_TOKEN_HEADER]: session.sessionToken };

  const first = await call(bridge, { method: "POST", url: "/unity/result", headers, body });
  assert.equal(first.status, 200);

  const replay = await call(bridge, {
    method: "POST",
    url: "/unity/result",
    headers,
    body: { ...body, result: { second: true } },
  });
  assert.equal(replay.status, 409);
  assert.deepEqual(live.results.get(command.toolCallId), { first: true });
});

// ---------------------------------------------------------------------------
// Session isolation

test("one session cannot poll or answer another session's Editor", async () => {
  const bridge = bridgeWith();
  const alice = await register(bridge, "Alice");
  const bob = await register(bridge, "Bob");
  const aliceSession = bridge.sessions.get(alice.sessionId);
  const command = bridge.queueCommand(aliceSession, "gameobject.find", { name: "Player" });

  // Bob's token does not open Alice's queue.
  const stolenPoll = await call(bridge, {
    url: `/unity/poll?sessionId=${alice.sessionId}`,
    headers: { [SESSION_TOKEN_HEADER]: bob.sessionToken },
  });
  assert.equal(stolenPoll.status, 401);
  assert.equal(aliceSession.pendingCommands.length, 1);

  // Nor can Bob answer a call that was issued to Alice.
  const crossResult = await call(bridge, {
    method: "POST",
    url: "/unity/result",
    headers: { [SESSION_TOKEN_HEADER]: bob.sessionToken },
    body: {
      sessionId: bob.sessionId,
      toolCallId: command.toolCallId,
      nonce: command.nonce,
      result: { hijacked: true },
    },
  });
  assert.equal(crossResult.status, 409);
  assert.equal(aliceSession.results.size, 0);
});

test("resolveSession refuses to guess between two connected Editors", async () => {
  const bridge = bridgeWith();
  assert.match(bridge.resolveSession().error, /No Unity session connected/);

  const alice = await register(bridge, "Alice");
  assert.equal(bridge.resolveSession().session.sessionId, alice.sessionId);

  const bob = await register(bridge, "Bob");
  const ambiguous = bridge.resolveSession();
  assert.equal(ambiguous.session, undefined);
  assert.match(ambiguous.error, /needs an explicit sessionId/);
  assert.match(ambiguous.error, /Alice/);
  assert.match(ambiguous.error, /Bob/);

  assert.equal(bridge.resolveSession(bob.sessionId).session.projectName, "Bob");
  assert.match(bridge.resolveSession("unity_nope").error, /No Unity session with id/);
});

// ---------------------------------------------------------------------------
// Legacy mode and helpers

test("legacy unauthenticated mode is off unless the operator asks for it", async () => {
  assert.equal(legacyUnauthenticatedEnabled({}), false);
  assert.equal(
    legacyUnauthenticatedEnabled({ OPENCLAW_UNITY_ALLOW_LEGACY_UNAUTHENTICATED: "0" }),
    false
  );
  assert.equal(
    legacyUnauthenticatedEnabled({ OPENCLAW_UNITY_ALLOW_LEGACY_UNAUTHENTICATED: "1" }),
    true
  );
  assert.equal(
    legacyUnauthenticatedEnabled({ OPENCLAW_EDITOR_ALLOW_LEGACY_UNAUTHENTICATED: "true" }),
    true
  );

  const legacy = createBridge({
    env: { OPENCLAW_UNITY_ALLOW_LEGACY_UNAUTHENTICATED: "1" },
    secret: SECRET,
    persist: false,
    logger: silent,
  });
  const response = await call(legacy, {
    method: "POST",
    url: "/unity/register",
    body: { project: "OldAddOn" },
  });
  assert.equal(response.status, 200);

  const status = await call(legacy, { url: "/unity/status" });
  assert.equal(status.json.auth, "legacy-unauthenticated");
});

test("token comparison and loopback detection behave", () => {
  assert.equal(tokensMatch("abc", "abc"), true);
  assert.equal(tokensMatch("abc", "abd"), false);
  assert.equal(tokensMatch("ab", "abc"), false);
  assert.equal(tokensMatch(undefined, "abc"), false);
  assert.equal(tokensMatch(42, "abc"), false);
  assert.equal(tokensMatch("", ""), false);

  for (const address of ["127.0.0.1", "127.1.2.3", "::1", "::ffff:127.0.0.1", "0:0:0:0:0:0:0:1"]) {
    assert.equal(isLoopbackAddress(address), true, address);
  }
  for (const address of ["10.0.0.1", "192.168.0.2", "::ffff:10.0.0.1", "", undefined, null, 127]) {
    assert.equal(isLoopbackAddress(address), false, String(address));
  }
});
