# 🦞 OpenClaw Unity Skill

> **TL;DR:** Vibe-code your game development remotely from anywhere! 🌍
> 
> **한줄요약:** 이제 집밖에서도 원격으로 바이브코딩으로 게임 개발 가능합니다! 🎮

Companion skill for the [OpenClaw Unity Plugin](https://github.com/TomLeeLive/openclaw-unity-plugin). Provides AI workflow patterns and gateway extension for Unity Editor control.

## ⚠️ Disclaimer

This software is in **beta**. Use at your own risk.

- Always backup your project before using
- Test in a separate project first
- The authors are not responsible for any data loss or project corruption

See [LICENSE](LICENSE.md) for full terms.

## Installation

```bash
# Clone to OpenClaw workspace
git clone https://github.com/TomLeeLive/openclaw-unity-skill.git ~/.openclaw/workspace/skills/unity-plugin

# Install gateway extension
cd ~/.openclaw/workspace/skills/unity-plugin
./scripts/install-extension.sh

# Restart gateway
openclaw gateway restart
```

## What's Included

```
unity-plugin/
├── SKILL.md           # AI workflow guide (~100 tools)
├── extension/         # Gateway extension (for OpenClaw channels)
│   ├── index.ts       # Safety gate + authenticated bridge
│   ├── dist/index.js  # Compiled bundle
│   ├── openclaw.plugin.json
│   └── package.json
├── scripts/
│   └── install-extension.sh
├── tests/
│   ├── gate.test.mjs    # Safety-gate tests (no Unity needed)
│   ├── bridge.test.mjs  # Bridge auth, result nonce, session isolation
│   └── dist.test.mjs    # The shipped bundle matches the source
└── references/
    └── tools.md       # Detailed tool documentation
```

## Safety

Read-only tools (`get*`, `list`, `find`, `script.read`, `debug.hierarchy`,
`debug.screenshot`, `console.getLogs`) run as they always have. Every
project-changing tool — create, delete, save, `set*`, `package.add`,
`script.execute`, input simulation, Play-mode control — is **refused by default**
and needs two independent opt-ins:

```bash
# 1. the operator enables project changes on the gateway process
OPENCLAW_EDITOR_ALLOW_DESTRUCTIVE=1 openclaw gateway restart
```

```
# 2. the call confirms that specific change, after asking the user
unity_execute: asset.delete {path: "Assets/Old/Item.prefab"}, confirm: true
```

Custom tools count as project-changing (1.8.0). A name outside the built-in
catalogue is a project-registered tool whose verb proves nothing, so
`mygame.getScore` is gated exactly like `asset.delete`. To exempt one you have
read, list its exact name on the gateway process:

```bash
OPENCLAW_UNITY_READONLY_CUSTOM_TOOLS="mygame.getScore" openclaw gateway restart
```

`script.execute`, `execute_code`, `execute_custom_tool` and `manage_tools` can
never be exempted.

`dryRun: true` previews any call without sending it. `openclaw unity status`
shows the bridge auth state and whether project changes are enabled. Full details
in [SKILL.md → Safety and permissions](SKILL.md#safety-and-permissions).

## Bridge authentication

The `/unity/*` endpoints are the Editor add-on's half of the bridge. Since 1.8.0
they are authenticated and loopback-only.

```
gateway starts
  └─ writes ~/.openclaw/unity-bridge.token   (32 random bytes, mode 0600)

Unity add-on                                  gateway extension
  POST /unity/register
    X-OpenClaw-Bridge-Token: <file contents>  ──▶ 401 if missing/wrong
                                              ◀── { sessionId, sessionToken }

  GET  /unity/poll?sessionId=…
    X-OpenClaw-Session: <sessionToken>        ──▶ 401 if missing/wrong
                                              ◀── { toolCallId, tool, arguments, nonce }

  POST /unity/result
    X-OpenClaw-Session: <sessionToken>
    { sessionId, toolCallId, nonce, result }  ──▶ 409 unless the nonce matches
                                                   a call in flight for THIS session
```

- `$OPENCLAW_CONFIG_DIR` or `$OPENCLAW_HOME` override the token directory.
- `OPENCLAW_BRIDGE_TOKEN` overrides the file on both sides.
- Non-loopback peers get 403; so does any request with an `Origin` or `Referer`
  header. No CORS headers are sent.
- Tokens are never logged — only the token file's path is.
- `OPENCLAW_UNITY_ALLOW_LEGACY_UNAUTHENTICATED=1` restores the pre-1.8.0
  unauthenticated bridge for an old add-on, with a loud warning and
  `auth: "legacy-unauthenticated"` in `GET /unity/status`. Update the add-on
  instead.

The Editor add-on's own MCP bridge (port 27182) has a separate per-launch token
in `~/.openclaw/unity-mcp-bridge.token`; see the
[plugin repository](https://github.com/TomLeeLive/openclaw-unity-plugin).

## Development

```bash
# Run the safety-gate tests (Node 22.18+ / 24 — no Unity Editor required)
node --test --test-force-exit tests/*.test.mjs

# Rebuild extension/dist/index.js after editing extension/index.ts
npx --yes esbuild@0.21.5 extension/index.ts --bundle --format=esm \
  --platform=node --target=esnext --external:openclaw \
  --outfile=extension/dist/index.js
```

## Connection Modes

| Mode | Use Case | Setup |
|------|----------|-------|
| **Gateway** | Telegram, Discord, OpenClaw channels | Extension install + Gateway restart |
| **MCP Bridge** | Claude Code, Cursor, local AI | Unity: Window → OpenClaw Plugin → MCP Bridge → Start |

### MCP Setup (for Claude Code)

```bash
# Add to Claude Code
claude mcp add unity -- node /path/to/unity-plugin/MCP~/index.js

# Verify connection
curl http://127.0.0.1:27182/status
```

## Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Gateway Extension** | Enables `unity_execute` tool | `~/.openclaw/extensions/unity/` |
| **Skill** | AI workflow patterns | `~/.openclaw/workspace/skills/unity-plugin/` |
| **Unity Package** | Unity Editor plugin + MCP Bridge | [openclaw-unity-plugin](https://github.com/TomLeeLive/openclaw-unity-plugin) |
| **MCP Server** | Local stdio server for Claude Code | Plugin's `MCP~/index.js` |

## Quick Verify

```bash
# Check extension loaded
openclaw unity status

# Check skill available
ls ~/.openclaw/workspace/skills/unity-plugin/SKILL.md
```

## 🔐 Security: disableModelInvocation Setting

이 스킬은 기본적으로 `disableModelInvocation: true`로 설정되어 있습니다.

| Setting | AI Auto-Invoke | User Explicit Request |
|---------|---------------|----------------------|
| `false` | ✅ Allowed | ✅ Allowed |
| `true` (기본값) | ❌ Blocked | ✅ Allowed |

### `disableModelInvocation: true` (기본값)

**장점:**
- 사용자가 명시적으로 요청한 작업만 실행
- 예측 가능한 동작 - AI가 임의로 도구 호출 안함
- 민감한 환경에서 안전
- 토큰 사용량 절약

**단점:**
- 매번 도구 사용을 명시적으로 요청해야 함
- 워크플로우가 덜 자연스러움
- AI의 자율적 보조 기능 제한

**적합한 경우:** 프로덕션 환경, 민감한 데이터, 엄격한 제어 필요시

---

### `disableModelInvocation: false`

**장점:**
- AI가 자율적으로 보조 작업 수행 (hierarchy 검사, 스크린샷, 컴포넌트 확인)
- 대화 중 맥락에 맞게 자동으로 필요한 도구 호출
- 개발 워크플로우가 더 자연스럽고 빠름
- "씬 구조 보여줘" → AI가 바로 `debug.hierarchy` 실행

**단점:**
- AI가 의도치 않은 작업을 수행할 가능성
- 토큰 사용량 증가 (자동 도구 호출)
- 민감한 작업에는 부적합

**적합한 경우:** 개발/디버깅, 프로토타이핑, 학습 목적

---

### 설정 변경 방법

SKILL.md의 frontmatter에서 변경:

```yaml
---
name: unity-plugin
disableModelInvocation: false  # AI 자동 호출 허용
---
```

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) 2026.2.3+
- [OpenClaw Unity Plugin](https://github.com/TomLeeLive/openclaw-unity-plugin) in Unity

## License

This project has been licensed under [Apache-2.0](LICENSE.md) since its initial release.
Copyright 2026 Tom Lee (TomLeeLive)
