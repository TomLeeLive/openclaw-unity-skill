---
name: unity-plugin
description: Control Unity Editor via OpenClaw Unity Plugin. Use for Unity game development tasks including scene management, GameObject/Component manipulation, debugging, input simulation, and Play mode control. Triggers on Unity-related requests like inspecting scenes, creating objects, taking screenshots, testing gameplay, or controlling the Editor.
homepage: https://github.com/TomLeeLive/openclaw-unity-skill
author: Tom Jaejoon Lee
---

# Unity Plugin Skill

Control Unity Editor through 52+ built-in tools. Works in both Editor and Play mode.

## First-Time Setup

If `unity_execute` tool is not available, install the gateway extension:

```bash
# From skill directory
./scripts/install-extension.sh

# Restart gateway
openclaw gateway restart
```

The extension files are in `extension/` directory.

### What install-extension.sh Does

```bash
# 1. Copies extension files from skill to gateway
#    Source: <skill>/extension/
#    Destination: ~/.openclaw/extensions/unity/

# 2. Files installed:
#    - index.ts     # Extension entry point (HTTP handlers, tools)
#    - package.json # Extension metadata

# After installation, restart gateway to load the extension.
```

## 🔐 Security: Model Invocation Setting

When publishing to ClawHub, configure `disableModelInvocation`:

| Setting | AI Auto-Invoke | User Explicit Request |
|---------|---------------|----------------------|
| `false` (default) | ✅ Allowed | ✅ Allowed |
| `true` | ❌ Blocked | ✅ Allowed |

### `disableModelInvocation: false` (기본값)

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

### `disableModelInvocation: true`

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

### 권장: **`false`** (Unity 개발용)

Unity 개발 시 AI가 hierarchy 검사, 스크린샷, 상태 확인 등을 자율적으로 수행하는 것이 생산성에 도움됩니다.

## Quick Reference

### Core Tools

| Category | Key Tools |
|----------|-----------|
| **Scene** | `scene.getActive`, `scene.getData`, `scene.load`, `scene.open` |
| **GameObject** | `gameobject.find`, `gameobject.create`, `gameobject.destroy`, `gameobject.delete` |
| **Component** | `component.get`, `component.set`, `component.add` |
| **Debug** | `debug.hierarchy`, `debug.screenshot`, `console.getLogs` |
| **Input** | `input.clickUI`, `input.type`, `input.keyPress` |
| **Editor** | `app.play`, `app.getState`, `editor.refresh` |

## Common Workflows

### 1. Scene Inspection

```
unity_execute: debug.hierarchy {depth: 2}
unity_execute: scene.getActive
```

### 2. Find & Modify Objects

```
unity_execute: gameobject.find {name: "Player"}
unity_execute: component.get {name: "Player", componentType: "Transform"}
unity_execute: transform.setPosition {name: "Player", x: 0, y: 5, z: 0}
```

### 3. UI Testing

```
unity_execute: input.clickUI {name: "PlayButton"}
unity_execute: input.type {text: "TestUser", elementName: "UsernameInput"}
unity_execute: debug.screenshot
```

### 4. Play Mode Control

```
unity_execute: app.play {state: true}   # Enter Play mode
unity_execute: app.play {state: false}  # Exit Play mode
unity_execute: app.getState             # Check current state
```

### 5. Force Recompile

```
unity_execute: editor.refresh           # Refresh assets & recompile
unity_execute: editor.recompile         # Request recompilation only
```

## Tool Categories

### Console (3 tools)
- `console.getLogs` - Get logs with optional type filter (Log/Warning/Error)
- `console.getErrors` - Get error/exception logs (with optional warnings)
- `console.clear` - Clear captured logs

### Scene (5 tools)
- `scene.list` - List scenes in build settings
- `scene.getActive` - Get active scene info
- `scene.getData` - Get full hierarchy data
- `scene.load` - Load scene by name (Play mode)
- `scene.open` - Open scene in Editor mode (EditorSceneManager)

### GameObject (7 tools)
- `gameobject.find` - Find by name, tag, or component
- `gameobject.create` - Create object or primitive (Cube, Sphere, etc.)
- `gameobject.destroy` - Destroy object
- `gameobject.delete` - Delete object (alias for destroy)
- `gameobject.getData` - Get detailed data
- `gameobject.setActive` - Enable/disable
- `gameobject.setParent` - Change hierarchy

### Transform (6 tools)
- `transform.getPosition` - Get world position {x, y, z}
- `transform.getRotation` - Get Euler rotation {x, y, z}
- `transform.getScale` - Get local scale {x, y, z}
- `transform.setPosition` - Set world position {x, y, z}
- `transform.setRotation` - Set Euler rotation
- `transform.setScale` - Set local scale

### Component (5 tools)
- `component.add` - Add component by type name
- `component.remove` - Remove component
- `component.get` - Get component data/properties
- `component.set` - Set field/property value
- `component.list` - List available component types

### Script (3 tools)
- `script.execute` - Execute simple command
- `script.read` - Read script file
- `script.list` - List project scripts

### Application (3 tools)
- `app.getState` - Get play mode, FPS, time
- `app.play` - Enter/exit Play mode
- `app.pause` - Toggle pause

### Debug (3 tools)
- `debug.log` - Write to console
- `debug.screenshot` - Capture screenshot
- `debug.hierarchy` - Text hierarchy view

### Editor (4 tools)
- `editor.refresh` - Refresh AssetDatabase (triggers recompile)
- `editor.recompile` - Request script recompilation
- `editor.focusWindow` - Focus window (game/scene/console/hierarchy/project/inspector)
- `editor.listWindows` - List open windows

### Input Simulation (10 tools)
- `input.keyPress` - Press and release key
- `input.keyDown` / `input.keyUp` - Hold/release key
- `input.type` - Type text into field
- `input.mouseMove` - Move cursor
- `input.mouseClick` - Click at position
- `input.mouseDrag` - Drag operation
- `input.mouseScroll` - Scroll wheel
- `input.getMousePosition` - Get cursor position
- `input.clickUI` - Click UI element by name

## Tips

### Screenshot Modes
- **Play mode**: `ScreenCapture` - includes all UI overlays
- **Editor mode**: `Camera.main.Render()` - no overlay UI
- Use `{method: "camera"}` for camera-only capture

### Finding Objects
```
gameobject.find {name: "Player"}           # By exact name
gameobject.find {tag: "Enemy"}             # By tag
gameobject.find {componentType: "Camera"}  # By component
```

### Script Recompilation
Unity may not auto-recompile after code changes. Use:
```
editor.refresh    # Full asset refresh + recompile
```

### Play Mode Transitions
- Plugin survives Play mode transitions via SessionState
- If connection lost, wait for auto-reconnect or use Window > OpenClaw Plugin > Force Reconnect

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tool timeout | Check Unity is responding, try `app.getState` |
| No connection | Verify `openclaw unity status`, check gateway |
| Scripts not updating | Use `editor.refresh` to force recompile |
| Wrong screenshot | Use Play mode for game view with UI |

## Links

- **Skill Repository:** https://github.com/TomLeeLive/openclaw-unity-skill
- **Plugin Repository:** https://github.com/TomLeeLive/openclaw-unity-mcp
- **OpenClaw Docs:** https://docs.openclaw.ai

## License

MIT License - See LICENSE file
