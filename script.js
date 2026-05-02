const bootLines = [
  "Scanning Dith's garden...",
  "One-eyed lifeform detected.",
  "Mounting /cult/memes...",
  "Blessing Abstract game cartridges...",
  "Loading Abstract Chain adapters...",
  "Sharpening claws...",
  "Installing zero_fcks.dll...",
  "Starting Cyclops Arcade...",
  "Opening CyclopsOS..."
];

const bootScreen = document.getElementById("boot-screen");
const bootLog = document.getElementById("boot-log");
const bootMeterFill = document.getElementById("boot-meter-fill");
const enterOs = document.getElementById("enter-os");
const startButton = document.getElementById("start-button");
const startMenu = document.getElementById("start-menu");
const taskTabs = document.getElementById("task-tabs");
const clock = document.getElementById("clock");
const terminalInput = document.getElementById("terminal-input");
const terminalOutput = document.getElementById("terminal-output");
const blueScreen = document.getElementById("blue-screen");
const restartOs = document.getElementById("restart-os");
const panicButton = document.getElementById("panic-button");
const secretIcon = document.getElementById("secret-icon");
const scoresIcon = document.getElementById("scores-icon");
const widgetStatus = document.getElementById("widget-status");
const eyeWidget = document.getElementById("eye-widget");
const toast = document.getElementById("toast");
const soundToggle = document.getElementById("sound-toggle");
const offerTreat = document.getElementById("offer-treat");
const offerSuspiciousTreat = document.getElementById("offer-suspicious-treat");
const treatReaction = document.getElementById("treat-reaction");
const generateProphecy = document.getElementById("generate-prophecy");
const prophecyText = document.getElementById("prophecy-text");
const gardenMessage = document.getElementById("garden-message");
const enhanceGarden = document.getElementById("enhance-garden");
const tapGlass = document.getElementById("tap-glass");
const rankName = document.getElementById("rank-name");
const rankDetail = document.getElementById("rank-detail");
const shrineResult = document.getElementById("shrine-result");
const highwayFrame = document.getElementById("highway-frame");
const gameFocusCatcher = document.querySelector(".game-focus-catcher");

let topZ = 100;
let bootIndex = 0;
let treatBalance = 0;
let eyePressure = 0;
let openedGameSlots = 0;
let soundOn = false;
let toastTimer = null;

const prophecies = [
  "The chart will move right.",
  "Never trust a two-eyed analyst.",
  "A wallet approaches with questionable intent.",
  "A new Abstract game asks for the cat. The cat asks for tribute.",
  "The bowl is empty because destiny is underfunded.",
  "Someone will say alpha and provide none.",
  "The garden remembers your cursor path.",
  "Buy button energy detected. Proceed with snacks.",
  "A hidden file is staring back."
];

const shrineResults = {
  treat: "Treat accepted. Cyclops grants +1 community morale.",
  cartridge: "Cartridge blessed. Insert into any Abstract game and pretend this was planned.",
  relic: "Relic attuned. If Cyclops cannot be playable, the item will do the haunting.",
  degen: "Degen energy detected. Strategy quality questionable. Vibes immaculate."
};

const treatReactions = [
  "Cyclops accepts without making eye contact.",
  "Cyclops sniffs it, judges you, and eats it anyway.",
  "The treat disappears. The eye gets larger.",
  "Offering accepted. Your rank remains emotionally complicated.",
  "Cyclops has moved the treat to cold storage for prophecy reasons."
];

const gardenMessages = [
  "ENHANCE FAILED: TOO MUCH ORANGE CAT ENERGY",
  "MOTION DETECTED NEAR PATIO TILE 04",
  "STATIC WHISPERS: TREAT... TREAT...",
  "A SINGLE EYE REFLECTS IN THE GLASS",
  "CAMERA 03 REQUESTS A SNACK"
];

const trashMessages = {
  "rugplan_final_FINAL2.txt": "File is empty except for: nice try.",
  "definitely_not_alpha.png": "It is a blurry picture of a bowl.",
  "two_eye_manifesto.exe": "Blocked. Heretical executable detected.",
  "apology_to_the_bowl.doc": "Dear bowl, I should have filled you sooner."
};

function typeBoot() {
  if (bootIndex >= bootLines.length) {
    enterOs.textContent = "Press any key to enter CyclopsOS";
    bootMeterFill.style.width = "100%";
    return;
  }

  bootLog.textContent += `${bootLines[bootIndex]}\n`;
  bootIndex += 1;
  bootMeterFill.style.width = `${Math.round((bootIndex / bootLines.length) * 100)}%`;
  window.setTimeout(typeBoot, 300);
}

function enterDesktop() {
  bootScreen.classList.add("hidden");
  showToast("CyclopsOS ready. Try the Arcade or Prophecy Terminal.");
  raisePressure(1, "Cyclops noticed your arrival.");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function raisePressure(amount = 1, reason = "Cyclops noticed.") {
  eyePressure += amount;
  document.body.dataset.pressure = String(Math.min(eyePressure, 12));

  if (eyePressure >= 4) document.body.classList.add("pressure-medium");
  if (eyePressure >= 7) document.body.classList.add("pressure-high");

  if (eyePressure === 5) {
    showToast("Eye Pressure rising. The desktop feels warmer.");
  } else if (eyePressure === 8) {
    unlockSecret();
  } else if (eyePressure === 11) {
    setTheme("cursed");
    showToast("Cyclops has enabled Cursed Vision.");
  } else {
    showToast(reason);
  }

  updateRank();
}

function chirp() {
  if (!soundOn) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 420;
  gain.gain.value = 0.025;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.045);
}

function focusWindow(windowEl) {
  document.querySelectorAll(".window").forEach((item) => item.classList.remove("focused"));
  windowEl.classList.remove("minimized");
  windowEl.classList.add("focused");
  topZ += 1;
  windowEl.style.zIndex = String(topZ);
  if (highwayFrame) {
    highwayFrame.style.pointerEvents = windowEl.id === "highway-window" ? "auto" : "none";
  }
  if (gameFocusCatcher) {
    gameFocusCatcher.style.pointerEvents = windowEl.id === "highway-window" ? "none" : "auto";
  }
  renderTaskTabs();
}

function placeStartupWindows() {
  const welcomeWindow = document.getElementById("welcome-window");
  const highwayWindow = document.getElementById("highway-window");
  if (!welcomeWindow || !highwayWindow) return;

  if (window.innerWidth <= 860) {
    welcomeWindow.style.left = "";
    welcomeWindow.style.top = "";
    welcomeWindow.style.zIndex = "";
    highwayWindow.style.left = "";
    highwayWindow.style.top = "";
    highwayWindow.style.zIndex = "";
    return;
  }

  const welcomeLeft = Math.min(Math.max(window.innerWidth * 0.38, 520), 720);
  const gameLeft = Math.min(Math.max(window.innerWidth * 0.2, 210), 360);

  welcomeWindow.style.left = `${Math.round(welcomeLeft)}px`;
  welcomeWindow.style.top = "26px";
  welcomeWindow.style.zIndex = "80";
  welcomeWindow.classList.add("focused");

  highwayWindow.style.left = `${Math.round(gameLeft)}px`;
  highwayWindow.style.top = "350px";
  highwayWindow.style.zIndex = "45";
  if (highwayFrame) highwayFrame.style.pointerEvents = "none";
  if (gameFocusCatcher) gameFocusCatcher.style.pointerEvents = "auto";
  topZ = Math.max(topZ, 100);
}

function openWindow(id) {
  const windowEl = document.getElementById(id);
  if (!windowEl) return;

  if (id === "highway-window" && highwayFrame && highwayFrame.src === "about:blank") {
    highwayFrame.src = highwayFrame.dataset.src;
  }

  windowEl.classList.add("active");
  focusWindow(windowEl);
  chirp();
  raisePressure(id === "forbidden-window" ? 2 : 1, `${windowEl.querySelector(".title-bar span")?.textContent || "Window"} opened.`);

  if (id === "terminal-window") {
    window.setTimeout(() => terminalInput?.focus(), 80);
  }
}

function closeWindow(windowEl) {
  windowEl.classList.remove("active", "focused", "minimized", "maxed");
  if (windowEl.id === "highway-window" && highwayFrame) {
    highwayFrame.src = "about:blank";
  }
  renderTaskTabs();
  chirp();
}

function minimizeWindow(windowEl) {
  windowEl.classList.add("minimized");
  windowEl.classList.remove("focused");
  renderTaskTabs();
  chirp();
}

function scaleHighwayGame(expanded) {
  if (!highwayFrame) return;

  const gameEmbed = highwayFrame.closest(".game-embed");
  if (!gameEmbed) return;

  if (!expanded) {
    gameEmbed.style.width = "680px";
    gameEmbed.style.height = "425px";
    gameEmbed.style.maxHeight = "";
    gameEmbed.style.margin = "";
    highwayFrame.style.width = "800px";
    highwayFrame.style.height = "500px";
    highwayFrame.style.transform = "scale(0.85)";
    return;
  }

  const availableWidth = Math.max(320, window.innerWidth - 96);
  const availableHeight = Math.max(260, window.innerHeight - 220);
  const scale = Math.min(availableWidth / 800, availableHeight / 500);
  const scaledWidth = Math.floor(800 * scale);
  const scaledHeight = Math.floor(500 * scale);

  gameEmbed.style.width = `${scaledWidth}px`;
  gameEmbed.style.height = `${scaledHeight}px`;
  gameEmbed.style.maxHeight = "none";
  gameEmbed.style.margin = "8px auto";
  highwayFrame.style.width = `${scaledWidth}px`;
  highwayFrame.style.height = `${scaledHeight}px`;
  highwayFrame.style.transform = "none";
}

function toggleMaxWindow(windowEl) {
  windowEl.classList.toggle("maxed");
  if (windowEl.id === "highway-window") {
    scaleHighwayGame(windowEl.classList.contains("maxed"));
  }
  focusWindow(windowEl);
}

function renderTaskTabs() {
  const openWindows = [...document.querySelectorAll(".window.active")];
  taskTabs.innerHTML = "";

  openWindows.forEach((windowEl) => {
    const title = windowEl.querySelector(".title-bar span")?.textContent || windowEl.id;
    const tab = document.createElement("button");
    tab.type = "button";
    tab.textContent = title;
    tab.addEventListener("click", () => focusWindow(windowEl));
    taskTabs.appendChild(tab);
  });
}

function makeDraggable(windowEl) {
  const handle = windowEl.querySelector(".title-bar");
  if (!handle) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || windowEl.classList.contains("maxed")) return;

    dragging = true;
    focusWindow(windowEl);
    offsetX = event.clientX - windowEl.offsetLeft;
    offsetY = event.clientY - windowEl.offsetTop;
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    const maxX = window.innerWidth - windowEl.offsetWidth - 8;
    const maxY = window.innerHeight - windowEl.offsetHeight - 48;
    const nextX = Math.max(8, Math.min(maxX, event.clientX - offsetX));
    const nextY = Math.max(8, Math.min(maxY, event.clientY - offsetY));

    windowEl.style.left = `${nextX}px`;
    windowEl.style.top = `${nextY}px`;
  });

  handle.addEventListener("pointerup", () => {
    dragging = false;
  });
}

function appendTerminal(text) {
  const line = document.createElement("p");
  line.textContent = text;
  terminalOutput.insertBefore(line, terminalOutput.querySelector("label"));
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function unlockSecret() {
  secretIcon.classList.add("unlocked");
  showToast("Hidden file unlocked: secret.eye");
}

function unlockScores() {
  scoresIcon.classList.add("unlocked");
  showToast("scores.dat unlocked. These scores are legally suspicious.");
}

function addTreat() {
  treatBalance += 1;
  widgetStatus.textContent = `Treat balance: ${treatBalance}`;
  if (treatBalance === 3) unlockSecret();
  if (treatBalance === 7) showToast("You have been promoted to Indoor God Assistant.");
  updateRank();
}

function updateRank() {
  const score = treatBalance + Math.floor(eyePressure / 2);
  let name = "Unblinking Intern";
  let detail = "Open things. Click suspiciously. Earn Cyclops' mild concern.";

  if (score >= 3) {
    name = "Treat Courier";
    detail = "You understand that snacks are infrastructure.";
  }
  if (score >= 6) {
    name = "Patio Mystic";
    detail = "You have seen the garden cam blink back.";
  }
  if (score >= 9) {
    name = "One-Eye Lieutenant";
    detail = "You may now supervise suspicious folders.";
  }
  if (score >= 13) {
    name = "Indoor God Assistant";
    detail = "Cyclops trusts you with absolutely nothing important.";
  }

  rankName.textContent = name;
  rankDetail.textContent = detail;
}

function runTerminalCommand(command) {
  const normalized = command.trim().toLowerCase();
  if (!normalized) return;

  appendTerminal(`C:\\Cyclops\\Cult> ${command}`);

  if (normalized === "help") {
    appendTerminal("Commands: help, games, shrine, vision, treat, lore, buy, summon, secret, clear");
  } else if (normalized === "games") {
    appendTerminal("Opening Cyclops Arcade...");
    openWindow("games-window");
  } else if (normalized === "shrine") {
    appendTerminal("Opening Eye Shrine...");
    openWindow("shrine-window");
  } else if (normalized === "vision") {
    appendTerminal("The eye sees Abstract games, meme raids, chart candles, and one suspicious cartridge.");
  } else if (normalized === "treat") {
    addTreat();
    raisePressure(1, "Terminal offering logged.");
    appendTerminal(`Offering accepted. Treat balance is now ${treatBalance}.`);
  } else if (normalized === "lore") {
    appendTerminal("Garden stray -> chosen cat -> pixel prophet -> chain legend.");
  } else if (normalized === "buy") {
    appendTerminal("Opening Buy.exe...");
    openWindow("token-window");
  } else if (normalized === "summon") {
    appendTerminal("Summoning the arcade...");
    openWindow("games-window");
    openWindow("gallery-window");
    raisePressure(2, "Summon ritual complete.");
  } else if (normalized === "secret") {
    unlockSecret();
    appendTerminal("secret.eye is now on the desktop.");
  } else if (normalized === "clear") {
    [...terminalOutput.querySelectorAll("p")].forEach((line) => line.remove());
  } else {
    appendTerminal(`Unknown command: ${command}`);
  }
}

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setTheme(theme) {
  document.body.classList.toggle("night", theme === "night");
  document.body.classList.toggle("cursed", theme === "cursed");
  showToast(`${theme === "classic" ? "Classic" : theme} vision enabled.`);
}

document.querySelectorAll(".desktop-icon").forEach((icon) => {
  icon.addEventListener("click", () => openWindow(icon.dataset.window));
});

document.querySelectorAll(".window").forEach((windowEl) => {
  makeDraggable(windowEl);
  windowEl.addEventListener("pointerdown", () => focusWindow(windowEl));
  windowEl.querySelector(".close-window")?.addEventListener("click", () => closeWindow(windowEl));
  windowEl.querySelector(".min-window")?.addEventListener("click", () => minimizeWindow(windowEl));
  windowEl.querySelector(".max-window")?.addEventListener("click", () => toggleMaxWindow(windowEl));
});

document.querySelectorAll("[data-window]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (trigger.classList.contains("desktop-icon")) return;
    openWindow(trigger.dataset.window);
    startMenu.classList.remove("open");
  });
});

document.querySelectorAll("[data-theme]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    setTheme(trigger.dataset.theme);
    startMenu.classList.remove("open");
  });
});

document.querySelectorAll(".game-card button").forEach((button) => {
  button.addEventListener("click", () => {
    openedGameSlots += 1;
    raisePressure(1, "Arcade cartridge inspected.");
    if (openedGameSlots >= 4) unlockScores();
    showToast("Cyclops integration slot marked. Replace this with a real game link or embed.");
  });
});

document.querySelectorAll("[data-offering]").forEach((offering) => {
  offering.addEventListener("click", () => {
    const type = offering.dataset.offering;
    shrineResult.textContent = shrineResults[type] || "The shrine accepts, but refuses to elaborate.";
    if (type === "treat") addTreat();
    if (type === "cartridge") openedGameSlots += 1;
    if (openedGameSlots >= 4) unlockScores();
    raisePressure(type === "degen" ? 3 : 2, "Shrine offering recorded.");
  });
});

document.querySelectorAll(".gallery-grid button").forEach((button) => {
  button.addEventListener("click", () => {
    raisePressure(1, "Meme file inspected.");
    showToast(button.querySelector("span")?.textContent || "Meme selected.");
  });
});

document.querySelectorAll("[data-trash]").forEach((file) => {
  file.addEventListener("click", () => {
    const name = file.dataset.trash;
    showToast(trashMessages[name] || "The trash refuses to explain itself.");
    raisePressure(1, "Trash file inspected.");
  });
});

gameFocusCatcher?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openWindow("highway-window");
});

startButton.addEventListener("click", () => {
  startMenu.classList.toggle("open");
});

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  soundToggle.textContent = soundOn ? "SND*" : "SND";
  showToast(soundOn ? "Sound blips enabled." : "Sound blips muted.");
  chirp();
});

enterOs.addEventListener("click", enterDesktop);

document.addEventListener("keydown", () => {
  if (!bootScreen.classList.contains("hidden")) enterDesktop();
});

document.addEventListener("click", (event) => {
  if (!startMenu.contains(event.target) && !startButton.contains(event.target)) {
    startMenu.classList.remove("open");
  }
});

terminalInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  runTerminalCommand(terminalInput.value);
  terminalInput.value = "";
});

panicButton.addEventListener("click", () => {
  raisePressure(4, "Emergency pet protocol violated.");
  setTheme("cursed");
  blueScreen.hidden = false;
});

restartOs.addEventListener("click", () => {
  blueScreen.hidden = true;
  showToast("CyclopsOS recovered. Do not pet means do not pet.");
});

eyeWidget.addEventListener("click", () => {
  addTreat();
  raisePressure(1, "Treat offered to the eye.");
});

offerTreat.addEventListener("click", () => {
  addTreat();
  raisePressure(1, "Treat.exe processed a snack.");
  treatReaction.textContent = treatReactions[Math.floor(Math.random() * treatReactions.length)];
});

offerSuspiciousTreat.addEventListener("click", () => {
  addTreat();
  raisePressure(3, "Suspicious treat accepted. Bad idea, probably.");
  treatReaction.textContent = "Cyclops ate it and the wallpaper coughed.";
});

generateProphecy.addEventListener("click", () => {
  const prophecy = prophecies[Math.floor(Math.random() * prophecies.length)];
  prophecyText.textContent = prophecy;
  raisePressure(1, "Fresh prophecy generated.");
});

enhanceGarden.addEventListener("click", () => {
  gardenMessage.textContent = gardenMessages[Math.floor(Math.random() * gardenMessages.length)];
  raisePressure(1, "Garden camera enhanced.");
});

tapGlass.addEventListener("click", () => {
  gardenMessage.textContent = "DO NOT TAP THE GLASS";
  raisePressure(3, "The glass tapped back.");
});

window.setTimeout(() => {
  if (!bootScreen.classList.contains("hidden")) return;
  showToast("Cyclops has been staring for one full minute.");
  raisePressure(1, "One-minute stare logged.");
}, 60000);

window.addEventListener("resize", () => {
  const highwayWindow = document.getElementById("highway-window");
  if (highwayWindow?.classList.contains("maxed")) {
    scaleHighwayGame(true);
  }
});

typeBoot();
updateClock();
window.setInterval(updateClock, 1000);
placeStartupWindows();
renderTaskTabs();
