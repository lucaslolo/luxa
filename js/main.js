const loader = document.getElementById("loader");
window.addEventListener("load", () => {
  window.setTimeout(() => loader?.classList.add("done"), 1250);
});
const menu = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
menu?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
  });
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
