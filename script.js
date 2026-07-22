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
