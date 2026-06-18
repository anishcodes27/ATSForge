// assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    initMatrixRain();
    checkAuth();
    initDragAndDrop();
    initFormSubmit();
    initAuthForm();
});

// Matrix Rain Background
function initMatrixRain() {
    const canvas = document.getElementById('matrix-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array.from({length: columns}).fill(1);
    
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00f0ff'; // Neon Blue Rain
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 33);
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// State
let currentFile = null;
let isRegisterMode = false;
let currentUser = null;

// Views
const views = {
    auth: document.getElementById('auth-view'),
    upload: document.getElementById('upload-view'),
    loading: document.getElementById('loading-view'),
    dashboard: document.getElementById('dashboard-view'),
    history: document.getElementById('history-view')
};

function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

function resetApp() {
    if (!currentUser) return switchView('auth');
    document.getElementById('analyze-form').reset();
    currentFile = null;
    document.getElementById('file-info').classList.add('hidden');
    switchView('upload');
}

// --- Auth Logic ---
async function checkAuth() {
    try {
        const res = await fetch('api/me.php');
        const data = await res.json();
        
        if (res.ok && data.authenticated) {
            currentUser = data.user;
            updateNavForAuth(true);
            switchView('upload');
        } else {
            updateNavForAuth(false);
            switchView('auth');
        }
    } catch (e) {
        switchView('auth');
    }
}

function updateNavForAuth(isAuthenticated) {
    const nameDisplay = document.getElementById('user-name-display');
    const histBtn = document.getElementById('nav-history-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');

    if (isAuthenticated) {
        nameDisplay.textContent = `> USER: ${currentUser.name}`;
        nameDisplay.classList.remove('hidden');
        histBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
    } else {
        nameDisplay.classList.add('hidden');
        histBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
}

function toggleAuthMode(mode) {
    isRegisterMode = mode === 'register';
    document.getElementById('name-group').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('auth_name').required = isRegisterMode;
    
    document.getElementById('auth-btn').innerHTML = isRegisterMode ? '> EXECUTE REGISTRATION' : '> EXECUTE LOGIN';
    
    document.getElementById('tab-login').className = isRegisterMode 
        ? 'text-[var(--text-dim)] hover:neon-text transition-all' 
        : 'neon-text font-bold';
        
    document.getElementById('tab-register').className = isRegisterMode 
        ? 'neon-text font-bold' 
        : 'text-[var(--text-dim)] hover:neon-text transition-all';
}

function initAuthForm() {
    const form = document.getElementById('auth-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const endpoint = isRegisterMode ? 'api/register.php' : 'api/login.php';
        const formData = new FormData(form);

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'ACCESS_DENIED');

            if (isRegisterMode) {
                showToast('SYSTEM_UPDATE', data.message, 'success');
                toggleAuthMode('login');
                form.reset();
            } else {
                showToast('ACCESS_GRANTED', 'Authentication successful.', 'success');
                currentUser = data.user;
                updateNavForAuth(true);
                switchView('upload');
            }
        } catch (error) {
            showToast('AUTH_ERROR', error.message, 'error');
        }
    });
}

async function handleLogout() {
    try {
        await fetch('api/logout.php');
        currentUser = null;
        updateNavForAuth(false);
        switchView('auth');
        showToast('SYSTEM', 'Connection terminated.', 'success');
    } catch (e) {
        showToast('ERROR', 'Failed to disconnect.', 'error');
    }
}

// Drag and Drop Logic
function initDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('resume_file');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeBtn = document.getElementById('remove-file-btn');

    dropZone.addEventListener('click', (e) => {
        if(e.target !== removeBtn && !removeBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
    });

    function handleFile(file) {
        if (file.type !== 'application/pdf') {
            showToast('FORMAT_ERROR', 'Only PDF streams are accepted.', 'error');
            return;
        }
        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024).toFixed(2) + ' KB';
        fileInfo.classList.remove('hidden');
    }
}

// Form Submission & Hacker Animation
function initFormSubmit() {
    const form = document.getElementById('analyze-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const targetRole = document.getElementById('target_role').value;
        if (!currentFile) {
            showToast('DATA_ERROR', 'No file stream detected.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('resume', currentFile);
        formData.append('target_role', targetRole);

        switchView('loading');
        runTypewriterEffect();

        try {
            const response = await fetch('api/analyze.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'ANALYSIS_FAILED');
            }

            if (result.success) {
                showToast('PROCESS_COMPLETE', 'Data successfully extracted.', 'success');
                renderDashboard(result.data, targetRole, currentFile.name);
            }
            
        } catch (error) {
            showToast('SYSTEM_ERROR', error.message, 'error');
            switchView('upload');
        }
    });
}

function runTypewriterEffect() {
    const container = document.getElementById('typewriter-container');
    container.innerHTML = '';
    const messages = [
        "> INITIALIZING NEURAL NET...",
        "> UPLOADING PDF DATA...",
        "> PARSING TEXT STREAMS...",
        "> CROSS-REFERENCING JOB REQUIREMENTS...",
        "> EVALUATING ATS COMPATIBILITY...",
        "> GENERATING INTELLIGENCE REPORT...",
        "> ALMOST COMPLETE..."
    ];
    
    let msgIndex = 0;
    
    function typeMessage() {
        if (msgIndex >= messages.length || views.loading.classList.contains('hidden')) return;
        
        const p = document.createElement('div');
        p.className = 'text-[var(--text-dim)]';
        container.appendChild(p);
        
        let charIndex = 0;
        const msg = messages[msgIndex];
        
        const typeInterval = setInterval(() => {
            if (views.loading.classList.contains('hidden')) {
                clearInterval(typeInterval);
                return;
            }
            p.textContent += msg.charAt(charIndex);
            charIndex++;
            if (charIndex >= msg.length) {
                clearInterval(typeInterval);
                msgIndex++;
                setTimeout(typeMessage, 800);
            }
        }, 30);
    }
    
    typeMessage();
}

// Rendering Dashboard
function renderDashboard(data, targetRole, filename = "Unknown File") {
    document.getElementById('display-role').textContent = targetRole;
    document.getElementById('display-file').textContent = filename;

    // ATS Score
    const score = data.ats_score || 0;
    document.getElementById('score-text').textContent = `${score}%`;
    
    // Generate ASCII Progress bar (20 blocks total)
    const totalBlocks = 20;
    const filledBlocks = Math.round((score / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    const asciiBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    document.getElementById('ascii-progress-bar').textContent = asciiBar;

    // Fill Keywords
    const keywordsContainer = document.getElementById('keywords-container');
    keywordsContainer.innerHTML = '';
    if (data.keywords && data.keywords.length > 0) {
        data.keywords.forEach(kw => {
            const span = document.createElement('span');
            span.className = 'px-3 py-1 border border-[var(--border-neon)] bg-[rgba(0,240,255,0.1)] text-[var(--text-main)] font-bold text-sm shadow-[0_0_5px_rgba(0,240,255,0.3)]';
            span.textContent = `> ${kw}`;
            keywordsContainer.appendChild(span);
        });
    } else {
        keywordsContainer.innerHTML = '<span class="text-[var(--text-dim)]">> NO_KEYWORDS_DETECTED</span>';
    }

    // Fill Missing Skills
    const missingContainer = document.getElementById('missing-skills-container');
    missingContainer.innerHTML = '';
    if (data.missing_skills && data.missing_skills.length > 0) {
        data.missing_skills.forEach(skill => {
            const span = document.createElement('span');
            span.className = 'px-3 py-1 border border-[var(--text-error)] bg-[rgba(255,0,60,0.1)] text-[var(--text-error)] font-bold text-sm shadow-[0_0_5px_rgba(255,0,60,0.3)]';
            span.textContent = `> ${skill}`;
            missingContainer.appendChild(span);
        });
    } else {
        missingContainer.innerHTML = '<span class="text-[var(--text-success)]">> ALL_REQUIREMENTS_MET</span>';
    }

    // Fill Lists
    const fillList = (id, items) => {
        const list = document.getElementById(id);
        list.innerHTML = '';
        if (items && items.length > 0) {
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="neon-text">></span> ${item}`;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<li class="text-[var(--text-dim)]">> NO_DATA_AVAILABLE</li>';
        }
    };

    fillList('recommendations-list', data.recommendations);
    fillList('projects-list', data.project_improvements);
    fillList('achievements-list', data.achievement_improvements);

    switchView('dashboard');
}

// History
async function showHistory() {
    switchView('loading');
    runTypewriterEffect();
    
    try {
        const response = await fetch('api/history.php');
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        const container = document.getElementById('history-container');
        container.innerHTML = '';
        
        if (result.data.length === 0) {
            container.innerHTML = '<div class="text-[var(--text-dim)]">> NO_HISTORY_LOGS_FOUND</div>';
        } else {
            result.data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'terminal-box hover:border-[var(--text-success)] cursor-pointer transition-colors group';
                div.onclick = () => renderDashboard(item, item.target_role, item.resume_name);
                
                let scoreClass = 'neon-text-red';
                if (item.ats_score >= 80) scoreClass = 'neon-text-green';
                else if (item.ats_score >= 60) scoreClass = 'neon-text';

                div.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-[var(--text-main)] group-hover:text-[var(--text-success)]">> ROLE: ${item.target_role}</h4>
                            <p class="text-sm text-[var(--text-dim)]">> FILE: ${item.resume_name}</p>
                            <p class="text-xs text-[var(--text-dim)] mt-1">> TIMESTAMP: ${item.created_at}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-3xl font-bold ${scoreClass}">${item.ats_score}%</span>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }
        
        switchView('history');
    } catch (error) {
        showToast('SYSTEM_ERROR', 'Failed to retrieve logs', 'error');
        switchView('upload');
    }
}

// Toasts
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast p-4 animate-fade-in ${type}`;
    
    let icon = '[ i ]';
    if(type === 'success') icon = '[ OK ]';
    if(type === 'error') icon = '[ ERR ]';

    toast.innerHTML = `
        <div class="flex gap-3">
            <span class="font-bold">${icon}</span>
            <div>
                <h4 class="font-bold">${title}</h4>
                <p class="text-sm text-[var(--text-dim)] mt-1">> ${message}</p>
            </div>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}
