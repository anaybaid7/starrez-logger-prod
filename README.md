# StarRez Logger Production Plugin (Campus Housing - Desk Services) 
StarRez Logger (Package Pickups, Package Labels, Key Lockouts)

---

## Overview

Standard front desk logging in StarRez requires staff to manually read a student number, copy a room code, format the entry correctly, and note the time. This takes approximately 20 seconds per entry and introduces room for error, particularly during busy periods.

This Chrome extension eliminates that process. It reads the student data already visible on screen and produces a correctly formatted log entry with a single click. Package logs, lockout logs, and package labels are generated automatically, always in the correct format.

---

## Technical Notes

*This section is intended for IT Services or management reviewing the extension for approval or deployment. More details can be found on the Confluence page, at https://anaybaid.atlassian.net/wiki/external/OGU3MTg3MzQ0ODY4NDgzZjg3MTVmNzMxZWMwN2UzNDY*

The extension is built to Chrome's Manifest V3 standard, which is the current and most restrictive extension architecture available.

- The extension only reads text that is already rendered on screen. It does not access StarRez's backend, API, or any data not already visible to the logged-in user, though that coule be preferred, if done officially through viable sources: https://www.starrez.com/news/starrez-colleague-integration-api-available
- All processing is done locally in the browser. No data is sent to any external server.
- The activity log is saved in the browser's localStorage on the local machine only. It contains formatted log strings and timestamps. No additional student data is retained beyond what appears in those strings.
- The extension activates only on `uwaterloo.starrezhousing.com`. It does not run on any other website.

**Permissions used:**

| Permission | Purpose |
|---|---|
| `clipboardWrite` | Copies the generated log entry to the clipboard when a button is clicked |
| `storage` | Stores the local activity log |
| `activeTab` + `scripting` | Allows the extension popup to read activity data from the active StarRez tab |
| `host: uwaterloo.starrezhousing.com` | Restricts the extension to the StarRez domain only |

The extension does not request access to browsing history, other tabs, network traffic, or any other website.

---

## Troubleshooting

**Buttons did not appear after opening a profile**
StarRez is a single-page application and updates content without a full page reload. The extension detects navigation changes and injects buttons automatically, usually within one second. If buttons do not appear, wait a moment and press F5 to refresh.

**Something looks incorrect after switching to a different student**
The extension monitors for profile changes and refreshes automatically. If the display appears stale, pressing F5 will resolve it.

**Copy Lockout returns "No loaner keys found"**
The student has no keys listed in their Keys section. The tool will not generate a blank entry. Complete a manual log entry to proceed.

**The Copy Lockout button took a few seconds to appear**
The Rez 360 sidebar loads independently from the rest of the profile. The extension monitors for it and injects the button as soon as the Keys section becomes available. On slower connections this may take a few seconds.

**Issue persists after refreshing**
Contact the extension maintainer with a screenshot. For anything time-sensitive at the desk, complete a manual entry in the meantime.

---

*Desk Services, Campus Housing, University of Waterloo*
