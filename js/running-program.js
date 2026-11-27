(() => {
  const STORAGE_KEY = "luxa-fit-performance-v1";
  const results = document.getElementById("running-program-results");
  const status = document.querySelector("[data-running-status]");
  const distanceInput = document.querySelector("[data-running-distance]");
  const generateButton = document.querySelector("[data-generate-running]");

  if (
    !results ||
    !status ||
    !(distanceInput instanceof HTMLSelectElement) ||
    !(generateButton instanceof HTMLButtonElement)
  ) {
    throw new Error(
      "Le générateur de course nécessite sa distance, son statut et sa zone de résultats.",
    );
  }

  const plans = {
    5: {
      label: "5 km",
      weeks: [
        {
          phase: "Base",
          easy: 35,
          long: 40,
          intervals: "6 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
        },
        {
          phase: "Base",
          easy: 35,
          long: 45,
          intervals: "8 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
        },
        {
          phase: "Développement",
          easy: 40,
          long: 50,
          intervals: "5 × 600 m",
          recovery: "2 min trot",
          pace: "fiveKm",
        },
        {
          phase: "Semaine allégée",
          easy: 30,
          long: 40,
          intervals: "4 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
          deload: true,
        },
        {
          phase: "Développement",
          easy: 40,
          long: 50,
          intervals: "5 × 800 m",
          recovery: "2 min trot",
          pace: "fiveKm",
        },
        {
          phase: "Développement",
          easy: 45,
          long: 55,
          intervals: "6 × 800 m",
          recovery: "2 min trot",
          pace: "fiveKm",
        },
        {
          phase: "Affûtage",
          easy: 35,
          long: 45,
          intervals: "3 × 1 000 m",
          recovery: "2 min 30 trot",
          pace: "fiveKm",
        },
        {
          phase: "Affûtage & test",
          easy: 25,
          intervals: "4 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
          test: true,
        },
      ],
    },
    10: {
      label: "10 km",
      weeks: [
        {
          phase: "Base",
          easy: 35,
          long: 50,
          intervals: "6 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
        },
        {
          phase: "Base",
          easy: 40,
          long: 55,
          intervals: "5 × 800 m",
          recovery: "2 min trot",
          pace: "tenKm",
        },
        {
          phase: "Développement",
          easy: 40,
          long: 60,
          intervals: "4 × 1 000 m",
          recovery: "2 min trot",
          pace: "tenKm",
        },
        {
          phase: "Semaine allégée",
          easy: 30,
          long: 45,
          intervals: "4 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
          deload: true,
        },
        {
          phase: "Développement",
          easy: 45,
          long: 65,
          intervals: "5 × 1 000 m",
          recovery: "2 min trot",
          pace: "tenKm",
        },
        {
          phase: "Développement",
          easy: 45,
          long: 70,
          intervals: "3 × 1 600 m",
          recovery: "3 min trot",
          pace: "tenKm",
        },
        {
          phase: "Affûtage",
          easy: 40,
          long: 60,
          intervals: "2 × 2 000 m",
          recovery: "3 min trot",
          pace: "tenKm",
        },
        {
          phase: "Affûtage & test",
          easy: 25,
          intervals: "4 × 400 m",
          recovery: "200 m trot",
          pace: "fiveKm",
          test: true,
        },
      ],
    },
  };

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function parseTime(value) {
    if (typeof value !== "string" || !/^\d{1,3}:[0-5]\d$/.test(value)) {
      return null;
    }

    const [minutes, seconds] = value.split(":").map(Number);
    const total = minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  function formatPace(secondsPerKilometer) {
    const rounded = Math.round(secondsPerKilometer);
    const minutes = Math.floor(rounded / 60);
    const seconds = String(rounded % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function readTimes() {
    const times = {};
    for (const key of ["fiveKm", "tenKm"]) {
      const element = document.querySelector(`[data-running-time="${key}"]`);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Le chrono "${key}" est manquant.`);
      }

      const value = element.dataset.runningValue || element.textContent.trim();
      const seconds = parseTime(value);
      if (!seconds) {
        setStatus(
          `Le chrono ${key === "fiveKm" ? "5 km" : "10 km"} chargé depuis le Dashboard est invalide.`,
          "error",
        );
        return null;
      }
      times[key] = seconds;
    }
    return times;
  }

  function updateTimes(data) {
    const values = {};
    for (const key of ["fiveKm", "tenKm"]) {
      const value = data[key];
      if (!parseTime(value)) {
        setStatus(
          `Le chrono ${key === "fiveKm" ? "5 km" : "10 km"} reçu depuis le Dashboard est invalide.`,
          "error",
        );
        return;
      }
      values[key] = value;
    }

    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-running-time="${key}"]`);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Le chrono "${key}" est manquant.`);
      }
      element.dataset.runningValue = value;
      element.textContent = value;
    });

    if (!results.hidden) {
      results.hidden = true;
      setStatus(
        "Tes chronos ont changé. Génère à nouveau le plan pour actualiser les allures.",
        "info",
      );
    }
  }

  function createRunRow(body, day, session, detail) {
    const row = document.createElement("tr");
    ["Séance", "Type", "Contenu"].forEach((label, index) => {
      const value = [day, session, detail][index];
      const cell = createTextElement("td", "", value);
      cell.dataset.label = label;
      row.append(cell);
    });
    body.append(row);
  }

  function renderPlan(plan, times, distance) {
    results.replaceChildren();

    const racePace = times[distance === "5" ? "fiveKm" : "tenKm"] / Number(distance);
    const fiveKmPace = times.fiveKm / 5;
    const weekGrid = document.createElement("div");
    weekGrid.className = "sbd-week-grid";
    weekGrid.dataset.mobileCarousel = "program-weeks";

    const heading = document.createElement("div");
    heading.className = "sbd-result-heading";
    heading.append(
      createTextElement("h3", "", `Plan course · ${plan.label}`),
      createTextElement(
        "p",
        "",
        `8 semaines · 3 sorties par semaine · allures indicatives calculées à partir de tes chronos du Dashboard.`,
      ),
    );
    results.append(heading);

    plan.weeks.forEach((week, index) => {
      const card = document.createElement("article");
      card.className = `sbd-week-card${week.deload || week.test ? " is-deload" : ""}`;
      card.append(
        createTextElement("p", "eyebrow", `SEMAINE ${index + 1}`),
        createTextElement("h4", "", week.phase),
        createTextElement(
          "p",
          "sbd-week-meta",
          week.test ? "3 sorties · test en fin de semaine" : "3 sorties · footing, qualité, sortie longue",
        ),
      );

      const tableWrap = document.createElement("div");
      tableWrap.className = "sbd-table-wrap";
      const table = document.createElement("table");
      table.className = "sbd-program-table running-program-table";
      table.setAttribute("aria-label", `Plan de course semaine ${index + 1}`);

      const head = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["Séance", "Type", "Contenu"].forEach((text) => {
        const cell = createTextElement("th", "", text);
        cell.scope = "col";
        headerRow.append(cell);
      });
      head.append(headerRow);

      const body = document.createElement("tbody");
      const easyRange = `${formatPace(racePace + 60)}–${formatPace(
        racePace + 90,
      )} min/km`;
      createRunRow(
        body,
        "Sortie 1",
        "Footing facile",
        `${week.easy} min à ${easyRange} (allure où tu peux parler).`,
      );

      const workPace = week.pace === "fiveKm" ? fiveKmPace : racePace;
      createRunRow(
        body,
        "Sortie 2",
        "Séance de qualité",
        `10–15 min d'échauffement, ${week.intervals} à ${formatPace(workPace)} min/km, récupération ${week.recovery}, puis 10 min faciles.`,
      );

      createRunRow(
        body,
        "Sortie 3",
        week.test ? `Test ${plan.label}` : "Sortie longue",
        week.test
          ? `Cours ${plan.label} à effort régulier et note ton nouveau chrono.`
          : `${week.long} min à ${easyRange}, en restant confortable.`,
      );

      table.append(head, body);
      tableWrap.append(table);
      card.append(tableWrap);
      weekGrid.append(card);
    });

    results.append(weekGrid);
    results.hidden = false;
  }

  function refreshFromStorage(value) {
    try {
      updateTimes(JSON.parse(value));
    } catch (error) {
      console.error("Impossible de lire les chronos du Dashboard.", error);
      setStatus(
        "Impossible de lire les chronos du Dashboard. Vérifie-les depuis cette page.",
        "error",
      );
    }
  }

  window.addEventListener("luxafit:performancechange", (event) => {
    updateTimes(event.detail);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      refreshFromStorage(event.newValue);
    }
  });
  distanceInput.addEventListener("change", () => {
    if (!results.hidden) {
      results.hidden = true;
      setStatus("Distance modifiée. Génère le plan pour afficher le nouvel objectif.", "info");
    }
  });
  generateButton.addEventListener("click", () => {
    if (!Object.prototype.hasOwnProperty.call(plans, distanceInput.value)) {
      setStatus("Choisis un objectif valide (5 km ou 10 km).", "error");
      return;
    }

    const times = readTimes();
    if (!times) return;

    const plan = plans[distanceInput.value];
    renderPlan(plan, times, distanceInput.value);
    setStatus(
      `Plan ${plan.label} généré à partir de tes chronos du Dashboard.`,
      "success",
    );
  });
})();
