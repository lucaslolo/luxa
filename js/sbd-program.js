(() => {
  const STORAGE_KEY = "luxa-fit-performance-v1";
  const results = document.getElementById("sbd-program-results");
  const status = document.querySelector("[data-sbd-status]");
  const levelInput = document.getElementById("sbd-level");
  const generateButton = document.querySelector("[data-generate-sbd]");

  if (
    !results ||
    !status ||
    !(levelInput instanceof HTMLSelectElement) ||
    !(generateButton instanceof HTMLButtonElement)
  ) {
    throw new Error(
      "Le générateur SBD nécessite son niveau, son statut et sa zone de résultats.",
    );
  }

  const lifts = {
    squat: "Squat",
    bench: "Développé couché",
    deadlift: "Soulevé de terre",
  };
  const levels = {
    beginner: {
      label: "Débutant",
      frequency: "3 séances par semaine",
      sessions: [
        { day: "Jour 1", exercises: ["squat", "bench"] },
        { day: "Jour 2", exercises: ["deadlift", "bench"] },
        { day: "Jour 3", exercises: ["squat", "bench"] },
      ],
      weeks: [
        { phase: "Accumulation", percentage: 65, sets: 3, reps: 5 },
        { phase: "Progression", percentage: 70, sets: 3, reps: 5 },
        { phase: "Intensification", percentage: 75, sets: 4, reps: 4 },
        { phase: "Deload", percentage: 55, sets: 2, reps: 5, deload: true },
      ],
    },
    expert: {
      label: "Expert",
      frequency: "4 séances par semaine",
      sessions: [
        { day: "Jour 1", exercises: ["squat", "bench"] },
        { day: "Jour 2", exercises: ["deadlift"] },
        { day: "Jour 3", exercises: ["squat", "bench"] },
        { day: "Jour 4", exercises: ["deadlift", "bench"] },
      ],
      weeks: [
        { phase: "Accumulation", percentage: 70, sets: 3, reps: 5 },
        { phase: "Progression", percentage: 75, sets: 4, reps: 4 },
        { phase: "Intensification", percentage: 82.5, sets: 4, reps: 3 },
        { phase: "Deload", percentage: 60, sets: 2, reps: 3, deload: true },
      ],
    },
  };

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function formatWeight(weight) {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 1,
    }).format(weight);
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function createCell(row, tagName, text, scope, label) {
    const cell = createTextElement(tagName, "", text);
    if (scope) cell.scope = scope;
    if (label) cell.dataset.label = label;
    row.append(cell);
  }

  function readMaxes() {
    const maxes = {};
    for (const liftKey of Object.keys(lifts)) {
      const element = document.querySelector(`[data-sbd-max="${liftKey}"]`);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`L'affichage du 1RM "${liftKey}" est manquant.`);
      }

      const value = Number(element.dataset.sbdValue || element.textContent.trim());
      if (!Number.isFinite(value) || value < 10 || value > 1000) {
        setStatus(
          `Le 1RM ${lifts[liftKey]} chargé depuis le Dashboard est invalide.`,
          "error",
        );
        return null;
      }
      maxes[liftKey] = value;
    }
    return maxes;
  }

  function updateMaxes(data) {
    const values = {};
    for (const liftKey of Object.keys(lifts)) {
      const value = Number(data[liftKey]);
      if (!Number.isFinite(value) || value < 10 || value > 1000) {
        setStatus(
          `Le 1RM ${lifts[liftKey]} reçu depuis le Dashboard est invalide.`,
          "error",
        );
        return;
      }
      values[liftKey] = value;
    }

    Object.entries(values).forEach(([liftKey, value]) => {
      const element = document.querySelector(`[data-sbd-max="${liftKey}"]`);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`L'affichage du 1RM "${liftKey}" est manquant.`);
      }
      element.dataset.sbdValue = String(value);
      element.textContent = formatWeight(value);
    });

    if (!results.hidden) {
      results.hidden = true;
      setStatus(
        "Tes records ont changé. Génère à nouveau le bloc pour actualiser les charges.",
        "info",
      );
    }
  }

  function renderProgram(level, maxes) {
    results.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "sbd-result-heading";
    heading.append(
      createTextElement("h3", "", `Bloc SBD · ${level.label}`),
      createTextElement(
        "p",
        "",
        `${level.frequency} · progression calculée à partir des 1RM du Dashboard.`,
      ),
    );
    results.append(heading);

    const weekGrid = document.createElement("div");
    weekGrid.className = "sbd-week-grid";
    weekGrid.dataset.mobileCarousel = "program-weeks";

    level.weeks.forEach((week, weekIndex) => {
      const card = document.createElement("article");
      card.className = `sbd-week-card${week.deload ? " is-deload" : ""}`;

      card.append(
        createTextElement("p", "eyebrow", `SEMAINE ${weekIndex + 1}`),
        createTextElement("h4", "", week.phase),
        createTextElement(
          "p",
          "sbd-week-meta",
          `${formatWeight(week.percentage)} % du 1RM · ${week.sets} × ${week.reps}${week.deload ? " · volume réduit" : ""}`,
        ),
      );

      const tableWrap = document.createElement("div");
      tableWrap.className = "sbd-table-wrap";
      const table = document.createElement("table");
      table.className = "sbd-program-table";
      table.setAttribute("aria-label", `Programme SBD semaine ${weekIndex + 1}`);

      const head = document.createElement("thead");
      const headerRow = document.createElement("tr");
      const headings = [
        "Séance",
        "Mouvement",
        "Séries × reps",
        "% du 1RM",
        "Charge",
      ];
      headings.forEach((headingText) =>
        createCell(headerRow, "th", headingText, "col"),
      );
      head.append(headerRow);

      const body = document.createElement("tbody");
      level.sessions.forEach((session) => {
        session.exercises.forEach((liftKey) => {
          const row = document.createElement("tr");
          const load =
            Math.round((maxes[liftKey] * week.percentage) / 100 / 2.5) * 2.5;
          createCell(row, "td", session.day, "", headings[0]);
          createCell(row, "td", lifts[liftKey], "", headings[1]);
          createCell(
            row,
            "td",
            `${week.sets} × ${week.reps}`,
            "",
            headings[2],
          );
          createCell(
            row,
            "td",
            `${formatWeight(week.percentage)} %`,
            "",
            headings[3],
          );
          createCell(row, "td", `${formatWeight(load)} kg`, "", headings[4]);
          body.append(row);
        });
      });

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
      updateMaxes(JSON.parse(value));
    } catch (error) {
      console.error("Impossible de lire les records du Dashboard.", error);
      setStatus(
        "Impossible de lire les records du Dashboard. Vérifie-les depuis cette page.",
        "error",
      );
    }
  }

  window.addEventListener("luxafit:performancechange", (event) => {
    updateMaxes(event.detail);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      refreshFromStorage(event.newValue);
    }
  });
  levelInput.addEventListener("change", () => {
    if (!results.hidden) {
      results.hidden = true;
      setStatus("Niveau modifié. Génère le bloc pour afficher le nouveau programme.", "info");
    }
  });
  generateButton.addEventListener("click", () => {
    if (!Object.prototype.hasOwnProperty.call(levels, levelInput.value)) {
      setStatus("Choisis un niveau valide pour générer le bloc.", "error");
      return;
    }

    const maxes = readMaxes();
    if (!maxes) return;

    const level = levels[levelInput.value];
    renderProgram(level, maxes);
    setStatus(
      `Bloc ${level.label.toLowerCase()} généré à partir des records du Dashboard.`,
      "success",
    );
  });
})();
