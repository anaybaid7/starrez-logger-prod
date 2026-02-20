// ============================================================================
// StarRez Package Logger v2.6 - KEYS FIX
// Only change from original: createLockoutButton() now uses a MutationObserver
// on #ui-script-rez360 instead of a retry loop, and finds the H3 by "KEYS" text
// ============================================================================

const CONFIG = {
    DEBUG: true, 
    RESIDENCE_PATTERN: /[A-Z0-9]+[NS]?-(?:[A-Z0-9]+-)?\d+[a-z]/i,
    STUDENT_NUMBER_PATTERN: /^\d{8}$/,
    CACHE_DURATION: 10000,            
    INIT_DEBOUNCE: 300,              
    OBSERVER_DEBOUNCE: 500,          
    BUTTON_ENABLE_DELAY: 200,
    PREVIEW_DURATION: 4000,          
    MAX_VALIDATION_ATTEMPTS: 20
};

const state = {
    lastExtracted: { name: null, studentNumber: null, roomSpace: null, timestamp: null },
    lastBreadcrumb: null,
    validationAttempts: 0,
    timers: { init: null, observer: null },
    keysObserver: null  // NEW: dedicated observer for Rez360 keys section
};

const log = (...args) => CONFIG.DEBUG && console.log('[PKG-LOGGER]', ...args);
const error = (...args) => console.error('[PKG-LOGGER ERROR]', ...args);

const clearTimer = (timerName) => {
    if (state.timers[timerName]) {
        clearTimeout(state.timers[timerName]);
        state.timers[timerName] = null;
    }
};

function getStaffName() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
        const match = script.textContent.match(/full_name:\s*`([^`]+)`/);
        if (match?.[1]) return match[1];
    }
    return null;
}

function getInitials(fullName) {
    if (!fullName) return 'X.X';
    if (fullName.includes(',')) {
        const [lastName, firstName = ''] = fullName.split(',').map(p => p.trim());
        const getInitials = (name) => name.split(/\s+/).filter(n => n.length > 0).map(n => n[0].toUpperCase()).join('');
        return `${getInitials(firstName)}.${getInitials(lastName)}`;
    }
    const parts = fullName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
        const firstInitials = parts.slice(0, -1).map(n => n[0].toUpperCase()).join('');
        const lastInitial = parts[parts.length - 1][0].toUpperCase();
        return `${firstInitials}.${lastInitial}`;
    }
    return parts.map(p => p[0]).join('').toUpperCase() + '.X';
}

function getCurrentBreadcrumb() {
    const breadcrumbs = document.querySelectorAll('habitat-header-breadcrumb-item');
    for (const crumb of breadcrumbs) {
        const text = crumb.textContent.trim();
        if (text.includes(',') && !text.includes('Dashboard') && !text.includes('Desk')) {
            return text;
        }
    }
    return null;
}

function getStudentDataFromRez360() {
    const data = {};
    const detailContainer = document.body;
    let containerText = detailContainer.innerText;
    
    const entryIdIndex = containerText.indexOf('EntryID:');
    if (entryIdIndex !== -1) {
        containerText = containerText.substring(entryIdIndex);
    }
    
    data.fullName = getCurrentBreadcrumb();
    if (!data.fullName) return null;
    
    const studentNumMatch = containerText.match(/Student Number\s+(\d{8})/);
    if (studentNumMatch) data.studentNumber = studentNumMatch[1];
    else return null;
    
    data.roomSpace = extractBedspace(containerText);
    if (!data.roomSpace) return null;
    
    return validateStudentData(data);
}

function extractBedspace(containerText) {
    const methods = [
        () => {
            const match = containerText.match(/Room\s+([A-Z0-9]+[NS]?-(?:[A-Z0-9]+-)?\d+[a-z])\/([A-Z0-9]+[NS]?-(?:[A-Z0-9]+-)?\d+[a-z])/i);
            return match ? match[2] : null;
        },
        () => {
            const rez360Section = containerText.match(/Rez 360[\s\S]*?(?=Activity|Related|$)/);
            if (rez360Section) {
                const match = rez360Section[0].match(CONFIG.RESIDENCE_PATTERN);
                return match ? match[0] : null;
            }
        },
        () => {
            const match = containerText.match(/Room Space[\s\S]*?([A-Z0-9]+[NS]?-(?:[A-Z0-9]+-)?\d+[a-z])/i);
            return match ? match[1] : null;
        }
    ];
    for (const method of methods) {
        const result = method();
        if (result) return result;
    }
    return null;
}

function validateStudentData(data) {
    if (data.fullName && CONFIG.STUDENT_NUMBER_PATTERN.test(data.studentNumber) && CONFIG.RESIDENCE_PATTERN.test(data.roomSpace)) {
        state.lastExtracted = { ...data, timestamp: Date.now() };
        return data;
    }
    return null;
}

function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${now.getHours() >= 12 ? 'pm' : 'am'}`;
}

function getFormattedDateTime() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${hours}:${minutes}${now.getHours() >= 12 ? 'p.m.' : 'a.m.'}`;
}

function generateLogEntry(packageCount = 1) {
    try {
        const studentData = getStudentDataFromRez360();
        if (!studentData) return { success: false, error: 'Data not found' };
        const staffName = getStaffName();
        const initials = getInitials(studentData.fullName);
        const staffInitials = staffName ? getInitials(staffName) : 'X.X';
        const time = getCurrentTime();
        const logEntry = `${initials} (${studentData.studentNumber}) ${studentData.roomSpace} ${packageCount} pkg${packageCount > 1 ? 's' : ''} @ ${time} - ${staffInitials}`;
        return { success: true, logEntry, data: { ...studentData, staffInitials, staffName } };
    } catch (err) { return { success: false, error: err.message }; }
}

// ============================================================================
// KEY EXTRACTION — scoped to Rez360 Keys card only
// Fixes the 2-3 refresh bug by reading from #ui-script-rez360 directly
// ============================================================================
function extractKeyCodes(studentName, studentID) {
    // Find KEYS H3 document-wide (lives in ui-detail-section-entry-rez360-{id})
    const h3 = [...document.querySelectorAll('h3')]
        .find(el => el.innerText.trim().toUpperCase() === 'KEYS');
    if (!h3) return null;

    // Walk up to container holding key data
    let card = h3;
    while (card.parentElement) {
        card = card.parentElement;
        if (/(?:Bedroom|Floor|Suite|Mail|Unit|LOANER)\s*:/i.test(card.innerText)) break;
    }

    const matches = [...card.innerText.matchAll(/(?:Bedroom|Floor|Suite|Mail|Unit|LOANER)[^:\r\n]*:\s*([A-Z0-9]+)/gi)];
    const loanerCodes = new Set();
    const allCodes = new Set();
    for (const m of matches) {
        const code = m[1].trim();
        if (code.length > 2 && !/[a-z]/.test(code) && code !== studentID) {
            allCodes.add(code);
            if (/LOANER/i.test(m[0])) loanerCodes.add(code);
        }
    }
    // Prefer LOANER keys, fall back to all keys (Bedroom/Suite/Floor)
    const result = loanerCodes.size > 0 ? [...loanerCodes] : [...allCodes];
    return result.length > 0 ? result : null;
}

function generateLockoutEntry() {
    try {
        const studentData = getStudentDataFromRez360();
        if (!studentData) return { success: false, error: 'Data not found' };
        
        const keyCodes = extractKeyCodes(studentData.fullName, studentData.studentNumber);
        if (!keyCodes || keyCodes.length === 0) return { success: false, error: 'No Loaner Keys found for this student' };
        
        const staffName = getStaffName();
        const staffInitials = staffName ? getInitials(staffName) : 'X.X';
        const initials = getInitials(studentData.fullName);
        const logEntry = `${initials} (${studentData.studentNumber}) ${studentData.roomSpace} KC: ${keyCodes.join(', ')}; [Fill in Reason] - ${staffInitials}`;
        return { success: true, logEntry, data: { ...studentData, keyCodes, staffInitials, staffName } };
    } catch (err) { return { success: false, error: err.message }; }
}

function generatePackageLabel() {
    try {
        const studentData = getStudentDataFromRez360();
        if (!studentData) return { success: false, error: 'Data not found' };
        const staffName = getStaffName();
        const staffInitials = staffName ? getInitials(staffName) : 'X.X';
        const dateTime = getFormattedDateTime();
        let displayName = studentData.fullName;
        if (displayName.includes(',')) {
            const [lastName, firstName] = displayName.split(',').map(p => p.trim());
            displayName = `${firstName} ${lastName}`;
        }
        const labelText = `${dateTime}\n${studentData.studentNumber}\n${displayName}\n${studentData.roomSpace}\nFDA: ${staffInitials}`;
        return { success: true, logEntry: labelText, data: { ...studentData, dateTime, staffInitials, staffName } };
    } catch (err) { return { success: false, error: err.message }; }
}

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; } 
    catch (err) { return false; }
}

function createStyledButton(text, gradient) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        margin-left: 10px; padding: 8px 16px; background: ${gradient}; color: white;
        border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); transition: all 0.2s ease;
    `;
    button.addEventListener('mouseenter', () => { button.style.transform = 'translateY(-2px)'; button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'; });
    button.addEventListener('mouseleave', () => { button.style.transform = 'translateY(0)'; button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'; });
    return button;
}

function showPreview(text, data) {
    document.getElementById('log-preview-popup')?.remove();
    const preview = document.createElement('div');
    preview.id = 'log-preview-popup';
    preview.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: white; border: 2px solid #667eea;
        border-radius: 8px; padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 10000;
        max-width: 500px; font-family: monospace; font-size: 13px; animation: slideIn 0.3s ease;
    `;
    let debugInfo = '';
    if (data.keyCodes) debugInfo = `Student: ${data.fullName}<br/>Keys: ${data.keyCodes.join(', ')}`;
    else debugInfo = `Student: ${data.fullName}<br/>Room: ${data.roomSpace}`;
    preview.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #667eea;">Copied to Clipboard</div>
        <div style="font-size: 11px; color: #999; margin-bottom: 4px;">Logged by: ${data.staffName || 'Unknown'}</div>
        <div style="background: #f7f7f7; padding: 8px; border-radius: 4px; word-break: break-all; font-weight: 600;">${text.replace(/\n/g, '<br>')}</div>
        <div style="font-size: 10px; color: #ccc; margin-top: 8px;">${debugInfo}</div>
    `;
    document.body.appendChild(preview);
    setTimeout(() => { preview.remove(); }, CONFIG.PREVIEW_DURATION);
}

function saveToLocalStorage(type, logEntry, data) {
    try {
        const entry = {
            id:            Date.now() + '-' + Math.random().toString(36).slice(2,6),
            type,
            logEntry,
            timestamp:     Date.now(),
            date:          new Date().toLocaleString(),
            staffName:     data.staffName     || 'Unknown',
            staffInitials: data.staffInitials || 'X.X',
            studentName:   data.fullName      || '',
            studentNumber: data.studentNumber  || '',
            roomSpace:     data.roomSpace      || '',
            keyCodes:      data.keyCodes       || null,
        };
        const existing = JSON.parse(localStorage.getItem('pkg_activity') || '[]');
        existing.unshift(entry);
        if (existing.length > 500) existing.length = 500;
        localStorage.setItem('pkg_activity', JSON.stringify(existing));
    } catch(e) { log('localStorage save failed:', e); }
}

async function handleButtonClick(button, count, originalText, gradient, type) {
    if (button.disabled) return;
    let result = (type === 'lockout') ? generateLockoutEntry() : (type === 'label') ? generatePackageLabel() : generateLogEntry(count);
    if (result.success) {
        if (await copyToClipboard(result.logEntry)) {
            saveToLocalStorage(type, result.logEntry, result.data);
            button.textContent = 'Copied!';
            button.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
            showPreview(result.logEntry, result.data);
            setTimeout(() => { button.textContent = originalText; button.style.background = gradient; }, 2000);
        }
    } else { alert('Error: ' + result.error); }
}

// ============================================================================
// LOCKOUT BUTTON
// Real container: id="ui-detail-section-entry-rez360-{entryId}" (outside #ui-script-rez360)
// So we search document-wide for the KEYS H3, not scoped to rez360 root
// ============================================================================
function createLockoutButton() {
    if (document.getElementById('lockout-log-btn')) return;
    if (!getCurrentBreadcrumb()) return;

    if (tryInjectLockoutButton()) return;

    if (state.keysObserver) { state.keysObserver.disconnect(); state.keysObserver = null; }

    let resolved = false;
    const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; state.keysObserver?.disconnect(); state.keysObserver = null; }
    }, 20000);

    state.keysObserver = new MutationObserver(() => {
        if (resolved) return;
        if (tryInjectLockoutButton()) {
            resolved = true;
            clearTimeout(timeout);
            state.keysObserver.disconnect();
            state.keysObserver = null;
            log('Lockout button injected via observer');
        }
    });
    state.keysObserver.observe(document.body, { childList: true, subtree: true });
    log('Waiting for KEYS H3...');
}

function tryInjectLockoutButton() {
    if (document.getElementById('lockout-log-btn')) return true;

    // Search document-wide — KEYS H3 is in ui-detail-section-entry-rez360-{id}, NOT ui-script-rez360
    const h3 = [...document.querySelectorAll('h3')]
        .find(el => el.innerText.trim().toUpperCase() === 'KEYS');
    if (!h3) return false;

    const gradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    const button = createStyledButton('Copy Lockout', gradient);
    button.id = 'lockout-log-btn';
    button.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleButtonClick(button, 1, 'Copy Lockout', gradient, 'lockout'); });
    h3.parentElement.appendChild(button);
    log('Lockout button injected at KEYS H3');
    return true;
}

function createLogButtons() {
    const issueButtons = Array.from(document.querySelectorAll('button, input[type="button"], a.button')).filter(b => b.textContent.toLowerCase().includes('issue') && !b.textContent.toLowerCase().includes('reissue'));
    issueButtons.forEach((btn, i) => {
        if (document.getElementById(`pkg-btn-${i}`)) return;
        const b = createStyledButton('Copy Log', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        b.id = `pkg-btn-${i}`;
        b.addEventListener('click', (e) => { e.preventDefault(); handleButtonClick(b, 1, 'Copy Log', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'package'); });
        btn.parentNode.insertBefore(b, btn.nextSibling);
    });

    const parcelCount = Array.from(document.querySelectorAll('span')).find(s => /^\d+\s+Parcel[s]?$/i.test(s.textContent.trim()));
    if (parcelCount && !document.getElementById('pkg-master')) {
        const count = parseInt(parcelCount.textContent);
        if (count > 1) {
            const b = createStyledButton(`Copy ${count} pkgs`, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
            b.id = 'pkg-master';
            b.addEventListener('click', (e) => { e.preventDefault(); handleButtonClick(b, count, `Copy ${count} pkgs`, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 'package'); });
            parcelCount.parentNode.insertBefore(b, parcelCount.nextSibling);
        }
    }

    createLockoutButton(); // FIXED version
    injectHistoryButton();

    const entryActions = Array.from(document.querySelectorAll('button')).find(el => /Entry Actions/i.test(el.textContent));
    if (entryActions && !document.getElementById('pkg-label')) {
        const b = createStyledButton('Print Label', 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)');
        b.id = 'pkg-label';
        b.addEventListener('click', (e) => { e.preventDefault(); handleButtonClick(b, 1, 'Print Label', 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 'label'); });
        entryActions.parentNode.insertBefore(b, entryActions);
    }
}

function clearOldButtons() {
    document.querySelectorAll('[id^="pkg-btn-"], #pkg-master, #lockout-log-btn, #pkg-label').forEach(b => b.remove());
    state.lastExtracted = { name: null };
    // Also kill the keys observer when switching profiles
    if (state.keysObserver) { state.keysObserver.disconnect(); state.keysObserver = null; }
}

function initialize() {
    clearTimer('init');
    state.timers.init = setTimeout(() => {
        const currentBreadcrumb = getCurrentBreadcrumb();
        if (currentBreadcrumb && currentBreadcrumb !== state.lastBreadcrumb) {
            log('New profile detected - Refreshing buttons');
            clearOldButtons();
            state.lastBreadcrumb = currentBreadcrumb;
        }
        const container = document.querySelector('.ui-tabs-panel:not(.ui-tabs-hide)') || document.body;
        if (!container.innerText.includes('EntryID:') && state.validationAttempts < CONFIG.MAX_VALIDATION_ATTEMPTS) {
            state.validationAttempts++;
            setTimeout(initialize, 500); 
            return;
        }
        state.validationAttempts = 0;
        createLogButtons();
    }, CONFIG.INIT_DEBOUNCE);
}

const style = document.createElement('style');
style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
document.head.appendChild(style);

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
else initialize();

const observer = new MutationObserver(() => { clearTimer('observer'); state.timers.observer = setTimeout(initialize, CONFIG.OBSERVER_DEBOUNCE); });
observer.observe(document.body, { childList: true, subtree: true });

log('StarRez Package Logger v2.6-keysfix Loaded');

// ============================================================================
// HISTORY PANEL — inline on page, no popup needed
// ============================================================================
function showHistoryPanel() {
    document.getElementById('pkg-history-panel')?.remove();
    let allActivity = JSON.parse(localStorage.getItem('pkg_activity') || '[]');
    let viewMode = 5; // 5, 'all', or custom number

    function render() {
        document.getElementById('pkg-history-panel')?.remove();
        const activity = viewMode === 'all' ? allActivity : allActivity.slice(0, viewMode);

        const panel = document.createElement('div');
        panel.id = 'pkg-history-panel';
        panel.style.cssText = 'position:fixed;top:60px;right:20px;width:440px;max-height:75vh;background:#fff;border:2px solid #667eea;border-radius:12px;box-shadow:0 8px 32px rgba(102,126,234,.25);z-index:99999;font-family:-apple-system,sans-serif;font-size:12px;display:flex;flex-direction:column;overflow:hidden;';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding:11px 14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;gap:8px;flex-shrink:0';
        const title = document.createElement('b');
        title.style.cssText = 'font-size:13px;flex:1';
        title.textContent = 'Activity History (' + allActivity.length + ' total)';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:13px';
        closeBtn.onclick = () => panel.remove();
        header.append(title, closeBtn);
        panel.appendChild(header);

        // Controls bar
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:6px;padding:8px 10px;background:#f6f7ff;border-bottom:1px solid #e8eaf0;flex-shrink:0;align-items:center;flex-wrap:wrap';

        const makeCtrlBtn = (label, active, onclick) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = 'padding:6px 13px;border-radius:6px;border:1px solid ' + (active ? '#667eea' : '#ddd') + ';background:' + (active ? '#667eea' : '#fff') + ';color:' + (active ? '#fff' : '#555') + ';font-size:12px;font-weight:600;cursor:pointer;transition:all .15s';
            b.onclick = onclick;
            return b;
        };

        controls.appendChild(makeCtrlBtn('Latest 5', viewMode === 5, () => { viewMode = 5; render(); }));
        controls.appendChild(makeCtrlBtn('Latest 10', viewMode === 10, () => { viewMode = 10; render(); }));
        controls.appendChild(makeCtrlBtn('All', viewMode === 'all', () => { viewMode = 'all'; render(); }));

        // Custom input
        const customWrap = document.createElement('div');
        customWrap.style.cssText = 'display:flex;align-items:center;gap:4px;margin-left:4px';
        const customInput = document.createElement('input');
        customInput.type = 'number';
        customInput.placeholder = 'Custom #';
        customInput.min = 1;
        customInput.style.cssText = 'width:72px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px';
        const customBtn = document.createElement('button');
        customBtn.textContent = 'Go';
        customBtn.style.cssText = 'padding:6px 13px;border:1px solid #667eea;background:#667eea;color:#fff;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer';
        customBtn.onclick = () => {
            const n = parseInt(customInput.value);
            if (n > 0) { viewMode = n; render(); }
        };
        customWrap.append(customInput, customBtn);
        controls.appendChild(customWrap);

        // Clear all button
        const clearAll = document.createElement('button');
        clearAll.textContent = 'Clear All';
        clearAll.style.cssText = 'margin-left:auto;padding:6px 13px;border:1px solid #e53935;background:#fff;color:#e53935;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer';
        clearAll.onclick = () => {
            if (confirm('Clear all activity? Cannot be undone.')) {
                localStorage.removeItem('pkg_activity');
                allActivity = [];
                render();
            }
        };
        controls.appendChild(clearAll);
        panel.appendChild(controls);

        // List
        const list = document.createElement('div');
        list.style.cssText = 'overflow-y:auto;flex:1';

        if (activity.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:30px;text-align:center;color:#aaa';
            empty.textContent = 'No activity yet';
            list.appendChild(empty);
        } else {
            const colors = { package:'#667eea', lockout:'#fa709a', label:'#4facfe' };
            activity.forEach((e, i) => {
                const row = document.createElement('div');
                row.style.cssText = 'padding:8px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .15s;display:flex;gap:8px;align-items:flex-start';
                row.onmouseenter = () => row.style.background = '#f6f7ff';
                row.onmouseleave = () => row.style.background = '';

                const main = document.createElement('div');
                main.style.cssText = 'flex:1;min-width:0';
                main.onclick = () => {
                    navigator.clipboard.writeText(e.logEntry).then(() => {
                        row.style.background = '#e8ffef';
                        setTimeout(() => row.style.background = '', 1000);
                    });
                };

                const d = new Date(e.timestamp);
                const time = (d.getMonth()+1) + '/' + d.getDate() + ' ' + (d.getHours()%12||12) + ':' + String(d.getMinutes()).padStart(2,'0') + (d.getHours()>=12?'p':'a');

                const meta = document.createElement('div');
                meta.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:3px';
                const typeBadge = document.createElement('span');
                typeBadge.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;color:' + (colors[e.type]||'#888');
                typeBadge.textContent = e.type;
                const staffSpan = document.createElement('span');
                staffSpan.style.cssText = 'font-size:10px;color:#aaa;flex:1';
                staffSpan.textContent = e.staffName || '';
                const timeSpan = document.createElement('span');
                timeSpan.style.cssText = 'font-size:10px;color:#bbb';
                timeSpan.textContent = time;
                meta.append(typeBadge, staffSpan, timeSpan);

                const logLine = document.createElement('div');
                logLine.style.cssText = 'color:#333;word-break:break-all;line-height:1.4;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:11px';
                logLine.textContent = e.logEntry;
                main.append(meta, logLine);

                // Delete button
                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.title = 'Delete this entry';
                delBtn.style.cssText = 'flex-shrink:0;background:none;border:none;color:#ccc;cursor:pointer;font-size:13px;padding:0 2px;line-height:1;margin-top:2px';
                delBtn.onmouseenter = () => delBtn.style.color = '#e53935';
                delBtn.onmouseleave = () => delBtn.style.color = '#ccc';
                delBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    allActivity.splice(i, 1);
                    localStorage.setItem('pkg_activity', JSON.stringify(allActivity));
                    render();
                };

                row.append(main, delBtn);
                list.appendChild(row);
            });
        }

        panel.appendChild(list);

        // Footer count
        if (allActivity.length > 0) {
            const footer = document.createElement('div');
            footer.style.cssText = 'padding:6px 12px;background:#f6f7ff;border-top:1px solid #e8eaf0;font-size:10px;color:#aaa;text-align:center;flex-shrink:0';
            footer.textContent = 'Showing ' + activity.length + ' of ' + allActivity.length + ' entries';
            panel.appendChild(footer);
        }

        document.body.appendChild(panel);
    }

    render();
}

function injectHistoryButton() {
    if (document.getElementById('pkg-history-btn')) return;
    // Anchor to Entry Actions button or fallback to first pkg button
    const anchor = [...document.querySelectorAll('button')].find(b => /Entry Actions/i.test(b.textContent));
    if (!anchor) return;

    const btn = createStyledButton('History', 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)');
    btn.id = 'pkg-history-btn';
    btn.addEventListener('click', (e) => { e.preventDefault(); showHistoryPanel(); });
    anchor.before(btn);
    log('History button injected');
}
