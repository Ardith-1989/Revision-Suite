// timeline-editor.js
// Uses:
//   /timelines/timelines-data.json  (modules -> units -> timelines metadata)
//   /timelines/timelines/<module>/<unitFolder>/<timelineId>.json  (individual timelines)
//
// From /teacher/, fetch paths are:
//   index:   ../timelines/timelines-data.json
//   files:   ../timelines/ + meta.path   (meta.path is relative to /timelines/index.html)

const INDEX_PATH = "../timelines/timelines-data.json";

const $ = (id) => document.getElementById(id);

const moduleSelect = $("moduleSelect");
const unitSelect = $("unitSelect");
const timelineSelect = $("timelineSelect");
const unitFolderInput = $("unitFolderInput");

const newTimelineBtn = $("newTimelineBtn");
const loadTimelineBtn = $("loadTimelineBtn");

const editorCard = $("editorCard");
const editorHeading = $("editorHeading");
const titleInput = $("titleInput");
const idInput = $("idInput");
const descInput = $("descInput");

const addEventBtn = $("addEventBtn");
const sortBtn = $("sortBtn");
const eventsBody = $("eventsBody");

const validateBtn = $("validateBtn");
const downloadTimelineBtn = $("downloadTimelineBtn");
const downloadIndexBtn = $("downloadIndexBtn");

let indexData = [];
let selectedModule = null;
let selectedUnit = null;
let selectedTimelineMeta = null;
let workingTimeline = null; // {id,title,description,events:[]}

function slugify(s){
  return (s||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

function downloadJSON(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setEditorVisible(v){ editorCard.style.display = v ? "block" : "none"; }

function inferUnitFolder(unit){
  const t = unit?.timelines?.[0];
  if (!t?.path) return "";
  // "timelines/<module>/<unitFolder>/<file>.json"
  const parts = t.path.split("/");
  return parts.length >= 3 ? (parts[2] || "") : "";
}

async function loadIndex(){
  const res = await fetch(INDEX_PATH, {cache:"no-store"});
  if (!res.ok) throw new Error("Could not load timelines index: " + INDEX_PATH);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("timelines-data.json must be an array");
  indexData = data;
}

function populateModules(){
  moduleSelect.innerHTML = "";
  indexData.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = m.name;
    moduleSelect.appendChild(opt);
  });
  selectedModule = indexData[0] || null;
  populateUnits();
}

function populateUnits(){
  unitSelect.innerHTML = "";
  timelineSelect.innerHTML = "";
  setEditorVisible(false);

  const units = selectedModule?.units || [];
  units.forEach((u, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = u.name;
    unitSelect.appendChild(opt);
  });

  selectedUnit = units[0] || null;
  unitFolderInput.value = inferUnitFolder(selectedUnit);
  populateTimelines();
}

function populateTimelines(){
  timelineSelect.innerHTML = "";
  setEditorVisible(false);

  const timelines = selectedUnit?.timelines || [];
  timelines.forEach((t, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = t.title;
    timelineSelect.appendChild(opt);
  });

  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "➕ New timeline…";
  timelineSelect.appendChild(newOpt);

  selectedTimelineMeta = timelines[0] || null;
}

function renderEvents(){
  eventsBody.innerHTML = "";
  (workingTimeline.events || []).forEach((ev, idx) => {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.textContent = String(idx + 1);

    const tdEvent = document.createElement("td");
    tdEvent.innerHTML = `
      <textarea class="eventLabel" rows="2" placeholder="Event label"></textarea>
    `;
    const labelTa = tdEvent.querySelector("textarea");
    labelTa.value = ev.label || "";
    labelTa.oninput = () => { workingTimeline.events[idx].label = labelTa.value; };

    const tdYear = document.createElement("td");
    const yearInput = document.createElement("input");
    yearInput.type = "number";
    yearInput.value = (typeof ev.year === "number") ? ev.year : 0;
    yearInput.oninput = () => { workingTimeline.events[idx].year = parseInt(yearInput.value || "0", 10); };
    tdYear.appendChild(yearInput);

    const tdDisp = document.createElement("td");
    const dispInput = document.createElement("input");
    dispInput.value = ev.displayDate || "";
    dispInput.placeholder = "e.g. 49 BCE";
    dispInput.oninput = () => { workingTimeline.events[idx].displayDate = dispInput.value; };
    tdDisp.appendChild(dispInput);

    const tdNote = document.createElement("td");
    const noteInput = document.createElement("input");
    noteInput.value = ev.note || "";
    noteInput.placeholder = "Optional note";
    noteInput.oninput = () => { workingTimeline.events[idx].note = noteInput.value; };
    tdNote.appendChild(noteInput);

    const tdRm = document.createElement("td");
    const rm = document.createElement("button");
    rm.className = "smallBtn danger";
    rm.textContent = "Remove";
    rm.onclick = () => {
      workingTimeline.events.splice(idx, 1);
      renderEvents();
    };
    tdRm.appendChild(rm);

    tr.appendChild(tdNum);
    tr.appendChild(tdEvent);
    tr.appendChild(tdYear);
    tr.appendChild(tdDisp);
    tr.appendChild(tdNote);
    tr.appendChild(tdRm);

    eventsBody.appendChild(tr);
  });
}

function sortEvents(){
  workingTimeline.events.sort((a,b) => (a.year ?? 0) - (b.year ?? 0));
  renderEvents();
}

async function loadSelectedTimeline(){
  const val = timelineSelect.value;
  if (val === "__new__") {
    await createNewTimelineFlow();
    return;
  }
  const idx = parseInt(val, 10);
  selectedTimelineMeta = (selectedUnit?.timelines || [])[idx] || null;
  if (!selectedTimelineMeta) return;

  editorHeading.textContent = "Editing: " + selectedTimelineMeta.title;
  setEditorVisible(true);

  const fetchPath = "../timelines/" + selectedTimelineMeta.path;
  const res = await fetch(fetchPath, {cache:"no-store"});
  if (!res.ok) throw new Error("Timeline JSON not found at: " + fetchPath.replace(/^\.\.\//,""));
  const data = await res.json();

  workingTimeline = {
    id: data.id || selectedTimelineMeta.id,
    title: data.title || selectedTimelineMeta.title,
    description: typeof data.description === "string" ? data.description : (selectedTimelineMeta.description || ""),
    events: Array.isArray(data.events) ? data.events.map(e => ({
      id: e.id || slugify(e.label || ("event-" + Math.random().toString(16).slice(2))),
      label: e.label || "",
      year: typeof e.year === "number" ? e.year : 0,
      displayDate: e.displayDate || "",
      note: e.note || ""
    })) : []
  };

  // Fill form fields
  idInput.value = workingTimeline.id;
  titleInput.value = workingTimeline.title;
  descInput.value = workingTimeline.description;

  titleInput.oninput = () => { if (workingTimeline) workingTimeline.title = titleInput.value; };
  descInput.oninput = () => { if (workingTimeline) workingTimeline.description = descInput.value; };

  renderEvents();
}

async function createNewTimelineFlow(){
  const title = prompt("New timeline title?");
  if (!title) return;

  const timelineId = slugify(title);
  const moduleId = selectedModule.id;

  let unitFolder = (unitFolderInput.value || "").trim();
  if (!unitFolder) {
    unitFolder = inferUnitFolder(selectedUnit);
    if (!unitFolder) {
      unitFolder = prompt("Unit folder name under /timelines/timelines/" + moduleId + "/ ?") || "";
      unitFolder = unitFolder.trim();
      if (!unitFolder) return;
    }
    unitFolderInput.value = unitFolder;
  }

  const storedPath = `timelines/${moduleId}/${unitFolder}/${timelineId}.json`;
  const meta = { id: timelineId, title, description: "", path: storedPath };

  // Ensure we update the canonical indexData object
  const m = indexData.find(m => m.id === selectedModule.id);
  const u = m?.units?.find(u => u.id === selectedUnit.id);
  if (!u) { alert("Could not find unit in timelines-data.json to update."); return; }
  if (!u.timelines) u.timelines = [];
  u.timelines.push(meta);

  // Sync selected pointers
  selectedModule = m;
  selectedUnit = u;
  selectedTimelineMeta = meta;

  populateTimelines();
  timelineSelect.value = String((selectedUnit.timelines.length - 1));

  workingTimeline = { id: timelineId, title, description: "", events: [] };
  setEditorVisible(true);
  editorHeading.textContent = "Creating: " + title;

  idInput.value = timelineId;
  titleInput.value = title;
  descInput.value = "";

  titleInput.oninput = () => { if (workingTimeline) workingTimeline.title = titleInput.value; };
  descInput.oninput = () => { if (workingTimeline) workingTimeline.description = descInput.value; };

  renderEvents();

  alert(
    "Timeline created in timelines-data.json (in memory).\n\nNext steps:\n1) Add events\n2) Download timeline JSON\n3) Download timelines-data.json\n4) Place timeline JSON at: /timelines/timelines/" +
    moduleId + "/" + unitFolder + "/" + timelineId + ".json"
  );
}

function addBlankEvent(){
  if (!workingTimeline) return;
  workingTimeline.events.push({
    id: slugify("event-" + (workingTimeline.events.length + 1)),
    label: "",
    year: 0,
    displayDate: "",
    note: ""
  });
  renderEvents();
}

function validateTimeline(){
  try{
    if (!workingTimeline) throw new Error("No timeline loaded.");
    if (!workingTimeline.title.trim()) throw new Error("Title is required.");
    if (!Array.isArray(workingTimeline.events)) throw new Error("Events must be an array.");
    workingTimeline.events.forEach((e, i) => {
      if (!e.label.trim()) throw new Error(`Event ${i+1} label is blank.`);
      if (typeof e.year !== "number" || Number.isNaN(e.year)) throw new Error(`Event ${i+1} year must be a number.`);
    });
    alert("Timeline looks valid ✔");
  }catch(err){
    alert("Validation error:\n" + (err.message || err));
  }
}

function downloadTimeline(){
  if (!workingTimeline) return;

  // Keep metadata title/description in sync for index export
  if (selectedTimelineMeta) {
    selectedTimelineMeta.title = titleInput.value.trim();
    selectedTimelineMeta.description = descInput.value.trim();
  }

  const out = {
    id: workingTimeline.id,
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    events: workingTimeline.events.map(e => ({
      id: e.id || slugify(e.label),
      label: e.label,
      year: e.year,
      displayDate: e.displayDate || "",
      note: e.note || ""
    }))
  };

  downloadJSON(workingTimeline.id + ".json", out);
}

function downloadIndex(){
  downloadJSON("timelines-data.json", indexData);
}

// Events
moduleSelect.onchange = () => { selectedModule = indexData[parseInt(moduleSelect.value,10)]; populateUnits(); };
unitSelect.onchange = () => { selectedUnit = (selectedModule?.units || [])[parseInt(unitSelect.value,10)] || null; unitFolderInput.value = inferUnitFolder(selectedUnit); populateTimelines(); };

newTimelineBtn.onclick = async () => { timelineSelect.value="__new__"; await createNewTimelineFlow(); };
loadTimelineBtn.onclick = async () => {
  try { await loadSelectedTimeline(); }
  catch(err){ alert(String(err.message || err)); }
};

addEventBtn.onclick = addBlankEvent;
sortBtn.onclick = sortEvents;
validateBtn.onclick = validateTimeline;
downloadTimelineBtn.onclick = downloadTimeline;
downloadIndexBtn.onclick = downloadIndex;

// Init
(async function init(){
  try{
    await loadIndex();
    populateModules();
  }catch(err){
    alert(String(err.message || err));
  }
})();
