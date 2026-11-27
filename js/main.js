const loader = document.getElementById("loader");
const INTRO_KEY = "luxa-intro-seen";
let loaderHidden = false;
const hideLoader = () => {
  if (loaderHidden || !loader) return;
  loaderHidden = true;
  loader.classList.add("done");
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch (error) {
    /* stockage indisponible : l'intro sera rejouée */
  }
};
if (document.documentElement.classList.contains("intro-seen")) {
  loaderHidden = true;
} else if (loader) {
  // Intro jouée une seule fois par session, sans attendre plus que nécessaire.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const introDelay = reducedMotion ? 150 : 900;
  if (document.readyState === "complete") {
    window.setTimeout(hideLoader, introDelay);
  } else {
    window.addEventListener("load", () =>
      window.setTimeout(hideLoader, introDelay),
    );
  }
  // Filet de sécurité si une ressource externe tarde à charger.
  window.setTimeout(hideLoader, 2600);
  loader.addEventListener("click", hideLoader);
}

const header = document.querySelector(".header");
const menu = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
if (nav && !nav.id) nav.id = "navigation-principale";
menu?.setAttribute("aria-controls", nav?.id || "");

const setMenu = (open) => {
  if (!nav || !menu) return;
  nav.classList.toggle("open", open);
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  menu.textContent = open ? "✕" : "☰";
};
menu?.addEventListener("click", () => {
  setMenu(!nav.classList.contains("open"));
});
nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav?.classList.contains("open")) {
    setMenu(false);
    menu?.focus();
  }
});
document.addEventListener("click", (event) => {
  if (
    nav?.classList.contains("open") &&
    header &&
    !header.contains(event.target)
  )
    setMenu(false);
});

// Page courante dans la navigation.
const currentPage = (
  window.location.pathname.split("/").pop() || "index.html"
).replace(/\.html$/, "");
nav?.querySelectorAll("a").forEach((link) => {
  if (link.hasAttribute("aria-current")) return;
  const href = link.getAttribute("href") || "";
  if (href.startsWith("#") || href.includes("#")) return;
  const page = href.split("/").pop().replace(/\.html$/, "") || "index";
  if (page === (currentPage || "index")) link.setAttribute("aria-current", "page");
});

// Section active sur la page d'accueil.
const sectionLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
if (sectionLinks.length && "IntersectionObserver" in window) {
  const linkFor = new Map();
  sectionLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (section) linkFor.set(section, link);
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = linkFor.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          sectionLinks.forEach((other) => other.removeAttribute("aria-current"));
          link.setAttribute("aria-current", "location");
        } else if (link.getAttribute("aria-current") === "location") {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  linkFor.forEach((_, section) => observer.observe(section));
}

// Ombre de l'en-tête au défilement.
if (header) {
  const onScroll = () =>
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Lien d'évitement : place le focus dans le contenu.
document.querySelector(".skip-link")?.addEventListener("click", (event) => {
  const target = document.querySelector(
    event.currentTarget.getAttribute("href"),
  );
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: false });
});

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const parseRankTime = (value) => {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
};

const formatHyroxTime = (seconds) => {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}H${minutes}`;
};

const updateRankProgress = (
  item,
  percentage,
  targetLabel,
  ariaLabel,
  ariaValueText,
  targetValue,
) => {
  const track = item.querySelector("[data-rank-progress]");
  const fill = item.querySelector("[data-rank-fill]");
  if (!track || !fill) return;

  const value = Math.max(0, Math.min(100, Math.round(percentage)));
  track.setAttribute("aria-valuenow", String(value));
  track.setAttribute("aria-valuetext", ariaValueText);
  track.setAttribute("aria-label", ariaLabel);
  fill.style.setProperty("--progress", `${value}%`);

  const targetLabelElement = item.querySelector("[data-rank-target-label]");
  const percentageElement = item.querySelector("[data-rank-percent]");
  const targetValueElement = item.querySelector("[data-rank-target-value]");
  if (targetLabelElement) targetLabelElement.textContent = targetLabel;
  if (percentageElement) percentageElement.textContent = `${value}%`;
  if (targetValueElement && targetValue !== undefined)
    targetValueElement.textContent = targetValue;
};

document.querySelectorAll("[data-rank-system]").forEach((card) => {
  const select = card.querySelector("[data-rank-select]");
  if (!(select instanceof HTMLSelectElement)) return;

  const update = () => {
    const option = select.selectedOptions[0];
    if (!option) return;
    const rank = option.textContent.trim();
    const system = card.dataset.rankSystem;

    if (system === "hyrox") {
      const item = card.querySelector(".progress-item");
      if (!item) return;
      const currentSeconds = Number(card.dataset.currentSeconds);
      const startSeconds = Number(card.dataset.startSeconds);
      const targetSeconds = option.dataset.targetTime
        ? parseRankTime(option.dataset.targetTime)
        : NaN;
      const targetOrder = Number(option.dataset.rankOrder);
      const currentOrder = Number(card.dataset.currentRankOrder);
      const currentTimeLabel =
        card
          .querySelector('[data-performance-current="hyrox"]')
          ?.textContent.trim() || formatHyroxTime(currentSeconds);
      if (!Number.isFinite(currentSeconds) || !Number.isFinite(startSeconds))
        return;

      const alreadyReached =
        targetOrder <= currentOrder ||
        (Number.isFinite(targetSeconds) && currentSeconds <= targetSeconds);
      const percentage =
        alreadyReached || !Number.isFinite(targetSeconds)
          ? 100
          : ((startSeconds - currentSeconds) / (startSeconds - targetSeconds)) *
            100;
      const targetTime = Number.isFinite(targetSeconds)
        ? formatHyroxTime(targetSeconds)
        : "";
      const targetLabel = alreadyReached
        ? `Rang ${rank} déjà atteint`
        : `Départ 2H · Cible ${rank} : ${targetTime}`;
      const heading = item.querySelector("[data-rank-heading]");
      if (heading) heading.textContent = `Progression vers ${rank}`;
      updateRankProgress(
        item,
        percentage,
        targetLabel,
        `Progression HYROX vers le rang ${rank}`,
        `Chrono actuel ${currentTimeLabel}, cible ${targetTime || "course terminée"}, ${Math.round(percentage)} pour cent vers ${rank}`,
      );
      return;
    }

    card
      .querySelectorAll(".progress-item[data-rank-metric]")
      .forEach((item) => {
        const metric = item.dataset.rankMetric;
        const metricLabel =
          item.querySelector(".progress-heading > span")?.textContent.trim() ||
          metric;

        if (system === "strength") {
          const current = Number(item.dataset.currentValue);
          const target = Number(option.dataset[metric]);
          if (
            !Number.isFinite(current) ||
            !Number.isFinite(target) ||
            target <= 0
          )
            return;
          const percentage = (current / target) * 100;
          updateRankProgress(
            item,
            percentage,
            `Rang ${rank} · ${target} kg`,
            `${metricLabel} : ${current} sur ${target} kg, rang ${rank}`,
            `${current} kg sur ${target} kg vers ${rank}, ${Math.round(percentage)} pour cent`,
            String(target),
          );
          return;
        }

        if (system === "running") {
          const currentSeconds = parseRankTime(item.dataset.currentTime);
          const targetTime = option.dataset[metric];
          const targetLabel = option.dataset[`${metric}Label`] || targetTime;
          const targetSeconds = targetTime ? parseRankTime(targetTime) : NaN;
          if (
            !Number.isFinite(currentSeconds) ||
            !Number.isFinite(targetSeconds) ||
            targetSeconds <= 0
          )
            return;
          const percentage = (targetSeconds / currentSeconds) * 100;
          updateRankProgress(
            item,
            percentage,
            `Rang ${rank} · ${targetLabel}`,
            `${metricLabel} : ${item.dataset.currentTime} vers ${targetLabel} pour le rang ${rank}`,
            `${item.dataset.currentTime} vers ${targetLabel}, indice de progression de ${Math.round(percentage)} pour cent`,
            targetLabel,
          );
        }
      });
  };

  select.addEventListener("change", update);
  update();
});
