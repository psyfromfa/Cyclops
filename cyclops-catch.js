const canvas = document.getElementById("catch-canvas");
const ctx = canvas.getContext("2d");
const shell = document.querySelector(".catch-shell");
const els = {
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  best: document.getElementById("best"),
  start: document.getElementById("start-screen"),
  pause: document.getElementById("pause-screen"),
  gameover: document.getElementById("gameover-screen"),
  gameoverTitle: document.getElementById("gameover-title"),
  gameoverCopy: document.getElementById("gameover-copy"),
  callout: document.getElementById("callout"),
  startBtn: document.getElementById("start-btn"),
  resumeBtn: document.getElementById("resume-btn"),
  retryBtn: document.getElementById("retry-btn"),
  scoreForm: document.getElementById("score-form"),
  scoreName: document.getElementById("score-name"),
  scoreSave: document.getElementById("score-save"),
  scoreMessage: document.getElementById("score-message"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardStatus: document.getElementById("leaderboard-status"),
  visorButton: document.getElementById("visor-button"),
  visorFill: document.getElementById("visor-fill"),
  visorValue: document.getElementById("visor-value"),
  musicToggle: document.getElementById("music-toggle"),
  musicVolume: document.getElementById("music-volume"),
  sfxVolume: document.getElementById("sfx-volume")
};

let W = 540;
let H = 960;
const PLAYER = { baseW: 767, baseH: 904 };
const VISOR_MAX = 100;
const storageKey = "cyclops-catch-best";
const leaderboardStorageKey = "cyclops-catch-scores-v1";
const playerNameStorageKey = "cyclops-catch-player-name";
const audioStorageKey = "cyclops-catch-audio-v1";
const SUPABASE_URL = "https://sthoqhnvmhzupnpjgxln.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5a8Qx9enJckgasdY1EQZkg_iECAkDzB";
const LEADERBOARD_TABLE = "catch_scores";
const LEADERBOARD_LIMIT = 10;
const DEFAULT_MUSIC_VOLUME = 0.18;
const DEFAULT_SFX_VOLUME = 0.7;
const musicSrc = "../A_Single_Lens.mp3";
const assets = {
  bg: "../assets/cyclops-catch/flowery-field-backdrop-v2.png",
  player: "../assets/cyclops-catch/grab-catcher.png",
  bomb: "../assets/cyclops-catch/bomb.svg",
  catches: [
    { src: "../assets/cyclops-solitaire/suits/polished/suit-visor-polished.png", label: "Visor", points: 20 },
    { src: "../assets/cyclops-solitaire/suits/polished/suit-hat-polished.png", label: "Cap", points: 25 },
    { src: "../assets/cyclops-solitaire/suits/polished/suit-paw-polished.png", label: "Paw", points: 30 },
    { src: "../assets/cyclops-solitaire/suits/polished/suit-abstract-official-green-flat.png", label: "Abstract", points: 35 }
  ]
};

const images = {};
const audioSettings = readAudioSettings();
let audioContext = null;
let music = null;
let raf = 0;
let lastTime = 0;
let pointerActive = false;
let previousMode = "ready";
let scoreSavedForRun = false;

const state = {
  mode: "loading",
  score: 0,
  best: readBest(),
  lives: 3,
  combo: 0,
  elapsed: 0,
  spawnTimer: 0,
  playerX: 270,
  targetX: 270,
  drops: [],
  particles: [],
  shake: 0,
  visor: 0,
  blastFlash: 0,
  messageTimer: 0
};

function readBest() {
  const value = Number(localStorage.getItem(storageKey));
  return Number.isFinite(value) ? value : 0;
}

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(storageKey, String(state.best));
  }
}

function readAudioSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(audioStorageKey) || "{}");
    return {
      musicOn: data.musicOn ?? true,
      musicVolume: clampVolume(data.musicVolume, DEFAULT_MUSIC_VOLUME),
      sfxVolume: clampVolume(data.sfxVolume, DEFAULT_SFX_VOLUME)
    };
  } catch {
    return {
      musicOn: true,
      musicVolume: DEFAULT_MUSIC_VOLUME,
      sfxVolume: DEFAULT_SFX_VOLUME
    };
  }
}

function saveAudioSettings() {
  localStorage.setItem(audioStorageKey, JSON.stringify(audioSettings));
}

function clampVolume(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, 0, 1);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

async function boot() {
  const loaded = await Promise.all([
    loadImage(assets.bg),
    loadImage(assets.player),
    loadImage(assets.bomb),
    ...assets.catches.map((item) => loadImage(item.src))
  ]);

  images.bg = loaded[0];
  images.player = loaded[1];
  images.bomb = loaded[2];
  assets.catches.forEach((item, index) => {
    item.image = loaded[index + 3];
  });

  state.mode = "ready";
  resizeCanvas();
  updateHud();
  updateVisorHud();
  setupAudioControls();
  draw();
  startLoop();
}

function startGame() {
  unlockAudio();
  playMusic();
  state.mode = "playing";
  state.score = 0;
  state.lives = 3;
  state.combo = 0;
  state.elapsed = 0;
  state.spawnTimer = 0.18;
  state.drops.length = 0;
  state.particles.length = 0;
  state.playerX = W / 2;
  state.targetX = W / 2;
  state.shake = 0;
  state.visor = 0;
  state.blastFlash = 0;
  state.messageTimer = 1.8;
  scoreSavedForRun = false;
  showCallout("Catch the good stuff. Dodge bombs.", 1.8);
  els.start.hidden = true;
  els.pause.hidden = true;
  els.gameover.hidden = true;
  updateHud();
  updateVisorHud();
  playTone(523, 0.08, "square", 0.05);
  playTone(784, 0.12, "square", 0.04, 0.08);
}

function setPaused(paused) {
  if (paused) {
    pauseMusic();
    updateVisorHud();
    if (state.mode === "playing") {
      previousMode = "playing";
      state.mode = "paused";
      els.pause.hidden = false;
      hideCallout();
      updateVisorHud();
    }
  } else if (!paused && state.mode === "paused") {
    state.mode = previousMode === "playing" ? "playing" : "ready";
    els.pause.hidden = true;
    if (state.mode === "playing") playMusic();
    showCallout("Back at it.", 0.9);
    updateVisorHud();
  }
}

function endGame() {
  state.mode = "gameover";
  const newBest = state.score > state.best;
  saveBest();
  updateHud();
  els.gameoverTitle.textContent = newBest ? "New best!" : "Try again?";
  els.gameoverCopy.textContent = `Final score: ${state.score}`;
  prepareScoreForm();
  els.gameover.hidden = false;
  renderLeaderboard();
  hideCallout();
  updateVisorHud();
  playTone(220, 0.16, "sawtooth", 0.07);
  playTone(146, 0.24, "sawtooth", 0.05, 0.12);
}

function startLoop() {
  if (!raf) {
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }
}

function loop(now) {
  raf = 0;
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  if (state.mode === "playing") update(dt);
  draw();
  startLoop();
}

function update(dt) {
  state.elapsed += dt;
  const player = getPlayerBox();
  state.playerX += (state.targetX - state.playerX) * Math.min(1, 14 * dt);
  state.playerX = clamp(state.playerX, player.w * 0.42, W - player.w * 0.42);
  state.spawnTimer -= dt;
  state.shake = Math.max(0, state.shake - dt * 20);
  state.blastFlash = Math.max(0, state.blastFlash - dt * 2.8);

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) hideCallout();
  }

  if (state.spawnTimer <= 0) {
    spawnWave();
    const difficulty = getDifficulty();
    state.spawnTimer = Math.max(0.14, 0.52 - difficulty * 0.34) * rand(0.66, 0.96);
  }

  const catchBox = {
    x: state.playerX - player.w * 0.56,
    y: player.y + player.h * 0.03,
    w: player.w * 1.12,
    h: player.h * 0.38
  };
  const hurtBox = {
    x: state.playerX - player.w * 0.36,
    y: player.y + player.h * 0.04,
    w: player.w * 0.72,
    h: player.h * 0.46
  };

  for (let i = state.drops.length - 1; i >= 0; i -= 1) {
    const drop = state.drops[i];
    drop.y += drop.vy * dt;
    drop.x += drop.drift * dt;
    drop.rotation += drop.spin * dt;
    keepDropInBounds(drop);

    const box = {
      x: drop.x - drop.size / 2,
      y: drop.y - drop.size / 2,
      w: drop.size,
      h: drop.size
    };

    const bombBox = {
      x: drop.x - drop.size * 0.28,
      y: drop.y - drop.size * 0.28,
      w: drop.size * 0.56,
      h: drop.size * 0.56
    };

    if (drop.kind === "bomb" && overlaps(bombBox, hurtBox)) {
      state.drops.splice(i, 1);
      hitBomb(drop.x, drop.y);
      continue;
    }

    if (drop.kind === "catch" && overlaps(box, catchBox)) {
      state.drops.splice(i, 1);
      catchItem(drop);
      continue;
    }

    if (drop.y > H + drop.size) {
      state.drops.splice(i, 1);
      if (drop.kind === "catch") state.combo = 0;
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 190 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function spawnDrop() {
  const difficulty = getDifficulty();
  const bombChance = Math.min(0.34, 0.08 + difficulty * 0.24);
  const isBomb = state.elapsed > 1.5 && Math.random() < bombChance;
  const scale = clamp(W / 540, 0.72, 1.08);
  const size = (isBomb ? rand(46, 62) : rand(42, 58)) * scale;
  const item = isBomb ? null : choice(assets.catches);
  state.drops.push({
    kind: isBomb ? "bomb" : "catch",
    image: isBomb ? images.bomb : item.image,
    label: isBomb ? "Bomb" : item.label,
    points: isBomb ? 0 : item.points,
    x: rand(size * 0.6, W - size * 0.6),
    y: -size,
    size,
    vy: rand(H * 0.24, H * 0.36) + difficulty * H * 0.28 + state.elapsed * 2.3,
    drift: rand(-42, 42) * scale * (1 + difficulty * 0.45),
    rotation: rand(-0.4, 0.4),
    spin: rand(-1.6, 1.6)
  });
}

function keepDropInBounds(drop) {
  const margin = drop.size * 0.58;
  if (drop.x < margin) {
    drop.x = margin;
    drop.drift = Math.abs(drop.drift) * 0.72;
  } else if (drop.x > W - margin) {
    drop.x = W - margin;
    drop.drift = -Math.abs(drop.drift) * 0.72;
  }
}

function spawnWave() {
  const difficulty = getDifficulty();
  const count = 1
    + (Math.random() < 0.18 + difficulty * 0.82 ? 1 : 0)
    + (state.elapsed > 14 && Math.random() < 0.16 + difficulty * 0.5 ? 1 : 0)
    + (state.elapsed > 38 && Math.random() < difficulty * 0.34 ? 1 : 0);

  for (let i = 0; i < count; i += 1) {
    spawnDrop();
  }
}

function getDifficulty() {
  return clamp(state.elapsed / 55, 0, 1);
}

function catchItem(drop) {
  state.combo += 1;
  const bonus = Math.min(60, (state.combo - 1) * 5);
  state.score += drop.points + bonus;
  chargeVisor(5);
  showCallout(bonus > 0 ? `${drop.label}! Combo +${bonus}` : `${drop.label}!`, 1.15);
  burst(drop.x, drop.y, "#ffd447", 9);
  updateHud();
  playTone(620 + state.combo * 18, 0.05, "square", 0.035);
}

function chargeVisor(amount) {
  const wasReady = state.visor >= VISOR_MAX;
  state.visor = clamp(state.visor + amount, 0, VISOR_MAX);
  updateVisorHud();
  if (!wasReady && state.visor >= VISOR_MAX) {
    showCallout("Visor blast ready!", 1.2);
    playTone(880, 0.07, "square", 0.04);
    playTone(1320, 0.09, "square", 0.035, 0.06);
  }
}

function activateVisorBlast() {
  if (state.mode !== "playing" || state.visor < VISOR_MAX) return;

  let captured = 0;
  let destroyed = 0;
  const drops = state.drops.splice(0);

  drops.forEach((drop) => {
    if (drop.kind === "catch") {
      captured += 1;
      state.score += drop.points;
      burst(drop.x, drop.y, "#ffd447", 14);
    } else {
      destroyed += 1;
      burst(drop.x, drop.y, "#ff3322", 16);
    }
  });

  state.combo += captured;
  state.visor = 0;
  state.blastFlash = 1;
  updateHud();
  updateVisorHud();
  showCallout(`Visor blast! ${captured} caught, ${destroyed} bombs cleared.`, 1.5);
  playTone(220, 0.06, "square", 0.08);
  playTone(440, 0.08, "square", 0.07, 0.05);
  playTone(880, 0.14, "square", 0.055, 0.13);
}

function hitBomb(x, y) {
  state.lives -= 1;
  state.combo = 0;
  state.shake = state.lives > 0 ? 1 : 0;
  showCallout(state.lives > 0 ? "Bomb! Watch it." : "Boom. Run over.", 1.4);
  burst(x, y, "#ff3322", 18);
  updateHud();
  playTone(88, 0.16, "sawtooth", 0.08);
  if (state.lives <= 0) endGame();
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-140, 140),
      vy: rand(-220, -60),
      size: rand(3, 8),
      color,
      life: rand(0.25, 0.6)
    });
  }
}

function draw() {
  resizeCanvas();
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (state.shake > 0) {
    ctx.translate(rand(-6, 6) * state.shake, rand(-5, 5) * state.shake);
  }
  drawCover(images.bg, 0, 0, W, H);
  state.drops.forEach(drawDrop);
  drawPlayer();
  drawParticles();
  drawBlastFlash();
  ctx.restore();
}

function drawWorldDecor() {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#1b0806";
  ctx.fillRect(0, H - 32, W, 32);
  ctx.restore();
}

function drawDrop(drop) {
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.rotation);
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 7;
  ctx.drawImage(drop.image, -drop.size / 2, -drop.size / 2, drop.size, drop.size);
  ctx.restore();
}

function drawPlayer() {
  const bob = state.mode === "playing" ? Math.sin(state.elapsed * 8) * 2 : 0;
  const player = getPlayerBox();
  ctx.save();
  ctx.translate(state.playerX, player.y + bob);
  ctx.drawImage(images.player, -player.w / 2, 0, player.w, player.h);
  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  });
}

function drawBlastFlash() {
  if (state.blastFlash <= 0) return;
  const player = getPlayerBox();
  const baseX = state.playerX;
  const baseY = player.y + player.h * 0.28;
  const beamHeight = Math.max(40, baseY + 40);
  const outerWidth = W * (0.12 + state.blastFlash * 0.09);
  const innerWidth = outerWidth * 0.34;
  const glow = outerWidth * 1.85;
  const alpha = Math.min(1, state.blastFlash);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * 0.26;
  const glowGradient = ctx.createLinearGradient(baseX, baseY, baseX, 0);
  glowGradient.addColorStop(0, "#ff2438");
  glowGradient.addColorStop(0.48, "#ffd447");
  glowGradient.addColorStop(1, "rgba(255, 244, 220, 0)");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.moveTo(baseX - glow * 0.18, baseY + 10);
  ctx.lineTo(baseX - glow, 0);
  ctx.lineTo(baseX + glow, 0);
  ctx.lineTo(baseX + glow * 0.18, baseY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha * 0.78;
  const beamGradient = ctx.createLinearGradient(baseX, baseY, baseX, 0);
  beamGradient.addColorStop(0, "#ff2030");
  beamGradient.addColorStop(0.38, "#ff5a3a");
  beamGradient.addColorStop(0.72, "#ffd447");
  beamGradient.addColorStop(1, "#fff4dc");
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.moveTo(baseX - outerWidth * 0.18, baseY + 4);
  ctx.lineTo(baseX - outerWidth, baseY - beamHeight);
  ctx.lineTo(baseX + outerWidth, baseY - beamHeight);
  ctx.lineTo(baseX + outerWidth * 0.18, baseY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fff4dc";
  ctx.beginPath();
  ctx.moveTo(baseX - innerWidth * 0.2, baseY + 2);
  ctx.lineTo(baseX - innerWidth, 0);
  ctx.lineTo(baseX + innerWidth, 0);
  ctx.lineTo(baseX + innerWidth * 0.2, baseY + 2);
  ctx.closePath();
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = "#1b0806";
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.beginPath();
  ctx.moveTo(baseX - outerWidth * 0.24, baseY + 6);
  ctx.lineTo(baseX - outerWidth * 1.02, 0);
  ctx.moveTo(baseX + outerWidth * 0.24, baseY + 6);
  ctx.lineTo(baseX + outerWidth * 1.02, 0);
  ctx.stroke();
  ctx.restore();
}

function drawCover(img, x, y, w, h) {
  if (!img || !img.width || !img.height) {
    ctx.fillStyle = "#42c8ff";
    ctx.fillRect(x, y, w, h);
    return;
  }
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function updateHud() {
  els.score.textContent = state.score;
  els.lives.textContent = state.lives;
  if (els.best) els.best.textContent = Math.max(state.best, state.score);
}

function updateVisorHud() {
  const pct = Math.round((state.visor / VISOR_MAX) * 100);
  els.visorFill.style.width = `${pct}%`;
  els.visorValue.textContent = `${pct}%`;
  const ready = state.visor >= VISOR_MAX && state.mode === "playing";
  els.visorButton.disabled = !ready;
  els.visorButton.classList.toggle("ready", ready);
  els.visorButton.setAttribute("aria-label", ready ? "Use visor blast, or press Space" : `Visor blast ${pct}% charged`);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const nextW = Math.max(320, Math.round(rect.width));
  const nextH = Math.max(320, Math.round(rect.height));
  if (canvas.width === nextW && canvas.height === nextH) return;

  const ratio = nextW / W;
  canvas.width = nextW;
  canvas.height = nextH;
  W = nextW;
  H = nextH;
  state.playerX = clamp(state.playerX * ratio, 0, W);
  state.targetX = clamp(state.targetX * ratio, 0, W);
}

function getPlayerBox() {
  const width = clamp(W * 0.32, 132, 190);
  const height = width * (PLAYER.baseH / PLAYER.baseW);
  return {
    w: width,
    h: height,
    y: H - height - Math.max(12, H * 0.018)
  };
}

function showCallout(text, duration = 1.2) {
  els.callout.textContent = text;
  els.callout.classList.add("show");
  state.messageTimer = duration;
}

function hideCallout() {
  els.callout.classList.remove("show");
}

function prepareScoreForm() {
  const savedName = window.localStorage.getItem(playerNameStorageKey) || "";
  els.scoreName.value = sanitizeInitials(savedName);
  els.scoreSave.disabled = false;
  els.scoreMessage.textContent = "Save your run for the ranks.";
}

function sanitizeInitials(name) {
  return (name || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase() || "CAT";
}

function getLocalScores() {
  try {
    const scores = JSON.parse(window.localStorage.getItem(leaderboardStorageKey) || "[]");
    return Array.isArray(scores) ? scores : [];
  } catch {
    return [];
  }
}

function setLocalScores(scores) {
  window.localStorage.setItem(leaderboardStorageKey, JSON.stringify(scores));
}

function compareScores(a, b) {
  return Number(b.score) - Number(a.score) || new Date(a.date || 0) - new Date(b.date || 0);
}

function saveLocalScore(score) {
  const scores = getLocalScores();
  scores.push(score);
  scores.sort(compareScores);
  setLocalScores(scores.slice(0, LEADERBOARD_LIMIT));
}

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    ...extraHeaders
  };
}

async function fetchLiveScores() {
  const params = new URLSearchParams({
    select: "initials,score,created_at",
    order: "score.desc,created_at.asc",
    limit: String(LEADERBOARD_LIMIT)
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${LEADERBOARD_TABLE}?${params}`, {
    headers: getSupabaseHeaders()
  });

  if (!response.ok) throw new Error(await response.text());

  const rows = await response.json();
  return rows.map((row) => ({
    initials: sanitizeInitials(row.initials),
    score: Number(row.score) || 0,
    date: row.created_at
  }));
}

async function submitLiveScore(score) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${LEADERBOARD_TABLE}`, {
    method: "POST",
    headers: getSupabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({
      initials: score.initials,
      score: score.score
    })
  });

  if (!response.ok) throw new Error(await response.text());
}

function populateLeaderboard(scores) {
  els.leaderboardList.innerHTML = "";
  if (!scores.length) {
    const item = document.createElement("li");
    item.textContent = "no runs yet";
    els.leaderboardList.append(item);
    return;
  }

  scores.slice(0, LEADERBOARD_LIMIT).forEach((score) => {
    const item = document.createElement("li");
    item.textContent = `${sanitizeInitials(score.initials)} - ${Number(score.score) || 0}`;
    els.leaderboardList.append(item);
  });
}

async function renderLeaderboard() {
  els.leaderboardStatus.textContent = "loading...";
  populateLeaderboard(getLocalScores().sort(compareScores));

  try {
    const liveScores = await fetchLiveScores();
    populateLeaderboard(liveScores);
    els.leaderboardStatus.textContent = "live ranks";
  } catch (error) {
    console.warn("Catch leaderboard load failed", error);
    els.leaderboardStatus.textContent = "local ranks";
  }
}

async function saveScore(event) {
  event.preventDefault();
  if (state.mode !== "gameover" || scoreSavedForRun) return;

  const initials = sanitizeInitials(els.scoreName.value);
  const score = {
    initials,
    score: state.score,
    date: new Date().toISOString()
  };

  scoreSavedForRun = true;
  els.scoreName.value = initials;
  window.localStorage.setItem(playerNameStorageKey, initials);
  saveLocalScore(score);
  populateLeaderboard(getLocalScores().sort(compareScores));
  els.scoreSave.disabled = true;
  els.scoreMessage.textContent = "saving score...";

  try {
    await submitLiveScore(score);
    els.scoreMessage.textContent = `saved ${initials}`;
    await renderLeaderboard();
  } catch (error) {
    console.warn("Catch leaderboard save failed", error);
    els.scoreMessage.textContent = "saved locally - live table not ready";
    els.leaderboardStatus.textContent = "local ranks";
  }
}

function pointerToGameX(event) {
  const rect = canvas.getBoundingClientRect();
  return (event.clientX - rect.left) * (W / rect.width);
}

function movePlayer(event) {
  const player = getPlayerBox();
  state.targetX = clamp(pointerToGameX(event), player.w * 0.42, W - player.w * 0.42);
}

function setupAudioControls() {
  els.musicVolume.value = Math.round(audioSettings.musicVolume * 100);
  els.sfxVolume.value = Math.round(audioSettings.sfxVolume * 100);
  updateAudioControls();
}

function updateAudioControls() {
  els.musicToggle.setAttribute("aria-pressed", String(audioSettings.musicOn && (!music || !music.paused)));
  els.musicToggle.setAttribute("aria-label", audioSettings.musicOn ? "Pause music" : "Play music");
  if (music) music.volume = audioSettings.musicVolume;
}

function toggleMusic() {
  unlockAudio();
  if (audioSettings.musicOn && music && !music.paused) {
    audioSettings.musicOn = false;
    pauseMusic();
  } else {
    audioSettings.musicOn = true;
    playMusic();
  }
  saveAudioSettings();
  updateAudioControls();
}

function getMusic() {
  if (!music) {
    music = new Audio(musicSrc);
    music.loop = true;
    music.preload = "auto";
    music.volume = audioSettings.musicVolume;
  }
  return music;
}

function playMusic() {
  if (!audioSettings.musicOn) {
    pauseMusic();
    return;
  }
  const track = getMusic();
  track.volume = audioSettings.musicVolume;
  track.play().catch(() => {});
  updateAudioControls();
}

function pauseMusic() {
  if (music) music.pause();
  updateAudioControls();
}

function unlockAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioContext = new AudioCtor();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
}

function playTone(freq, duration, type = "square", volume = 0.04, delay = 0) {
  if (!audioContext || audioSettings.sfxVolume <= 0) return;
  const start = audioContext.currentTime + delay;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const peakVolume = Math.max(0.0001, volume * audioSettings.sfxVolume);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakVolume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function isUiTarget(event) {
  return Boolean(event.target?.closest?.("button, input, label, .screen-panel, .hud, .hud-audio"));
}

function onPointerDown(event) {
  if (isUiTarget(event)) return;
  pointerActive = true;
  shell?.setPointerCapture?.(event.pointerId);
  unlockAudio();
  movePlayer(event);
}

function onPointerMove(event) {
  if (isUiTarget(event)) return;
  if (pointerActive || state.mode === "playing") movePlayer(event);
}

function onPointerUp() {
  pointerActive = false;
}

shell.addEventListener("pointerdown", onPointerDown);
shell.addEventListener("pointermove", onPointerMove);
shell.addEventListener("pointerup", onPointerUp);
shell.addEventListener("pointercancel", onPointerUp);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);

els.startBtn.addEventListener("click", startGame);
els.retryBtn.addEventListener("click", startGame);
els.scoreForm.addEventListener("submit", saveScore);
els.resumeBtn.addEventListener("click", () => setPaused(false));
els.visorButton.addEventListener("click", activateVisorBlast);
els.musicToggle.addEventListener("click", toggleMusic);
els.musicVolume.addEventListener("input", () => {
  audioSettings.musicVolume = clampVolume(Number(els.musicVolume.value) / 100, audioSettings.musicVolume);
  saveAudioSettings();
  updateAudioControls();
});
els.sfxVolume.addEventListener("input", () => {
  audioSettings.sfxVolume = clampVolume(Number(els.sfxVolume.value) / 100, audioSettings.sfxVolume);
  saveAudioSettings();
});

document.addEventListener("keydown", (event) => {
  if (event.target?.matches?.("input, textarea")) return;
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    if (event.code === "Space" && state.mode === "playing") activateVisorBlast();
    else if (state.mode === "ready" || state.mode === "gameover") startGame();
    else if (state.mode === "paused") setPaused(false);
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") state.targetX -= 48;
  if (event.code === "ArrowRight" || event.code === "KeyD") state.targetX += 48;
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPaused(true);
});

window.addEventListener("message", (event) => {
  if (event.data?.source !== "cyclops-site") return;
  if (event.data.action === "pause") setPaused(true);
  if (event.data.action === "resume" && state.mode === "paused") setPaused(false);
});

window.CyclopsCatchGame = {
  pause: () => setPaused(true),
  resume: () => {
    if (state.mode === "paused") setPaused(false);
  }
};

boot();
