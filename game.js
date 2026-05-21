const ASSETS = {
  back: "../assets/cyclops-solitaire/card-backs/card-back-cyclops-gold-rim.png",
  mascot: "../assets/cyclops-solitaire/mascot/cyclops-idle.png",
  suits: {
    visor: "../assets/cyclops-solitaire/suits/polished/suit-visor-polished.png",
    hat: "../assets/cyclops-solitaire/suits/polished/suit-hat-polished.png",
    paw: "../assets/cyclops-solitaire/suits/polished/suit-paw-polished.png",
    abstract: "../assets/cyclops-solitaire/suits/polished/suit-abstract-official-green-flat.png"
  }
};

const SUITS = [
  { id: "visor", label: "Visors", color: "red" },
  { id: "hat", label: "Hats", color: "black" },
  { id: "paw", label: "Paws", color: "red" },
  { id: "abstract", label: "Abstracts", color: "black" }
];

const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SCORE_KEY = "cyclops-solitaire-scores-v1";
const SUPABASE_URL = "https://sthoqhnvmhzupnpjgxln.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5a8Qx9enJckgasdY1EQZkg_iECAkDzB";
const LEADERBOARD_TABLE = "leaderboard_scores";
const LEADERBOARD_LIMIT = 20;
const AUDIO_KEY = "cyclops-solitaire-audio-v2";
const DEFAULT_MUSIC_VOLUME = 0.25;
const DEFAULT_SFX_VOLUME = 0.75;
const SFX_GAIN = 1.9;
const VOICE_LINES = {
  startShowdown: ["GLHF", "should be easy", "good luck, gamer"],
  startWarmup: ["nice, ez game", "GLHF"],
  draw: ["you got this", "I'm literally Dith's cat", "one eye, one vision", "GLHF"],
  recycle: ["let's reset it", "one eye, one vision"],
  flip: ["nice!", "ez", "one eye, one vision"],
  tableau: ["good move", "you got this", "I'm literally Dith's cat", "one eye, one vision"],
  foundation: ["nice one, gamer!", "one eye, one vision"],
  foundationComplete: ["so close to victory!", "GGEZ"],
  win: ["GGEZ", "one eye, one vision"],
  noMoves: ["board looks cooked, bro"],
  undo: ["oopsie"]
};
const SPARSE_VOICE_FREQUENCY_BY_ACTION = {
  draw: 3,
  recycle: 3,
  flip: 3,
  tableau: 3
};
const lastVoiceLineByAction = {};
const voiceLineAttemptsByAction = {};

const els = {
  board: document.querySelector("#board"),
  stock: document.querySelector("#stock"),
  waste: document.querySelector("#waste"),
  foundations: document.querySelector("#foundations"),
  tableau: document.querySelector("#tableau"),
  moves: document.querySelector("#moves"),
  timer: document.querySelector("#timer"),
  status: document.querySelector("#status"),
  bubble: document.querySelector("#cat-bubble"),
  newGame: document.querySelector("#new-game"),
  help: document.querySelector("#how-to-play"),
  leaderboardOpen: document.querySelector("#leaderboard-open"),
  undo: document.querySelector("#undo-move"),
  modeModal: document.querySelector("#mode-modal"),
  modeCancel: document.querySelector("#mode-cancel"),
  howToModal: document.querySelector("#how-to-modal"),
  howToClose: document.querySelector("#how-to-close"),
  leaderboardModal: document.querySelector("#leaderboard-modal"),
  leaderboardClose: document.querySelector("#leaderboard-close"),
  leaderboardEasy: document.querySelector("#leaderboard-easy"),
  leaderboardHard: document.querySelector("#leaderboard-hard"),
  leaderboardStatus: document.querySelector("#leaderboard-status"),
  winModal: document.querySelector("#win-modal"),
  winSummary: document.querySelector("#win-summary"),
  winLeaderboard: document.querySelector("#win-leaderboard"),
  playAgain: document.querySelector("#play-again"),
  scoreForm: document.querySelector("#score-form"),
  scoreName: document.querySelector("#score-name"),
  scoreSave: document.querySelector("#score-save"),
  scoreMessage: document.querySelector("#score-message"),
  noMoveModal: document.querySelector("#no-move-modal"),
  noMoveNew: document.querySelector("#no-move-new"),
  noMoveKeep: document.querySelector("#no-move-keep"),
  music: document.querySelector("#background-music"),
  musicToggle: document.querySelector("#music-toggle"),
  musicVolume: document.querySelector("#music-volume"),
  sfxVolume: document.querySelector("#sfx-volume")
};

const state = {
  mode: "hard",
  stock: [],
  waste: [],
  foundations: {},
  tableau: [],
  moves: 0,
  elapsed: 0,
  started: false,
  selected: null,
  undo: [],
  timerId: null,
  gameOver: false,
  musicOn: true,
  musicPlaying: false,
  musicVolume: DEFAULT_MUSIC_VOLUME,
  sfxVolume: DEFAULT_SFX_VOLUME,
  musicRequestId: 0,
  audioContext: null,
  wasteDrawGroup: 0,
  lastTap: { id: "", time: 0 },
  bubbleTimer: null
};

function cloneCard(card) {
  return { ...card };
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({
        id: `${suit.id}-${rank}`,
        suit: suit.id,
        suitLabel: suit.label,
        rank,
        color: suit.color,
        faceUp: false
      });
    }
  }
  return shuffle(deck);
}

function shuffle(deck) {
  const copy = deck.map(cloneCard);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resetGame(mode = state.mode) {
  stopTimer();
  Object.assign(state, {
    mode,
    stock: [],
    waste: [],
    foundations: Object.fromEntries(SUITS.map((suit) => [suit.id, []])),
    tableau: Array.from({ length: 7 }, () => []),
    moves: 0,
    elapsed: 0,
    started: false,
    selected: null,
    undo: [],
    gameOver: false,
    wasteDrawGroup: 0,
    lastTap: { id: "", time: 0 }
  });

  const deck = createDeck();
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row <= col; row += 1) {
      const card = deck.pop();
      card.faceUp = row === col;
      state.tableau[col].push(card);
    }
  }

  state.stock = deck;
  hideModal(els.winModal);
  hideModal(els.noMoveModal);
  hideModal(els.modeModal);
  resetSparseVoiceCounters();
  setStatus(mode === "hard" ? "showdown mode: draw three" : "warmup mode: draw one");
  speakLine(mode === "hard" ? "startShowdown" : "startWarmup");
  render();
}

function snapshot() {
  return JSON.stringify({
    mode: state.mode,
    stock: state.stock,
    waste: state.waste,
    foundations: state.foundations,
    tableau: state.tableau,
    moves: state.moves,
    elapsed: state.elapsed,
    started: state.started,
    gameOver: state.gameOver,
    wasteDrawGroup: state.wasteDrawGroup
  });
}

function restore(serialized) {
  const data = JSON.parse(serialized);
  stopTimer();
  state.mode = data.mode;
  state.stock = data.stock;
  state.waste = data.waste;
  state.foundations = data.foundations;
  state.tableau = data.tableau;
  state.moves = data.moves;
  state.elapsed = data.elapsed;
  state.started = data.started;
  state.gameOver = data.gameOver;
  state.wasteDrawGroup = data.wasteDrawGroup ?? getHighestWasteDrawGroup();
  state.selected = null;
  if (state.started && !state.gameOver) {
    startTimer();
  }
  setStatus(state.mode === "hard" ? "showdown mode: draw three" : "warmup mode: draw one");
  render();
}

function pushUndo() {
  state.undo.push(snapshot());
  if (state.undo.length > 80) {
    state.undo.shift();
  }
}

function startTimer() {
  if (state.started && state.timerId) return;
  state.started = true;
  state.timerId = window.setInterval(() => {
    state.elapsed += 1;
    els.timer.textContent = formatTime(state.elapsed);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function drawFromStock() {
  if (state.gameOver) return;
  unlockAudio();
  pushUndo();
  startTimer();
  state.selected = null;

  if (state.stock.length) {
    const drawCount = state.mode === "hard" ? 3 : 1;
    const wasteDrawGroup = state.wasteDrawGroup + 1;
    for (let i = 0; i < drawCount && state.stock.length; i += 1) {
      const card = state.stock.pop();
      card.faceUp = true;
      card.wasteDrawGroup = wasteDrawGroup;
      state.waste.push(card);
    }
    state.wasteDrawGroup = wasteDrawGroup;
    state.moves += 1;
    setStatus(`${state.mode === "hard" ? "three" : "one"} card pull`);
    speakLine("draw");
    playSfx("riffle");
  } else if (state.waste.length) {
    state.stock = state.waste.reverse().map((card) => {
      const cleanCard = { ...card, faceUp: false };
      delete cleanCard.wasteDrawGroup;
      return cleanCard;
    });
    state.waste = [];
    state.moves += 1;
    setStatus("deck recycled");
    speakLine("recycle");
    playSfx("recycle");
  } else {
    state.undo.pop();
  }

  render();
  maybeShowNoMove();
}

function flipTableauTop(colIndex) {
  const pile = state.tableau[colIndex];
  const top = pile[pile.length - 1];
  if (!top || top.faceUp || state.gameOver) return;
  pushUndo();
  startTimer();
  top.faceUp = true;
  state.moves += 1;
  state.selected = null;
  setStatus("card revealed");
  speakLine("flip");
  playSfx("flip");
  render();
}

function selectCards(selection) {
  const cards = getCards(selection);
  if (!cards.length || cards.some((card) => !card.faceUp)) return;
  state.selected = selection;
  render();
}

function clearSelection() {
  state.selected = null;
  render();
}

function getCards(selection) {
  if (!selection) return [];
  if (selection.source === "waste") {
    if (selection.cardIndex !== undefined && selection.cardIndex !== state.waste.length - 1) {
      return [];
    }
    const top = state.waste[state.waste.length - 1];
    return top ? [top] : [];
  }
  if (selection.source === "tableau") {
    return state.tableau[selection.pileIndex].slice(selection.cardIndex);
  }
  if (selection.source === "foundation") {
    const pile = state.foundations[selection.suit];
    const top = pile[pile.length - 1];
    return top ? [top] : [];
  }
  return [];
}

function removeCards(selection) {
  if (selection.source === "waste") {
    const card = state.waste.pop();
    if (!card) return [];
    delete card.wasteDrawGroup;
    return [card];
  }
  if (selection.source === "tableau") {
    return state.tableau[selection.pileIndex].splice(selection.cardIndex);
  }
  if (selection.source === "foundation") {
    return [state.foundations[selection.suit].pop()];
  }
  return [];
}

function canMoveToTableau(cards, colIndex) {
  if (!cards.length) return false;
  const moving = cards[0];
  const dest = state.tableau[colIndex];
  const top = dest[dest.length - 1];
  if (!top) return moving.rank === 13;
  return top.faceUp && top.color !== moving.color && top.rank === moving.rank + 1;
}

function canMoveToFoundation(cards, suitId) {
  if (cards.length !== 1) return false;
  const card = cards[0];
  if (card.suit !== suitId) return false;
  const foundation = state.foundations[suitId];
  const top = foundation[foundation.length - 1];
  return top ? card.rank === top.rank + 1 : card.rank === 1;
}

function moveSelectedToTableau(colIndex) {
  const selection = state.selected;
  const cards = getCards(selection);
  if (!selection || !canMoveToTableau(cards, colIndex)) return false;
  if (selection.source === "tableau" && selection.pileIndex === colIndex) return false;

  pushUndo();
  startTimer();
  const moving = removeCards(selection);
  state.tableau[colIndex].push(...moving);
  state.moves += 1;
  state.selected = null;
  revealExposedTableauCard(selection);
  setStatus("clean move");
  speakLine("tableau");
  playSfx("play");
  render();
  checkWin();
  maybeShowNoMove();
  return true;
}

function moveSelectedToFoundation(suitId) {
  const selection = state.selected;
  const cards = getCards(selection);
  if (!selection || !canMoveToFoundation(cards, suitId)) return false;

  pushUndo();
  startTimer();
  const moving = removeCards(selection);
  state.foundations[suitId].push(...moving);
  const foundationComplete = state.foundations[suitId].length === 13;
  state.moves += 1;
  state.selected = null;
  revealExposedTableauCard(selection);
  setStatus(`${RANKS[moving[0].rank]} to ${getSuitLabel(suitId)}`);
  speakLine(foundationComplete ? "foundationComplete" : "foundation", { force: true });
  playSfx(foundationComplete ? "complete" : "foundation");
  render();
  checkWin();
  maybeShowNoMove();
  return true;
}

function revealExposedTableauCard(selection) {
  if (!selection || selection.source !== "tableau") return;
  const pile = state.tableau[selection.pileIndex];
  const top = pile[pile.length - 1];
  if (top && !top.faceUp) {
    top.faceUp = true;
  }
}

function tryAutoFoundation(selection) {
  const cards = getCards(selection);
  if (cards.length !== 1) return false;
  const card = cards[0];
  state.selected = selection;
  return moveSelectedToFoundation(card.suit);
}

function handleCardClick(event) {
  event.stopPropagation();
  unlockAudio();
  playSfx("click");
  const cardEl = event.currentTarget;
  const source = cardEl.dataset.source;
  const cardIndex = Number(cardEl.dataset.cardIndex);
  const pileIndex = Number(cardEl.dataset.pileIndex);
  const suit = cardEl.dataset.suit;

  if (source === "tableau") {
    const pile = state.tableau[pileIndex];
    const card = pile[cardIndex];
    const isTop = cardIndex === pile.length - 1;
    if (!card.faceUp) {
      if (isTop) flipTableauTop(pileIndex);
      return;
    }

    if (state.selected && moveSelectedToTableau(pileIndex)) return;

    const selection = { source, pileIndex, cardIndex };
    if (isDoubleTap(card.id) && isTop && tryAutoFoundation(selection)) return;
    selectCards(selection);
    return;
  }

  if (source === "waste") {
    const top = state.waste[state.waste.length - 1];
    if (!top) return;
    const selection = { source: "waste", cardIndex: state.waste.length - 1 };
    if (isDoubleTap(top.id) && tryAutoFoundation(selection)) return;
    selectCards(selection);
    return;
  }

  if (source === "foundation") {
    if (state.selected && moveSelectedToFoundation(suit)) return;

    const pile = state.foundations[suit];
    const top = pile[pile.length - 1];
    if (!top) return;
    selectCards({ source: "foundation", suit });
  }
}

function isDoubleTap(id) {
  const now = Date.now();
  const match = state.lastTap.id === id && now - state.lastTap.time < 360;
  state.lastTap = { id, time: now };
  return match;
}

function checkWin() {
  const complete = SUITS.every((suit) => state.foundations[suit.id].length === 13);
  if (!complete) return;
  state.gameOver = true;
  stopTimer();
  state.selected = null;
  els.winSummary.textContent = `${state.mode === "hard" ? "showdown" : "warmup"} mode - ${state.moves} moves - ${formatTime(state.elapsed)}`;
  els.scoreName.value = "";
  els.scoreMessage.textContent = "";
  showModal(els.winModal);
  speakLine("win");
  playSfx("win");
}

function hasAvailableMove() {
  if (state.stock.length || state.waste.length) return true;

  for (const pile of state.tableau) {
    const top = pile[pile.length - 1];
    if (top && !top.faceUp) return true;
  }

  const wasteTop = state.waste[state.waste.length - 1];
  if (wasteTop && hasDestination([wasteTop], null)) return true;

  for (let sourceCol = 0; sourceCol < state.tableau.length; sourceCol += 1) {
    const pile = state.tableau[sourceCol];
    for (let cardIndex = 0; cardIndex < pile.length; cardIndex += 1) {
      const card = pile[cardIndex];
      if (!card.faceUp) continue;
      const cards = pile.slice(cardIndex);
      if (cards.length === 1 && canMoveToFoundation(cards, card.suit)) return true;
      for (let destCol = 0; destCol < state.tableau.length; destCol += 1) {
        if (destCol !== sourceCol && canMoveToTableau(cards, destCol)) return true;
      }
    }
  }

  for (const suit of SUITS) {
    const top = state.foundations[suit.id][state.foundations[suit.id].length - 1];
    if (top && hasDestination([top], null)) return true;
  }

  return false;
}

function hasDestination(cards, excludedCol) {
  if (cards.length === 1 && canMoveToFoundation(cards, cards[0].suit)) return true;
  return state.tableau.some((_, colIndex) => colIndex !== excludedCol && canMoveToTableau(cards, colIndex));
}

function maybeShowNoMove() {
  if (state.gameOver || hasAvailableMove()) return;
  showModal(els.noMoveModal);
  speakLine("noMoves");
}

function render() {
  els.moves.textContent = `${state.moves} move${state.moves === 1 ? "" : "s"}`;
  els.timer.textContent = formatTime(state.elapsed);
  els.undo.disabled = state.undo.length === 0;

  renderStock();
  renderWaste();
  renderFoundations();
  renderTableau();
}

function renderStock() {
  els.stock.innerHTML = "";
  els.stock.className = `pile stock${!state.stock.length && state.waste.length ? " recycle" : ""}`;
  if (state.stock.length) {
    const card = createCardElement({ faceUp: false }, { source: "stock" });
    const count = document.createElement("span");
    count.className = "stock-count";
    count.textContent = state.stock.length;
    card.append(count);
    els.stock.append(card);
  }
}

function renderWaste() {
  els.waste.innerHTML = "";
  const visible = getVisibleWasteCards();
  els.waste.className = "pile waste";
  visible.forEach(({ card, cardIndex }, index) => {
    const isTop = cardIndex === state.waste.length - 1;
    const cardEl = createCardElement(card, {
      source: "waste",
      cardIndex,
      selectable: isTop
    });
    cardEl.style.left = `${index * 20}px`;
    cardEl.style.zIndex = String(index + 1);
    cardEl.disabled = !isTop;
    els.waste.append(cardEl);
  });
}

function getVisibleWasteCards() {
  if (!state.waste.length) return [];
  if (state.mode !== "hard") {
    const cardIndex = state.waste.length - 1;
    return [{ card: state.waste[cardIndex], cardIndex }];
  }

  const topCard = state.waste[state.waste.length - 1];
  const topGroup = topCard.wasteDrawGroup;
  let startIndex = Math.max(0, state.waste.length - 3);

  if (topGroup !== undefined) {
    startIndex = state.waste.length - 1;
    while (startIndex > 0 && state.waste[startIndex - 1].wasteDrawGroup === topGroup) {
      startIndex -= 1;
    }
  }

  return state.waste.slice(startIndex).map((card, index) => ({
    card,
    cardIndex: startIndex + index
  }));
}

function getHighestWasteDrawGroup() {
  return Math.max(0, ...state.waste.map((card) => card.wasteDrawGroup || 0));
}

function renderFoundations() {
  els.foundations.innerHTML = "";
  SUITS.forEach((suit) => {
    const pile = document.createElement("div");
    pile.className = `pile foundation-empty foundation-${suit.id}`;
    pile.dataset.suit = suit.id;
    pile.setAttribute("role", "button");
    pile.setAttribute("tabindex", "0");
    pile.setAttribute("aria-label", `${suit.label} foundation`);
    pile.addEventListener("click", () => {
      if (!moveSelectedToFoundation(suit.id)) clearSelection();
    });

    const foundation = state.foundations[suit.id];
    const top = foundation[foundation.length - 1];
    if (top) {
      pile.className = "pile";
      pile.append(createCardElement(top, { source: "foundation", suit: suit.id }));
    } else {
      const img = document.createElement("img");
      img.className = `foundation-icon foundation-icon-${suit.id}`;
      img.src = ASSETS.suits[suit.id];
      img.alt = "";
      pile.append(img);
    }
    els.foundations.append(pile);
  });
}

function renderTableau() {
  els.tableau.innerHTML = "";
  const hiddenGap = getHiddenGap();
  const faceGap = getFaceGap();

  state.tableau.forEach((pile, pileIndex) => {
    const column = document.createElement("div");
    column.className = `tableau-column${pile.length ? "" : " empty-column"}`;
    column.dataset.pileIndex = pileIndex;
    column.addEventListener("click", () => {
      if (!moveSelectedToTableau(pileIndex)) clearSelection();
    });

    let topOffset = 0;
    pile.forEach((card, cardIndex) => {
      const cardEl = createCardElement(card, { source: "tableau", pileIndex, cardIndex });
      cardEl.style.top = `${topOffset}px`;
      cardEl.style.zIndex = String(cardIndex + 1);
      column.append(cardEl);
      topOffset += card.faceUp ? faceGap : hiddenGap;
    });
    column.style.height = `${Math.max(getCardHeight(), topOffset + getCardHeight() - faceGap)}px`;
    els.tableau.append(column);
  });
}

function createCardElement(card, meta) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "playing-card";
  button.dataset.source = meta.source || "";

  if (meta.pileIndex !== undefined) button.dataset.pileIndex = meta.pileIndex;
  if (meta.cardIndex !== undefined) button.dataset.cardIndex = meta.cardIndex;
  if (meta.suit !== undefined) button.dataset.suit = meta.suit;

  if (state.selected && isSameSelection(state.selected, meta)) {
    button.classList.add("selected");
  }

  if (!card.faceUp) {
    button.classList.add("face-down");
    const img = document.createElement("img");
    img.className = "card-back-img";
    img.src = ASSETS.back;
    img.alt = "";
    button.append(img);
    if (meta.source !== "stock") {
      button.addEventListener("click", handleCardClick);
    }
    return button;
  }

  button.classList.add(card.color === "red" ? "red-group" : "black-group");
  button.setAttribute("aria-label", `${RANKS[card.rank]} of ${card.suitLabel}`);
  button.append(createRankCorner(card));
  button.append(createSuitCorner(card));
  button.append(createCenterRank(card));
  button.addEventListener("click", handleCardClick);
  return button;
}

function createRankCorner(card) {
  const corner = document.createElement("span");
  corner.className = "card-rank";
  corner.textContent = RANKS[card.rank];
  return corner;
}

function createSuitCorner(card) {
  const img = document.createElement("img");
  img.className = "card-suit-corner";
  img.src = ASSETS.suits[card.suit];
  img.alt = "";
  return img;
}

function createCenterRank(card) {
  const center = document.createElement("span");
  center.className = "center-rank";
  if (RANKS[card.rank].length > 1) {
    center.classList.add("wide-rank");
  }
  center.textContent = RANKS[card.rank];
  return center;
}

function isSameSelection(selection, meta) {
  if (!selection || selection.source !== meta.source) return false;
  if (selection.source === "waste") return selection.cardIndex === meta.cardIndex;
  if (selection.source === "foundation") return selection.suit === meta.suit;
  return selection.pileIndex === meta.pileIndex && selection.cardIndex === meta.cardIndex;
}

function getCardHeight() {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue("--card-w").trim();
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.width = value;
  document.body.append(probe);
  const width = probe.getBoundingClientRect().width || 100;
  probe.remove();
  return width * 1.4;
}

function getFaceGap() {
  const preferred = window.innerWidth < 720 ? 28 : Math.max(34, Math.min(46, window.innerWidth * 0.032));
  const minimum = window.innerWidth < 720 ? 18 : 18;
  const longestPile = state.tableau.reduce((longest, pile) => Math.max(longest, pile.length), 0);
  if (longestPile <= 1) return preferred;

  const tableauTop = els.tableau.getBoundingClientRect().top || (window.innerWidth < 720 ? 260 : 270);
  const availableHeight = Math.max(getCardHeight(), window.innerHeight - tableauTop - 12);
  const compressed = (availableHeight - getCardHeight()) / Math.max(1, longestPile - 1);
  return Math.max(minimum, Math.min(preferred, compressed));
}

function getHiddenGap() {
  return window.innerWidth < 720 ? 17 : 22;
}

function setStatus(text) {
  els.status.textContent = text;
}

function getSuitLabel(suitId) {
  return SUITS.find((suit) => suit.id === suitId)?.label || suitId;
}

function resetSparseVoiceCounters() {
  Object.keys(voiceLineAttemptsByAction).forEach((action) => {
    voiceLineAttemptsByAction[action] = 0;
  });
}

function shouldSpeakForAction(action, force = false) {
  if (force) return true;
  const frequency = SPARSE_VOICE_FREQUENCY_BY_ACTION[action] || 1;
  if (frequency <= 1) return true;

  voiceLineAttemptsByAction[action] = (voiceLineAttemptsByAction[action] || 0) + 1;
  return voiceLineAttemptsByAction[action] % frequency === 0;
}

function speakLine(action, options = {}) {
  const lines = VOICE_LINES[action];
  if (!lines?.length) return;
  if (!shouldSpeakForAction(action, options.force)) return;

  let line = lines[Math.floor(Math.random() * lines.length)];
  if (lines.length > 1 && line === lastVoiceLineByAction[action]) {
    const nextIndex = (lines.indexOf(line) + 1) % lines.length;
    line = lines[nextIndex];
  }

  lastVoiceLineByAction[action] = line;
  speak(line);
}

function speak(text) {
  window.clearTimeout(state.bubbleTimer);
  els.bubble.textContent = text;
  els.bubble.classList.add("active");
  state.bubbleTimer = window.setTimeout(() => {
    els.bubble.classList.remove("active");
  }, 2200);
}

function showModal(modal) {
  modal.hidden = false;
}

function hideModal(modal) {
  modal.hidden = true;
}

function getLocalScores() {
  try {
    const scores = JSON.parse(window.localStorage.getItem(SCORE_KEY) || "{}");
    return { easy: scores.easy || [], hard: scores.hard || [] };
  } catch {
    return { easy: [], hard: [] };
  }
}

function setLocalScores(scores) {
  window.localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
}

function saveLocalScore(score) {
  const scores = getLocalScores();
  scores[score.mode].push(score);
  scores[score.mode].sort(compareScores);
  scores[score.mode] = scores[score.mode].slice(0, LEADERBOARD_LIMIT);
  setLocalScores(scores);
}

function compareScores(a, b) {
  return a.moves - b.moves || a.seconds - b.seconds;
}

function sanitizePlayerName(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9_@ .-]/g, "")
    .slice(0, 24) || "anon";
}

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    ...extraHeaders
  };
}

async function fetchLiveScores(mode) {
  const params = new URLSearchParams({
    select: "display_name,moves,seconds,created_at",
    mode: `eq.${mode}`,
    order: "moves.asc,seconds.asc,created_at.asc",
    limit: String(LEADERBOARD_LIMIT)
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${LEADERBOARD_TABLE}?${params}`, {
    headers: getSupabaseHeaders()
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();
  return rows.map((row) => ({
    name: row.display_name,
    moves: Number(row.moves),
    seconds: Number(row.seconds),
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
      mode: score.mode,
      display_name: score.name,
      moves: score.moves,
      seconds: score.seconds
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function populateLeaderboardList(list, scores) {
  list.innerHTML = "";
  if (!scores.length) {
    const empty = document.createElement("li");
    empty.textContent = "no clears yet";
    list.append(empty);
    return;
  }

  [...scores].sort(compareScores).forEach((score) => {
    const item = document.createElement("li");
    item.textContent = `${score.name} - ${score.moves} moves - ${formatTime(score.seconds)}`;
    list.append(item);
  });
}

async function saveScore(name) {
  const displayName = sanitizePlayerName(name);
  const score = {
    mode: state.mode,
    name: displayName,
    moves: state.moves,
    seconds: state.elapsed,
    date: new Date().toISOString()
  };

  saveLocalScore(score);
  els.scoreMessage.textContent = "saving score...";
  if (els.scoreSave) els.scoreSave.disabled = true;

  try {
    await submitLiveScore(score);
    els.scoreMessage.textContent = `saved ${displayName}`;
    await renderLeaderboard(state.mode);
  } catch (error) {
    console.warn("Live leaderboard save failed", error);
    els.scoreMessage.textContent = "saved locally - live table not ready";
    await renderLeaderboard(state.mode);
  } finally {
    if (els.scoreSave) els.scoreSave.disabled = false;
  }
}

async function renderLeaderboard(activeMode = "easy") {
  setLeaderboardMode(activeMode);
  els.leaderboardStatus.textContent = "loading live ranks...";
  populateLeaderboardList(els.leaderboardEasy, []);
  populateLeaderboardList(els.leaderboardHard, []);

  let scores;
  let source = "live";
  try {
    const [easy, hard] = await Promise.all([fetchLiveScores("easy"), fetchLiveScores("hard")]);
    scores = { easy, hard };
  } catch (error) {
    console.warn("Live leaderboard load failed", error);
    scores = getLocalScores();
    source = "local";
  }

  populateLeaderboardList(els.leaderboardEasy, scores.easy);
  populateLeaderboardList(els.leaderboardHard, scores.hard);
  els.leaderboardStatus.textContent = source === "live" ? "live ranks" : "local ranks - Supabase table needed";
}

function setLeaderboardMode(mode) {
  document.querySelectorAll("[data-leaderboard-mode]").forEach((button) => {
    const active = button.dataset.leaderboardMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-leaderboard-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.leaderboardPanel !== mode;
  });
}

function setupAudioControls() {
  loadAudioSettings();
  if (els.musicVolume) els.musicVolume.value = Math.round(state.musicVolume * 100);
  if (els.sfxVolume) els.sfxVolume.value = Math.round(state.sfxVolume * 100);
  updateMusicVolume();
  updateMusicToggle();

  els.musicToggle.addEventListener("click", toggleMusic);
  els.musicVolume.addEventListener("input", () => {
    state.musicVolume = clampVolume(Number(els.musicVolume.value) / 100, state.musicVolume);
    updateMusicVolume();
    saveAudioSettings();
  });
  els.sfxVolume.addEventListener("input", () => {
    state.sfxVolume = clampVolume(Number(els.sfxVolume.value) / 100, state.sfxVolume);
    saveAudioSettings();
  });

  document.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
  document.addEventListener("keydown", unlockAudio, { once: true, capture: true });
}

function loadAudioSettings() {
  try {
    const data = JSON.parse(window.localStorage.getItem(AUDIO_KEY) || "{}");
    state.musicOn = data.musicOn ?? true;
    state.musicVolume = clampVolume(data.musicVolume, DEFAULT_MUSIC_VOLUME);
    state.sfxVolume = clampVolume(data.sfxVolume, DEFAULT_SFX_VOLUME);
  } catch {
    state.musicOn = true;
    state.musicVolume = DEFAULT_MUSIC_VOLUME;
    state.sfxVolume = DEFAULT_SFX_VOLUME;
  }
}

function saveAudioSettings() {
  window.localStorage.setItem(AUDIO_KEY, JSON.stringify({
    musicOn: state.musicOn,
    musicVolume: state.musicVolume,
    sfxVolume: state.sfxVolume
  }));
}

function clampVolume(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function toggleMusic() {
  if (state.musicPlaying) {
    pauseMusic();
    return;
  }
  state.musicOn = true;
  saveAudioSettings();
  unlockAudio();
  attemptMusicPlayback();
}

function pauseMusic() {
  state.musicRequestId += 1;
  if (els.music) els.music.pause();
  state.musicOn = false;
  state.musicPlaying = false;
  saveAudioSettings();
  updateMusicToggle();
}

function updateMusicVolume() {
  if (els.music) els.music.volume = state.musicVolume;
}

function updateMusicToggle() {
  els.musicToggle.setAttribute("aria-pressed", String(state.musicPlaying));
  els.musicToggle.setAttribute("aria-label", state.musicPlaying ? "Pause music" : "Play music");
}

function attemptMusicPlayback() {
  if (!els.music || !state.musicOn) {
    updateMusicToggle();
    return;
  }

  updateMusicVolume();
  const requestId = state.musicRequestId + 1;
  state.musicRequestId = requestId;
  const playAttempt = els.music.play();
  if (!playAttempt) return;

  playAttempt
    .then(() => {
      if (requestId !== state.musicRequestId) return;
      state.musicPlaying = true;
      updateMusicToggle();
    })
    .catch(() => {
      if (requestId !== state.musicRequestId) return;
      state.musicPlaying = false;
      updateMusicToggle();
    });
}

function unlockAudio() {
  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume();
  }
  if (state.musicOn && !state.musicPlaying) {
    attemptMusicPlayback();
  }
}

function startMusicFromParent() {
  state.musicOn = true;
  saveAudioSettings();
  unlockAudio();
  attemptMusicPlayback();
}

window.CyclopsSolitaireAudio = {
  start: startMusicFromParent,
  pause: pauseMusic
};

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
  }
  return state.audioContext;
}

function playSfx(name) {
  if (state.sfxVolume <= 0) return;

  switch (name) {
    case "click":
      playTone(620, 0.045, { type: "square", volume: 0.042 });
      playTone(930, 0.035, { delay: 0.035, type: "square", volume: 0.026 });
      break;
    case "flip":
      playNoise(0.045, { volume: 0.036, filterFrequency: 1800 });
      playTone(520, 0.07, { delay: 0.025, type: "triangle", volume: 0.038 });
      break;
    case "play":
      playTone(440, 0.055, { type: "square", volume: 0.04 });
      playTone(660, 0.075, { delay: 0.055, type: "square", volume: 0.044 });
      break;
    case "foundation":
      playTone(660, 0.065, { type: "triangle", volume: 0.046 });
      playTone(990, 0.075, { delay: 0.06, type: "triangle", volume: 0.04 });
      playTone(1320, 0.09, { delay: 0.13, type: "triangle", volume: 0.032 });
      break;
    case "complete":
      [523, 659, 784, 1046].forEach((frequency, index) => {
        playTone(frequency, 0.09, { delay: index * 0.075, type: "square", volume: 0.046 });
      });
      playNoise(0.16, { delay: 0.24, volume: 0.028, filterFrequency: 2400 });
      break;
    case "riffle":
      for (let i = 0; i < 6; i += 1) {
        playNoise(0.035, { delay: i * 0.026, volume: 0.034, filterFrequency: 1200 + i * 260 });
        playTone(180 + i * 28, 0.025, { delay: i * 0.026, type: "square", volume: 0.02 });
      }
      break;
    case "recycle":
      [420, 330, 260].forEach((frequency, index) => {
        playTone(frequency, 0.075, { delay: index * 0.06, type: "sawtooth", volume: 0.04 });
      });
      break;
    case "win":
      [523, 659, 784, 1046, 988, 784, 1046, 1318].forEach((frequency, index) => {
        playTone(frequency, 0.12, { delay: index * 0.105, type: "square", volume: 0.048 });
      });
      break;
  }
}

function playTone(frequency, duration, options = {}) {
  const context = getAudioContext();
  if (!context || context.state === "suspended") return;

  const start = context.currentTime + (options.delay || 0);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const peakVolume = Math.max(0.0001, Math.min(0.22, (options.volume ?? 0.03) * state.sfxVolume * SFX_GAIN));

  oscillator.type = options.type || "square";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), start + duration * 0.85);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakVolume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playNoise(duration, options = {}) {
  const context = getAudioContext();
  if (!context || context.state === "suspended") return;

  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + (options.delay || 0);
  const peakVolume = Math.max(0.0001, Math.min(0.2, (options.volume ?? 0.02) * state.sfxVolume * SFX_GAIN));

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(options.filterFrequency || 1600, start);
  filter.Q.value = 5;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakVolume, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

els.stock.addEventListener("click", drawFromStock);
els.stock.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    drawFromStock();
  }
});

els.newGame.addEventListener("click", () => showModal(els.modeModal));
els.modeCancel.addEventListener("click", () => hideModal(els.modeModal));
document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => resetGame(button.dataset.mode));
});

els.help.addEventListener("click", () => showModal(els.howToModal));
els.howToClose.addEventListener("click", () => hideModal(els.howToModal));

els.leaderboardOpen.addEventListener("click", () => {
  showModal(els.leaderboardModal);
  renderLeaderboard(state.mode);
});
els.leaderboardClose.addEventListener("click", () => hideModal(els.leaderboardModal));
els.winLeaderboard.addEventListener("click", () => {
  hideModal(els.winModal);
  showModal(els.leaderboardModal);
  renderLeaderboard(state.mode);
});
document.querySelectorAll("[data-leaderboard-mode]").forEach((button) => {
  button.addEventListener("click", () => setLeaderboardMode(button.dataset.leaderboardMode));
});

els.playAgain.addEventListener("click", () => {
  hideModal(els.winModal);
  resetGame(state.mode);
});

els.scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveScore(els.scoreName.value);
});

els.undo.addEventListener("click", () => {
  const previous = state.undo.pop();
  if (!previous) return;
  const movesBeforeUndo = state.moves;
  const elapsedBeforeUndo = state.elapsed;
  const startedBeforeUndo = state.started;
  restore(previous);
  state.moves = movesBeforeUndo + 1;
  state.elapsed = elapsedBeforeUndo;
  state.started = startedBeforeUndo || state.started;
  if (state.started && !state.gameOver) startTimer();
  render();
  setStatus("move undone");
  speakLine("undo");
});

els.noMoveNew.addEventListener("click", () => {
  hideModal(els.noMoveModal);
  showModal(els.modeModal);
});
els.noMoveKeep.addEventListener("click", () => hideModal(els.noMoveModal));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    state.selected = null;
    document.querySelectorAll(".choice-modal").forEach(hideModal);
    render();
  }
});

window.addEventListener("resize", render);

setupAudioControls();
resetGame("hard");
