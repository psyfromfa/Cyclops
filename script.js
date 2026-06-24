const navLinks = [...document.querySelectorAll(".main-nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const playerModal = document.getElementById("player-modal");
const playerFrame = document.getElementById("player-frame");
const playerTitle = document.getElementById("player-title");
const playerMinimize = document.getElementById("player-minimize");
const playerSizeToggle = document.getElementById("player-size-toggle");
const playerClose = document.getElementById("player-close");
const playerRestore = document.getElementById("player-restore");
const playerRestoreTitle = document.getElementById("player-restore-title");
const toast = document.getElementById("toast");

let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function setActiveNav() {
  const checkpoint = window.scrollY + 160;
  let activeId = sections[0]?.id;

  sections.forEach((section) => {
    if (section.offsetTop <= checkpoint) activeId = section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
  });
}

function setPlayerExpanded(expanded) {
  playerModal.classList.toggle("player-expanded", expanded);
  playerSizeToggle.textContent = expanded ? "[ ]" : "[ ]";
  playerSizeToggle.title = expanded ? "Restore window" : "Maximize";
  playerSizeToggle.setAttribute("aria-label", expanded ? "Restore game window" : "Maximize game");
  playerSizeToggle.setAttribute("aria-pressed", String(expanded));
}

function getGameWindow() {
  try {
    return playerFrame.contentWindow;
  } catch {
    return null;
  }
}

function sendGameMessage(action) {
  const gameWindow = getGameWindow();
  try {
    gameWindow?.postMessage?.({ source: "cyclops-site", action }, "*");
  } catch {
    // The window controls should keep working even if a cartridge is cross-origin or still loading.
  }
}

function pauseEmbeddedGame() {
  const gameWindow = getGameWindow();
  try {
    gameWindow?.CyclopsHighwayHavoc?.pause?.();
    gameWindow?.CyclopsSolitaireAudio?.pause?.();
    gameWindow?.CyclopsCatchGame?.pause?.();
  } catch {
    // Keep the parent window state responsive if the iframe cannot be inspected.
  }
  sendGameMessage("pause");
}

function resumeEmbeddedGame() {
  const gameWindow = getGameWindow();
  try {
    gameWindow?.CyclopsHighwayHavoc?.resume?.();
    gameWindow?.CyclopsSolitaireAudio?.start?.();
    gameWindow?.CyclopsCatchGame?.resume?.();
  } catch {
    // Resume is best-effort; the iframe also receives the message below.
  }
  sendGameMessage("resume");
}

function openPlayer(src, title) {
  if (playerFrame.getAttribute("src") !== src) {
    playerFrame.src = src;
  }
  playerTitle.textContent = title || "Cyclops Cartridge";
  playerRestoreTitle.textContent = "Paused";
  setPlayerExpanded(false);
  playerRestore.hidden = true;
  playerModal.hidden = false;
  document.body.classList.add("player-open");
  resumeEmbeddedGame();
}

function minimizePlayer() {
  playerRestoreTitle.textContent = "Paused";
  playerModal.hidden = true;
  playerRestore.hidden = false;
  document.body.classList.remove("player-open");
  pauseEmbeddedGame();
}

function restorePlayer() {
  playerModal.hidden = false;
  playerRestore.hidden = true;
  document.body.classList.add("player-open");
  resumeEmbeddedGame();
}

function closePlayer() {
  playerModal.hidden = true;
  playerRestore.hidden = true;
  playerFrame.src = "about:blank";
  setPlayerExpanded(false);
  document.body.classList.remove("player-open");
}

document.querySelectorAll("[data-open-player]").forEach((button) => {
  button.addEventListener("click", () => {
    openPlayer(button.dataset.openPlayer, button.dataset.title);
  });
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      showToast("Contract copied.");
    } catch {
      showToast(value);
    }
  });
});

playerMinimize?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  minimizePlayer();
});
playerClose?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closePlayer();
});
playerRestore?.addEventListener("click", restorePlayer);
playerFrame.addEventListener("load", () => {
  if (playerModal.hidden) {
    return;
  }
  resumeEmbeddedGame();
  window.setTimeout(resumeEmbeddedGame, 250);
});

playerSizeToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setPlayerExpanded(!playerModal.classList.contains("player-expanded"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !playerModal.hidden) minimizePlayer();
});

window.addEventListener("scroll", setActiveNav, { passive: true });
setActiveNav();
