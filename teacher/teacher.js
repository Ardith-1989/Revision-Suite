let curriculum = null;
let selectedModule = null;
let selectedUnit = null;
let activeTab = null;

const moduleListEl     = document.querySelector("#moduleList");
const unitSectionEl    = document.querySelector("#unitSection");
const unitListEl       = document.querySelector("#unitList");
const tabsEl           = document.querySelector("#editorTabs");
const jsonEditorEl     = document.querySelector("#jsonEditor");
const editorTitleEl    = document.querySelector("#editorTitle");
const validateBtn      = document.querySelector("#validateBtn");
const downloadBtn      = document.querySelector("#downloadBtn");
const actionsEl        = document.querySelector("#actions");

// Load modules.json
fetch("../quizzes/modules.json")
  .then(r => r.json())
  .then(data => {
    curriculum = data;
    renderModules();
  });

function renderModules() {
  moduleListEl.innerHTML = "";

  curriculum.forEach(mod => {
    const li = document.createElement("li");

    const btn = document.createElement("button");
    btn.textContent = mod.name;
    btn.className = "td-btn td-btn-outline";
    btn.onclick = () => {
      selectedModule = mod;
      selectedUnit = null;
      renderUnits();
      editorTitleEl.textContent = "Select a Unit";
      hideEditor();
    };

    li.appendChild(btn);
    moduleListEl.appendChild(li);
  });
}

function renderUnits() {
  unitListEl.innerHTML = "";
  unitSectionEl.classList.remove("td-hidden");

  selectedModule.units.forEach(u => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = u.name;
    btn.className = "td-btn td-btn-outline";
    btn.onclick = () => {
      selectedUnit = u;
      editorTitleEl.textContent = selectedUnit.name;
      showTabs();
      hideEditor();
    };
    li.appendChild(btn);
    unitListEl.appendChild(li);
  });
}

function showTabs() {
  tabsEl.classList.remove("td-hidden");
  jsonEditorEl.classList.add("td-hidden");
  actionsEl.classList.add("td-hidden");

  tabsEl.querySelectorAll(".td-tab").forEach(tab => {
    tab.classList.remove("active");
    tab.onclick = () => {
      tabsEl.querySelectorAll(".td-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      loadEditorJSON();
    };
  });
}

function loadEditorJSON() {
  if (!selectedUnit) return;

  jsonEditorEl.classList.remove("td-hidden");
  actionsEl.classList.remove("td-hidden");

  if (activeTab === "mcq") {
    const quizMeta = selectedUnit.quizzes || [];
    if (!quizMeta.length) {
      jsonEditorEl.value = "// No quizzes found for this unit.";
      return;
    }
    const path = quizMeta[0].path;
    fetch("../" + path)
      .then(r => r.json())
      .then(data => jsonEditorEl.value = JSON.stringify(data, null, 2));
  }

  if (activeTab === "randomiser") {
    fetch("../revision/cards_data.json")
      .then(r => r.json())
      .then(data => jsonEditorEl.value = JSON.stringify(data, null, 2));
  }

  if (activeTab === "timeline") {
    // Generate basic timeline structure
    const timelineStub = {
      title: selectedUnit.name + " Timeline",
      events: []
    };
    jsonEditorEl.value = JSON.stringify(timelineStub, null, 2);
  }
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

  if (activeTab === "mcq") {
    filename = selectedUnit.quizzes[0].path.split("/").pop();
  }
  if (activeTab === "randomiser") {
    filename = "cards_data.json";
  }
  if (activeTab === "timeline") {
    filename = selectedUnit.id + "-timeline.json";
  }

  const blob = new Blob([jsonEditorEl.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function hideEditor() {
  jsonEditorEl.classList.add("td-hidden");
  actionsEl.classList.add("td-hidden");
}
