// EXPENSO // BRUTALIST APP LOGIC
import { createClient } from '@supabase/supabase-js';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentUser = null;

const validCats = ['FOOD', 'TRANSPORT', 'ENTERTAINMENT', 'UTILITIES', 'SHOPPING', 'HEALTH', 'OTHER'];

const state = {
    expenses: [],
    limits: JSON.parse(localStorage.getItem('expenso_limits')) || {},
    filter: 'ALL',
    sort: 'LATEST',
    invert: JSON.parse(localStorage.getItem('expenso_invert')) || false,
    loading: false
};

if (state.invert) document.body.classList.add('invert-reality');

// DOM ELEMENTS
const magicInput = document.getElementById('magic-input');
const magicBtn = document.getElementById('magic-btn');
const yellBtn = document.getElementById('yell-btn');
const expenseList = document.getElementById('expense-list');
const categoryChartEl = document.getElementById('category-chart');
const mistakesListEl = document.getElementById('mistakes-list');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const limitCatInput = document.getElementById('limit-cat');
const limitAmountInput = document.getElementById('limit-amount');
const limitBtn = document.getElementById('limit-btn');
const limitsListEl = document.getElementById('limits-list');
const aiAdviceEl = document.getElementById('ai-advice');
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const invertBtn = document.getElementById('invert-btn');
const exportBtn = document.getElementById('export-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const importFile = document.getElementById('import-file');
const filterSelect = document.getElementById('filter-select');
const sortSelect = document.getElementById('sort-select');
const roastBtn = document.getElementById('roast-btn');
const clearBtn = document.getElementById('clear-btn');
const toastEl = document.getElementById('toast');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMsg = document.getElementById('modal-msg');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// CHAT ELEMENTS
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const chatBtn = document.getElementById('chat-btn');
let chatHistory = [];

// PDF ELEMENTS
const pdfTemplateContainer = document.getElementById('pdf-template-container');
const pdfReport = document.getElementById('pdf-report');
const pdfAiAnalysis = document.getElementById('pdf-ai-analysis');
const pdfNet = document.getElementById('pdf-net');
const pdfIncome = document.getElementById('pdf-income');
const pdfExpenses = document.getElementById('pdf-expenses');
const pdfTableBody = document.getElementById('pdf-table-body');

// AUTH ELEMENTS
const authScreen = document.getElementById('auth-screen');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const authUsername = document.getElementById('auth-username');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authConfirmPassword = document.getElementById('auth-confirm-password');
const showPasswordBtn = document.getElementById('show-password-btn');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const logoutBtn = document.getElementById('logout-btn');
const appHeaderTitle = document.getElementById('app-header-title');

// INFO UI
const infoOverlay = document.getElementById('info-overlay');
const infoTitle = document.getElementById('info-title');
const infoMsg = document.getElementById('info-msg');
const infoCloseBtn = document.getElementById('info-close-btn');
const helpBtn = document.getElementById('help-btn');
const aboutBtn = document.getElementById('about-btn');

const tutorialHTML = `
    <p><strong>WELCOME TO EXPENSO.</strong></p>
    <br>
    <p>1. <strong>MAGIC ENTRY:</strong> Type naturally (e.g. "I just bought a $5 coffee") and hit GO. The AI will parse it.</p>
    <br>
    <p>2. <strong>VOICE INPUT:</strong> Click SPEAK and dictate your expenses hands-free.</p>
    <br>
    <p>3. <strong>KILL SWITCH:</strong> Set strict spending limits for each category to identify where you are bankrupting yourself.</p>
    <br>
    <p>4. <strong>COACH CHAT:</strong> Ask the AI at the bottom of the screen for personalized advice based on your logged history.</p>
`;

const aboutHTML = `
    <p><strong>EXPENSO // v1.0.0</strong></p>
    <br>
    <p>A brutalist, AI-powered financial tracker.</p>
    <br>
    <p>Built with no frameworks and no bloat. Powered by Groq AI and Supabase PostgreSQL.</p>
`;

function showInfo(title, htmlMsg) {
    infoTitle.textContent = title;
    infoMsg.innerHTML = htmlMsg;
    infoOverlay.style.display = 'flex';
}

infoCloseBtn.addEventListener('click', () => {
    infoOverlay.style.display = 'none';
});

helpBtn.addEventListener('click', () => {
    settingsOverlay.style.display = 'none';
    showInfo("HOW_TO_USE", tutorialHTML);
});

aboutBtn.addEventListener('click', () => {
    settingsOverlay.style.display = 'none';
    showInfo("ABOUT_SYSTEM", aboutHTML);
});

// CORE FUNCTIONS
function save() {
    try {
        localStorage.setItem('expenso_limits', JSON.stringify(state.limits));
        localStorage.setItem('expenso_invert', JSON.stringify(state.invert));
        render();
    } catch (e) {
        showToast("STORAGE_ERROR");
    }
}

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
}

function showModal(title, msg) {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMsg.textContent = msg;
        modalOverlay.style.display = 'flex';

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modalOverlay.style.display = 'none';
            modalConfirmBtn.removeEventListener('click', onConfirm);
            modalCancelBtn.removeEventListener('click', onCancel);
        };

        modalConfirmBtn.addEventListener('click', onConfirm);
        modalCancelBtn.addEventListener('click', onCancel);
    });
}

async function callAI(text) {
    if (!API_KEY) {
        showToast("SET VITE_GROQ_API_KEY IN .ENV");
        return null;
    }

    state.loading = true;
    magicBtn.textContent = "WAIT...";
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{
                    role: "user",
                    content: `Parse this into JSON: "${text}". 
                    Fields: amount (number), category (string MUST be one of: FOOD, TRANSPORT, ENTERTAINMENT, UTILITIES, SHOPPING, HEALTH, OTHER), note (string), type (expense/income), merchant (string). 
                    Example: {"amount": 20, "category": "FOOD", "note": "Lunch", "type": "expense", "merchant": "Subway"}.
                    Return ONLY JSON.`
                }],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error(e);
        showToast("GROQ_FAILURE");
        return null;
    } finally {
        state.loading = false;
        magicBtn.textContent = "GO";
    }
}

async function handleMagicEntry() {
    try {
        const text = magicInput.value.trim();
        if (!text) return;

        const result = await callAI(text);
        if (result) {
            const newExpense = {
                ...result,
                date: new Date().toISOString()
            };
            
            let newId = crypto.randomUUID();
            if (supabase && currentUser) {
                const { data: insertData, error } = await supabase.from('expenses').insert([{
                    user_id: currentUser.id,
                    amount: newExpense.amount,
                    category: newExpense.category,
                    note: newExpense.note,
                    type: newExpense.type,
                    merchant: newExpense.merchant,
                    date: newExpense.date
                }]).select();
                
                if (error) {
                    showToast("SYNC_FAILED");
                    magicBtn.textContent = "GO";
                    return;
                }
                if (insertData && insertData.length > 0) {
                    newId = insertData[0].id;
                }
            }
            
            newExpense.id = newId;
            state.expenses.unshift(newExpense);
            magicInput.value = "";
            save();
            showToast("ENTRY_LOGGED");
            updateAIAdvice();
        }
    } catch (e) {
        showToast("ENTRY_FAILED");
        magicBtn.textContent = "GO";
    }
}

async function updateAIAdvice() {
    if (state.expenses.length < 3 || !API_KEY) return;

    try {
        const summary = JSON.stringify(state.expenses.slice(0, 10));
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{
                    role: "user",
                    content: `Based on these transactions: ${summary}, give one constructive, direct financial advice (under 20 words). Be strict but helpful.`
                }]
            })
        });

        const data = await response.json();
        aiAdviceEl.textContent = data.choices[0].message.content.trim();
    } catch (e) {
        aiAdviceEl.textContent = "KEEP_TRACKING_YOUR_WASTE.";
    }
}

window.deleteExpense = async (id) => {
    try {
        const confirmed = await showModal("DELETE_ENTRY", "ARE_YOU_SURE?");
        if (confirmed) {
            if (supabase && currentUser) {
                const { error } = await supabase.from('expenses').delete().eq('id', id);
                if (error) throw error;
            }
            state.expenses = state.expenses.filter(e => e.id !== id);
            save();
            showToast("ENTRY_DELETED");
        }
    } catch (e) {
        showToast("DELETE_FAILED");
    }
};

function renderCharts() {
    const expenses = state.expenses.filter(e => e.type === 'expense');
    
    // Category Blocks
    if (expenses.length === 0) {
        categoryChartEl.innerHTML = '<div class="empty-state">NO_DATA</div>';
        mistakesListEl.innerHTML = '<div class="empty-state">NO_DATA</div>';
        return;
    }

    const categories = {};
    expenses.forEach(e => {
        let cat = (e.category || 'OTHER').toUpperCase();
        if (!validCats.includes(cat)) cat = 'OTHER';
        categories[cat] = (categories[cat] || 0) + e.amount;
    });

    const maxCatAmount = Math.max(...Object.values(categories));
    
    categoryChartEl.innerHTML = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amount]) => {
            const limit = state.limits[cat];
            const isBankrupt = limit !== undefined && amount > limit;
            const maxVal = limit !== undefined ? Math.max(limit, maxCatAmount) : maxCatAmount;
            const pct = Math.min((amount / maxVal) * 100, 100);
            
            return `
                <div class="chart-row ${isBankrupt ? 'bankrupt' : ''}">
                    <div class="chart-label-row">
                        <span>${cat} ${isBankrupt ? '<span class="bankrupt-tag">BANKRUPT</span>' : ''}</span>
                        <span>$${amount.toFixed(2)} ${limit !== undefined ? `/ $${limit.toFixed(0)}` : ''}</span>
                    </div>
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');

    // Biggest Mistakes
    const mistakes = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
    
    mistakesListEl.innerHTML = mistakes.map(m => `
        <div class="mistake-item">
            <span class="mistake-note">${(m.note || m.category || 'UNKNOWN').toUpperCase()}</span>
            <span class="mistake-amount">-$${m.amount.toFixed(2)}</span>
        </div>
    `).join('');
}

function renderLimits() {
    if (Object.keys(state.limits).length === 0) {
        limitsListEl.innerHTML = '<div class="empty-state">NO_LIMITS_SET</div>';
        return;
    }
    limitsListEl.innerHTML = Object.entries(state.limits).map(([cat, limit]) => `
        <div class="expense-item">
            <div class="item-info">
                <span class="item-note">${cat}</span>
            </div>
            <div style="display:flex; align-items:center; gap:20px;">
                <span class="item-amount">LIMIT: $${limit}</span>
                <button onclick="adjustLimit('${cat}', ${limit})" style="padding: 5px 10px; font-size: 0.6rem; background: var(--acid); color: var(--black);">ADJ</button>
                <button onclick="deleteLimit('${cat}')" style="padding: 5px 10px; font-size: 0.6rem; background: var(--red);">DEL</button>
            </div>
        </div>
    `).join('');
}

window.deleteLimit = async (cat) => {
    try {
        const confirmed = await showModal("DELETE_LIMIT", "ARE_YOU_SURE?");
        if (confirmed) {
            delete state.limits[cat];
            save();
            showToast("LIMIT_DELETED");
        }
    } catch (e) {
        showToast("ERROR_DELETING_LIMIT");
    }
};

window.adjustLimit = (cat, limit) => {
    limitCatInput.value = cat;
    limitAmountInput.value = limit;
    limitAmountInput.focus();
};

function render() {
    // Totals
    const income = state.expenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
    const expense = state.expenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
    const balance = income - expense;

    totalBalanceEl.textContent = `$${balance.toFixed(2)}`;
    totalIncomeEl.textContent = `+$${income.toFixed(0)}`;
    totalExpenseEl.textContent = `-$${expense.toFixed(0)}`;

    renderCharts();
    renderLimits();

    // Filter and Sort List
    let filteredExpenses = state.expenses;
    
    if (state.filter !== 'ALL') {
        filteredExpenses = filteredExpenses.filter(e => {
            let cat = (e.category || 'OTHER').toUpperCase();
            if (!validCats.includes(cat)) cat = 'OTHER';
            return cat === state.filter;
        });
    }

    if (state.sort === 'DAMAGE') {
        filteredExpenses = [...filteredExpenses].sort((a, b) => b.amount - a.amount);
    } else {
        // LATEST
        filteredExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (filteredExpenses.length === 0) {
        expenseList.innerHTML = '<div class="empty-state">NO_DATA_AVAILABLE</div>';
        return;
    }

    expenseList.innerHTML = filteredExpenses.map(e => `
        <div class="expense-item ${e.type === 'income' ? 'is-income' : ''}">
            <div class="item-info">
                <span class="item-note">${e.note || e.category}</span>
                <span class="item-meta">${e.merchant ? e.merchant + ' //' : ''} ${new Date(e.date).toLocaleDateString()}</span>
            </div>
            <div style="display:flex; align-items:center; gap:20px;">
                <span class="item-amount">${e.type === 'income' ? '+' : '-'}$${e.amount.toFixed(2)}</span>
                <button onclick="deleteExpense('${e.id}')" style="padding: 5px 10px; font-size: 0.6rem; background: var(--red);">DEL</button>
            </div>
        </div>
    `).join('');
}

// EVENTS
magicBtn.addEventListener('click', handleMagicEntry);

// VOICE INPUT
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    yellBtn.addEventListener('click', () => {
        try {
            finalTranscript = "";
            magicInput.value = "";
            magicInput.disabled = true;
            magicBtn.disabled = true;
            yellBtn.disabled = true;
            recognition.start();
            yellBtn.classList.add('listening');
            yellBtn.textContent = '...';
        } catch(e) {
            console.error(e);
            magicInput.disabled = false;
            magicBtn.disabled = false;
            yellBtn.disabled = false;
        }
    });

    recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
        }
        magicInput.value = currentTranscript;
        finalTranscript = currentTranscript;
    };

    recognition.onend = () => {
        yellBtn.classList.remove('listening');
        yellBtn.textContent = 'SPEAK';
        magicInput.disabled = false;
        magicBtn.disabled = false;
        yellBtn.disabled = false;
        
        if (finalTranscript.trim()) {
            handleMagicEntry();
        }
    };

    recognition.onerror = (event) => {
        recognition.stop();
        yellBtn.classList.remove('listening');
        yellBtn.textContent = 'SPEAK';
        magicInput.disabled = false;
        magicBtn.disabled = false;
        yellBtn.disabled = false;
        showToast("MIC_ERROR");
    };
} else {
    yellBtn.style.display = 'none';
}
magicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleMagicEntry();
});

limitBtn.addEventListener('click', () => {
    try {
        const cat = limitCatInput.value;
        const amt = parseFloat(limitAmountInput.value);
        if (cat && !isNaN(amt)) {
            state.limits[cat] = amt;
            limitCatInput.value = '';
            limitAmountInput.value = '';
            save();
            showToast("LIMIT_SET");
        } else {
            showToast("INVALID_INPUT");
        }
    } catch (e) {
        showToast("LIMIT_ERROR");
    }
});

// SETTINGS & INVERT
settingsBtn.addEventListener('click', () => settingsOverlay.style.display = 'flex');
closeSettingsBtn.addEventListener('click', () => settingsOverlay.style.display = 'none');

invertBtn.addEventListener('click', () => {
    state.invert = !state.invert;
    if (state.invert) {
        document.body.classList.add('invert-reality');
    } else {
        document.body.classList.remove('invert-reality');
    }
    save();
});

// DATA VAULT
exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.expenses));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "expenso_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("EXPORT_COMPLETE");
});

exportPdfBtn.addEventListener('click', async () => {
    if (!API_KEY) {
        showToast("MISSING_API_KEY");
        return;
    }
    
    if (state.expenses.length === 0) {
        showToast("NO_DATA_TO_EXPORT");
        return;
    }

    exportPdfBtn.textContent = "WAIT...";
    exportPdfBtn.disabled = true;

    try {
        const summary = JSON.stringify(state.expenses.slice(0, 100));
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{
                    role: "user",
                    content: `Here is a JSON list of my entire spending history: ${summary}. Give me a comprehensive, brutal, and constructive 3-4 sentence financial analysis of my overall spending habits. No intro, just the analysis.`
                }]
            })
        });

        const data = await response.json();
        const analysis = data.choices[0].message.content.trim();

        pdfAiAnalysis.textContent = analysis;

        const income = state.expenses.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
        const expensesAmt = state.expenses.filter(e => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);
        const netWorth = income - expensesAmt;

        pdfNet.textContent = `$${netWorth.toFixed(2)}`;
        pdfIncome.textContent = `$${income.toFixed(2)}`;
        pdfExpenses.textContent = `$${expensesAmt.toFixed(2)}`;

        pdfTableBody.innerHTML = state.expenses.map(e => `
            <tr>
                <td>${new Date(e.date).toLocaleDateString()}</td>
                <td>${e.type.toUpperCase()}</td>
                <td>${(e.category || 'OTHER').toUpperCase()}</td>
                <td>$${e.amount.toFixed(2)}</td>
                <td>${e.note || '-'}</td>
            </tr>
        `).join('');

        pdfTemplateContainer.style.display = 'block';
        
        const opt = {
            margin:       0.5,
            filename:     'expenso_dossier.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Ensure html2pdf is loaded
        if (window.html2pdf) {
            await html2pdf().set(opt).from(pdfReport).save();
            showToast("PDF_GENERATED");
            settingsOverlay.style.display = 'none';
        } else {
            showToast("PDF_LIBRARY_MISSING");
        }
    } catch (e) {
        showToast("PDF_FAILED");
    } finally {
        pdfTemplateContainer.style.display = 'none';
        exportPdfBtn.textContent = "EXPORT_PDF";
        exportPdfBtn.disabled = false;
    }
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                state.expenses = importedData;
                save();
                showToast("IMPORT_SUCCESSFUL");
                settingsOverlay.style.display = 'none';
            } else {
                showToast("INVALID_DATA_FORMAT");
            }
        } catch (err) {
            showToast("IMPORT_FAILED");
        }
    };
    reader.readAsText(file);
});

// SORT AND FILTER
filterSelect.addEventListener('change', (e) => {
    state.filter = e.target.value;
    render();
});
sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
});

// MONTHLY ANALYSIS
roastBtn.addEventListener('click', async () => {
    if (!API_KEY) {
        showToast("MISSING_API_KEY");
        return;
    }
    roastBtn.textContent = "WAIT...";
    const currentMonth = new Date().getMonth();
    const monthExpenses = state.expenses.filter(e => e.type === 'expense' && new Date(e.date).getMonth() === currentMonth);
    
    if (monthExpenses.length === 0) {
        await showModal("NO_DATA", "NOTHING TO ANALYZE THIS MONTH.");
        roastBtn.textContent = "ANALYZE_MONTH";
        return;
    }

    try {
        const summary = JSON.stringify(monthExpenses.slice(0, 30));
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{
                    role: "user",
                    content: `Here is a JSON list of expenses for this month: ${summary}. Give me a constructive, helpful 2-sentence analysis of my spending habits this month. Highlight where I'm spending the most and how to improve.`
                }]
            })
        });

        const data = await response.json();
        await showModal("MONTHLY_ANALYSIS", data.choices[0].message.content.trim());
    } catch (e) {
        showToast("ANALYSIS_FAILED");
    } finally {
        roastBtn.textContent = "ANALYZE_MONTH";
    }
});

clearBtn.addEventListener('click', async () => {
    try {
        const confirmed = await showModal("PURGE_DATA", "WIPE_ALL_HISTORY?");
        if (confirmed) {
            if (supabase && currentUser) {
                const { error } = await supabase.from('expenses').delete().eq('user_id', currentUser.id);
                if (error) throw error;
            }
            state.expenses = [];
            save();
            aiAdviceEl.textContent = "DATA_PURGED.";
            showToast("STORAGE_CLEARED");
        }
    } catch (e) {
        showToast("PURGE_FAILED");
    }
});

// CHATBOT LOGIC
async function handleChatSubmit() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Render user message
    chatWindow.innerHTML += `<div class="chat-message msg-user">${text.toUpperCase()}</div>`;
    chatInput.value = '';
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (!API_KEY) {
        chatWindow.innerHTML += `<div class="chat-message msg-ai">MISSING API KEY. SET VITE_GROQ_API_KEY.</div>`;
        return;
    }

    // Add to history
    chatHistory.push({ role: "user", content: text });

    // AI loading state
    chatBtn.textContent = '...';
    chatBtn.disabled = true;

    try {
        const expenseSummary = JSON.stringify(state.expenses.slice(0, 50));
        const messages = [
            { 
                role: "system", 
                content: `You are Expenso, a strict but constructive financial coach. You analyze data and give short, direct answers. You have access to this recent user spending data: ${expenseSummary}` 
            },
            ...chatHistory
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: messages,
                max_tokens: 150
            })
        });

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        
        chatHistory.push({ role: "assistant", content: aiResponse });
        chatWindow.innerHTML += `<div class="chat-message msg-ai">${aiResponse.toUpperCase()}</div>`;
    } catch (e) {
        chatWindow.innerHTML += `<div class="chat-message msg-ai">NETWORK ERROR.</div>`;
    } finally {
        chatBtn.textContent = 'SEND';
        chatBtn.disabled = false;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

chatBtn.addEventListener('click', handleChatSubmit);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmit();
});

// AUTHENTICATION LOGIC
let isLoginMode = true;

authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = "SYSTEM_LOGIN";
        authUsername.style.display = "none";
        authUsername.required = false;
        authConfirmPassword.style.display = "none";
        authConfirmPassword.required = false;
        authToggleBtn.textContent = "CREATE_ACCOUNT";
    } else {
        authTitle.textContent = "REGISTER_USER";
        authUsername.style.display = "block";
        authUsername.required = true;
        authConfirmPassword.style.display = "block";
        authConfirmPassword.required = true;
        authToggleBtn.textContent = "HAVE_ACCOUNT? LOGIN";
    }
});

showPasswordBtn.addEventListener('click', () => {
    if (authPassword.type === "password") {
        authPassword.type = "text";
        authConfirmPassword.type = "text";
        showPasswordBtn.textContent = "HIDE";
    } else {
        authPassword.type = "password";
        authConfirmPassword.type = "password";
        showPasswordBtn.textContent = "SHOW";
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) {
        showToast("SUPABASE_NOT_CONFIGURED");
        return;
    }

    const email = authEmail.value;
    const password = authPassword.value;
    const confirmPassword = authConfirmPassword.value;
    const username = authUsername.value;

    if (!isLoginMode && password !== confirmPassword) {
        showToast("PASSWORDS_DO_NOT_MATCH");
        return;
    }

    authSubmitBtn.textContent = "WAIT...";
    authSubmitBtn.disabled = true;

    try {
        if (isLoginMode) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (!data.session) throw new Error("EMAIL_NOT_VERIFIED");
            currentUser = data.user;
            await completeLogin();
        } else {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username: username } }
            });
            if (error) throw error;
            
            if (!data.session) {
                showToast("ACCOUNT_CREATED. CHECK_EMAIL_TO_VERIFY.");
                // Switch back to login mode visually
                isLoginMode = true;
                authTitle.textContent = "SYSTEM_LOGIN";
                authUsername.style.display = "none";
                authUsername.required = false;
                authConfirmPassword.style.display = "none";
                authConfirmPassword.required = false;
                authToggleBtn.textContent = "CREATE_ACCOUNT";
                authForm.reset();
            } else {
                currentUser = data.user;
                await completeLogin();
            }
        }
    } catch (error) {
        showToast("AUTH_FAILED: " + error.message);
    } finally {
        authSubmitBtn.textContent = "ENTER";
        authSubmitBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        const confirmed = await showModal("LOGOUT", "ARE_YOU_SURE?");
        if (!confirmed) return;
        if (supabase) await supabase.auth.signOut();
        currentUser = null;
        state.expenses = [];
        render();
        authScreen.style.display = 'flex';
        settingsOverlay.style.display = 'none';
        appHeaderTitle.textContent = "EXPENSO.";
        showToast("LOGGED_OUT");
    } catch (e) {
        showToast("LOGOUT_FAILED");
    }
});

async function completeLogin() {
    authScreen.style.display = 'none';
    const username = currentUser?.user_metadata?.username || 'USER';
    appHeaderTitle.textContent = `EXPENSO. // ${username.toUpperCase()}`;
    showToast("ACCESS_GRANTED");
    await fetchExpenses();

    // Show tutorial if first time
    if (!localStorage.getItem('expenso_tutorial_seen')) {
        setTimeout(() => {
            showInfo("SYSTEM_INITIALIZATION", tutorialHTML);
            localStorage.setItem('expenso_tutorial_seen', 'true');
        }, 500);
    }
}

async function fetchExpenses() {
    if (!supabase || !currentUser) return;
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        state.expenses = data || [];
        render();
        if (state.expenses.length > 0) updateAIAdvice();
    } catch (e) {
        showToast("FETCH_FAILED");
    }
}

async function checkSession() {
    if (!supabase) return;
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
            currentUser = session.user;
            await completeLogin();
        } else {
            authScreen.style.display = 'flex';
            appHeaderTitle.textContent = "EXPENSO.";
        }
    } catch (e) {
        showToast("SESSION_ERROR");
        authScreen.style.display = 'flex';
        appHeaderTitle.textContent = "EXPENSO.";
    }
}

// INIT
render();
checkSession();

// EXPOSE GLOBALS
window.deleteExpense = deleteExpense;
