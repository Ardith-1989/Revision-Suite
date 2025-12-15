// timelines.js

/* ============================
   THEME TOGGLE (reuse key)
   ============================ */
const THEME_KEY = "revision-theme";

function applyStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const body = document.body;
  if (!stored || stored === "light") {
    body.classList.add("theme-light");
  } else {
    body.classList.remove("theme-light");
  }
}

function toggleTheme() {
  const body = document.body;
  const isLight = body.classList.contains("theme-light");
  if (isLight) {
    body.classList.remove("theme-light");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    body.classList.add("theme-light");
    localStorage.setItem(THEME_KEY, "light");
  }
}

/* ============================
   DOM REFERENCES
   ============================ */
const cardTitleEl = document.getElementById("cardTitle");
const cardSubtitleEl = document.getElementById("cardSubtitle");
const pillRightEl = document.getElementById("pillRight");
const breadcrumbsEl = document.getElementById("breadcrumbs");
const contentEl = document.getElementById("timelineContent");

const themeBtnEl = document.getElementById("toggleThemeBtn");

/* ============================
   SIMPLE IN-MEMORY DATA MODEL
   (Replace with JSON fetch later)
   ============================ */

const TIMELINE_DATA = [
  {
    id: "late-republic",
    name: "Late Roman Republic",
    units: [
      {
        id: "caesar-pompey",
        name: "Caesar vs Pompey",
        timelines: [
          {
            id: "caesar-pompey-timeline-1",
            title: "From Alliance to Civil War",
            description:
              "Key events from the First Triumvirate to the outbreak of civil war.",
            events: [
              {
                id: "consulship-59",
                label: "Caesar's first consulship with Bibulus",
                year: -59,
                displayDate: "59 BCE",
                note: "Caesar uses radical measures, clashing with the Senate."
              },
              {
                id: "first-triumvirate",
                label: "Informal 'First Triumvirate' agreement",
                year: -60,
                displayDate: "60 BCE",
                note: "Political alliance between Caesar, Pompey, and Crassus."
              },
              {
                id: "death-julia",
                label: "Death of Julia",
                year: -54,
                displayDate: "54 BCE",
                note: "Removes the family tie between Caesar and Pompey."
              },
              {
                id: "sole-consul-52",
                label: "Pompey appointed sole consul",
                year: -52,
                displayDate: "52 BCE",
                note: "Violence in Rome after Clodius' death leads to Pompey's sole consulship."
              },
              {
                id: "rubicon-49",
                label: "Caesar crosses the Rubicon",
                year: -49,
                displayDate: "49 BCE",
                note: "Triggers civil war between Caesar and Pompey."
              },
              {
                id: "pharsalus-48",
                label: "Battle of Pharsalus",
                year: -48,
                displayDate: "48 BCE",
                note: "Decisive victory for Caesar over Pompey."
              }
            ]
          }
        ]
      }
    ]
  }
];

/* ============================
   APP STATE
   ============================ */

let currentModule = null;
let currentUnit = null;
let currentTimeline = null;
let currentMode = "study"; // "study" | "match-dates" | "order-only" | "which-first" | "placement"

/* ============================
   HELPERS
   ============================ */

function setBreadcrumbs(level) {
  const bits = [];

  bits.push(`<span data-level="modules">Timelines</span>`);

  if (currentModule && level !== "modules") {
    bits.push("›");
    bits.push(
      `<span data-level="units" data-module-id="${currentModule.id}">${currentModule.name}</span>`
    );
  }

  if (currentUnit && (level === "timeline" || level === "activity")) {
    bits.push("›");
    bits.push(
      `<span data-level="timeline" data-module-id="${currentModule.id}" data-unit-id="${currentUnit.id}">${currentUnit.name}</span>`
    );
  }

  if (currentTimeline && level === "activity") {
    bits.push("›");
    bits.push(`<span>${currentTimeline.title}</span>`);
  }

  breadcrumbsEl.innerHTML = bits.join(" ");

  // Click handlers
  breadcrumbsEl
    .querySelectorAll("span[data-level]")
    .forEach((span) =>
      span.addEventListener("click", () => {
        const lvl = span.getAttribute("data-level");
        if (lvl === "modules") {
          renderModuleList();
        } else if (lvl === "units") {
          const moduleId = span.getAttribute("data-module-id");
          renderUnitList(moduleId);
        } else if (lvl === "timeline") {
          const moduleId = span.getAttribute("data-module-id");
          const unitId = span.getAttribute("data-unit-id");
          const mod = TIMELINE_DATA.find((m) => m.id === moduleId);
          const unit = mod?.units?.find((u) => u.id === unitId);
          if (mod && unit) {
            currentModule = mod;
            currentUnit = unit;
            currentTimeline = unit.timelines[0] || null;
            renderTimelineView();
          }
        }
      })
    );
}

function sortEventsByDate(events) {
  return [...events].sort((a, b) => a.year - b.year);
}

/* ============================
   RENDER: MODULE LIST
   ============================ */

function renderModuleList() {
  currentModule = null;
  currentUnit = null;
  currentTimeline = null;
  currentMode = "study";

  cardTitleEl.textContent = "Timelines";
  cardSubtitleEl.textContent = "Select a module to get started.";
  pillRightEl.textContent = `${TIMELINE_DATA.length} module${
    TIMELINE_DATA.length !== 1 ? "s" : ""
  }`;

  setBreadcrumbs("modules");

  if (!TIMELINE_DATA.length) {
    contentEl.innerHTML = `<p class="helper-text">No timeline modules available.</p>`;
    return;
  }

  contentEl.innerHTML = `
    <div class="list">
      ${TIMELINE_DATA.map(
        (mod) => `
        <div class="list-item" data-module-id="${mod.id}">
          <div class="list-main">
            <div class="list-title">${mod.name}</div>
            <div class="list-meta">
              <span>${mod.units?.length || 0} unit${
          (mod.units?.length || 0) !== 1 ? "s" : ""
        }</span>
              <span>•</span>
              <span>${(mod.units || []).reduce(
                (acc, u) => acc + (u.timelines?.length || 0),
                0
              )} timeline(s)</span>
            </div>
          </div>
          <button class="tag-button" data-module-id="${mod.id}">
            View timelines ›
          </button>
        </div>
      `
      ).join("")}
    </div>
    <p class="helper-text">
      These modules mirror your course structure. Choose one to explore its units and timelines.
    </p>
  `;

  contentEl.querySelectorAll("[data-module-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const moduleId = el.getAttribute("data-module-id");
      renderUnitList(moduleId);
    });
  });
}

/* ============================
   RENDER: UNIT LIST
   ============================ */

function renderUnitList(moduleId) {
  const mod = TIMELINE_DATA.find((m) => m.id === moduleId);
  if (!mod) return;

  currentModule = mod;
  currentUnit = null;
  currentTimeline = null;
  currentMode = "study";

  cardTitleEl.textContent = mod.name;
  cardSubtitleEl.textContent =
    "Choose a topic to study its timeline or try sequencing activities.";
  const totalTimelines = (mod.units || []).reduce(
    (acc, u) => acc + (u.timelines?.length || 0),
    0
  );
  pillRightEl.textContent = `${mod.units?.length || 0} unit${
    (mod.units?.length || 0) !== 1 ? "s" : ""
  } • ${totalTimelines} timeline(s)`;

  setBreadcrumbs("units");

  if (!mod.units || !mod.units.length) {
    contentEl.innerHTML = `<p class="helper-text">This module has no units yet.</p>`;
    return;
  }

  contentEl.innerHTML = `
    <div class="list">
      ${mod.units
        .map((u) => {
          const timelineCount = u.timelines?.length || 0;
          return `
          <div class="list-item" data-unit-id="${u.id}">
            <div class="list-main">
              <div class="list-title">${u.name}</div>
              <div class="list-meta">
                <span>${timelineCount} timeline${
            timelineCount !== 1 ? "s" : ""
          }</span>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="tag-button" data-unit-id="${u.id}" data-action="study">
                Study
              </button>
              <button class="tag-button" data-unit-id="${u.id}" data-action="test">
                Test ›
              </button>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
    <p class="helper-text">
      “Study” shows the timeline in order. “Test” lets you try drag-and-drop and question-based activities.
    </p>
  `;

  // Click anywhere on card → default to Study first timeline
  contentEl.querySelectorAll(".list-item").forEach((card) => {
    card.addEventListener("click", (e) => {
      const unitId = card.getAttribute("data-unit-id");
      if (e.target.closest("button")) return;
      const unit = mod.units.find((u) => u.id === unitId);
      if (!unit || !unit.timelines || !unit.timelines.length) return;
      currentUnit = unit;
      currentTimeline = unit.timelines[0];
      currentMode = "study";
      renderTimelineView();
    });
  });

  // Button-specific actions
  contentEl.querySelectorAll("button[data-unit-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const unitId = btn.getAttribute("data-unit-id");
      const action = btn.getAttribute("data-action");
      const unit = mod.units.find((u) => u.id === unitId);
      if (!unit || !unit.timelines || !unit.timelines.length) return;
      currentUnit = unit;
      currentTimeline = unit.timelines[0];
      if (action === "study") {
        currentMode = "study";
        renderTimelineView();
      } else {
        currentMode = "match-dates";
        renderTimelineView();
      }
    });
  });
}

/* ============================
   RENDER: TIMELINE VIEW
   (Study + mode tabs)
   ============================ */

function renderTimelineView() {
  if (!currentModule || !currentUnit || !currentTimeline) return;

  cardTitleEl.textContent = currentTimeline.title;
  cardSubtitleEl.textContent = currentTimeline.description || "";
  pillRightEl.textContent = `${currentTimeline.events.length} event${
    currentTimeline.events.length !== 1 ? "s" : ""
  }`;
  setBreadcrumbs("timeline");

  const sortedEvents = sortEventsByDate(currentTimeline.events);

  // Mode tabs
  const modeTabHtml = `
    <div class="mode-tabs">
      <button class="mode-tab ${
        currentMode === "study" ? "active" : ""
      }" data-mode="study">Study timeline</button>
      <button class="mode-tab ${
        currentMode === "match-dates" ? "active" : ""
      }" data-mode="match-dates">Match Dates</button>
      <button class="mode-tab ${
        currentMode === "order-only" ? "active" : ""
      }" data-mode="order-only">Order</button>
      <!-- <button class="mode-tab ${
        currentMode === "which-first" ? "active" : ""
      }" data-mode="which-first">Which came first?</button>
      <button class="mode-tab ${
        currentMode === "placement" ? "active" : ""
      }" data-mode="placement">Placement</button> --!>
    </div>
  `;

  // Body content depends on mode
  let bodyHtml = "";

  if (currentMode === "study") {
    bodyHtml = `
      <div class="timeline-study-list">
        ${sortedEvents
          .map(
            (ev) => `
          <div class="timeline-event-row">
            <div class="timeline-date">${ev.displayDate || ev.year}</div>
            <div>
              <div class="timeline-label">${ev.label}</div>
              ${
                ev.note
                  ? `<div class="timeline-note">${ev.note}</div>`
                  : ""
              }
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <p class="helper-text">
        Read through the timeline to get a sense of the order. When you’re ready, try one of the activities.
      </p>
      <div class="controls-bottom">
        <button class="primary-button" data-start-mode="match-dates">
          Start drag & drop (match dates) ›
        </button>
        <button class="secondary-button" data-start-mode="order-only">
          Start drag & drop (order only) ›
        </button>
        <button class="secondary-button" data-start-mode="which-first">
          Start “Which came first?” ›
        </button>
        <button class="secondary-button" data-start-mode="placement">
          Start placement questions ›
        </button>
      </div>
    `;
  } else {
    // Placeholder; actual activity is rendered separately
    bodyHtml = `<div id="activityContainer"></div>`;
  }

  contentEl.innerHTML = `
    ${modeTabHtml}
    ${bodyHtml}
  `;

  // Mode tab handlers
  contentEl.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      currentMode = mode;
      if (mode === "study") {
        renderTimelineView();
      } else {
        renderTimelineView();
        renderActivityForMode(mode);
      }
    });
  });

  // Start buttons in study view
  contentEl
    .querySelectorAll("[data-start-mode]")
    .forEach((btn) =>
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-start-mode");
        currentMode = mode;
        renderTimelineView();
        renderActivityForMode(mode);
      })
    );

  // If we arrived here already in an activity mode, render it
  if (
    currentMode === "match-dates" ||
    currentMode === "order-only" ||
    currentMode === "which-first" ||
    currentMode === "placement"
  ) {
    renderActivityForMode(currentMode);
  }
}

/* ============================
   ACTIVITY DISPATCH
   ============================ */

function renderActivityForMode(mode) {
  if (mode === "match-dates" || mode === "order-only") {
    renderDragDropActivity(mode);
  } else if (mode === "which-first") {
    renderWhichFirstActivity();
  } else if (mode === "placement") {
    renderPlacementActivity();
  }
}

/* ============================
   ACTIVITY: DRAG & DROP
   mode = "match-dates" | "order-only"
   ============================ */

function renderDragDropActivity(mode) {
  const container = document.getElementById("activityContainer");
  if (!container || !currentTimeline) return;

  const sortedEvents = sortEventsByDate(currentTimeline.events);
  const eventsSubset = [...sortedEvents]; // later you can sample subset

  if (mode === "match-dates") {
    // Dates fixed in correct order; events list is shuffled
    const datesHtml = eventsSubset
      .map(
        (ev) => `
      <div class="dnd-slot" data-date-id="${ev.id}">
        <div>
          <div class="slot-label">${ev.displayDate || ev.year}</div>
          <div class="slot-event" data-slot-event></div>
        </div>
      </div>
    `
      )
      .join("");

    // SHUFFLED event cards for matching
    const shuffledEvents = [...eventsSubset];
    for (let i = shuffledEvents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledEvents[i], shuffledEvents[j]] = [
        shuffledEvents[j],
        shuffledEvents[i],
      ];
    }

    const eventCardsHtml = shuffledEvents
      .map(
        (ev) => `
      <div class="dnd-event-card" draggable="true" data-event-id="${ev.id}">
        ${ev.label}
      </div>
    `
      )
      .join("");

    container.innerHTML = `
      <div class="controls-row">
        <p class="helper-text">
          Drag each event onto the correct date. All dates are shown in order.
        </p>
      </div>

      <div class="dnd-layout">
        <div class="dnd-column" id="datesColumn">
          <div class="dnd-column-title">Dates (fixed)</div>
          ${datesHtml}
        </div>
        <div class="dnd-column">
          <div class="dnd-column-title">Events (drag these onto the dates)</div>
          <div class="dnd-events-pool" id="eventsPool">
            ${eventCardsHtml}
          </div>
        </div>
      </div>

      <div class="controls-bottom">
        <button class="secondary-button" id="resetMatchDates">Reset</button>
        <button class="primary-button" id="checkMatchDates">Check answers</button>
        <button class="secondary-button" id="switchOrderMode">Switch to order-only mode</button>
      </div>
      <div class="feedback" id="activityFeedback"></div>
    `;

    setupMatchDatesDnD(container, eventsSubset);
  } else {
    // order-only: events only, shuffled
    const shuffled = [...eventsSubset];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const listHtml = shuffled
      .map(
        (ev, idx) => `
      <div class="dnd-order-item" draggable="true" data-event-id="${ev.id}">
        <div class="dnd-order-item-index">${idx + 1}.</div>
        <div>${ev.label}</div>
      </div>
    `
      )
      .join("");

    container.innerHTML = `
      <div class="controls-row">
        <p class="helper-text">
          Drag the events into the correct chronological order (top = earliest). Dates are hidden while you arrange them.
        </p>
      </div>

      <div class="dnd-order-list" id="orderList">
        ${listHtml}
      </div>

      <div class="controls-bottom">
        <button class="secondary-button" id="reshuffleOrder">Reshuffle</button>
        <button class="primary-button" id="checkOrder">Check order</button>
        <button class="secondary-button" id="switchMatchMode">Switch to match-dates mode</button>
      </div>
      <div class="feedback" id="activityFeedback"></div>
    `;

    setupOrderOnlyDnD(container, eventsSubset);
  }
}

/* ============================
   DND: MATCH DATES MODE
   ============================ */

function setupMatchDatesDnD(root, events) {
  const eventCards = root.querySelectorAll(".dnd-event-card");
  const slots = root.querySelectorAll(".dnd-slot");
  const feedbackEl = root.querySelector("#activityFeedback");
  const resetBtn = root.querySelector("#resetMatchDates");
  const checkBtn = root.querySelector("#checkMatchDates");
  const switchBtn = root.querySelector("#switchOrderMode");

  let draggedCard = null;

  eventCards.forEach((card) => {
    card.addEventListener("dragstart", () => {
      draggedCard = card;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      draggedCard = null;
    });
  });

  slots.forEach((slot) => {
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      slot.classList.add("highlight-drop");
    });
    slot.addEventListener("dragleave", () => {
      slot.classList.remove("highlight-drop");
    });
    slot.addEventListener("drop", () => {
      slot.classList.remove("highlight-drop");
      if (!draggedCard) return;
      const slotEventEl = slot.querySelector("[data-slot-event]");
      if (!slotEventEl) return;

      // If this card was in another slot, clear that slot's display
      const previousSlot = root.querySelector(
        `.dnd-slot [data-slot-event][data-event-id="${draggedCard.getAttribute(
          "data-event-id"
        )}"]`
      );
      if (previousSlot) {
        previousSlot.textContent = "";
        previousSlot.removeAttribute("data-event-id");
      }

      slotEventEl.textContent = draggedCard.textContent.trim();
      slotEventEl.setAttribute(
        "data-event-id",
        draggedCard.getAttribute("data-event-id")
      );


      // Hide card once placed (so it does not remain in the bank)
      draggedCard.style.display = "none";
      // Prevent immediate click-after-drop from returning it straight away
      root.__suppressSlotClickUntil = Date.now() + 350;
    });
  });

  resetBtn.addEventListener("click", () => {
    root.querySelectorAll("[data-slot-event]").forEach((el) => {
      el.textContent = "";
      el.removeAttribute("data-event-id");
    });
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    root
      .querySelectorAll(".dnd-slot")
      .forEach((s) => s.classList.remove("dnd-correct", "dnd-incorrect"));
  });

  checkBtn.addEventListener("click", () => {
    let correct = 0;
    const total = events.length;

    root.querySelectorAll(".dnd-slot").forEach((slot) => {
      slot.classList.remove("dnd-correct", "dnd-incorrect");
      const dateId = slot.getAttribute("data-date-id");
      const slotEventEl = slot.querySelector("[data-slot-event]");
      const chosenId = slotEventEl?.getAttribute("data-event-id") || null;

      if (!chosenId) {
        slot.classList.add("dnd-incorrect");
        return;
      }

      if (chosenId === dateId) {
        correct++;
        slot.classList.add("dnd-correct");
      } else {
        slot.classList.add("dnd-incorrect");
      }
    });

    const percent = Math.round((correct / total) * 100);
    feedbackEl.textContent = `You matched ${correct}/${total} events correctly (${percent}%).`;
    feedbackEl.className =
      "feedback " + (percent === 100 ? "correct" : "incorrect");
  });

  switchBtn.addEventListener("click", () => {
    currentMode = "order-only";
    renderTimelineView();
  });
}

/* ============================
   DND: ORDER-ONLY MODE
   ============================ */

function setupOrderOnlyDnD(root, events) {
  const listEl = root.querySelector("#orderList");
  const feedbackEl = root.querySelector("#activityFeedback");
  const reshuffleBtn = root.querySelector("#reshuffleOrder");
  const checkBtn = root.querySelector("#checkOrder");
  const switchBtn = root.querySelector("#switchMatchMode");

  let draggedItem = null;

  function attachDndHandlers() {
    listEl.querySelectorAll(".dnd-order-item").forEach((item) => {
      item.addEventListener("dragstart", () => {
        draggedItem = item;
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        draggedItem = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        const bbox = item.getBoundingClientRect();
        const offset = e.clientY - bbox.top;
        const shouldInsertBefore = offset < bbox.height / 2;
        const container = item.parentElement;
        if (draggedItem && draggedItem !== item) {
          if (shouldInsertBefore) {
            container.insertBefore(draggedItem, item);
          } else {
            container.insertBefore(draggedItem, item.nextSibling);
          }
          updateIndices();
        }
      });
    });
  }

  function updateIndices() {
    listEl.querySelectorAll(".dnd-order-item").forEach((item, idx) => {
      const idxEl = item.querySelector(".dnd-order-item-index");
      if (idxEl) idxEl.textContent = `${idx + 1}.`;
    });
  }

  attachDndHandlers();

  reshuffleBtn.addEventListener("click", () => {
    const items = Array.from(listEl.children);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    listEl.innerHTML = "";
    items.forEach((it) => listEl.appendChild(it));
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    items.forEach((it) =>
      it.classList.remove("dnd-correct", "dnd-incorrect")
    );
    updateIndices();
    attachDndHandlers();
  });

  checkBtn.addEventListener("click", () => {
    const ordered = sortEventsByDate(events);
    const items = Array.from(listEl.querySelectorAll(".dnd-order-item"));

    let correctPositions = 0;

    items.forEach((item, idx) => {
      item.classList.remove("dnd-correct", "dnd-incorrect");
      const eventId = item.getAttribute("data-event-id");
      const shouldId = ordered[idx]?.id;
      if (eventId === shouldId) {
        correctPositions++;
        item.classList.add("dnd-correct");
      } else {
        item.classList.add("dnd-incorrect");
      }
    });

    const percent = Math.round(
      (correctPositions / Math.max(1, items.length)) * 100
    );
    feedbackEl.textContent = `You placed ${correctPositions}/${items.length} events in the correct position (${percent}%).`;
    feedbackEl.className =
      "feedback " + (percent === 100 ? "correct" : "incorrect");
  });

  switchBtn.addEventListener("click", () => {
    currentMode = "match-dates";
    renderTimelineView();
  });
}

/* ============================
   ACTIVITY: WHICH CAME FIRST?
   ============================ */

function renderWhichFirstActivity() {
  const container = document.getElementById("activityContainer");
  if (!container || !currentTimeline) return;

  const sortedEvents = sortEventsByDate(currentTimeline.events);
  if (sortedEvents.length < 2) {
    container.innerHTML =
      '<p class="helper-text">Not enough events in this timeline for a "Which came first?" question.</p>';
    return;
  }

  container.innerHTML = `
    <div class="controls-row">
      <p class="helper-text">
        Choose which event happened earliest. You can try as many questions as you like.
      </p>
    </div>
    <div id="whichFirstQuestion"></div>
    <div class="controls-bottom">
      <button class="primary-button" id="nextWhichFirst">Next question</button>
      <button class="secondary-button" id="switchToPlacement">Switch to placement</button>
    </div>
    <div class="feedback" id="whichFirstFeedback"></div>
  `;

  function buildQuestion() {
    const qContainer = container.querySelector("#whichFirstQuestion");
    const feedbackEl = container.querySelector("#whichFirstFeedback");
    if (!qContainer) return;

    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";

    // Pick 3 distinct events if possible, else 2
    const pool = [...sortedEvents];
    const chosen = [];
    while (pool.length && chosen.length < Math.min(3, sortedEvents.length)) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }

    // Determine the earliest event among chosen
    const earliest = chosen.reduce(
      (best, ev) => (ev.year < best.year ? ev : best),
      chosen[0]
    );

    // Shuffle the options for display
    const displayOptions = [...chosen];
    for (let i = displayOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [displayOptions[i], displayOptions[j]] = [
        displayOptions[j],
        displayOptions[i],
      ];
    }

    const optionsHtml = displayOptions
      .map(
        (ev, index) => `
      <button class="option-btn" data-event-id="${ev.id}">
        <span class="option-label">${String.fromCharCode(65 + index)}.</span>
        <span class="option-text">${ev.label}</span>
      </button>
    `
      )
      .join("");

    qContainer.innerHTML = `
      <p class="question-meta">Which of these events happened <strong>earliest</strong>?</p>
      <div class="options">
        ${optionsHtml}
      </div>
    `;

    qContainer.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosenId = btn.getAttribute("data-event-id");
        const isCorrect = chosenId === earliest.id;

        qContainer.querySelectorAll(".option-btn").forEach((b) => {
          b.disabled = true;
          const evId = b.getAttribute("data-event-id");
          if (evId === earliest.id) {
            b.classList.add("correct");
          } else if (evId === chosenId && !isCorrect) {
            b.classList.add("incorrect");
          }
        });

        feedbackEl.className =
          "feedback " + (isCorrect ? "correct" : "incorrect");
        feedbackEl.textContent = isCorrect
          ? "Correct – that was the earliest of the options."
          : "Incorrect – the earliest event is highlighted in green.";
      });
    });
  }

  const nextBtn = container.querySelector("#nextWhichFirst");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      buildQuestion();
    });
  }

  const switchPlacementBtn = container.querySelector("#switchToPlacement");
  if (switchPlacementBtn) {
    switchPlacementBtn.addEventListener("click", () => {
      currentMode = "placement";
      renderTimelineView();
    });
  }

  // Build the first question immediately
  buildQuestion();
}

/* ============================
   ACTIVITY: PLACEMENT QUESTIONS
   ============================ */

function renderPlacementActivity() {
  const container = document.getElementById("activityContainer");
  if (!container || !currentTimeline) return;

  const sortedEvents = sortEventsByDate(currentTimeline.events);
  if (sortedEvents.length < 3) {
    container.innerHTML =
      '<p class="helper-text">Not enough events in this timeline for placement questions.</p>';
    return;
  }

  container.innerHTML = `
    <div class="placement-card">
      <p class="placement-question">When did this event happen?</p>

      <div class="placement-event-main">
        <div class="placement-event-title" id="placementEventTitle"></div>
        <div class="placement-event-date" id="placementEventDate"></div>
      </div>

      <div class="placement-anchors-panel">
        <button class="placement-choice" data-position="before">
          <span class="placement-choice-label">Before</span>
        </button>

        <div class="placement-anchor-card">
          <div class="placement-anchor-date" id="placementAnchor1Date"></div>
          <div class="placement-anchor-label" id="placementAnchor1Label"></div>
        </div>

        <button class="placement-choice" data-position="between">
          <span class="placement-choice-label">Between</span>
        </button>

        <div class="placement-anchor-card">
          <div class="placement-anchor-date" id="placementAnchor2Date"></div>
          <div class="placement-anchor-label" id="placementAnchor2Label"></div>
        </div>

        <button class="placement-choice" data-position="after">
          <span class="placement-choice-label">After</span>
        </button>
      </div>
    </div>

    <div class="controls-bottom">
      <button class="secondary-button" id="skipPlacement">Skip</button>
      <button class="secondary-button" id="newAnchors">New anchors</button>
    </div>

    <div class="feedback" id="placementFeedback"></div>
  `;

  const titleEl = container.querySelector("#placementEventTitle");
  const dateEl = container.querySelector("#placementEventDate");
  const a1DateEl = container.querySelector("#placementAnchor1Date");
  const a1LabelEl = container.querySelector("#placementAnchor1Label");
  const a2DateEl = container.querySelector("#placementAnchor2Date");
  const a2LabelEl = container.querySelector("#placementAnchor2Label");

  const choiceButtons = Array.from(
    container.querySelectorAll(".placement-choice")
  );
  const skipBtn = container.querySelector("#skipPlacement");
  const newAnchorsBtn = container.querySelector("#newAnchors");
  const feedbackEl = container.querySelector("#placementFeedback");

  // State for this session
  let anchors = null;          // { leftIdx, rightIdx }
  let currentScenario = null;  // { targetIdx, position }
  let locked = false;

  function clearChoiceStyles() {
    choiceButtons.forEach((btn) =>
      btn.classList.remove("selected", "correct", "incorrect")
    );
  }

  function setAnchors() {
    const n = sortedEvents.length;

    // Pick two distinct indices i < j that allow at least one other event
    for (let attempts = 0; attempts < 30; attempts++) {
      const i = Math.floor(Math.random() * (n - 1));
      const j = i + 1 + Math.floor(Math.random() * (n - 1 - i));

      // Make sure there is at least one other event that's not an anchor
      let hasOther = false;
      for (let k = 0; k < n; k++) {
        if (k !== i && k !== j) {
          hasOther = true;
          break;
        }
      }
      if (!hasOther) continue;

      anchors = { leftIdx: i, rightIdx: j };
      break;
    }

    if (!anchors) {
      // Fallback: first and last
      anchors = { leftIdx: 0, rightIdx: n - 1 };
    }

    // Update anchor UI
    const left = sortedEvents[anchors.leftIdx];
    const right = sortedEvents[anchors.rightIdx];

    a1DateEl.textContent = left.displayDate || left.year;
    a1LabelEl.textContent = left.label;

    a2DateEl.textContent = right.displayDate || right.year;
    a2LabelEl.textContent = right.label;
  }

  function buildScenario() {
    const n = sortedEvents.length;
    if (!anchors) {
      setAnchors();
    }

    const { leftIdx, rightIdx } = anchors;

    // Collect all non-anchor indices
    const candidateIndices = [];
    for (let k = 0; k < n; k++) {
      if (k !== leftIdx && k !== rightIdx) candidateIndices.push(k);
    }

    if (!candidateIndices.length) {
      // If somehow no candidates, choose new anchors and try again
      anchors = null;
      setAnchors();
      return buildScenario();
    }

    const targetIdx =
      candidateIndices[Math.floor(Math.random() * candidateIndices.length)];

    let position;
    if (targetIdx < leftIdx) {
      position = "before";
    } else if (targetIdx > rightIdx) {
      position = "after";
    } else {
      position = "between";
    }

    currentScenario = { targetIdx, position };
    locked = false;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    clearChoiceStyles();

    const target = sortedEvents[targetIdx];
    titleEl.textContent = target.label;
    dateEl.textContent = target.displayDate || target.year;
  }

  function handleAnswer(selectedPos) {
    if (!currentScenario || locked) return;
    locked = true;

    const correctPos = currentScenario.position;

    choiceButtons.forEach((btn) => {
      const pos = btn.getAttribute("data-position");
      btn.classList.remove("correct", "incorrect");
      if (pos === correctPos) {
        btn.classList.add("correct");
      }
      if (pos === selectedPos && pos !== correctPos) {
        btn.classList.add("incorrect");
      }
    });

    if (selectedPos === correctPos) {
      feedbackEl.textContent =
        "Correct – that is where this event belongs relative to the anchors.";
      feedbackEl.className = "feedback correct";
    } else {
      let explanation;
      if (correctPos === "before") {
        explanation = "this event occurs before the first anchor.";
      } else if (correctPos === "between") {
        explanation = "this event falls between the two anchor events.";
      } else {
        explanation = "this event occurs after the second anchor.";
      }
      feedbackEl.textContent = "Incorrect – " + explanation;
      feedbackEl.className = "feedback incorrect";
    }

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      buildScenario();
    }, 900);
  }

  // Button interactions (tap = select + mark + auto next)
  choiceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pos = btn.getAttribute("data-position");
      clearChoiceStyles();
      btn.classList.add("selected");
      handleAnswer(pos);
    });
  });

  // Skip: just go straight to another target with same anchors
  skipBtn.addEventListener("click", () => {
    if (locked) locked = false;
    buildScenario();
  });

  // New anchors: pick new pair and question
  newAnchorsBtn.addEventListener("click", () => {
    anchors = null;
    setAnchors();
    buildScenario();
  });

  // Initial anchors + first question
  setAnchors();
  buildScenario();
}

/* ============================
   INITIALISATION
   ============================ */

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();
  if (themeBtnEl) {
    themeBtnEl.addEventListener("click", toggleTheme);
  }
  renderModuleList();
});
