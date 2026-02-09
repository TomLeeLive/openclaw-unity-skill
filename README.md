# 🦞 OpenClaw Unity Skill

> **TL;DR:** Vibe-code your game development remotely from anywhere! 🌍
> 
> **한줄요약:** 이제 집밖에서도 원격으로 바이브코딩으로 게임 개발 가능합니다! 🎮

Companion skill for the [OpenClaw Unity Plugin](https://github.com/TomLeeLive/openclaw-unity-plugin). Provides AI workflow patterns and gateway extension for Unity Editor control.

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
├── SKILL.md           # AI workflow guide (52 tools)
├── extension/         # Gateway extension (required)
│   ├── index.ts
│   ├── openclaw.plugin.json
│   └── package.json
├── scripts/
│   └── install-extension.sh
└── references/
    └── tools.md       # Detailed tool documentation
```

## Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Gateway Extension** | Enables `unity_execute` tool | `~/.openclaw/extensions/unity/` |
| **Skill** | AI workflow patterns | `~/.openclaw/workspace/skills/unity-plugin/` |
| **Unity Package** | Unity Editor plugin | [openclaw-unity-plugin](https://github.com/TomLeeLive/openclaw-unity-plugin) |

## Quick Verify

```bash
# Check extension loaded
openclaw unity status

# Check skill available
ls ~/.openclaw/workspace/skills/unity-plugin/SKILL.md
```

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) 2026.2.3+
- [OpenClaw Unity Plugin](https://github.com/TomLeeLive/openclaw-unity-plugin) in Unity

## License

MIT License - See [LICENSE](LICENSE)
