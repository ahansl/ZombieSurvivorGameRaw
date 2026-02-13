// ============================================================
// Zombie Survivor Math Game — by Francis
// ============================================================

// --- Constants ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Player
const PLAYER_RADIUS = 18;
const PLAYER_COLOR = '#53d769';
const PLAYER_STROKE_COLOR = '#ffffff';
const PLAYER_STROKE_WIDTH = 2;
const PLAYER_MOVE_DISTANCE = 96;        // ~1 inch at 96 DPI
const PLAYER_MOVE_DISTANCE_HARD = 144;   // ~1.5 inches for hard facts
const PLAYER_MAX_HEALTH = 5;

// Math facts
const MATH_FACT_OFFSET = 60;
const MATH_FACT_FONT = 'bold 20px Courier New';
const MATH_FACT_COLOR = '#ffffff';
const MATH_FACT_BG_COLOR = 'rgba(0,0,0,0.6)';
const MATH_FACT_PADDING_X = 10;
const MATH_FACT_PADDING_Y = 6;

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

// Difficulty scaling
const DIFFICULTY_TICK_SECONDS = 30;

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
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = PLAYER_COLOR;
  ctx.fill();
  ctx.strokeStyle = PLAYER_STROKE_COLOR;
  ctx.lineWidth = PLAYER_STROKE_WIDTH;
  ctx.stroke();
}

function movePlayer(direction, distance) {
  switch (direction) {
    case 'left':  state.player.x -= distance; break;
    case 'right': state.player.x += distance; break;
    case 'up':    state.player.y -= distance; break;
    case 'down':  state.player.y += distance; break;
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
    left:  { x: cx - MATH_FACT_OFFSET, y: cy },
    right: { x: cx + MATH_FACT_OFFSET, y: cy },
    up:    { x: cx, y: cy - MATH_FACT_OFFSET },
    down:  { x: cx, y: cy + MATH_FACT_OFFSET },
  };

  ctx.font = MATH_FACT_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [direction, pos] of Object.entries(positions)) {
    const text = state.mathFacts[direction].text;
    const metrics = ctx.measureText(text);
    const bgWidth = metrics.width + MATH_FACT_PADDING_X * 2;
    const bgHeight = 24 + MATH_FACT_PADDING_Y * 2;

    const drawX = pos.x;
    const drawY = pos.y;

    // Background pill
    ctx.fillStyle = MATH_FACT_BG_COLOR;
    drawRoundedRect(drawX - bgWidth / 2, drawY - bgHeight / 2, bgWidth, bgHeight, 6);

    // Text
    ctx.fillStyle = MATH_FACT_COLOR;
    ctx.fillText(text, drawX, drawY);
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

function drawEnemy(enemy) {
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

function drawGameOver() {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // GAME OVER
  ctx.font = 'bold 48px Courier New';
  ctx.fillStyle = '#e94560';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  // Survival time
  const minutes = Math.floor(state.timer / 60);
  const seconds = Math.floor(state.timer % 60);
  ctx.font = 'bold 24px Courier New';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    'You survived: ' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'),
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 10
  );

  // Restart instruction
  ctx.font = '18px Courier New';
  ctx.fillStyle = '#cccccc';
  ctx.fillText('Press ENTER to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
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

function drawGrid() {
  const cam = getCameraOffset();
  const gridSize = 80;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  const startX = -(cam.x % gridSize);
  const startY = -(cam.y % gridSize);

  for (let x = startX; x <= CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = startY; y <= CANVAS_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

function render() {
  const cam = getCameraOffset();

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background grid (screen space, but offset by camera)
  drawGrid();

  // --- World space (camera transform) ---
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // Enemies (behind player)
  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  // Player
  drawPlayer();

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

function setupInput() {
  input.focus();

  document.addEventListener('click', function () {
    if (!state.gameOver) {
      input.focus();
    }
  });

  input.addEventListener('input', function () {
    if (state.gameOver) return;

    const value = input.value.trim();
    if (value === '') return;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    for (const direction of ['left', 'right', 'up', 'down']) {
      if (numValue === state.mathFacts[direction].answer) {
        const dist = state.mathFacts[direction].hard ? PLAYER_MOVE_DISTANCE_HARD : PLAYER_MOVE_DISTANCE;
        movePlayer(direction, dist);
        generateAllFacts();
        input.value = '';
        return;
      }
    }
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && state.gameOver) {
      resetGame();
    }
  });
}

// --- Game Reset ---

function resetGame() {
  state = createInitialState();
  generateAllFacts();
  input.value = '';
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

    // Collisions
    checkCollisions();

    // Damage flash countdown
    state.damageFlashTimer = Math.max(0, state.damageFlashTimer - deltaTime);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// --- Init ---

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  input = document.getElementById('answer-input');

  resetGame();
  setupInput();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
