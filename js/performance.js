(() => {
  const STORAGE_KEY = "luxa-fit-performance-v1";
  const DEFAULTS = {
    bench: 135,
    squat: 170,
    deadlift: 215,
    fiveKm: "21:02",
    tenKm: "50:00",
    hyrox: "1:32:00",
  };
  const STRENGTH_RANKS = [
    { key: "bronze", name: "Bronze", bench: 70, squat: 90, deadlift: 110 },
    { key: "argent", name: "Argent", bench: 90, squat: 115, deadlift: 145 },
    { key: "or", name: "Or", bench: 105, squat: 135, deadlift: 165 },
    { key: "elite", name: "Elite", bench: 120, squat: 150, deadlift: 185 },
    {
      key: "champion",
      name: "Champion",
      bench: 130,
      squat: 160,
      deadlift: 200,
    },
    { key: "chad", name: "Chad", bench: 140, squat: 180, deadlift: 220 },
  ];
  const RUNNING_RANKS = [
    { key: "bronze", name: "Bronze", fiveKm: "30:00", tenKm: "60:00" },
    { key: "argent", name: "Argent", fiveKm: "27:00", tenKm: "54:00" },
    { key: "or", name: "Or", fiveKm: "23:00", tenKm: "50:00" },
    { key: "elite", name: "Elite", fiveKm: "21:30", tenKm: "43:00" },
    { key: "champion", name: "Champion", fiveKm: "19:00", tenKm: "38:00" },
    { key: "chad", name: "Chad", fiveKm: "17:59", tenKm: "35:59" },
  ];
  const HYROX_RANKS = [
    { key: "bronze", name: "Bronze", index: 0 },
    { key: "argent", name: "Argent", index: 1 },
    { key: "or", name: "Or", index: 2, seconds: 6300 },
    { key: "elite", name: "Elite", index: 3, seconds: 4800 },
    { key: "champion", name: "Champion", index: 4, seconds: 4200 },
    { key: "chad", name: "Chad", index: 5, seconds: 3600 },
  ];
  const RANK_CLASSES = STRENGTH_RANKS.map((rank) => `rank-${rank.key}`);
  const statusElement = document.querySelector("[data-performance-status]");

  function setStatus(message, state) {
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.dataset.state = state;
    } else if (state === "error") {
      console.error(message);
    }
  }

  function reportStorageError(message, error) {
    console.error(message, error);
    setStatus(message, "error");
  }

  function parseDuration(value) {
    if (typeof value !== "string") return null;
    const parts = value.trim().split(":");
    if (
      parts.length < 2 ||
      parts.length > 3 ||
      parts.some((part) => !/^\d+$/.test(part))
    )
      return null;

    const seconds = Number(parts[parts.length - 1]);
    if (seconds > 59) return null;
    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      return minutes * 60 + seconds;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (minutes > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  function formatRunTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function formatHyroxTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    if (hours === 0)
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return `${hours}H${minutes}`;
  }

  function formatHyroxLong(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    return hours === 0
      ? `${Math.floor(seconds / 60)} min`
      : `${hours} h ${minutes}`;
  }

  function canonicalHyroxTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const remainder = String(seconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${remainder}`;
  }

  function formatWeight(value) {
    return String(Number(value.toFixed(1)));
  }

  function normalizePerformance(value) {
    if (!value || typeof value !== "object") return null;
    const weights = ["bench", "squat", "deadlift"];
    if (
      weights.some(
        (key) =>
          !Number.isFinite(Number(value[key])) ||
          Number(value[key]) <= 0 ||
          Number(value[key]) > 1000,
      )
    )
      return null;

    const fiveKm = parseDuration(value.fiveKm);
    const tenKm = parseDuration(value.tenKm);
    const hyrox = parseDuration(value.hyrox);
    if (
      ![fiveKm, tenKm, hyrox].every(
        (seconds) =>
          Number.isInteger(seconds) && seconds > 0 && seconds <= 86400,
      )
    )
      return null;

    return {
      bench: Number(value.bench),
      squat: Number(value.squat),
      deadlift: Number(value.deadlift),
      fiveKm: formatRunTime(fiveKm),
      tenKm: formatRunTime(tenKm),
      hyrox: canonicalHyroxTime(hyrox),
    };
  }

  function loadPerformance() {
    let serialized;
    try {
      serialized = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      reportStorageError(
        "Le stockage local est inaccessible; les valeurs de départ sont affichées.",
        error,
      );
      return { data: { ...DEFAULTS }, saved: false, error: true };
    }

    if (serialized === null)
      return { data: { ...DEFAULTS }, saved: false, error: false };

    let parsed;
    try {
      parsed = JSON.parse(serialized);
    } catch (error) {
      reportStorageError(
        "Les performances enregistrées sont illisibles; réenregistre des valeurs valides pour les remplacer.",
        error,
      );
      return { data: { ...DEFAULTS }, saved: false, error: true };
    }

    const normalized = normalizePerformance(parsed);
    if (!normalized) {
      reportStorageError(
        "Les performances enregistrées ne sont pas valides; les valeurs de départ sont affichées.",
        new Error("Stored performance data failed validation."),
      );
      return { data: { ...DEFAULTS }, saved: false, error: true };
    }

    return { data: normalized, saved: true, error: false };
  }

  function savePerformance(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      reportStorageError(
        "Impossible d'enregistrer les performances dans ce navigateur.",
        error,
      );
      return false;
    }
  }

  function strengthRank(data) {
    let current = null;
    STRENGTH_RANKS.forEach((rank) => {
      if (
        data.bench >= rank.bench &&
        data.squat >= rank.squat &&
        data.deadlift >= rank.deadlift
      )
        current = rank;
    });
    return current;
  }

  function runningRank(data) {
    let current = null;
    RUNNING_RANKS.forEach((rank) => {
      if (
        parseDuration(data.fiveKm) <= parseDuration(rank.fiveKm) &&
        parseDuration(data.tenKm) <= parseDuration(rank.tenKm)
      )
        current = rank;
    });
    return current;
  }

  function hyroxRank(data) {
    const seconds = parseDuration(data.hyrox);
    let current = seconds > 0 ? HYROX_RANKS[1] : null;
    HYROX_RANKS.slice(2).forEach((rank) => {
      if (seconds <= rank.seconds) current = rank;
    });
    return current;
  }

  function getRanks(data) {
    return {
      strength: strengthRank(data),
      running: runningRank(data),
      hyrox: hyroxRank(data),
    };
  }

  function displayValue(key, data) {
    if (key === "hyroxShort") return formatHyroxTime(parseDuration(data.hyrox));
    if (key === "hyroxLong") return formatHyroxLong(parseDuration(data.hyrox));
    if (key === "fiveKm" || key === "tenKm") return data[key];
    if (["bench", "squat", "deadlift"].includes(key))
      return formatWeight(data[key]);
    return "";
  }

  function displayRank(rank) {
    return rank ? rank.name : "En progression";
  }

  function renderRankBadges(ranks) {
    document
      .querySelectorAll("[data-performance-rank-badge]")
      .forEach((badge) => {
        const rank = ranks[badge.dataset.performanceRankBadge];
        badge.classList.remove(...RANK_CLASSES, "rank-unranked");
        badge.classList.add(rank ? `rank-${rank.key}` : "rank-unranked");
        badge.setAttribute("aria-label", `Rang actuel : ${displayRank(rank)}`);
      });
  }

  function renderRankLadders(ranks) {
    document.querySelectorAll("[data-performance-ranks]").forEach((list) => {
      const rank = ranks[list.dataset.performanceRanks];
      list.querySelectorAll("[data-rank-key]").forEach((row) => {
        const isCurrent = Boolean(rank && row.dataset.rankKey === rank.key);
        row.classList.toggle("is-current", isCurrent);
        if (isCurrent) row.setAttribute("aria-current", "true");
        else row.removeAttribute("aria-current");

        const title = row.querySelector(".rank-title");
        const note = row.querySelector(".rank-current-note");
        if (isCurrent && title && !note) {
          const currentNote = document.createElement("span");
          currentNote.className = "rank-current-note";
          currentNote.textContent = "Ton rang";
          title.append(currentNote);
        } else if (!isCurrent && note) {
          note.remove();
        }
      });
    });
  }

  function updateProgressItem(item, data) {
    const type = item.dataset.performanceProgress;
    const metric = item.dataset.performanceMetric;
    let currentLabel = "";
    let targetLabel = "";
    let percentage = 0;

    if (type === "strength") {
      const current = data[metric];
      const target = Number(item.dataset.targetValue);
      if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0)
        return;
      currentLabel = `${formatWeight(current)} kg`;
      targetLabel = `${formatWeight(target)} kg`;
      percentage = (current / target) * 100;
    } else if (type === "running") {
      const current = parseDuration(data[metric]);
      const target = parseDuration(item.dataset.targetTime);
      if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0)
        return;
      currentLabel = formatRunTime(current);
      targetLabel = item.dataset.targetLabel || formatRunTime(target);
      percentage = (target / current) * 100;
    } else if (type === "hyrox") {
      const current = parseDuration(data.hyrox);
      const target = parseDuration(item.dataset.targetTime);
      const start = parseDuration(item.dataset.startTime);
      if (
        ![current, target, start].every(Number.isFinite) ||
        target <= 0 ||
        start <= target
      )
        return;
      currentLabel = formatHyroxTime(current);
      targetLabel = item.dataset.targetLabel || formatHyroxTime(target);
      percentage = ((start - current) / (start - target)) * 100;
    } else {
      return;
    }

    const value = Math.max(0, Math.min(100, Math.round(percentage)));
    const currentElement = item.querySelector("[data-performance-current]");
    const percentageElement = item.querySelector("[data-performance-percent]");
    const fill = item.querySelector(".progress-track span");
    const progressBar = item.querySelector('[role="progressbar"]');
    if (currentElement) currentElement.textContent = currentLabel;
    if (percentageElement) percentageElement.textContent = `${value}%`;
    if (fill) fill.style.setProperty("--progress", `${value}%`);
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", String(value));
      progressBar.setAttribute(
        "aria-valuetext",
        `${currentLabel}, progression vers ${targetLabel}, ${value} pour cent`,
      );
      progressBar.setAttribute(
        "aria-label",
        `${item.dataset.performanceLabel || metric} : ${currentLabel}, cible ${targetLabel}`,
      );
    }
  }

  function render(data) {
    const ranks = getRanks(data);

    document
      .querySelectorAll("[data-performance-display]")
      .forEach((element) => {
        element.textContent = displayValue(
          element.dataset.performanceDisplay,
          data,
        );
      });
    document
      .querySelectorAll("[data-performance-rank-name]")
      .forEach((element) => {
        element.textContent = displayRank(
          ranks[element.dataset.performanceRankName],
        );
      });
    document
      .querySelectorAll("[data-performance-rank-label]")
      .forEach((element) => {
        const rank = ranks[element.dataset.performanceRankLabel];
        element.textContent = rank
          ? `HYROX · RANG ${rank.name.toUpperCase()}`
          : "HYROX · À CLASSER";
      });
    renderRankBadges(ranks);
    renderRankLadders(ranks);

    const hyroxCard = document.querySelector('[data-rank-system="hyrox"]');
    if (hyroxCard) {
      hyroxCard.dataset.currentSeconds = String(parseDuration(data.hyrox));
      hyroxCard.dataset.currentRankOrder = String(
        ranks.hyrox ? ranks.hyrox.index : -1,
      );
      const current = hyroxCard.querySelector(
        '[data-performance-current="hyrox"]',
      );
      if (current) current.textContent = displayValue("hyroxShort", data);
    }

    const strengthCard = document.querySelector(
      '[data-rank-system="strength"]',
    );
    if (strengthCard) {
      strengthCard.querySelectorAll("[data-rank-metric]").forEach((item) => {
        const current = data[item.dataset.rankMetric];
        item.dataset.currentValue = String(current);
        const currentElement = item.querySelector("[data-performance-current]");
        if (currentElement) currentElement.textContent = formatWeight(current);
      });
    }

    const runningCard = document.querySelector('[data-rank-system="running"]');
    if (runningCard) {
      runningCard.querySelectorAll("[data-rank-metric]").forEach((item) => {
        const current = data[item.dataset.rankMetric];
        item.dataset.currentTime = current;
        const currentElement = item.querySelector("[data-performance-current]");
        if (currentElement) currentElement.textContent = current;
      });
    }

    document
      .querySelectorAll("[data-performance-progress]")
      .forEach((item) => updateProgressItem(item, data));
    document
      .querySelectorAll("[data-performance-preview-rank]")
      .forEach((element) => {
        element.textContent = displayRank(
          ranks[element.dataset.performancePreviewRank],
        );
      });
  }

  const initial = loadPerformance();
  let activeData = initial.data;

  document.querySelectorAll("[data-performance-form]").forEach((form) => {
    const inputNames = [
      "bench",
      "squat",
      "deadlift",
      "fiveKm",
      "tenKm",
      "hyrox",
    ];
    inputNames.forEach((name) => {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement) input.value = activeData[name];
    });

    form.addEventListener(
      "invalid",
      () => {
        setStatus("Vérifie les champs signalés avant d'enregistrer.", "error");
      },
      true,
    );

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) {
        setStatus("Vérifie les champs signalés avant d'enregistrer.", "error");
        return;
      }

      const candidate = {};
      inputNames.forEach((name) => {
        const input = form.elements.namedItem(name);
        candidate[name] =
          input instanceof HTMLInputElement &&
          ["bench", "squat", "deadlift"].includes(name)
            ? Number(input.value)
            : input instanceof HTMLInputElement
              ? input.value.trim()
              : "";
      });
      const normalized = normalizePerformance(candidate);
      if (!normalized) {
        setStatus(
          "Certaines valeurs ne sont pas valides. Vérifie les poids et le format des chronos.",
          "error",
        );
        return;
      }
      if (!savePerformance(normalized)) return;

      activeData = normalized;
      render(activeData);
      setStatus("Performances enregistrées sur cet appareil.", "success");
      window.dispatchEvent(
        new CustomEvent("luxafit:performancechange", {
          detail: { ...activeData },
        }),
      );
    });
  });

  render(activeData);
  if (statusElement && !initial.error) {
    setStatus(
      initial.saved
        ? "Valeurs chargées depuis ce navigateur."
        : "Valeurs de départ affichées. Enregistre tes changements pour les conserver sur cet appareil.",
      "info",
    );
  }
})();
