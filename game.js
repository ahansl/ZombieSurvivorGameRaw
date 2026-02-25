// ============================================================
// Zombie Survivor Math Game — by Francis
// ============================================================

// --- Constants ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Player
const PLAYER_RADIUS = 18;
const PLAYER_SPRITE_SIZE = 64;  // drawn size of the character sprite
const PLAYER_COLOR = '#53d769';
const PLAYER_STROKE_COLOR = '#ffffff';
const PLAYER_STROKE_WIDTH = 2;

// Player sprite image
const playerImage = new Image();
playerImage.src = 'main_character.png';
const backgroundImage = new Image();
backgroundImage.src = 'background.png';
const enemyImage = new Image();
enemyImage.src = 'villager_pitchfork.png';
const PLAYER_MOVE_DISTANCE = 96;        // ~1 inch at 96 DPI
const PLAYER_MOVE_DISTANCE_HARD = 144;   // ~1.5 inches for hard facts
const PLAYER_MAX_HEALTH = 5;

// Math facts
const MATH_FACT_OFFSET = 90;
const MATH_FACT_FONT = 'bold 20px Courier New';
const MATH_FACT_COLOR = '#ffffff';
const MATH_FACT_BG_COLOR = 'rgba(0,0,0,0.6)';
const MATH_FACT_PADDING_X = 10;
const MATH_FACT_PADDING_Y = 6;
const MATH_FACT_SOLVED_COLOR = '#53d769';
const MATH_FACT_SOLVED_DURATION = 1.0;

// Enemies
const ENEMY_SIZE = 14;
const ENEMY_COLOR = '#e94560';
const ENEMY_LINE_WIDTH = 3;
const ENEMY_BASE_SPEED = 0.4;
const ENEMY_SPEED_INCREMENT = 0.05;
const ENEMY_SPAWN_INTERVAL_INITIAL = 3000;
const ENEMY_SPAWN_INTERVAL_MIN = 800;
const ENEMY_SPAWN_INTERVAL_DECREASE = 100;
const ENEMY_SPAWN_MARGIN = 30;
const ENEMY_DAMAGE = 1;
const ENEMY_HIT_DISTANCE = 22;

// Health bar
const HEALTH_BAR_X = 20;
const HEALTH_BAR_Y = 40;
const HEALTH_BAR_WIDTH = 150;
const HEALTH_BAR_HEIGHT = 16;
const HEALTH_BAR_BG = '#333333';
const HEALTH_BAR_FILL_HEALTHY = '#53d769';
const HEALTH_BAR_FILL_DANGER = '#e94560';
const HEALTH_BAR_BORDER = '#ffffff';

// Timer
const TIMER_X = CANVAS_WIDTH / 2;
const TIMER_Y = 8;
const TIMER_FONT = 'bold 22px Courier New';
const TIMER_COLOR = '#cccccc';

// Math difficulty
const MULTIPLY_MIN = 2;
const MULTIPLY_MAX = 12;
const DIVISION_CHANCE = 0.25;

// Orbiting star
const STAR_ORBIT_RADIUS = 50;
const STAR_ORBIT_SPEED = 2;       // radians per second
const STAR_SIZE = 8;
const STAR_COLOR = '#ffd700';
const STAR_HIT_DISTANCE = 20;

// Difficulty scaling
const DIFFICULTY_TICK_SECONDS = 30;

// Leaderboard (JSONBin.io)
const LEADERBOARD_BIN_ID = 'YOUR_BIN_ID_HERE';
const LEADERBOARD_ACCESS_KEY = 'YOUR_ACCESS_KEY_HERE';
const LEADERBOARD_MAX_ENTRIES = 10;

// --- Game State ---

let canvas, ctx, input;
let lastTimestamp = 0;

let state = {};

function createInitialState() {
  return {
    player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, health: PLAYER_MAX_HEALTH },
    enemies: [],
    mathFacts: {
      left: { text: '', answer: 0 },
      right: { text: '', answer: 0 },
      up: { text: '', answer: 0 },
      down: { text: '', answer: 0 },
    },
    timer: 0,
    gameOver: false,
    lastEnemySpawn: 0,
    currentSpawnInterval: ENEMY_SPAWN_INTERVAL_INITIAL,
    currentEnemySpeed: ENEMY_BASE_SPEED,
    lastDifficultyTick: 0,
    damageFlashTimer: 0,
    starAngle: 0,
    solvedDirection: null,
    solvedFlashTimer: 0,
    leaderboardPhase: null,
    leaderboardData: [],
    initialsText: '',
  };
}

// --- Helpers ---

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();
}

// --- Leaderboard API ---

async function fetchLeaderboard() {
  if (LEADERBOARD_BIN_ID === 'YOUR_BIN_ID_HERE') {
    try {
      return JSON.parse(localStorage.getItem('leaderboard')) || [];
    } catch (e) {
      return [];
    }
  }
  try {
    const res = await fetch('https://api.jsonbin.io/v3/b/' + LEADERBOARD_BIN_ID + '/latest', {
      headers: { 'X-Access-Key': LEADERBOARD_ACCESS_KEY }
    });
    const json = await res.json();
    return Array.isArray(json.record) ? json.record : [];
  } catch (e) {
    console.log('[leaderboard] fetch error:', e);
    return [];
  }
}

async function saveLeaderboard(entries) {
  if (LEADERBOARD_BIN_ID === 'YOUR_BIN_ID_HERE') {
    try {
      localStorage.setItem('leaderboard', JSON.stringify(entries));
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    await fetch('https://api.jsonbin.io/v3/b/' + LEADERBOARD_BIN_ID, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': LEADERBOARD_ACCESS_KEY
      },
      body: JSON.stringify(entries)
    });
    return true;
  } catch (e) {
    console.log('[leaderboard] save error:', e);
    return false;
  }
}

function startLeaderboardFlow() {
  state.leaderboardPhase = 'loading';
  input.value = '';

  fetchLeaderboard().then(function (entries) {
    state.leaderboardData = entries;
    const qualifies = entries.length < LEADERBOARD_MAX_ENTRIES ||
      state.timer > entries[entries.length - 1].time;

    if (qualifies) {
      state.leaderboardPhase = 'initials';
      input.setAttribute('inputmode', 'text');
      input.placeholder = 'Enter initials...';
      input.value = '';
      input.focus();
    } else {
      state.leaderboardPhase = 'display';
    }
  });
}

function submitScore() {
  const entry = { initials: state.initialsText, time: state.timer };
  state.leaderboardData.push(entry);
  state.leaderboardData.sort(function (a, b) { return b.time - a.time; });
  state.leaderboardData = state.leaderboardData.slice(0, LEADERBOARD_MAX_ENTRIES);
  state.leaderboardPhase = 'display';
  input.value = '';

  saveLeaderboard(state.leaderboardData);
}

// --- Math Fact Generation ---

function generateMathFact() {
  if (Math.random() < DIVISION_CHANCE) {
    const divisor = randomInt(MULTIPLY_MIN, MULTIPLY_MAX);
    const quotient = randomInt(MULTIPLY_MIN, MULTIPLY_MAX);
    const dividend = divisor * quotient;
    const hard = divisor >= 7 && quotient >= 7;
    return { text: dividend + ' \u00F7 ' + divisor, answer: quotient, hard: hard };
  } else {
    const a = randomInt(MULTIPLY_MIN, MULTIPLY_MAX);
    const b = randomInt(MULTIPLY_MIN, MULTIPLY_MAX);
    const hard = a >= 7 && b >= 7;
    return { text: a + ' x ' + b, answer: a * b, hard: hard };
  }
}

function generateAllFacts() {
  const directions = ['left', 'right', 'up', 'down'];
  const usedAnswers = new Set();

  for (const dir of directions) {
    let fact;
    let attempts = 0;
    do {
      fact = generateMathFact();
      attempts++;
    } while (usedAnswers.has(fact.answer) && attempts < 50);
    usedAnswers.add(fact.answer);
    state.mathFacts[dir] = fact;
  }
}

// --- Player ---

function drawPlayer() {
  if (playerImage.complete && playerImage.naturalWidth > 0) {
    const half = PLAYER_SPRITE_SIZE / 2;
    ctx.drawImage(playerImage, state.player.x - half, state.player.y - half, PLAYER_SPRITE_SIZE, PLAYER_SPRITE_SIZE);
  } else {
    // Fallback green circle while image loads
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fill();
    ctx.strokeStyle = PLAYER_STROKE_COLOR;
    ctx.lineWidth = PLAYER_STROKE_WIDTH;
    ctx.stroke();
  }
}

function movePlayer(direction, distance) {
  switch (direction) {
    case 'left':  state.player.x -= distance; break;
    case 'right': state.player.x += distance; break;
    case 'up':    state.player.y -= distance; break;
    case 'down':  state.player.y += distance; break;
  }
}

// --- Orbiting Star ---

function getStarPosition() {
  return {
    x: state.player.x + Math.cos(state.starAngle) * STAR_ORBIT_RADIUS,
    y: state.player.y + Math.sin(state.starAngle) * STAR_ORBIT_RADIUS,
  };
}

function updateStar(deltaTime) {
  state.starAngle += STAR_ORBIT_SPEED * deltaTime;
}

function drawStar(sx, sy) {
  const spikes = 5;
  const outerRadius = STAR_SIZE;
  const innerRadius = STAR_SIZE / 2;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 2 * -1) + (Math.PI / spikes) * i;
    const px = sx + Math.cos(angle) * radius;
    const py = sy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = STAR_COLOR;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function checkStarCollisions() {
  const star = getStarPosition();
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    const dx = star.x - enemy.x;
    const dy = star.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < STAR_HIT_DISTANCE) {
      state.enemies.splice(i, 1);
    }
  }
}

// --- Camera ---

function getCameraOffset() {
  return {
    x: state.player.x - CANVAS_WIDTH / 2,
    y: state.player.y - CANVAS_HEIGHT / 2,
  };
}

// --- Math Fact Display ---

function drawMathFacts() {
  // Math facts are drawn in screen space (after camera restore) around screen center
  const cx = CANVAS_WIDTH / 2;
  const cy = CANVAS_HEIGHT / 2;
  const positions = {
    left:  { x: cx - MATH_FACT_OFFSET - 50, y: cy },
    right: { x: cx + MATH_FACT_OFFSET + 50, y: cy },
    up:    { x: cx, y: cy - MATH_FACT_OFFSET },
    down:  { x: cx, y: cy + MATH_FACT_OFFSET },
  };

  ctx.font = MATH_FACT_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [direction, pos] of Object.entries(positions)) {
    const fact = state.mathFacts[direction];
    const isSolved = state.solvedDirection === direction && state.solvedFlashTimer > 0;
    const text = isSolved ? fact.text + ' = ' + fact.answer : fact.text;
    const metrics = ctx.measureText(text);
    const bgWidth = metrics.width + MATH_FACT_PADDING_X * 2;
    const bgHeight = 24 + MATH_FACT_PADDING_Y * 2;

    const drawX = pos.x;
    const drawY = pos.y;

    if (isSolved) {
      // Bright green pill with answer shown
      ctx.fillStyle = MATH_FACT_SOLVED_COLOR;
      drawRoundedRect(drawX - bgWidth / 2 - 4, drawY - bgHeight / 2 - 4, bgWidth + 8, bgHeight + 8, 8);
      ctx.fillStyle = '#000000';
      ctx.fillText(text, drawX, drawY);
    } else {
      // Normal dark pill
      ctx.fillStyle = MATH_FACT_BG_COLOR;
      drawRoundedRect(drawX - bgWidth / 2, drawY - bgHeight / 2, bgWidth, bgHeight, 6);
      ctx.fillStyle = MATH_FACT_COLOR;
      ctx.fillText(text, drawX, drawY);
    }
  }
}

// --- Enemies ---

function spawnEnemy() {
  const cam = getCameraOffset();
  const edge = Math.floor(Math.random() * 4);
  let x, y;

  switch (edge) {
    case 0: // top
      x = cam.x + randomInt(ENEMY_SPAWN_MARGIN, CANVAS_WIDTH - ENEMY_SPAWN_MARGIN);
      y = cam.y - ENEMY_SIZE;
      break;
    case 1: // right
      x = cam.x + CANVAS_WIDTH + ENEMY_SIZE;
      y = cam.y + randomInt(ENEMY_SPAWN_MARGIN, CANVAS_HEIGHT - ENEMY_SPAWN_MARGIN);
      break;
    case 2: // bottom
      x = cam.x + randomInt(ENEMY_SPAWN_MARGIN, CANVAS_WIDTH - ENEMY_SPAWN_MARGIN);
      y = cam.y + CANVAS_HEIGHT + ENEMY_SIZE;
      break;
    case 3: // left
      x = cam.x - ENEMY_SIZE;
      y = cam.y + randomInt(ENEMY_SPAWN_MARGIN, CANVAS_HEIGHT - ENEMY_SPAWN_MARGIN);
      break;
  }

  state.enemies.push({ x, y, speed: state.currentEnemySpeed });
}

function updateEnemies(deltaTime) {
  for (const enemy of state.enemies) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      enemy.x += (dx / distance) * enemy.speed * deltaTime * 60;
      enemy.y += (dy / distance) * enemy.speed * deltaTime * 60;
    }
  }
}

const ENEMY_SPRITE_SIZE = 48;

function drawEnemy(enemy) {
  if (enemyImage.complete && enemyImage.naturalWidth > 0) {
    ctx.drawImage(
      enemyImage,
      enemy.x - ENEMY_SPRITE_SIZE / 2,
      enemy.y - ENEMY_SPRITE_SIZE / 2,
      ENEMY_SPRITE_SIZE,
      ENEMY_SPRITE_SIZE
    );
  } else {
    // Fallback X while image loads
    ctx.strokeStyle = ENEMY_COLOR;
    ctx.lineWidth = ENEMY_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(enemy.x - ENEMY_SIZE, enemy.y - ENEMY_SIZE);
    ctx.lineTo(enemy.x + ENEMY_SIZE, enemy.y + ENEMY_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(enemy.x + ENEMY_SIZE, enemy.y - ENEMY_SIZE);
    ctx.lineTo(enemy.x - ENEMY_SIZE, enemy.y + ENEMY_SIZE);
    ctx.stroke();
  }
}

// --- Collisions ---

function checkCollisions() {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ENEMY_HIT_DISTANCE) {
      state.player.health -= ENEMY_DAMAGE;
      state.enemies.splice(i, 1);
      state.damageFlashTimer = 0.15;

      if (state.player.health <= 0) {
        state.player.health = 0;
        state.gameOver = true;
      }
    }
  }

  if (state.gameOver) {
    startLeaderboardFlow();
  }
}

// --- HUD ---

function drawHealthBar() {
  // Label
  ctx.font = 'bold 14px Courier New';
  ctx.fillStyle = '#cccccc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('HEALTH', HEALTH_BAR_X, HEALTH_BAR_Y - 18);

  // Background
  ctx.fillStyle = HEALTH_BAR_BG;
  ctx.fillRect(HEALTH_BAR_X, HEALTH_BAR_Y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

  // Fill
  const healthPercent = state.player.health / PLAYER_MAX_HEALTH;
  ctx.fillStyle = healthPercent > 0.4 ? HEALTH_BAR_FILL_HEALTHY : HEALTH_BAR_FILL_DANGER;
  ctx.fillRect(HEALTH_BAR_X, HEALTH_BAR_Y, HEALTH_BAR_WIDTH * healthPercent, HEALTH_BAR_HEIGHT);

  // Border
  ctx.strokeStyle = HEALTH_BAR_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(HEALTH_BAR_X, HEALTH_BAR_Y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
}

function drawTimer() {
  const minutes = Math.floor(state.timer / 60);
  const seconds = Math.floor(state.timer % 60);
  const timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

  ctx.font = TIMER_FONT;
  ctx.fillStyle = TIMER_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SURVIVED: ' + timeStr, TIMER_X, TIMER_Y);
}

// --- Damage Flash ---

function drawDamageFlash() {
  if (state.damageFlashTimer > 0) {
    const alpha = (state.damageFlashTimer / 0.15) * 0.3;
    ctx.fillStyle = 'rgba(233, 69, 96, ' + alpha + ')';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

// --- Game Over ---

function drawLeaderboardTable(startY) {
  const cx = CANVAS_WIDTH / 2;
  const entries = state.leaderboardData;

  ctx.font = 'bold 20px Courier New';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOP SURVIVORS', cx, startY);

  const rowHeight = 28;
  const tableY = startY + 30;

  ctx.font = 'bold 14px Courier New';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'right';
  ctx.fillText('#', cx - 100, tableY);
  ctx.textAlign = 'center';
  ctx.fillText('NAME', cx, tableY);
  ctx.textAlign = 'left';
  ctx.fillText('TIME', cx + 70, tableY);

  for (let i = 0; i < entries.length && i < LEADERBOARD_MAX_ENTRIES; i++) {
    const entry = entries[i];
    const y = tableY + (i + 1) * rowHeight;
    const m = Math.floor(entry.time / 60);
    const s = Math.floor(entry.time % 60);
    const t = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

    ctx.font = '16px Courier New';
    ctx.fillStyle = i < 3 ? '#ffd700' : '#cccccc';
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1), cx - 100, y);
    ctx.textAlign = 'center';
    ctx.fillText(entry.initials, cx, y);
    ctx.textAlign = 'left';
    ctx.fillText(t, cx + 70, y);
  }

  if (entries.length === 0) {
    ctx.font = '16px Courier New';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.fillText('No scores yet', cx, tableY + rowHeight);
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cx = CANVAS_WIDTH / 2;
  const minutes = Math.floor(state.timer / 60);
  const seconds = Math.floor(state.timer % 60);
  const timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

  ctx.font = 'bold 48px Courier New';
  ctx.fillStyle = '#e94560';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', cx, 60);

  ctx.font = 'bold 24px Courier New';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('You survived: ' + timeStr, cx, 105);

  if (state.leaderboardPhase === 'loading') {
    ctx.font = '18px Courier New';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Loading leaderboard...', cx, 300);

  } else if (state.leaderboardPhase === 'initials') {
    ctx.font = 'bold 28px Courier New';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('NEW HIGH SCORE!', cx, 200);

    const display = state.initialsText.padEnd(3, '_');
    ctx.font = 'bold 48px Courier New';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(display, cx, 270);

    ctx.font = '18px Courier New';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Type 3 letters, then press ENTER', cx, 330);

  } else if (state.leaderboardPhase === 'display') {
    drawLeaderboardTable(155);

    ctx.font = '18px Courier New';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER to play again', cx, 560);

  } else {
    ctx.font = '18px Courier New';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Press ENTER to play again', cx, 160);
  }
}

// --- Difficulty ---

function updateDifficulty() {
  const elapsedTicks = Math.floor(state.timer / DIFFICULTY_TICK_SECONDS);
  if (elapsedTicks > state.lastDifficultyTick) {
    state.lastDifficultyTick = elapsedTicks;
    state.currentEnemySpeed += ENEMY_SPEED_INCREMENT;
    state.currentSpawnInterval = Math.max(
      ENEMY_SPAWN_INTERVAL_MIN,
      ENEMY_SPAWN_INTERVAL_INITIAL - elapsedTicks * ENEMY_SPAWN_INTERVAL_DECREASE
    );
  }
}

// --- Rendering ---

// Seeded random for deterministic terrain
function seededRandom(seed) {
  let s = Math.abs(seed) || 1;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Terrain tile colors — earthy landscape palette
const TERRAIN_COLORS = [
  '#1a2e1a', // dark forest
  '#1e3320', // deep green
  '#243b24', // forest green
  '#2d4a2d', // mossy green
  '#1c2e24', // dark teal-green
  '#2a3a1e', // olive dark
  '#1f2b1a', // shadow green
  '#273d27', // mid green
];

const TILE_SIZE = 80;
const tileColorCache = {};

function getTileColor(tx, ty) {
  const key = tx + ',' + ty;
  if (tileColorCache[key]) return tileColorCache[key];
  const rng = seededRandom((tx * 73856093) ^ (ty * 19349663));
  const color = TERRAIN_COLORS[Math.floor(rng() * TERRAIN_COLORS.length)];
  tileColorCache[key] = color;
  return color;
}

// Decorations per tile (grass tufts, pebbles, etc.)
const tileDecoCache = {};

function getTileDecorations(tx, ty) {
  const key = tx + ',' + ty;
  if (tileDecoCache[key]) return tileDecoCache[key];
  const rng = seededRandom((tx * 48611) ^ (ty * 96769));
  const items = [];
  const count = Math.floor(rng() * 4); // 0-3 decorations per tile
  for (let i = 0; i < count; i++) {
    items.push({
      ox: rng() * TILE_SIZE,
      oy: rng() * TILE_SIZE,
      type: Math.floor(rng() * 3), // 0=grass tuft, 1=pebble, 2=dark patch
      size: 2 + rng() * 5,
    });
  }
  tileDecoCache[key] = items;
  return items;
}

function drawBackground() {
  if (!backgroundImage.complete || backgroundImage.naturalWidth === 0) {
    // Fallback: solid dark fill while image loads
    ctx.fillStyle = '#1a2e1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  const cam = getCameraOffset();
  const imgW = backgroundImage.naturalWidth;
  const imgH = backgroundImage.naturalHeight;

  // Tile the background image across the visible area
  const startX = Math.floor(cam.x / imgW) * imgW;
  const startY = Math.floor(cam.y / imgH) * imgH;

  for (let wx = startX; wx < cam.x + CANVAS_WIDTH; wx += imgW) {
    for (let wy = startY; wy < cam.y + CANVAS_HEIGHT; wy += imgH) {
      ctx.drawImage(backgroundImage, wx - cam.x, wy - cam.y);
    }
  }
}

function render() {
  const cam = getCameraOffset();

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background grid + scattered decorations
  drawBackground();

  // --- World space (camera transform) ---
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // Enemies (behind player)
  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  // Player
  drawPlayer();

  // Orbiting star
  const star = getStarPosition();
  drawStar(star.x, star.y);

  ctx.restore();
  // --- End world space ---

  // Math facts (screen space, around center)
  if (!state.gameOver) {
    drawMathFacts();
  }

  // HUD (screen space)
  drawHealthBar();
  drawTimer();

  // Damage flash
  drawDamageFlash();

  // Game over overlay
  if (state.gameOver) {
    drawGameOver();
  }
}

// --- Input ---

// Word-to-number map for speech recognition
const WORD_NUMBERS = {
  'zero': 0, 'one': 1, 'two': 2, 'to': 2, 'too': 2, 'three': 3, 'four': 4, 'for': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'ate': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100,
};

function parseSpokenNumber(text) {
  // Try direct number parse first
  const direct = parseInt(text, 10);
  if (!isNaN(direct)) return direct;

  // Try word-to-number
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/[\s-]+/);
  let total = 0;
  let found = false;
  for (const word of words) {
    if (WORD_NUMBERS[word] !== undefined) {
      const val = WORD_NUMBERS[word];
      if (val === 100) {
        total = (total === 0 ? 1 : total) * 100;
      } else {
        total += val;
      }
      found = true;
    }
  }
  return found ? total : NaN;
}

function tryAnswer(numValue) {
  if (state.gameOver || state.solvedFlashTimer > 0) return false;
  if (isNaN(numValue)) return false;

  for (const direction of ['left', 'right', 'up', 'down']) {
    if (numValue === state.mathFacts[direction].answer) {
      const dist = state.mathFacts[direction].hard ? PLAYER_MOVE_DISTANCE_HARD : PLAYER_MOVE_DISTANCE;
      movePlayer(direction, dist);
      state.solvedDirection = direction;
      state.solvedFlashTimer = MATH_FACT_SOLVED_DURATION;
      input.value = '';
      return true;
    }
  }
  return false;
}

function setupInput() {
  input.focus();

  document.addEventListener('click', function () {
    if (!state.gameOver || state.leaderboardPhase === 'initials') {
      input.focus();
    }
  });

  input.addEventListener('input', function () {
    if (state.gameOver && state.leaderboardPhase === 'initials') {
      state.initialsText = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
      input.value = state.initialsText;
      return;
    }

    if (state.gameOver || state.solvedFlashTimer > 0) return;

    const value = input.value.trim();
    if (value === '') return;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    tryAnswer(numValue);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && state.gameOver) {
      if (state.leaderboardPhase === 'initials' && state.initialsText.length === 3) {
        submitScore();
      } else if (state.leaderboardPhase === 'display' || state.leaderboardPhase === null) {
        resetGame();
      }
    }
  });

  // --- Microphone / Speech Recognition ---
  const micBtn = document.getElementById('mic-btn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.title = 'Speech recognition not supported in this browser';
    micBtn.style.opacity = '0.4';
    micBtn.style.cursor = 'not-allowed';
    return;
  }

  let listening = false;
  let recognition = null;
  let restartTimer = null;

  function extractNumber(text) {
    // 1) Try pulling a digit sequence out of anywhere in the string (e.g. "the answer is 42")
    const digitMatch = text.match(/\d+/);
    if (digitMatch) return parseInt(digitMatch[0], 10);
    // 2) Fall back to word-based parsing
    return parseSpokenNumber(text);
  }

  function startRecognition() {
    // Kill any existing instance first
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }

    var rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onresult = function (event) {
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var result = event.results[i];
        // Show what the mic is hearing in the input field
        input.value = result[0].transcript.trim();

        // Try every alternative for a valid answer
        for (var a = 0; a < result.length; a++) {
          var transcript = result[a].transcript.trim();
          var numValue = extractNumber(transcript);
          if (!isNaN(numValue) && tryAnswer(numValue)) {
            return;
          }
        }
      }
    };

    rec.onerror = function (event) {
      console.log('[mic] error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopRecognition();
        micBtn.title = 'Microphone access denied — check browser permissions';
      }
      // no-speech / aborted / network — let onend handle restart
    };

    rec.onend = function () {
      console.log('[mic] session ended');
      // Only restart if user still wants to listen; add delay so the
      // browser fully releases the mic before we grab it again.
      if (listening) {
        restartTimer = setTimeout(function () {
          restartTimer = null;
          if (listening) {
            try {
              startRecognition();
            } catch (e) {
              stopRecognition();
            }
          }
        }, 500);
      }
    };

    // Diagnostic events — shows exactly where the audio pipeline stalls
    rec.onaudiostart = function () { console.log('[mic] audiostart — mic is capturing'); };
    rec.onaudioend   = function () { console.log('[mic] audioend — mic stopped capturing'); };
    rec.onsoundstart = function () { console.log('[mic] soundstart — sound detected'); };
    rec.onsoundend   = function () { console.log('[mic] soundend — sound stopped'); };
    rec.onspeechstart = function () { console.log('[mic] speechstart — speech detected'); };
    rec.onspeechend  = function () { console.log('[mic] speechend — speech stopped'); };

    recognition = rec;
    rec.start();
    console.log('[mic] started');
  }

  function stopRecognition() {
    listening = false;
    micBtn.classList.remove('listening');
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }
  }

  micBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (listening) {
      stopRecognition();
    } else {
      listening = true;
      micBtn.classList.add('listening');
      try {
        startRecognition();
      } catch (e) {
        stopRecognition();
        micBtn.title = 'Could not start microphone — try using HTTPS';
      }
    }
  });
}

// --- Game Reset ---

function resetGame() {
  state = createInitialState();
  generateAllFacts();
  input.value = '';
  input.setAttribute('inputmode', 'numeric');
  input.placeholder = 'Type answer here...';
  input.focus();
  lastTimestamp = 0;
}

// --- Game Loop ---

function gameLoop(timestamp) {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp;
  }

  const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  if (!state.gameOver) {
    // Update timer
    state.timer += deltaTime;

    // Difficulty scaling
    updateDifficulty();

    // Spawn enemies
    if (timestamp - state.lastEnemySpawn >= state.currentSpawnInterval) {
      spawnEnemy();
      state.lastEnemySpawn = timestamp;
    }

    // Move enemies
    updateEnemies(deltaTime);

    // Update orbiting star
    updateStar(deltaTime);

    // Collisions
    checkStarCollisions();
    checkCollisions();

    // Solved fact flash countdown — regenerate facts when it expires
    if (state.solvedFlashTimer > 0) {
      state.solvedFlashTimer -= deltaTime;
      if (state.solvedFlashTimer <= 0) {
        state.solvedFlashTimer = 0;
        state.solvedDirection = null;
        generateAllFacts();
      }
    }

    // Damage flash countdown
    state.damageFlashTimer = Math.max(0, state.damageFlashTimer - deltaTime);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// --- Init ---

function startGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  input = document.getElementById('answer-input');

  resetGame();
  setupInput();
  input.focus();
  requestAnimationFrame(gameLoop);
}

function init() {
  const storyScreen = document.getElementById('prologue-story');
  const scrollScreen = document.getElementById('prologue-scroll');
  const gameContainer = document.getElementById('game-container');

  document.getElementById('story-continue-btn').addEventListener('click', () => {
    storyScreen.style.display = 'none';
    scrollScreen.style.display = 'flex';
  });

  document.getElementById('scroll-play-btn').addEventListener('click', () => {
    scrollScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    startGame();
  });
}

window.addEventListener('DOMContentLoaded', init);
