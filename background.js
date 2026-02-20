// background.js — Service Worker
// Handles messages from popup to read/clear activity logs

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_ACTIVITY') {
        chrome.storage.local.get(['pkg_activity', 'pkg_stats'], (result) => {
            sendResponse({
                activity: result.pkg_activity ?? [],
                stats:    result.pkg_stats    ?? {},
            });
        });
        return true; // async
    }

    if (msg.type === 'CLEAR_ACTIVITY') {
        chrome.storage.local.remove(['pkg_activity', 'pkg_stats'], () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (msg.type === 'EXPORT_CSV') {
        chrome.storage.local.get(['pkg_activity'], (result) => {
            sendResponse({ activity: result.pkg_activity ?? [] });
        });
        return true;
    }
});
