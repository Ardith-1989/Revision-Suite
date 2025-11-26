// ===============================
// Global state
// ===============================

let contentGroups = {};
let functionGroups = {};

// ===============================
// Data loading
// ===============================

async function loadCardData() {
    try {
        const response = await fetch('./cards_data.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Failed to fetch JSON: ' + response.statusText);
        }
        const data = await response.json();

        contentGroups = data.contentGroups || {};
        functionGroups = data.functionGroups || {};

        renderContentSelection();
        renderFunctionSelection();
    } catch (err) {
        console.error('Error loading card data:', err);
        if (Object.keys(contentGroups).length === 0) {
            alert('Failed to load flashcard data. Please check cards_data.json.');
        }
    }
}

// ===============================
// Sidebar open / close
// ===============================

function toggleSidebar(force) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;

    const isOpen = sidebar.classList.contains('open');
    const willOpen = typeof force === 'boolean' ? force : !isOpen;

    if (willOpen) {
        sidebar.classList.add('open');
        backdrop.style.display = 'block';
    } else {
        sidebar.classList.remove('open');
        backdrop.style.display = 'none';
    }
}

function closeSidebar() {
    toggleSidebar(false);
}

// Expose for inline handlers
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

// ===============================
// Selection rendering helpers
// ===============================

function renderContentSelection() {
    const root = document.getElementById('groupSelection');
    if (!root) return;
    root.innerHTML = '';

    Object.entries(contentGroups).forEach(([name, value]) => {
        const block = buildCategoryBlock(name, value, 'content');
        root.appendChild(block);
    });

    updateSelectAllContent();
}

function renderFunctionSelection() {
    const root = document.getElementById('functionSelection');
    if (!root) return;
    root.innerHTML = '';

    Object.entries(functionGroups).forEach(([name, value]) => {
        const block = buildCategoryBlock(name, value, 'function');
        root.appendChild(block);
    });

    updateSelectAllFunctions();
}

// type = "content" | "function"
function buildCategoryBlock(name, value, type) {
    const container = document.createElement('div');
    container.className = type === 'content' ? 'category-container' : 'function-container';

    const header = document.createElement('div');
    header.className = type === 'content' ? 'category-title' : 'function-title';

    const categoryCheckbox = document.createElement('input');
    categoryCheckbox.type = 'checkbox';
    categoryCheckbox.className = type === 'content'
        ? 'category-checkbox'
        : 'function-category-checkbox';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = ' ' + name;

    header.appendChild(categoryCheckbox);
    header.appendChild(labelSpan);

    const body = document.createElement('div');
    body.className = type === 'content' ? 'category-content' : 'function-content';
    body.style.display = 'none';

    // Clicking the title row (but NOT the checkbox) toggles expand/collapse
    header.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'input') return;
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    // Category checkbox selects/deselects all leaf checkboxes inside
    categoryCheckbox.addEventListener('change', () => {
        const selector = type === 'content' ? '.content-checkbox' : '.function-checkbox';
        body.querySelectorAll(selector).forEach(cb => {
            cb.checked = categoryCheckbox.checked;
        });
        if (type === 'function') {
            updateSelectAllFunctions();
        } else {
            updateSelectAllContent();
        }
    });

    // Fill body: leaves or nested groups
    if (Array.isArray(value)) {
        value.forEach(item => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = item;
            cb.className = type === 'content' ? 'content-checkbox' : 'function-checkbox';

            cb.addEventListener('change', () => {
                if (type === 'function') {
                    updateSelectAllFunctions();
                } else {
                    updateSelectAllContent();
                }
            });

            label.appendChild(cb);
            label.appendChild(document.createTextNode(' ' + item));
            body.appendChild(label);
        });
    } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([subName, subVal]) => {
            const childBlock = buildCategoryBlock(subName, subVal, type);
            body.appendChild(childBlock);
        });
    }

    container.appendChild(header);
    container.appendChild(body);
    return container;
}

// ===============================
// "Select all" logic – instruction cards
// ===============================

function updateSelectAllFunctions() {
    const all = Array.from(document.querySelectorAll('.function-checkbox'));
    const selectAll = document.getElementById('selectAllFunctions');
    if (!selectAll || all.length === 0) return;
    selectAll.checked = all.every(cb => cb.checked);
}

function attachSelectAllFunctionsHandler() {
    const selectAll = document.getElementById('selectAllFunctions');
    if (!selectAll) return;
    selectAll.addEventListener('change', () => {
        const checked = selectAll.checked;
        document.querySelectorAll('.function-checkbox, .function-category-checkbox').forEach(cb => {
            cb.checked = checked;
        });
    });
}

// ===============================
// "Select all" / "Clear all" – content cards
// ===============================

function updateSelectAllContent() {
    const selectAll = document.getElementById('selectAllContent');
    if (!selectAll) return;

    const leaves = Array.from(document.querySelectorAll('.content-checkbox'));
    if (leaves.length === 0) {
        selectAll.checked = false;
        return;
    }
    selectAll.checked = leaves.every(cb => cb.checked);
}

function attachContentControls() {
    const selectAll = document.getElementById('selectAllContent');
    const clearBtn = document.getElementById('clearContentSelections');

    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checked = selectAll.checked;
            document.querySelectorAll('.content-checkbox, .category-checkbox').forEach(cb => {
                cb.checked = checked;
            });
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.querySelectorAll('.content-checkbox, .category-checkbox').forEach(cb => {
                cb.checked = false;
            });
            if (selectAll) selectAll.checked = false;
        });
    }
}

// ===============================
// Flashcard generation
// ===============================

function generateFlashcards() {
    const selectedContent = Array.from(document.querySelectorAll('.content-checkbox:checked'))
        .map(cb => cb.value)
        .filter(v => v && v.trim() !== '' && v !== 'on');

    const selectedFunctions = Array.from(document.querySelectorAll('.function-checkbox:checked'))
        .map(cb => cb.value)
        .filter(v => v && v.trim() !== '' && v !== 'on');

    if (selectedContent.length === 0) {
        alert('Please select at least one content card.');
        return;
    }

    if (selectedFunctions.length === 0) {
        alert('Please select at least one instruction card.');
        return;
    }

    const contentText = selectedContent[Math.floor(Math.random() * selectedContent.length)];
    const functionText = selectedFunctions[Math.floor(Math.random() * selectedFunctions.length)];

    const contentCard = document.getElementById('content-card');
    const functionCard = document.getElementById('function-card');

    if (contentCard) contentCard.innerText = contentText;
    if (functionCard) functionCard.innerText = functionText;
}

function randomiseSingleCard(type) {
    if (type === 'content') {
        const selectedContent = Array.from(document.querySelectorAll('.content-checkbox:checked'))
            .map(cb => cb.value)
            .filter(v => v && v.trim() !== '' && v !== 'on');

        if (selectedContent.length === 0) {
            alert('Please select at least one content card.');
            return;
        }
        const contentText = selectedContent[Math.floor(Math.random() * selectedContent.length)];
        const contentCard = document.getElementById('content-card');
        if (contentCard) contentCard.innerText = contentText;
    }

    if (type === 'function') {
        const selectedFunctions = Array.from(document.querySelectorAll('.function-checkbox:checked'))
            .map(cb => cb.value)
            .filter(v => v && v.trim() !== '' && v !== 'on');

        if (selectedFunctions.length === 0) {
            alert('Please select at least one instruction card.');
            return;
        }
        const functionText = selectedFunctions[Math.floor(Math.random() * selectedFunctions.length)];
        const functionCard = document.getElementById('function-card');
        if (functionCard) functionCard.innerText = functionText;
    }
}

// ===============================
// Excel upload / template
// ===============================

async function handleExcelUpload() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput || fileInput.files.length === 0) {
        alert('Please select an Excel file.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const parsed = parseExcelToJSON(workbook);

            Object.keys(parsed.contentGroups).forEach(group => {
                contentGroups[`(Uploaded) ${group}`] = parsed.contentGroups[group];
            });

            Object.keys(parsed.functionGroups).forEach(group => {
                functionGroups[`(Uploaded) ${group}`] = parsed.functionGroups[group];
            });

            renderContentSelection();
            renderFunctionSelection();
            alert('Flashcard data uploaded successfully!');
        } catch (err) {
            console.error('Error processing Excel file:', err);
            alert('Invalid Excel file format. Please check the structure.');
        }
    };

    reader.readAsArrayBuffer(file);
}

// Expect: first part content groups, then a "Functions" row, then function groups
function parseExcelToJSON(workbook) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const contentGroups = {};
    const functionGroups = {};
    let currentCategory = '';
    let isFunctionSection = false;

    rows.forEach(row => {
        if (!row || row.length === 0) return;

        if (row[0] === 'Functions') {
            isFunctionSection = true;
            currentCategory = '';
            return;
        }

        if (!isFunctionSection) {
            // Content side
            if (row[0] && !row[1]) {
                currentCategory = row[0];
                contentGroups[currentCategory] = [];
            } else if (currentCategory && row[1]) {
                contentGroups[currentCategory].push(row[1]);
            }
        } else {
            // Function side
            if (row[0] && !row[1]) {
                currentCategory = row[0];
                functionGroups[currentCategory] = [];
            } else if (currentCategory && row[1]) {
                functionGroups[currentCategory].push(row[1]);
            }
        }
    });

    return { contentGroups, functionGroups };
}

function downloadExcelTemplate() {
    const templateData = [
        ['Content Group', 'Topic'],
        ['Greek History', 'The Battle of Marathon'],
        ['', 'The Battle of Salamis'],
        ['Roman History', 'Caesar’s Assassination'],
        ['', 'Augustus’ Reforms'],
        ['Functions', ''],
        ['Function Group', 'Function Instruction'],
        ['Summarisation', 'Summarise in 3 bullet points'],
        ['Recall', 'Write a 5-minute paragraph']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Flashcard Template');
    XLSX.writeFile(workbook, 'Flashcard_Template.xlsx');
}

// Expose upload/template for inline handlers
window.handleExcelUpload = handleExcelUpload;
window.downloadExcelTemplate = downloadExcelTemplate;

// ===============================
// Theme toggle & initialisation
// ===============================

document.addEventListener('DOMContentLoaded', async () => {
    await loadCardData();

    attachSelectAllFunctionsHandler();
    attachContentControls();

    const contentCard = document.getElementById('content-card');
    const functionCard = document.getElementById('function-card');

    if (contentCard) {
        contentCard.addEventListener('click', () => randomiseSingleCard('content'));
        contentCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                randomiseSingleCard('content');
            }
        });
    }

    if (functionCard) {
        functionCard.addEventListener('click', () => randomiseSingleCard('function'));
        functionCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                randomiseSingleCard('function');
            }
        });
    }

    // Theme toggle
    const themeToggleBtn = document.getElementById('toggleThemeBtn');
    const storedTheme = localStorage.getItem('revisionRandomiserTheme');

    if (storedTheme === 'dark') {
        document.body.classList.remove('theme-light');
    } else if (storedTheme === 'light') {
        document.body.classList.add('theme-light');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.contains('theme-light');
            if (isLight) {
                document.body.classList.remove('theme-light');
                localStorage.setItem('revisionRandomiserTheme', 'dark');
            } else {
                document.body.classList.add('theme-light');
                localStorage.setItem('revisionRandomiserTheme', 'light');
            }
        });
    }

    // Close sidebar on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
});

// ===============================
// PWA: service worker + install
// ===============================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('Service Worker Registered', reg))
        .catch(err => console.log('Service Worker Registration Failed', err));
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;

    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.style.position = 'fixed';
    installButton.style.bottom = '20px';
    installButton.style.right = '20px';
    installButton.style.padding = '10px';
    installButton.style.background = '#007BFF';
    installButton.style.color = '#fff';
    installButton.style.border = 'none';
    installButton.style.cursor = 'pointer';
    installButton.style.zIndex = '9999';

    installButton.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                console.log('User installed the app');
            }
            installButton.remove();
        });
    });

    document.body.appendChild(installButton);
});
