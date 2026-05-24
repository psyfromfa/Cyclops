const navLinks = [...document.querySelectorAll(".main-nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const playerModal = document.getElementById("player-modal");
const playerFrame = document.getElementById("player-frame");
const playerTitle = document.getElementById("player-title");
const playerSizeToggle = document.getElementById("player-size-toggle");
const playerClose = document.getElementById("player-close");
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
  playerSizeToggle.textContent = expanded ? "Windowed" : "Full screen";
  playerSizeToggle.setAttribute("aria-pressed", String(expanded));
}

function openPlayer(src, title) {
  playerFrame.src = src;
  playerTitle.textContent = title || "Cyclops Cartridge";
  setPlayerExpanded(false);
  playerModal.hidden = false;
  document.body.classList.add("player-open");
}

function closePlayer() {
  playerModal.hidden = true;
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

playerClose.addEventListener("click", closePlayer);

playerSizeToggle.addEventListener("click", () => {
  setPlayerExpanded(!playerModal.classList.contains("player-expanded"));
});

playerModal.addEventListener("click", (event) => {
  if (event.target === playerModal) closePlayer();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !playerModal.hidden) closePlayer();
});

window.addEventListener("scroll", setActiveNav, { passive: true });
setActiveNav();
