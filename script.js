const root = document.documentElement;
const header = document.querySelector("[data-header]");
const progressBar = document.querySelector(".reading-progress span");
const menuButton = document.querySelector(".index-button");
const menu = document.querySelector("#site-index");
const menuClose = menu?.querySelector(".index-close");
const themeChoices = Array.from(document.querySelectorAll("[data-theme-choice]"));
const motionChoices = Array.from(document.querySelectorAll("[data-motion-choice]"));
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const systemReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const validThemeModes = new Set(["system", "light", "dark"]);
const validMotionModes = new Set(["system", "reduced"]);
const headerInkSurfaces = Array.from(document.querySelectorAll("[data-header-ink]"));
const credits = document.querySelector(".credits");
const creditsSummary = credits?.querySelector("summary");
const cursorTrail = document.querySelector("[data-cursor-trail]");
const cometCursor = document.querySelector("[data-comet-cursor]");
const customCursorLayer = [cursorTrail, cometCursor].filter(Boolean);
let menuCloseTimer = 0;
let creditsCloseTimer = 0;
let themeTransitionTimer = 0;

document.addEventListener(
  "pointerdown",
  () => root.classList.add("is-pointer-navigation"),
  { capture: true, passive: true },
);

document.addEventListener(
  "keydown",
  () => root.classList.remove("is-pointer-navigation"),
  { capture: true },
);

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

const readSavedMotionMode = () => {
  try {
    const savedMotionMode = localStorage.getItem("olga-motion");
    return validMotionModes.has(savedMotionMode) ? savedMotionMode : "system";
  } catch (error) {
    return "system";
  }
};

const motionIsReduced = () => root.dataset.motion === "reduced";

const syncCustomCursorState = () => {
  const customCursorIsActive = Boolean(cometCursor && !motionIsReduced() && finePointer.matches);

  root.classList.toggle("has-custom-cursor", customCursorIsActive);
  if (!customCursorIsActive) cometCursor?.classList.remove("is-visible", "is-interactive", "is-pressed");
};

const moveCustomCursorLayer = (target) => {
  if (!target) return;
  customCursorLayer.forEach((element) => target.append(element));
};

const applyMotion = (motionMode, { save = false } = {}) => {
  const nextMotionMode = validMotionModes.has(motionMode) ? motionMode : "system";
  const nextMotion = nextMotionMode === "reduced" || systemReducedMotion.matches ? "reduced" : "full";

  root.dataset.motionMode = nextMotionMode;
  root.dataset.motion = nextMotion;
  syncCustomCursorState();

  motionChoices.forEach((choice) => {
    choice.setAttribute("aria-pressed", String(choice.dataset.motionChoice === nextMotionMode));
  });

  if (save) {
    try {
      localStorage.setItem("olga-motion", nextMotionMode);
    } catch (error) {
      // The selected preference still applies for the current visit when storage is unavailable.
    }
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
applyMotion(document.documentElement.dataset.motionMode || readSavedMotionMode());

themeChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    const updateTheme = () => applyTheme(choice.dataset.themeChoice, { save: true });

    if (!motionIsReduced() && typeof document.startViewTransition === "function") {
      document.startViewTransition(updateTheme);
      return;
    }

    if (!motionIsReduced()) {
      root.classList.add("is-theme-transitioning");
      window.requestAnimationFrame(updateTheme);
      window.clearTimeout(themeTransitionTimer);
      themeTransitionTimer = window.setTimeout(() => root.classList.remove("is-theme-transitioning"), 480);
      return;
    }

    updateTheme();
  });
});

motionChoices.forEach((choice) => {
  choice.addEventListener("click", () => applyMotion(choice.dataset.motionChoice, { save: true }));
});

systemTheme.addEventListener?.("change", () => {
  if ((document.documentElement.dataset.themeMode || readSavedThemeMode()) === "system") {
    applyTheme("system");
  }
});

systemReducedMotion.addEventListener?.("change", () => {
  if ((root.dataset.motionMode || readSavedMotionMode()) === "system") applyMotion("system");
});

finePointer.addEventListener?.("change", syncCustomCursorState);

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

if (cursorTrail) {
  const trailContext = cursorTrail.getContext("2d", { alpha: true });
  const trailLifetime = 620;
  const trailPoints = [];
  let trailFrame = 0;
  let trailPixelRatio = 1;
  let trailTarget = null;
  let trailHead = null;

  const colourWithAlpha = (colour, alpha) => {
    const match = colour.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return colour;

    const value = Number.parseInt(match[1], 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const readTrailPalette = () => {
    const styles = window.getComputedStyle(root);
    return {
      violet: styles.getPropertyValue("--aurora-violet").trim(),
      blue: styles.getPropertyValue("--aurora-blue").trim(),
      green: styles.getPropertyValue("--aurora-green").trim(),
    };
  };

  const resizeTrail = () => {
    trailPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    cursorTrail.width = Math.round(window.innerWidth * trailPixelRatio);
    cursorTrail.height = Math.round(window.innerHeight * trailPixelRatio);
    trailContext.setTransform(trailPixelRatio, 0, 0, trailPixelRatio, 0, 0);
    trailPoints.length = 0;
    trailTarget = null;
    trailHead = null;
  };

  const drawTrail = (now) => {
    trailFrame = 0;
    trailContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (motionIsReduced() || !finePointer.matches) {
      trailPoints.length = 0;
      trailTarget = null;
      trailHead = null;
      return;
    }

    if (trailTarget && trailHead) {
      const deltaX = trailTarget.x - trailHead.x;
      const deltaY = trailTarget.y - trailHead.y;
      const distanceToTarget = Math.hypot(deltaX, deltaY);

      if (distanceToTarget > 0.35) {
        trailHead.x += deltaX * 0.16;
        trailHead.y += deltaY * 0.16;
        trailPoints.push({ x: trailHead.x, y: trailHead.y, time: now });
        if (trailPoints.length > 38) trailPoints.shift();
      }
    }

    while (trailPoints.length && now - trailPoints[0].time > trailLifetime) trailPoints.shift();

    if (trailPoints.length > 1) {
      const firstPoint = trailPoints[0];
      const lastPoint = trailPoints[trailPoints.length - 1];
      const idleFade = Math.max(0, 1 - (now - lastPoint.time) / trailLifetime);
      const palette = readTrailPalette();
      const gradient = trailContext.createLinearGradient(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y);

      gradient.addColorStop(0, colourWithAlpha(palette.violet, 0));
      gradient.addColorStop(0.48, colourWithAlpha(palette.blue, 0.76));
      gradient.addColorStop(1, colourWithAlpha(palette.green, 0.94));

      trailContext.beginPath();
      trailContext.moveTo(firstPoint.x, firstPoint.y);

      for (let index = 1; index < trailPoints.length - 1; index += 1) {
        const point = trailPoints[index];
        const nextPoint = trailPoints[index + 1];
        trailContext.quadraticCurveTo(point.x, point.y, (point.x + nextPoint.x) / 2, (point.y + nextPoint.y) / 2);
      }

      trailContext.lineTo(lastPoint.x, lastPoint.y);
      trailContext.globalAlpha = 0.5 * idleFade;
      trailContext.lineCap = "round";
      trailContext.lineJoin = "round";
      trailContext.lineWidth = 2.1;
      trailContext.strokeStyle = gradient;
      trailContext.shadowBlur = 7;
      trailContext.shadowColor = colourWithAlpha(palette.blue, 0.24);
      trailContext.stroke();
      trailContext.globalAlpha = 1;
      trailContext.shadowBlur = 0;
    }

    const headIsMoving =
      trailTarget && trailHead && Math.hypot(trailTarget.x - trailHead.x, trailTarget.y - trailHead.y) > 0.35;
    if (trailPoints.length > 1 || headIsMoving) trailFrame = window.requestAnimationFrame(drawTrail);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (motionIsReduced() || !finePointer.matches || (event.pointerType && event.pointerType !== "mouse")) return;

      const now = performance.now();
      trailTarget = { x: event.clientX, y: event.clientY, time: now };

      if (!trailHead) {
        trailHead = { x: event.clientX, y: event.clientY };
        trailPoints.push({ x: event.clientX, y: event.clientY, time: now });
      }

      if (!trailFrame) trailFrame = window.requestAnimationFrame(drawTrail);
    },
    { passive: true },
  );

  window.addEventListener("resize", resizeTrail, { passive: true });
  resizeTrail();
}

if (cometCursor) {
  let cursorFrame = 0;
  let cursorX = -48;
  let cursorY = -48;

  const renderCursor = () => {
    cursorFrame = 0;
    cometCursor.style.setProperty("--cursor-x", `${cursorX - 3}px`);
    cometCursor.style.setProperty("--cursor-y", `${cursorY - 3}px`);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (motionIsReduced() || !finePointer.matches || (event.pointerType && event.pointerType !== "mouse")) return;

      cursorX = event.clientX;
      cursorY = event.clientY;
      cometCursor.classList.add("is-visible");
      if (!cursorFrame) cursorFrame = window.requestAnimationFrame(renderCursor);
    },
    { passive: true },
  );

  window.addEventListener(
    "pointerover",
    (event) => {
      const interactiveTarget = event.target.closest?.("a, button, summary, [role='button'], [tabindex='0']");
      cometCursor.classList.toggle("is-interactive", Boolean(interactiveTarget));
    },
    { passive: true },
  );

  window.addEventListener("pointerdown", () => cometCursor.classList.add("is-pressed"), { passive: true });
  window.addEventListener("pointerup", () => cometCursor.classList.remove("is-pressed"), { passive: true });
  window.addEventListener("blur", () => cometCursor.classList.remove("is-visible", "is-interactive", "is-pressed"));
  document.documentElement.addEventListener("mouseleave", () => cometCursor.classList.remove("is-visible"));
}

const openMenu = () => {
  if (!menu || typeof menu.showModal !== "function") return;

  window.clearTimeout(menuCloseTimer);
  menu.classList.remove("is-closing");
  menu.showModal();
  moveCustomCursorLayer(menu);
  document.body.classList.add("menu-open");
  syncCustomCursorState();
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

  if (motionIsReduced()) {
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
  moveCustomCursorLayer(document.body);
  syncCustomCursorState();
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
  if (!credits?.open || credits.classList.contains("is-closing") || motionIsReduced()) return;

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

    if (motionIsReduced()) {
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
