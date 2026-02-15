# Zombie Survivor Math Game — Codebase Analysis

## Overview

An educational arcade-style survivor game built with vanilla JavaScript and HTML5 Canvas. Players solve multiplication and division problems to move their character and avoid approaching enemies. Designed for students practicing math facts (roughly grades 2–5).

## Project Structure

```
ZombieSurvivorGameRaw/
├── index.html           # Entry point — canvas, input field, mic button
├── game.js              # All game logic (914 lines)
├── style.css            # Dark-themed styling with animations
├── main_character.png   # Vampire sprite (2295x2110)
├── background.png       # Background asset
├── IMG_8780.jpg         # Reference image
├── test-mic.mjs         # Playwright speech recognition test
├── .gitignore           # Excludes node_modules/ and test files
└── node_modules/        # Playwright-core (dev only)
```

No build system, no framework — pure browser APIs.

## Technologies

- **Rendering:** Canvas 2D API (800x600)
- **Voice Input:** Web Speech API (continuous recognition)
- **Language:** ES6+ JavaScript, HTML5, CSS3
- **Testing:** Playwright-core (microphone permission automation)
- **Runtime Dependencies:** None

## Architecture

The codebase is procedural, organized into clear sections within `game.js`:

| Section | Lines | Purpose |
|---------|-------|---------|
| Constants | 5–77 | Player, enemy, UI, difficulty, math config |
| Game State | 78–106 | Single mutable state object |
| Helpers | 110–131 | `randomInt`, `clamp`, `drawRoundedRect` |
| Math Facts | 135–164 | Problem generation, uniqueness enforcement |
| Player | 168–191 | Sprite rendering, movement |
| Orbiting Star | 195–239 | Orbital mechanics, enemy destruction |
| Camera | 243–248 | World-to-screen coordinate transform |
| Math Display | 252–292 | Directional equation pills on HUD |
| Enemies | 296–350 | Spawning, pathfinding, rendering |
| Collision | 353–371 | Enemy-player and star-enemy detection |
| HUD | 375–418 | Health bar, timer, damage flash |
| Difficulty | 453–463 | Progressive scaling every 30s |
| Terrain | 468–595 | Seeded procedural tile generation + decorations |
| Rendering | 597–640 | Composite render pipeline |
| Input | 694–839 | Keyboard + speech recognition handling |
| Game Loop | 853–900 | Delta-time update/render cycle |
| Init | 904–914 | Bootstrap on DOMContentLoaded |

## Game Mechanics

### Core Loop

1. Four math problems display around screen center (up/down/left/right)
2. Enemies spawn from edges and path toward the player
3. Player types or speaks the answer to a problem
4. Correct answer → player moves in that direction; new problem generates
5. Enemy contact → 1 damage + red flash; health reaches 0 → game over

### Math System

- 75% multiplication, 25% division
- Operand range: 2–12
- "Hard" facts (both operands ≥ 7) grant 50% bonus movement (144px vs 96px)
- Four unique active problems — no duplicate answers allowed

### Enemy System

- Initial spawn interval: 3000ms, decreasing by 100ms per tier (minimum 800ms)
- Initial speed: 0.4 px/frame, +0.05 every 30 seconds
- Direct vector pathfinding toward player
- Rendered as red diagonal X marks

### Orbiting Star

- Golden 5-pointed star orbits player at 50px radius, 2 rad/s
- Automatically destroys enemies within 20px
- Provides passive defense

### Difficulty Scaling

Every 30 seconds: enemy speed increases, spawn interval decreases. Creates progressive pressure without changing gameplay rules.

## Rendering Pipeline

```
render()
├─ Clear canvas
├─ Draw terrain (procedural tiles + grid + decorations)
├─ [Camera transform]
│  ├─ Draw enemies
│  ├─ Draw player (sprite or fallback circle)
│  └─ Draw orbiting star
├─ [Screen space]
│  ├─ Draw math fact pills
│  ├─ Draw health bar
│  ├─ Draw timer
│  ├─ Draw damage flash overlay
│  └─ Draw game over overlay
```

World objects use camera-transformed coordinates; HUD elements stay fixed.

## Input Handling

### Keyboard
- Input field captures keystrokes; numeric validation; auto-clear on correct answer

### Speech Recognition
- Continuous listening with 500ms restart delay (avoids browser mic contention)
- Two-level number extraction: direct digit parsing → word-to-number fallback
- Handles homophones: "to/too" → 2, "for/four" → 4, "ate" → 8
- Diagnostic console logging; graceful degradation for unsupported browsers

## Notable Implementation Details

- **Delta-time physics:** All movement scaled by frame delta (capped at 50ms) for frame-rate independence
- **Seeded procedural terrain:** XOR-based hash function generates deterministic, infinite tiles with decorations and an 8-color dark forest palette
- **Solved-fact flash:** 1-second green highlight shows the answer, then auto-regenerates new unique facts
- **Health bar color shift:** Green → red threshold at 40% health for visual urgency
- **Backward iteration for removal:** Star-enemy collision iterates enemies in reverse for safe splice during loop

## Stats

| Metric | Value |
|--------|-------|
| Total lines (game.js) | 914 |
| Canvas resolution | 800x600 |
| Frame target | 60 FPS |
| Max health | 5 |
| Active math problems | 4 |
| Tile size | 80x80 px |
| Sprite display size | 64x64 px |
| Initial spawn interval | 3000ms |
| Minimum spawn interval | 800ms |
| Difficulty tick | Every 30s |

## Git History

| Commit | Description |
|--------|-------------|
| 5e36bad | Replace player circle with vampire sprite, adjust equation layout |
| c39894e | Add .gitignore for node_modules and test files |
| b53578c | Fix speech recognition: continuous streaming, restart delay, diagnostics |
| 35ab90d | Add solved equation flash, terrain background, and voice input |
| ff4282a | Add orbiting star that destroys enemies on contact |
| 3b86d87 | Add hard-fact bonus movement, slower enemies, scrolling camera |
| a216d7f | Initial commit: Zombie Survivor Math Game |
