// popup.js — Activity Log Viewer (reads from localStorage on StarRez tab)

let allActivity = [];
let allStats    = {};
let activeTab   = 'log';
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindEvents();
});

function bindEvents() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderLog();
        });
    });
    document.getElementById('search-input').addEventListener('input', renderLog);
    document.getElementById('btn-refresh').addEventListener('click', loadData);
    document.getElementById('btn-clear').addEventListener('click', clearAll);
    document.getElementById('btn-export').addEventListener('click', exportCSV);
}

// Read from localStorage via content script injection into the active tab
function loadData() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.url || !tab.url.includes('starrez')) {
            showNoTab();
            return;
        }
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const activity = JSON.parse(localStorage.getItem('pkg_activity') || '[]');
                return activity;
            }
        }, (results) => {
            if (chrome.runtime.lastError || !results || !results[0]) {
                showNoTab();
                return;
            }
            allActivity = results[0].result || [];
            allStats    = buildStats(allActivity);
            renderAll();
        });
    });
}

function buildStats(activity) {
    const stats = {};
    for (const e of activity) {
        const key = e.staffName || 'Unknown';
        if (!stats[key]) stats[key] = { package: 0, lockout: 0, label: 0, total: 0 };
        stats[key][e.type] = (stats[key][e.type] || 0) + 1;
        stats[key].total++;
    }
    return stats;
}

function showNoTab() {
    document.getElementById('log-list').innerHTML = `
        <div class="empty">
            <div class="icon">🔗</div>
            <p>Open a StarRez tab first</p>
            <small>Activity is stored on the StarRez page</small>
        </div>`;
    document.getElementById('header-sub').textContent = 'No StarRez tab active';
}

function renderAll() {
    updateStatsBar();
    renderLog();
    renderStatsTab();
    updateHeader();
}

function updateHeader() {
    const today = allActivity.filter(e => isToday(e.timestamp));
    document.getElementById('header-sub').textContent =
        allActivity.length === 0
            ? 'No activity yet'
            : `${today.length} today · ${allActivity.length} total`;
}

function updateStatsBar() {
    const today = allActivity.filter(e => isToday(e.timestamp));
    document.getElementById('count-package').textContent = today.filter(e => e.type === 'package').length;
    document.getElementById('count-lockout').textContent = today.filter(e => e.type === 'lockout').length;
    document.getElementById('count-label'  ).textContent = today.filter(e => e.type === 'label'  ).length;
    document.getElementById('count-total'  ).textContent = today.length;
}

function isToday(ts) {
    const d = new Date(ts), n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function renderLog() {
    const list  = document.getElementById('log-list');
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    let filtered = allActivity;
    if (activeFilter !== 'all') filtered = filtered.filter(e => e.type === activeFilter);
    if (query) filtered = filtered.filter(e =>
        (e.studentName  || '').toLowerCase().includes(query) ||
        (e.studentNumber|| '').includes(query) ||
        (e.roomSpace    || '').toLowerCase().includes(query) ||
        (e.staffName    || '').toLowerCase().includes(query) ||
        (e.logEntry     || '').toLowerCase().includes(query)
    );
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty">
                <div class="icon">${allActivity.length === 0 ? '📭' : '🔍'}</div>
                <p>${allActivity.length === 0 ? 'No activity recorded yet' : 'No results'}</p>
                <small>${allActivity.length === 0 ? 'Use the buttons on a student profile' : 'Try clearing the search'}</small>
            </div>`;
        return;
    }
    list.innerHTML = filtered.map(entry => `
        <div class="log-entry" data-log="${escHtml(entry.logEntry)}">
            <span class="copy-hint">click to copy</span>
            <div class="entry-top">
                <span class="type-badge ${entry.type}">${typeLabel(entry.type)}</span>
                <span class="entry-student">${escHtml(formatName(entry.studentName))} · ${escHtml(entry.roomSpace)}</span>
                <span class="entry-time">${formatTime(entry.timestamp)}</span>
            </div>
            <div class="entry-log">${escHtml(entry.logEntry).replace(/\n/g, '<br>')}</div>
            <div class="entry-staff">Logged by ${escHtml(entry.staffName || entry.staffInitials)}</div>
        </div>
    `).join('');
    list.querySelectorAll('.log-entry').forEach(el => {
        el.addEventListener('click', () => {
            navigator.clipboard.writeText(el.dataset.log).then(() => {
                const flash = document.createElement('div');
                flash.className = 'copied-flash';
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 500);
            });
        });
    });
}

function renderStatsTab() {
    const container = document.getElementById('stats-tab');
    const entries   = Object.entries(allStats).sort((a, b) => b[1].total - a[1].total);
    if (entries.length === 0) {
        container.innerHTML = `<div class="empty"><div class="icon">📊</div><p>No stats yet</p></div>`;
        return;
    }
    container.innerHTML = entries.map(([name, s]) => `
        <div class="staff-row">
            <div class="staff-name">👤 ${escHtml(name)}</div>
            <div class="staff-breakdown">
                <div class="staff-stat"><div class="n" style="color:#667eea">${s.package||0}</div><div class="l">Packages</div></div>
                <div class="staff-stat"><div class="n" style="color:#fa709a">${s.lockout||0}</div><div class="l">Lockouts</div></div>
                <div class="staff-stat"><div class="n" style="color:#4facfe">${s.label||0}</div><div class="l">Labels</div></div>
                <div class="staff-stat"><div class="n">${s.total||0}</div><div class="l">Total</div></div>
            </div>
        </div>
    `).join('');
}

function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const isLog = tab === 'log';
    document.getElementById('stats-bar' ).classList.toggle('hidden', !isLog);
    document.getElementById('filter-bar').classList.toggle('hidden', !isLog);
    document.getElementById('log-list'  ).classList.toggle('hidden', !isLog);
    document.getElementById('stats-tab' ).classList.toggle('hidden',  isLog);
}

function clearAll() {
    if (!confirm('Clear all activity? Cannot be undone.')) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => { localStorage.removeItem('pkg_activity'); }
        }, () => {
            allActivity = [];
            allStats    = {};
            renderAll();
        });
    });
}

function exportCSV() {
    if (allActivity.length === 0) { alert('No activity to export.'); return; }
    const headers = ['Date','Type','Staff','Student Name','Student ID','Room','Log Entry','Key Codes'];
    const rows = allActivity.map(e => [
        e.date, e.type, e.staffName, formatName(e.studentName),
        e.studentNumber, e.roomSpace,
        `"${(e.logEntry||'').replace(/"/g,'""')}"`,
        (e.keyCodes||[]).join('; ')
    ].join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `starrez-${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
}

function escHtml(str = '') {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatName(name = '') {
    if (!name.includes(',')) return name;
    const [last, first] = name.split(',').map(s => s.trim());
    return `${first} ${last}`;
}
function typeLabel(type) {
    return { package: '📦 Package', lockout: '🔑 Lockout', label: '🏷 Label' }[type] ?? type;
}
function formatTime(ts) {
    const d = new Date(ts);
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2,'0');
    const ampm = d.getHours() >= 12 ? 'pm' : 'am';
    if (isToday(ts)) return `${h}:${m} ${ampm}`;
    return `${d.getMonth()+1}/${d.getDate()} ${h}:${m}${ampm}`;
}

