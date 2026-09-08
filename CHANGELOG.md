# Changelog

All notable changes to OpenClaw Unity Skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2026-09-09

### Security

- **The local bridge is authenticated.** `/unity/*` used to accept any local
  caller. Now the gateway generates a per-launch token when it loads the
  extension, writes it to `~/.openclaw/unity-bridge.token` with mode `0600`
  (`$OPENCLAW_CONFIG_DIR`/`$OPENCLAW_HOME` override the directory, and
  `OPENCLAW_BRIDGE_TOKEN` overrides the file) and requires it as
  `X-OpenClaw-Bridge-Token` on `POST /unity/register` — 401 otherwise.
  `register` answers with a per-session token that `poll`, `heartbeat` and
  `result` must carry as `X-OpenClaw-Session`, bound to that session id. Tokens
  are never logged; only the token file's path is.
- **Tool results carry the nonce of their own request.** Every queued command is
  stamped with a nonce that is handed to the Editor on `poll`. A result is
  accepted only for a tool call that is in flight for that session and only with
  that call's nonce; anything else is dropped with 409 and never reaches the
  model. A third local process can no longer answer in the Editor's place, and a
  consumed result cannot be replayed.
- **Loopback only, and no browser.** Requests whose peer is not on 127.0.0.0/8 or
  ::1 are refused with 403, as is any request carrying an `Origin` or `Referer`
  header. The wildcard `Access-Control-Allow-Origin: *` header is gone — it had
  let any open web page reach the bridge.
- **Custom tools default to the destructive class.** A tool name outside the
  built-in catalogue is a project-registered custom tool whose verb proves
  nothing, so it now needs the operator opt-in and `confirm: true` just like
  `asset.delete`. Previously `mygame.getScore` passed ungated purely because it
  started with `get`. Exempt a tool you have read with
  `OPENCLAW_UNITY_READONLY_CUSTOM_TOOLS="exact.name,other.name"` on the gateway
  process; `script.execute`, `execute_code`, `execute_custom_tool`,
  `manage_tools` and any name containing a destructive verb can never be
  exempted.
- **Sessions are isolated.** Each connected Editor has its own session token,
  command queue and in-flight table; one session cannot poll another's queue or
  answer another's tool call. Session ids are random instead of
  timestamp-derived, and session tokens are never reported by `unity_sessions` or
  `GET /unity/status`.

### Added

- `tests/bridge.test.mjs` — handshake rejection/acceptance, nonce mismatch and
  replay rejection, cross-session rejection, loopback and browser-origin refusal,
  legacy-mode behaviour. Runs without a Unity Editor.
- `openclaw unity status` and `GET /unity/status` report the bridge auth state
  (`token` or `legacy-unauthenticated`) and the token file path.
- `dryRun` output now includes `custom: true|false`.

### Changed

- `unity_execute` no longer picks "the first connected session" when several
  Editors are attached: it asks for an explicit `sessionId` rather than risk
  driving the wrong project.
- `GET /unity/status` requires the bridge token.
- Timed-out tool calls are removed from the in-flight table, so a late result
  cannot land on a request the model gave up on.
- README: the license section no longer claims MIT alongside Apache-2.0.

### Migration

Update the Unity Editor add-on to **openclaw-unity-plugin 1.7.0**, which reads
the token file and echoes the nonce. An older add-on cannot register. If you must
run one for now, set `OPENCLAW_UNITY_ALLOW_LEGACY_UNAUTHENTICATED=1` on the
gateway process — it restores the old unauthenticated behaviour, logs a warning
while it does, and is not a supported end state.

## [1.7.0] - 2026-09-08

### Added

- Runtime confirmation gate in the gateway extension: project-changing tools
  (create/delete/destroy, save, `set*`, `asset.*` writes, `package.add`,
  `script.execute`, input simulation, Play-mode control, `test.run`) are refused
  unless the gateway was started with `OPENCLAW_EDITOR_ALLOW_DESTRUCTIVE=1` (or
  `OPENCLAW_UNITY_ALLOW_DESTRUCTIVE=1`) **and** the call passes `confirm: true`
- `dryRun: true` on `unity_execute` — reports the classification and what would
  be sent, without sending it
- `destructiveOperations` state reported by `GET /unity/status` and by
  `openclaw unity status`
- `tests/gate.test.mjs` and `tests/dist.test.mjs` — gate behaviour, tool wiring
  and compiled-bundle parity, runnable without a Unity Editor
- SKILL.md "Safety and permissions" section; README safety and development notes

### Changed

- Read-only tools (`get*`, `list`, `find`, `script.read`, `debug.hierarchy`,
  `debug.screenshot`, `console.getLogs`) are unaffected — same behaviour as
  before

## [1.6.3] - 2026-08-06

### Changed

- Security guidance in SKILL.md aligned with the actual disclosure

## [1.6.2] - 2026-07-08

### Fixed

- Locale-safe JSON parsing for comma-decimal locales
- Gateway extension loads on OpenClaw ≥2026.3 (`registerHttpRoute`) and on older
  gateways (`registerHttpHandler`)
