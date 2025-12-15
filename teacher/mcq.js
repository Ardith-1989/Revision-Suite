// MCQ Editor for your repo structure
// - modules.json at: /quizzes/modules.json
// - quiz files at: /quizzes/quizzes/<moduleFolder>/<unitFolder>/<file>.json
// - modules.json quiz paths stored like: "quizzes/<moduleFolder>/<unitFolder>/<file>.json"
// From /teacher/, we fetch quiz JSON via: "../quizzes/" + storedPath

const MODULES_PATH = "../quizzes/modules.json";

const el = (id) => document.getElementById(id);

const moduleSelect = el("moduleSelect");
const unitSelect = el("unitSelect");
const quizSelect = el("quizSelect");
const quizFolderInput = el("quizFolderInput");
const quizDescInput = el("quizDescInput");

const newQuizBtn = el("newQuizBtn");
const loadQuizBtn = el("loadQuizBtn");

const editorCard = el("editorCard");
const editorHeading = el("editorHeading");
const quizTitleInput = el("quizTitleInput");
const quizIdInput = el("quizIdInput");

const addQuestionBtn = el("addQuestionBtn");
const questionsBody = el("questionsBody");

const validateBtn = el("validateBtn");
const downloadQuizBtn = el("downloadQuizBtn");
const downloadModulesBtn = el("downloadModulesBtn");

let modulesData = null;

let selectedModule = null;
let selectedUnit = null;
let selectedQuizMeta = null;

let workingQuiz = null; // { id, title, questions: [...] }

// ---------- helpers ----------
function slugify(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setEditorVisible(visible) {
  editorCard.style.display = visible ? "block" : "none";
}

function inferUnitFolder(unit) {
  // Try to infer from first quiz path: "quizzes/<moduleFolder>/<unitFolder>/file.json"
  const quizzes = unit?.quizzes || [];
  if (!quizzes.length) return "";
  const p = quizzes[0].path || "";
  const parts = p.split("/"); // ["quizzes", "<moduleFolder>", "<unitFolder>", "<file>.json"]
  if (parts.length >= 3) return parts[2] || "";
  return "";
}

function fetchQuizJSONFromMeta(meta) {
  const storedPath = meta.path; // e.g. "quizzes/greekstates/persia/01-the-classical-greek-world.json"
  const fetchPath = "../quizzes/" + storedPath; // -> "../quizzes/quizzes/greekstates/persia/..."
  return fetch(fetchPath).then((r) => {
    if (!r.ok) throw new Error("Quiz JSON not found at: " + fetchPath.replace(/^\.\.\//, ""));
    return r.json();
  });
}

// Normalise to our editor schema
function normaliseQuiz(data, fallbackId, fallbackTitle) {
  const id = data?.id || fallbackId;
  const title = data?.title || fallbackTitle;
  const description = typeof data?.description === "string" ? data.description : "";

  if (data && Array.isArray(data.questions)) {
    const questions = data.questions.map((q) => {
      if (Array.isArray(q.options) && Number.isInteger(q.correctIndex)) {
        return {
          question: q.question || "",
          options: [
            q.options[0] ?? "",
            q.options[1] ?? "",
            q.options[2] ?? "",
            q.options[3] ?? "",
          ],
          correctIndex: q.correctIndex,
        };
      }

      if (q.answers && typeof q.answers === "object") {
        const opts = [q.answers.A, q.answers.B, q.answers.C, q.answers.D].map(v => v ?? "");
        const map = { A: 0, B: 1, C: 2, D: 3 };
        const correctIndex = map[q.correctAnswer] ?? 0;
        return { question: q.question || "", options: opts, correctIndex };
      }

      return { question: q.question || "", options: ["", "", "", ""], correctIndex: 0 };
    });

    return { id, title, description, questions };
  }

  return { id, title, description, questions: [] };
}

function buildQuizToSave() {
  return {
    id: workingQuiz.id,
    title: quizTitleInput.value.trim(),
    description: quizDescInput.value.trim(),
    questions: workingQuiz.questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
    })),
  };
}

// ---------- render dropdowns ----------
function populateModules() {
  moduleSelect.innerHTML = "";
  modulesData.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = m.name;
    moduleSelect.appendChild(opt);
  });

  selectedModule = modulesData[0] || null;
  populateUnits();
}

function populateUnits() {
  unitSelect.innerHTML = "";
  quizSelect.innerHTML = "";
  setEditorVisible(false);

  const units = selectedModule?.units || [];
  units.forEach((u, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = u.name;
    unitSelect.appendChild(opt);
  });

  selectedUnit = units[0] || null;

  // infer unit folder for quiz creation
  quizFolderInput.value = inferUnitFolder(selectedUnit);

  populateQuizzes();
}

function populateQuizzes() {
  quizSelect.innerHTML = "";
  setEditorVisible(false);

  const quizzes = selectedUnit?.quizzes || [];

  // Existing quizzes
  quizzes.forEach((q, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = q.title;
    quizSelect.appendChild(opt);
  });

  // Special option for creating new quiz
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "➕ New quiz…";
  quizSelect.appendChild(newOpt);

  selectedQuizMeta = quizzes[0] || null;
}

// ---------- question UI ----------
function renderQuestions() {
  questionsBody.innerHTML = "";
  workingQuiz.questions.forEach((q, i) => {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.textContent = String(i + 1);

    const tdQ = document.createElement("td");
    tdQ.innerHTML = `
      <textarea class="qText" rows="2" style="width:100%" placeholder="Question">${escapeHTML(q.question)}</textarea>
      <div class="optionGrid">
        <input class="optA" placeholder="Option A" value="${escapeAttr(q.options[0])}">
        <input class="optB" placeholder="Option B" value="${escapeAttr(q.options[1])}">
        <input class="optC" placeholder="Option C" value="${escapeAttr(q.options[2])}">
        <input class="optD" placeholder="Option D" value="${escapeAttr(q.options[3])}">
      </div>
    `;

    const tdCorrect = document.createElement("td");
    tdCorrect.innerHTML = `
      <select class="correctSel">
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
        <option value="3">D</option>
      </select>
    `;
    tdCorrect.querySelector(".correctSel").value = String(q.correctIndex);

    const tdRemove = document.createElement("td");
    const rm = document.createElement("button");
    rm.className = "smallBtn danger";
    rm.textContent = "Remove";
    rm.onclick = () => {
      workingQuiz.questions.splice(i, 1);
      renderQuestions();
    };
    tdRemove.appendChild(rm);

    tr.appendChild(tdNum);
    tr.appendChild(tdQ);
    tr.appendChild(tdCorrect);
    tr.appendChild(tdRemove);

    questionsBody.appendChild(tr);

    // Wire inputs → workingQuiz
    const qText = tdQ.querySelector(".qText");
    const optA = tdQ.querySelector(".optA");
    const optB = tdQ.querySelector(".optB");
    const optC = tdQ.querySelector(".optC");
    const optD = tdQ.querySelector(".optD");
    const correctSel = tdCorrect.querySelector(".correctSel");

    qText.addEventListener("input", () => (workingQuiz.questions[i].question = qText.value));
    optA.addEventListener("input", () => (workingQuiz.questions[i].options[0] = optA.value));
    optB.addEventListener("input", () => (workingQuiz.questions[i].options[1] = optB.value));
    optC.addEventListener("input", () => (workingQuiz.questions[i].options[2] = optC.value));
    optD.addEventListener("input", () => (workingQuiz.questions[i].options[3] = optD.value));
    correctSel.addEventListener("change", () => (workingQuiz.questions[i].correctIndex = parseInt(correctSel.value, 10)));
  });
}

function escapeHTML(s){ return (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function escapeAttr(s){ return (s||"").replaceAll("&","&amp;").replaceAll("\"","&quot;"); }

// ---------- actions ----------
async function loadSelectedQuiz() {
  const qVal = quizSelect.value;
  if (qVal === "__new__") {
    await createNewQuizFlow();
    return;
  }

  const idx = parseInt(qVal, 10);
  const quizzes = selectedUnit?.quizzes || [];
  selectedQuizMeta = quizzes[idx] || null;

  if (!selectedQuizMeta) return;

  setEditorVisible(true);
  editorHeading.textContent = "Editing: " + selectedQuizMeta.title;
  try {
    const raw = await fetchQuizJSONFromMeta(selectedQuizMeta);
    workingQuiz = normaliseQuiz(raw, selectedQuizMeta.id, selectedQuizMeta.title);
  } catch (e) {
    // If fetch fails, open empty but keep metadata
    workingQuiz = { id: selectedQuizMeta.id, title: selectedQuizMeta.title, questions: [] };
    alert(String(e.message || e));
  }

  // Populate form fields from the loaded quiz (safe – workingQuiz definitely exists here)
  quizIdInput.value = workingQuiz.id || (selectedQuizMeta?.id || "");
  quizTitleInput.value = workingQuiz.title || (selectedQuizMeta?.title || "");
  quizDescInput.value = workingQuiz.description || "";

  // Keep workingQuiz in sync with form fields (avoid stacking listeners)
  quizTitleInput.oninput = () => { if (workingQuiz) workingQuiz.title = quizTitleInput.value; };
  quizDescInput.oninput = () => { if (workingQuiz) workingQuiz.description = quizDescInput.value; };
  renderQuestions();
}

async function createNewQuizFlow() {
  if (!selectedModule || !selectedUnit) return;

  const title = prompt("New quiz title?");
  if (!title) return;

  const quizId = slugify(title);
  const moduleFolder = selectedModule.id; // matches your example
  let unitFolder = (quizFolderInput.value || "").trim();

  if (!unitFolder) {
    // Try infer again, else ask
    unitFolder = inferUnitFolder(selectedUnit);
    if (!unitFolder) {
      unitFolder = prompt("Unit folder name under quizzes/quizzes/" + moduleFolder + "/ ?\nExample: persia") || "";
      unitFolder = unitFolder.trim();
      if (!unitFolder) return;
    }
    quizFolderInput.value = unitFolder;
  }

  // Path stored in modules.json (relative to /quizzes/index.html)
  const storedPath = `quizzes/${moduleFolder}/${unitFolder}/${quizId}.json`;

  // Add quiz meta to selected unit
  if (!selectedUnit.quizzes) selectedUnit.quizzes = [];
  const quizMeta = { id: quizId, title, path: storedPath };
  selectedUnit.quizzes.push(quizMeta);

  // Update dropdown and select new quiz
  populateQuizzes();
  // select the last quiz (newly added)
  quizSelect.value = String((selectedUnit.quizzes.length - 1));

  selectedQuizMeta = quizMeta;
  workingQuiz = { id: quizId, title, description: "", questions: [] };
  quizDescInput.value = "";


  setEditorVisible(true);
  editorHeading.textContent = "Creating: " + title;

  quizIdInput.value = quizId;
  quizTitleInput.value = title;


  // Keep workingQuiz in sync with form fields
  quizTitleInput.oninput = () => { if (workingQuiz) workingQuiz.title = quizTitleInput.value; };
  quizDescInput.oninput = () => { if (workingQuiz) workingQuiz.description = quizDescInput.value; };
  renderQuestions();

  alert(
    "Quiz created in modules.json (in memory).\n\nNext steps:\n1) Add questions\n2) Download quiz JSON\n3) Download modules.json\n4) Place quiz JSON at: /quizzes/quizzes/" +
      moduleFolder + "/" + unitFolder + "/" + quizId + ".json"
  );
}

function addBlankQuestion() {
  if (!workingQuiz) return;
  workingQuiz.questions.push({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0
  });
  renderQuestions();
}

// ---------- exports ----------
function downloadQuiz() {
  if (!workingQuiz) return;

  // Ensure meta is updated with any title edits
  const newTitle = quizTitleInput.value.trim();
  workingQuiz.title = newTitle;

  if (selectedQuizMeta) {
    selectedQuizMeta.title = newTitle;
    // also keep id in sync if missing
    if (!selectedQuizMeta.id) selectedQuizMeta.id = workingQuiz.id;
  }

  const quizObj = buildQuizToSave();
  const filename = `${workingQuiz.id}.json`;
  downloadJSON(filename, quizObj);
}

function validateQuiz() {
  try {
    const quizObj = buildQuizToSave();
    if (!quizObj.title) throw new Error("Title is required.");
    quizObj.questions.forEach((q, i) => {
      if (!q.question.trim()) throw new Error(`Question ${i + 1} is blank.`);
      if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Question ${i + 1}: options must be 4 items.`);
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Question ${i + 1}: correctIndex must be 0–3.`);
    });
    alert("Quiz looks valid ✔");
  } catch (e) {
    alert("Validation error:\n" + (e.message || e));
  }
}

function downloadModules() {
  downloadJSON("modules.json", modulesData);
}

// ---------- wire events ----------
moduleSelect.addEventListener("change", () => {
  const idx = parseInt(moduleSelect.value, 10);
  selectedModule = modulesData[idx];
  populateUnits();
});

unitSelect.addEventListener("change", () => {
  const units = selectedModule?.units || [];
  selectedUnit = units[parseInt(unitSelect.value, 10)];
  quizFolderInput.value = inferUnitFolder(selectedUnit);
  populateQuizzes();
});

quizSelect.addEventListener("change", () => {
  // do nothing until "Load selected quiz" pressed (keeps UX consistent)
});

newQuizBtn.addEventListener("click", async () => {
  quizSelect.value = "__new__";
  await createNewQuizFlow();
});

loadQuizBtn.addEventListener("click", loadSelectedQuiz);
addQuestionBtn.addEventListener("click", addBlankQuestion);

validateBtn.addEventListener("click", validateQuiz);
downloadQuizBtn.addEventListener("click", downloadQuiz);
downloadModulesBtn.addEventListener("click", downloadModules);

// ---------- init ----------
(async function init(){
  const r = await fetch(MODULES_PATH);
  modulesData = await r.json();
  populateModules();
})();
