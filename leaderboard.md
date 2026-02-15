# Global Leaderboard for Zombie Survivor Math Game

## Context
The game currently shows a static "GAME OVER" screen with survival time and a prompt to press Enter. We want to add a global top-10 leaderboard ranked by survival time, where qualifying players enter 3-letter initials. It must be free, easy, and work without a backend.

## Approach: JSONBin.io
**Why:** Free REST API for JSON storage. Two `fetch()` calls, zero dependencies, no SDK, CORS-friendly, scoped access keys for basic protection. Far simpler than Firebase/Supabase, more secure than jsonblob.

**One-time setup (manual):**
1. Create free account at jsonbin.io
2. Create a bin with initial value `[]`
3. Create a read/update-scoped Access Key
4. Paste the Bin ID and Access Key into `game.js` as constants

## Implementation Plan

### 1. Add leaderboard constants and state fields
**File:** `game.js` (top of file + `createInitialState`)
- Add `LEADERBOARD_BIN_ID` and `LEADERBOARD_ACCESS_KEY` constants
- Add state fields: `leaderboardPhase` (`null` | `"loading"` | `"initials"` | `"display"`), `leaderboardData` (array), `initialsText` (string)

### 2. Add API functions
**File:** `game.js` (new section after constants)
- `fetchLeaderboard()` — GET from JSONBin, returns array
- `saveLeaderboard(entries)` — PUT to JSONBin, returns success boolean
- Both use simple `fetch()` with the Access Key header

### 3. Modify game-over trigger
**File:** `game.js` (collision detection, ~line 380)
- When `state.gameOver` becomes true, set `leaderboardPhase = "loading"` and call `fetchLeaderboard()`
- On response: check if player's time qualifies (top 10 or fewer than 10 entries)
  - If yes → set phase to `"initials"`, reconfigure input for 3-letter entry
  - If no → set phase to `"display"`

### 4. Modify game-over rendering
**File:** `game.js` (`drawGameOver` function, ~line 437)
- **Loading phase:** Show "GAME OVER" + "Loading leaderboard..."
- **Initials phase:** Show "NEW HIGH SCORE!" + current initials being typed + "Press ENTER to submit"
- **Display phase:** Draw top-10 table (rank, initials, time) in Courier New, then "Press ENTER to play again"

### 5. Modify input handling for initials
**File:** `game.js` (input event listeners, ~line 656)
- When `leaderboardPhase === "initials"`:
  - Filter to letters only, uppercase, max 3 chars
  - On Enter with 3 letters: insert score into leaderboard array, sort, trim to 10, call `saveLeaderboard()`, set phase to `"display"`
- When `leaderboardPhase === "display"`:
  - On Enter: call `resetGame()`

### 6. Modify resetGame
**File:** `game.js` (~line 805)
- Reset leaderboard state fields
- Restore input element to numeric mode

## Files Modified
- `game.js` — all leaderboard logic (API, state, rendering, input)

## Verification
1. Start the server, open Chrome
2. Play until game over → should see "Loading leaderboard..."
3. If qualifying: enter 3 initials, press Enter → score saved, table shown
4. If not qualifying: leaderboard table shown directly
5. Press Enter → game restarts cleanly
6. Refresh page → leaderboard persists from JSONBin
