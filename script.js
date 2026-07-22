const root = document.documentElement;
const header = document.querySelector("[data-header]");
const progressBar = document.querySelector(".reading-progress span");
const menuButton = document.querySelector(".index-button");
const menu = document.querySelector("#site-index");
const menuClose = menu?.querySelector(".index-close");
const themeChoices = Array.from(document.querySelectorAll("[data-theme-choice]"));
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const validThemeModes = new Set(["system", "light", "dark"]);
const headerInkSurfaces = Array.from(document.querySelectorAll("[data-header-ink]"));
const credits = document.querySelector(".credits");
const creditsSummary = credits?.querySelector("summary");
let menuCloseTimer = 0;
let creditsCloseTimer = 0;
let themeTransitionTimer = 0;

const resolveHeaderInk = (inkMode) => {
  const isDarkTheme = document.documentElement.dataset.theme === "dark";

  if (inkMode === "dark" || inkMode === "light") return inkMode;
  if (inkMode === "inverse") return isDarkTheme ? "dark" : "light";
  return isDarkTheme ? "light" : "dark";
};

const updateHeaderInk = () => {
  if (!header) return;

  const sampleY = Math.max(1, Math.min(window.innerHeight - 1, header.getBoundingClientRect().height / 2));
  const activeSurface = headerInkSurfaces.find((surface) => {
    const bounds = surface.getBoundingClientRect();
    return bounds.top <= sampleY && bounds.bottom > sampleY;
  });

  header.dataset.headerInk = resolveHeaderInk(activeSurface?.dataset.headerInk || "theme");
};

const readSavedThemeMode = () => {
  try {
    const savedThemeMode = localStorage.getItem("olga-theme");
    return validThemeModes.has(savedThemeMode) ? savedThemeMode : "system";
  } catch (error) {
    return "system";
  }
};

const resolveTheme = (themeMode) => {
  if (themeMode === "system") {
    return systemTheme.matches ? "dark" : "light";
  }

  return themeMode;
};

const applyTheme = (themeMode, { save = false } = {}) => {
  const nextThemeMode = validThemeModes.has(themeMode) ? themeMode : "system";
  const nextTheme = resolveTheme(nextThemeMode);

  document.documentElement.dataset.themeMode = nextThemeMode;
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  if (themeColor) {
    themeColor.content = nextTheme === "dark" ? "#11130f" : "#f2efe7";
  }

  themeChoices.forEach((choice) => {
    const isSelected = choice.dataset.themeChoice === nextThemeMode;
    choice.setAttribute("aria-pressed", String(isSelected));
  });

  updateHeaderInk();

  if (save) {
    try {
      localStorage.setItem("olga-theme", nextThemeMode);
    } catch (error) {
      // The selected theme still applies for the current visit when storage is unavailable.
    }
  }
};

applyTheme(document.documentElement.dataset.themeMode || readSavedThemeMode());

themeChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    const updateTheme = () => applyTheme(choice.dataset.themeChoice, { save: true });

    if (!reducedMotion.matches && typeof document.startViewTransition === "function") {
      document.startViewTransition(updateTheme);
      return;
    }

    if (!reducedMotion.matches) {
      root.classList.add("is-theme-transitioning");
      window.requestAnimationFrame(updateTheme);
      window.clearTimeout(themeTransitionTimer);
      themeTransitionTimer = window.setTimeout(() => root.classList.remove("is-theme-transitioning"), 480);
      return;
    }

    updateTheme();
  });
});

systemTheme.addEventListener?.("change", () => {
  if ((document.documentElement.dataset.themeMode || readSavedThemeMode()) === "system") {
    applyTheme("system");
  }
});

const updateScrollUI = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;

  header?.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeaderInk();

  if (progressBar) {
    progressBar.style.transform = `scaleX(${progress})`;
  }
};

let scrollFrame = 0;
window.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      updateScrollUI();
      scrollFrame = 0;
    });
  },
  { passive: true },
);

updateScrollUI();

const openMenu = () => {
  if (!menu || typeof menu.showModal !== "function") return;

  window.clearTimeout(menuCloseTimer);
  menu.classList.remove("is-closing");
  menu.showModal();
  document.body.classList.add("menu-open");
  menuButton?.setAttribute("aria-expanded", "true");
};

const finishMenuClose = () => {
  window.clearTimeout(menuCloseTimer);
  menuCloseTimer = 0;
  menu?.removeEventListener("animationend", handleMenuExit);
  menu?.classList.remove("is-closing");

  if (menu?.open) menu.close();
};

const handleMenuExit = (event) => {
  if (event.target !== menu || event.animationName !== "index-out") return;
  finishMenuClose();
};

const closeMenu = () => {
  if (!menu?.open || menu.classList.contains("is-closing")) return;

  if (reducedMotion.matches) {
    finishMenuClose();
    return;
  }

  menu.classList.add("is-closing");
  menu.addEventListener("animationend", handleMenuExit);
  menuCloseTimer = window.setTimeout(finishMenuClose, 380);
};

menuButton?.addEventListener("click", openMenu);
menuClose?.addEventListener("click", closeMenu);

menu?.addEventListener("click", (event) => {
  if (event.target === menu) closeMenu();
});

menu?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMenu();
});

menu?.addEventListener("close", () => {
  window.clearTimeout(menuCloseTimer);
  menuCloseTimer = 0;
  menu.removeEventListener("animationend", handleMenuExit);
  menu.classList.remove("is-closing");
  document.body.classList.remove("menu-open");
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.focus();
});

menu?.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

const finishCreditsClose = () => {
  window.clearTimeout(creditsCloseTimer);
  creditsCloseTimer = 0;
  credits?.classList.remove("is-closing");

  if (credits) credits.open = false;
};

creditsSummary?.addEventListener("click", (event) => {
  if (!credits?.open || credits.classList.contains("is-closing") || reducedMotion.matches) return;

  event.preventDefault();
  credits.classList.add("is-closing");
  creditsCloseTimer = window.setTimeout(finishCreditsClose, 240);
});

const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -7%", threshold: 0.08 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const archiveStack = document.querySelector("[data-archive-stack]");
const archiveCards = archiveStack ? Array.from(archiveStack.querySelectorAll("[data-archive-card]")) : [];
const archiveCounter = document.querySelector("[data-archive-counter]");
const archiveStatus = document.querySelector("[data-archive-status]");

if (archiveStack && archiveCards.length > 1) {
  let activeArchiveIndex = 0;
  let archiveIsAnimating = false;
  let archiveAnimationTimer = 0;
  let activePointerId = null;
  let draggedCard = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragX = 0;
  let dragAxis = null;

  const formatArchivePosition = (index) => String(index + 1).padStart(2, "0");

  const clearArchiveDrag = (card) => {
    card.classList.remove("is-dragging", "is-leaving");
    card.style.removeProperty("--archive-drag-x");
    card.style.removeProperty("--archive-drag-y");
    card.style.removeProperty("--archive-drag-rotate");
  };

  const renderArchiveStack = ({ focus = false, announce = false } = {}) => {
    const activeCard = archiveCards[activeArchiveIndex];
    const activeLabel = activeCard.dataset.archiveLabel || "Archive photograph";

    activeCard.dataset.stackDepth = "0";
    activeCard.removeAttribute("aria-hidden");
    activeCard.tabIndex = 0;
    activeCard.setAttribute(
      "aria-label",
      `Image ${activeArchiveIndex + 1} of ${archiveCards.length}: ${activeLabel}. Drag horizontally, or use the Left and Right arrow keys.`,
    );

    if (focus) activeCard.focus({ preventScroll: true });

    archiveCards.forEach((card, index) => {
      clearArchiveDrag(card);
      const depth = (index - activeArchiveIndex + archiveCards.length) % archiveCards.length;
      card.dataset.stackDepth = String(depth);

      if (depth !== 0) {
        card.setAttribute("aria-hidden", "true");
        card.removeAttribute("aria-label");
        card.tabIndex = -1;
      }
    });

    if (archiveCounter) {
      archiveCounter.textContent = `${formatArchivePosition(activeArchiveIndex)} / ${formatArchivePosition(archiveCards.length - 1)}`;
    }

    if (announce && archiveStatus) {
      archiveStatus.textContent = `Showing image ${activeArchiveIndex + 1} of ${archiveCards.length}: ${activeLabel}.`;
    }
  };

  const cycleArchiveStack = (indexDelta) => {
    if (archiveIsAnimating) return;

    const activeCard = archiveCards[activeArchiveIndex];
    const nextIndex = (activeArchiveIndex + indexDelta + archiveCards.length) % archiveCards.length;

    if (reducedMotion.matches) {
      activeArchiveIndex = nextIndex;
      renderArchiveStack({ focus: true, announce: true });
      return;
    }

    archiveIsAnimating = true;
    activeCard.classList.remove("is-dragging");
    activeCard.classList.add("is-leaving");
    const exitDirection = indexDelta > 0 ? -1 : 1;
    const exitDistance = activeCard.getBoundingClientRect().width + 96;

    window.requestAnimationFrame(() => {
      activeCard.style.setProperty("--archive-drag-x", `${exitDirection * exitDistance}px`);
      activeCard.style.setProperty("--archive-drag-y", "12px");
      activeCard.style.setProperty("--archive-drag-rotate", `${exitDirection * 3.5}deg`);
    });

    const finishCycle = () => {
      if (!archiveIsAnimating) return;
      window.clearTimeout(archiveAnimationTimer);
      activeCard.removeEventListener("transitionend", handleArchiveExit);
      activeArchiveIndex = nextIndex;
      archiveIsAnimating = false;
      renderArchiveStack({ focus: true, announce: true });
    };

    const handleArchiveExit = (event) => {
      if (event.target !== activeCard || event.propertyName !== "transform") return;
      finishCycle();
    };

    activeCard.addEventListener("transitionend", handleArchiveExit);
    archiveAnimationTimer = window.setTimeout(finishCycle, 560);
  };

  const finishArchiveDrag = (event, { cancelled = false } = {}) => {
    if (activePointerId === null || event.pointerId !== activePointerId || !draggedCard) return;

    const card = draggedCard;
    const threshold = Math.min(92, Math.max(48, card.getBoundingClientRect().width * 0.13));

    if (card.hasPointerCapture?.(activePointerId)) card.releasePointerCapture(activePointerId);

    activePointerId = null;
    draggedCard = null;
    card.classList.remove("is-dragging");

    if (!cancelled && dragAxis === "horizontal" && Math.abs(dragX) >= threshold) {
      cycleArchiveStack(dragX < 0 ? 1 : -1);
    } else {
      clearArchiveDrag(card);
    }

    dragX = 0;
    dragAxis = null;
  };

  archiveCards.forEach((card) => {
    card.addEventListener("keydown", (event) => {
      if (card.dataset.stackDepth !== "0" || archiveIsAnimating) return;

      if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        cycleArchiveStack(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycleArchiveStack(-1);
      }
    });

    card.addEventListener("pointerdown", (event) => {
      if (card.dataset.stackDepth !== "0" || archiveIsAnimating || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }

      activePointerId = event.pointerId;
      draggedCard = card;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragX = 0;
      dragAxis = null;
      card.classList.add("is-dragging");
      card.setPointerCapture?.(activePointerId);
    });

    card.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId || draggedCard !== card) return;

      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;

      if (!dragAxis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 7) {
        dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      }

      if (dragAxis === "vertical") {
        finishArchiveDrag(event, { cancelled: true });
        return;
      }

      if (dragAxis !== "horizontal") return;

      if (event.cancelable) event.preventDefault();
      dragX = deltaX;
      const cardWidth = Math.max(card.getBoundingClientRect().width, 1);
      card.style.setProperty("--archive-drag-x", `${deltaX}px`);
      card.style.setProperty("--archive-drag-y", `${deltaY * 0.14}px`);
      card.style.setProperty("--archive-drag-rotate", `${(deltaX / cardWidth) * 4}deg`);
    });

    card.addEventListener("pointerup", (event) => finishArchiveDrag(event));
    card.addEventListener("pointercancel", (event) => finishArchiveDrag(event, { cancelled: true }));
  });

  renderArchiveStack();
}
