/******************************************************
 * Teacher Dashboard – Full structured JSON editor
 * Supports:
 * - Multi-quiz selection and editing
 * - Add new quiz (updates modules.json)
 * - Unit-filtered randomiser card editing
 * - Add new cards
 * - Timeline editing and JSON creation
 * - Auto filename generation
 * - Export updated modules.json
 ******************************************************/

// Paths
const MODULES_PATH = "../quizzes/modules.json";
const RANDOMISER_PATH = "../revision/cards_data.json";

// State
let modulesData = null;
let randomiserData = null;

let selectedModule = null;
let selectedUnit = null;
let activeTab = null;

let currentQuizMeta = null;
let currentTimelineMeta = null;

// DOM
const moduleListEl = document.querySelector("#moduleList");
const unitSectionEl = document.querySelector("#unitSection");
const unitListEl = document.querySelector("#unitList");

const tabsEl = document.querySelector("#editorTabs");
const jsonEditorEl = document.querySelector("#jsonEditor");
const editorTitleEl = document.querySelector("#editorTitle");
const listPanelEl = document.querySelector("#listPanel");

const validateBtn = document.querySelector("#validateBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const downloadModulesBtn = document.querySelector("#downloadModulesBtn");
const actionsEl = document.querySelector("#actions");

// Load modules.json
fetch(MODULES_PATH)
  .then(r => r.json())
  .then(async data => {
    modulesData = data;

    // Load randomiser file
    randomiserData = await fetch(RANDOMISER_PATH).then(r => r.json());
    renderModules();
  });

/******************************
 * Module & Unit Navigation
 ******************************/
function renderModules() {
  moduleListEl.innerHTML = "";
  modulesData.forEach(mod => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = mod.name;
    btn.className = "td-btn td-btn-outline";
    btn.onclick = () => {
      selectedModule = mod;
      selectedUnit = null;
      currentQuizMeta = null;
      currentTimelineMeta = null;
      renderUnits();
      resetEditor();
      editorTitleEl.textContent = "Select a Unit";
    };
    li.appendChild(btn);
    moduleListEl.appendChild(li);
  });
}

function renderUnits() {
  unitSectionEl.classList.remove("td-hidden");
  unitListEl.innerHTML = "";

  selectedModule.units.forEach(u => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = u.name;
    btn.className = "td-btn td-btn-outline";
    btn.onclick = () => {
      selectedUnit = u;
      resetEditor();
      editorTitleEl.textContent = selectedUnit.name;
      tabsEl.classList.remove("td-hidden");
    };
    li.appendChild(btn);
    unitListEl.appendChild(li);
  });
}

function resetEditor() {
  currentQuizMeta = null;
  currentTimelineMeta = null;
  listPanelEl.classList.add("td-hidden");
  jsonEditorEl.classList.add("td-hidden");
  actionsEl.classList.add("td-hidden");
  tabsEl.querySelectorAll(".td-tab").forEach(tab => tab.classList.remove("active"));
}

/******************************
 * Tabs
 ******************************/
tabsEl.querySelectorAll(".td-tab").forEach(tab => {
  tab.onclick = () => {
    tabsEl.querySelectorAll(".td-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.tab;
    loadContentForTab();
  };
});

function loadContentForTab() {
  if (!selectedUnit) return;

  listPanelEl.innerHTML = "";
  listPanelEl.classList.remove("td-hidden");

  if (activeTab === "mcq") loadQuizList();
  if (activeTab === "randomiser") loadRandomiserSubset();
  if (activeTab === "timeline") loadTimelineList();
}

/******************************
 * MCQ TAB
 ******************************/
function loadQuizList() {
  const quizzes = selectedUnit.quizzes || [];

  let html = `<h3>MCQ Quizzes for this Unit</h3>`;
  if (!quizzes.length) html += `<p>No quizzes yet.</p>`;

  quizzes.forEach(q => {
    html += `
      <div class="td-listrow">
        <div>
          <strong>${q.title}</strong><br>
          <small>${q.path}</small>
        </div>
        <button class="td-btn td-btn-outline td-quiz-edit" 
           data-quizid="${q.id}" 
           data-quizpath="${q.path}">
          Edit
        </button>
      </div>
    `;
  });

  html += `<button id="addQuizBtn" class="td-btn td-btn-primary">+ Add New Quiz</button>`;
  listPanelEl.innerHTML = html;

  // Delegated listener on listContainer
  listPanelEl.onclick = (ev) => {
    const btn = ev.target.closest(".td-quiz-edit");
    if (!btn) return;

    const qid = btn.getAttribute("data-quizid");
    const path = btn.getAttribute("data-quizpath");

    currentQuizMeta = findQuizMeta(qid, path);

    if (!currentQuizMeta) {
      alert("Could not locate quiz metadata from modules.json");
      return;
    }

    loadQuizJSON();
  };

  document.querySelector("#addQuizBtn").onclick = addNewQuiz;
}

function findQuizMeta(quizId, quizPath) {
  if (!selectedUnit.quizzes) return null;

  // 1. direct ID match
  let q = selectedUnit.quizzes.find(q => q.id === quizId);
  if (q) return q;

  // 2. fallback: match by path
  q = selectedUnit.quizzes.find(q => q.path === quizPath);
  if (q) return q;

  // Normalize and try again
  const normalPath = quizPath.replace(/^\.\.\//, "").replace(/^\//, "");
  q = selectedUnit.quizzes.find(q =>
    q.path.replace(/^\.\.\//, "").replace(/^\//, "") === normalPath
  );
  return q || null;
}

function addNewQuiz() {
  const title = prompt("Quiz Title?");
  if (!title) return;

  const quizId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Path stored in modules.json is relative to /quizzes/index.html
  // so it should be "quizzes/<module>/<unit>/<quiz-id>.json"
  const path = `quizzes/${selectedModule.id}/${selectedUnit.id}/${quizId}.json`;

  const quizObj = {
    id: quizId,
    title,
    path
  };

  if (!selectedUnit.quizzes) selectedUnit.quizzes = [];
  selectedUnit.quizzes.push(quizObj);

  currentQuizMeta = quizObj;

  jsonEditorEl.value = JSON.stringify(
    {
      id: quizId,
      title,
      questions: []
    },
    null,
    2
  );

  enableEditor();
  loadQuizList();
}

function loadQuizJSON() {
  if (!currentQuizMeta) {
    alert("Error: No quiz metadata.");
    return;
  }

  // Path stored in modules.json is relative to /quizzes/index.html
  // e.g. "quizzes/greekstates/persia/01-the-classical-greek-world.json"
  const relativeFromQuizzesApp = currentQuizMeta.path;

  // From /teacher/index.html we need to go up to root, then into /quizzes/,
  // then apply the same relative path used inside the quizzes app.
  // Result example:
  //   "../quizzes/quizzes/greekstates/persia/01-the-classical-greek-world.json"
  const fetchPath = "../quizzes/" + relativeFromQuizzesApp;

  fetch(fetchPath)
    .then(r => {
      if (!r.ok) {
        throw new Error(
          "Quiz JSON not found at: " + fetchPath.replace(/^\.\.\//, "")
        );
      }
      return r.json();
    })
    .then(data => {
      jsonEditorEl.value = JSON.stringify(data, null, 2);
      enableEditor();
    })
    .catch(err => {
      alert("Failed to load quiz:\n" + err.message);
      jsonEditorEl.value = "// Failed to load quiz\n// " + err.message;
      enableEditor();
    });
}

/******************************
 * RANDOMISER TAB
 ******************************/
function loadRandomiserSubset() {
  const moduleId = selectedModule.id;
  const unitId = selectedUnit.id;

  const subset = randomiserData.filter(
    c => c.module === moduleId && c.unit === unitId
  );

  currentQuizMeta = null;
  currentTimelineMeta = null;

  jsonEditorEl.value = JSON.stringify(subset, null, 2);
  enableEditor();

  listPanelEl.innerHTML = `
    <h3>Cards for this Unit</h3>
    <p>Editing filtered subset from cards_data.json</p>
    <button id="addCardBtn" class="td-btn td-btn-primary">+ Add Card</button>
  `;

  document.querySelector("#addCardBtn").onclick = addNewRandomiserCard;
}

function addNewRandomiserCard() {
  const subset = JSON.parse(jsonEditorEl.value);
  subset.push({
    module: selectedModule.id,
    unit: selectedUnit.id,
    type: "content",
    text: ""
  });
  jsonEditorEl.value = JSON.stringify(subset, null, 2);
}

/******************************
 * TIMELINE TAB
 ******************************/
function loadTimelineList() {
  const timelines = selectedUnit.timelines || [];
  let html = `<h3>Timelines for this Unit</h3>`;
  if (!timelines.length) html += `<p>No timelines yet.</p>`;

  timelines.forEach(t => {
    html += `
      <div class="td-listrow">
        <div>
          <strong>${t.title}</strong><br>
          <small>${t.path}</small>
        </div>
        <button class="td-btn td-btn-outline" data-timeline="${t.id}">Edit</button>
      </div>`;
  });

  html += `<button id="addTimelineBtn" class="td-btn td-btn-primary">+ Add New Timeline</button>`;
  listPanelEl.innerHTML = html;

  listPanelEl.querySelectorAll("[data-timeline]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.timeline;
      currentTimelineMeta = selectedUnit.timelines.find(t => t.id === id);
      loadTimelineJSON();
    };
  });

  document.querySelector("#addTimelineBtn").onclick = addNewTimeline;
}

function addNewTimeline() {
  const title = prompt("Timeline Title?");
  if (!title) return;

  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `timelines/${selectedModule.id}/${selectedUnit.id}/${id}.json`;

  if (!selectedUnit.timelines) selectedUnit.timelines = [];
  const tObj = { id, title, path };
  selectedUnit.timelines.push(tObj);

  currentTimelineMeta = tObj;

  jsonEditorEl.value = JSON.stringify(
    {
      title,
      events: []
    },
    null,
    2
  );

  enableEditor();
  loadTimelineList();
}

function loadTimelineJSON() {
  fetch("../" + currentTimelineMeta.path)
    .then(r => r.json())
    .then(data => {
      jsonEditorEl.value = JSON.stringify(data, null, 2);
      enableEditor();
    })
    .catch(() => {
      jsonEditorEl.value = JSON.stringify(
        {
          title: currentTimelineMeta.title,
          events: []
        },
        null,
        2
      );
      enableEditor();
    });
}

/******************************
 * JSON Editor Helpers
 ******************************/
function enableEditor() {
  jsonEditorEl.classList.remove("td-hidden");
  actionsEl.classList.remove("td-hidden");
}

validateBtn.onclick = () => {
  try {
    JSON.parse(jsonEditorEl.value);
    alert("JSON is valid!");
  } catch (err) {
    alert("Invalid JSON:\n\n" + err.message);
  }
};

downloadBtn.onclick = () => {
  let filename = "";
  if (activeTab === "mcq") filename = currentQuizMeta.path.split("/").pop();
  if (activeTab === "randomiser") filename = "cards_data.json";
  if (activeTab === "timeline") filename = currentTimelineMeta.id + ".json";

  const blob = new Blob([jsonEditorEl.value], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

downloadModulesBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(modulesData, null, 2)], {
    type: "application/json"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "modules.json";
  a.click();
};
