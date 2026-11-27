(() => {
  const STORAGE_KEY = "luxa-fit-performance-v1";
  const squatMaxElement = document.querySelector("[data-hyrox-squat-max]");
  const tenKmElement = document.querySelector("[data-hyrox-ten-km]");
  const results = document.getElementById("hyrox-program-results");
  const status = document.querySelector("[data-hyrox-status]");

  if (
    !(squatMaxElement instanceof HTMLElement) ||
    !(tenKmElement instanceof HTMLElement) ||
    !results ||
    !status
  ) {
    throw new Error(
      "Le programme HYROX nécessite les repères du Dashboard, son statut et sa zone de résultats.",
    );
  }

  const weeks = [
    {
      phase: "Base",
      squat: { sets: 4, reps: 5, percentage: 70 },
      run: "6 × 800 m à effort contrôlé (RPE 7), récupération 2 min en trot.",
      runPace: "tenKm",
      hybrid:
        "3 tours : 800 m de course + 500 m SkiErg ; 800 m + 20 m de poussée de traîneau ; 800 m + 12 wall balls. Enchaîne sans sprinter.",
      longRun: "40 min faciles en aisance respiratoire, puis 10 min de technique SkiErg ou rameur.",
      deload: false,
    },
    {
      phase: "Construire le volume",
      squat: { sets: 4, reps: 5, percentage: 72.5 },
      run: "7 × 800 m à effort régulier, récupération 90 s à 2 min en trot.",
      runPace: "tenKm",
      hybrid:
        "4 tours : 800 m de course + 12 burpee broad jumps ; 800 m + 20 m de tirage de traîneau. Reste régulier sur les transitions.",
      longRun: "45 min faciles en aisance respiratoire, puis 3 × 10 wall balls propres.",
      deload: false,
    },
    {
      phase: "Développement",
      squat: { sets: 5, reps: 4, percentage: 77.5 },
      run: "5 × 1 000 m à effort régulier, récupération 2 min en trot.",
      runPace: "tenKm",
      hybrid:
        "4 tours : 1 km de course + 500 m rameur ; 1 km + 100 m farmer carry ; 1 km + 20 fentes avec sac ; 1 km + 15 wall balls.",
      longRun: "50 min faciles. Termine par 10 min de pratique légère des transitions.",
      deload: false,
    },
    {
      phase: "Semaine allégée",
      squat: { sets: 3, reps: 4, percentage: 60 },
      run: "5 × 400 m faciles, récupération 200 m en trot.",
      runPace: "easy",
      hybrid:
        "2 tours faciles : 600 m de course + 10 wall balls ; 600 m + 10 m de poussée de traîneau. Priorité à la technique.",
      longRun: "35 min faciles, sans accélération finale.",
      deload: true,
    },
    {
      phase: "Intensification",
      squat: { sets: 5, reps: 3, percentage: 82.5 },
      run: "4 × 1 200 m au seuil contrôlé (RPE 7–8), récupération 2 min en trot.",
      runPace: "tenKm",
      hybrid:
        "4 blocs : 1 km de course + 20 m de poussée de traîneau ; 1 km + 20 m de tirage ; 1 km + 500 m SkiErg ; 1 km + 20 fentes avec sac.",
      longRun: "55 min faciles en aisance respiratoire.",
      deload: false,
    },
    {
      phase: "Force et endurance",
      squat: { sets: 5, reps: 3, percentage: 85 },
      run: "3 × 1 600 m à effort contrôlé, récupération 3 min en trot.",
      runPace: "tenKm",
      hybrid:
        "4 tours : 800 m de course + 100 m farmer carry ; 800 m + 500 m rameur ; 800 m + 20 fentes avec sac ; 800 m + 15 wall balls. Garde une technique nette.",
      longRun: "60 min faciles, sans chercher à battre un chrono.",
      deload: false,
    },
    {
      phase: "Enchaînement spécifique",
      squat: { sets: 4, reps: 3, percentage: 80 },
      run: "4 × 1 000 m à effort de course contrôlé, récupération 2 min en trot.",
      runPace: "hyrox",
      hybrid:
        "Simulation partielle : 4 × (1 km de course + une station différente : SkiErg, traîneau, farmer carry, wall balls). Intensité RPE 7–8, transitions efficaces.",
      longRun: "50 min faciles. La séance hybride est la seule séance dure de la semaine.",
      deload: false,
    },
    {
      phase: "Affûtage",
      squat: { sets: 3, reps: 3, percentage: 65 },
      run: "4 × 400 m toniques mais faciles, récupération complète en marchant ou en trottant.",
      runPace: "tenKm",
      hybrid:
        "3 tours légers : 800 m de course + une station au choix. Effort RPE 6–7, arrête avant la dégradation de la technique.",
      longRun: "35 min faciles. Termine le bloc frais, pas épuisé.",
      deload: true,
    },
  ];

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function formatWeight(weight) {
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 1,
    }).format(weight);
  }

  function parseRunTime(value) {
    if (typeof value !== "string" || !/^\d{1,4}:[0-5]\d$/.test(value)) {
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

  function textElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function renderProgram(squatMax, tenKmSeconds) {
    results.replaceChildren();

    const tenKmPace = tenKmSeconds / 10;
    const tenKmPaceLabel = `${formatPace(tenKmPace)} min/km`;
    const hyroxPaceRange = `${formatPace(tenKmPace + 15)}–${formatPace(
      tenKmPace + 30,
    )} min/km`;
    const easyPaceRange = `${formatPace(tenKmPace + 60)}–${formatPace(
      tenKmPace + 90,
    )} min/km`;

    const heading = document.createElement("div");
    heading.className = "sbd-result-heading";
    heading.append(
      textElement("h3", "", "Bloc HYROX · 8 semaines"),
      textElement(
        "p",
        "",
        "4 séances par semaine : force, course, travail hybride sous fatigue et endurance facile.",
      ),
    );
    results.append(heading);

    const weekGrid = document.createElement("div");
    weekGrid.className = "sbd-week-grid";
    weekGrid.dataset.mobileCarousel = "program-weeks";

    weeks.forEach((week, index) => {
      const card = document.createElement("article");
      card.className = `sbd-week-card${week.deload ? " is-deload" : ""}`;
      card.append(
        textElement("p", "eyebrow", `SEMAINE ${index + 1}`),
        textElement("h4", "", week.phase),
        textElement(
          "p",
          "sbd-week-meta",
          "4 séances · espace les séances difficiles avec au moins un jour facile ou de repos.",
        ),
      );

      const tableWrap = document.createElement("div");
      tableWrap.className = "sbd-table-wrap";
      const table = document.createElement("table");
      table.className = "sbd-program-table hyrox-program-table";
      table.setAttribute("aria-label", `Programme HYROX semaine ${index + 1}`);

      const head = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["Séance", "Focus", "Programme"].forEach((label) => {
        const cell = textElement("th", "", label);
        cell.scope = "col";
        headerRow.append(cell);
      });
      head.append(headerRow);

      const squatLoad =
        Math.round(
          (squatMax * (week.squat.percentage / 100)) / 2.5,
        ) * 2.5;
      const body = document.createElement("tbody");
      const sessions = [
        [
          "Séance 1",
          "Squat lourd",
          `Échauffement général 8–10 min, puis séries de montée en charge. Squat ${week.squat.sets} × ${week.squat.reps} à ${week.squat.percentage} % du 1RM (≈ ${formatWeight(squatLoad)} kg), RPE ${week.deload ? "6–7" : "7–8"}, repos 2–3 min. Puis soulevé de terre roumain 3 × 8 et gainage 3 séries.`,
        ],
        [
          "Séance 2",
          "Course · qualité",
          `${week.run} Repère : ${week.runPace === "easy" ? `allure facile ${easyPaceRange}` : week.runPace === "hyrox" ? `allure HYROX ${hyroxPaceRange}` : `allure 10 km ${tenKmPaceLabel}`}. Échauffement 10–15 min et retour au calme 10 min.`,
        ],
        [
          "Séance 3",
          "HYROX sous fatigue",
          `${week.hybrid} Allure sur les portions courues : ${week.deload ? `facile ${easyPaceRange}` : hyroxPaceRange}.`,
        ],
        [
          "Séance 4",
          "Endurance · récupération",
          `${week.longRun} Allure facile indicative : ${easyPaceRange}.`,
        ],
      ];

      sessions.forEach((session) => {
        const row = document.createElement("tr");
        session.forEach((value, cellIndex) => {
          const cell = textElement("td", "", value);
          cell.dataset.label = ["Séance", "Focus", "Programme"][cellIndex];
          row.append(cell);
        });
        body.append(row);
      });

      table.append(head, body);
      tableWrap.append(table);
      card.append(tableWrap);
      weekGrid.append(card);
    });

    results.append(weekGrid);
  }

  function updatePerformance(data) {
    const squatMax = Number(data.squat);
    const tenKmSeconds = parseRunTime(data.tenKm);
    if (
      !Number.isFinite(squatMax) ||
      squatMax < 10 ||
      squatMax > 1000 ||
      !tenKmSeconds
    ) {
      setStatus(
        "Le squat ou le chrono 10 km du Dashboard est invalide. Corrige tes repères pour calculer le programme.",
        "error",
      );
      return false;
    }

    squatMaxElement.textContent = formatWeight(squatMax);
    tenKmElement.textContent = data.tenKm;
    renderProgram(squatMax, tenKmSeconds);
    return true;
  }

  const initialData = {
    squat: squatMaxElement.textContent.trim(),
    tenKm: tenKmElement.textContent.trim(),
  };
  if (!updatePerformance(initialData)) {
    throw new Error("Les repères HYROX du Dashboard ne sont pas valides.");
  }

  setStatus("Charges et allures calculées depuis tes repères du Dashboard.", "success");

  window.addEventListener("luxafit:performancechange", (event) => {
    if (updatePerformance(event.detail)) {
      setStatus("Programme actualisé depuis le Dashboard.", "success");
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;

    try {
      const data = JSON.parse(event.newValue);
      if (updatePerformance(data)) {
        setStatus("Programme actualisé depuis le Dashboard.", "success");
      }
    } catch (error) {
      console.error("Impossible de lire les repères du Dashboard.", error);
      setStatus("Impossible de lire les repères du Dashboard.", "error");
    }
  });
})();
