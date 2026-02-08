# OpenClaw Unity Skill

OpenClaw skill for controlling Unity Editor via [OpenClaw Unity Plugin](https://github.com/TomLeeLive/openclaw-unity-plugin).

## Installation

### Option 1: Local Skill

Copy the skill folder to your OpenClaw workspace:

```bash
cp -r . ~/.openclaw/workspace/skills/unity-plugin
```

### Option 2: Git URL (if supported)

```
https://github.com/TomLeeLive/openclaw-unity-skill.git
```

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) 2026.2.3+
- [OpenClaw Unity Plugin](https://github.com/TomLeeLive/openclaw-unity-plugin) installed in Unity

## Features

This skill provides guidance for 44 Unity control tools:

- **Scene Management** - List, load, inspect scenes
- **GameObject Control** - Create, find, modify, destroy objects
- **Component Editing** - Add, remove, get/set component properties
- **Debug Tools** - Screenshots, hierarchy view, console logs
- **Input Simulation** - Keyboard, mouse, UI clicks for game testing
- **Editor Control** - Play mode, pause, recompile, asset refresh

## Usage

The skill automatically activates when you ask about Unity-related tasks:

```
"What's in my Unity scene?"
"Create a cube at position (0, 5, 0)"
"Click the Play button and take a screenshot"
"Recompile Unity scripts"
```

## Files

```
unity-plugin/
├── SKILL.md              # Main skill guide
└── references/
    └── tools.md          # Complete tool parameter reference
```

## License

MIT License - See [LICENSE](LICENSE)

---

Part of the [OpenClaw](https://github.com/openclaw/openclaw) ecosystem.
