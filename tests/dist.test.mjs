// The compiled bundle that ships in the package must carry the same gate as the
// source it was built from — a fix in extension/index.ts alone proves nothing
// about extension/dist/index.js.
//
//   node --test --test-force-exit tests/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import * as source from "../extension/index.ts";
import * as bundle from "../extension/dist/index.js";

const GATE_EXPORTS = [
  "classifyTool",
  "createBridge",
  "destructiveOperationsEnabled",
  "evaluateDestructiveGate",
  "isCustomTool",
  "isLoopbackAddress",
  "legacyUnauthenticatedEnabled",
  "projectChangingTools",
  "readOnlyCustomTools",
  "tokensMatch",
];

test("the compiled bundle exports the gate and the bridge", () => {
  for (const name of GATE_EXPORTS) {
    assert.equal(typeof bundle[name], "function", name);
  }
  assert.equal(bundle.default.id, "unity");
  assert.equal(bundle.BRIDGE_TOKEN_HEADER, source.BRIDGE_TOKEN_HEADER);
  assert.equal(bundle.SESSION_TOKEN_HEADER, source.SESSION_TOKEN_HEADER);
  assert.equal(bundle.BUILTIN_TOOLS.size, source.BUILTIN_TOOLS.size);
});

test("the compiled bundle refuses a project-changing call by default", () => {
  const decision = bundle.evaluateDestructiveGate({
    tool: "asset.delete",
    confirm: true,
    env: {},
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "operator-opt-in-missing");
});

test("the compiled bundle classifies exactly like the source", () => {
  const samples = [
    "asset.delete",
    "debug.hierarchy",
    "debug.screenshot",
    "transform.setPosition",
    "batch.execute",
    "mygame.getScore",
    "execute_code",
    "manage_tools",
    "",
  ];
  for (const tool of samples) {
    assert.equal(bundle.classifyTool(tool), source.classifyTool(tool), tool);
  }
});

test("the compiled bundle refuses an unauthenticated register", async () => {
  const bridge = bundle.createBridge({
    env: {},
    secret: "f".repeat(64),
    persist: false,
    logger: { info() {}, warn() {}, error() {} },
  });

  const req = new EventEmitter();
  req.method = "POST";
  req.url = "/unity/register";
  req.headers = {};
  req.socket = { remoteAddress: "127.0.0.1" };
  req.destroy = () => {};
  process.nextTick(() => {
    req.emit("data", Buffer.from("{}", "utf8"));
    req.emit("end");
  });

  const res = {
    statusCode: 0,
    payload: undefined,
    setHeader() {},
    end(payload) {
      this.payload = payload;
    },
  };

  assert.equal(await bridge.handleRequest(req, res), true);
  assert.equal(res.statusCode, 401);
  assert.equal(bridge.sessions.size, 0);
});
