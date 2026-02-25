# StarRez Logger Production Plugin (Campus Housing - Desk Services) 
StarRez Logger (Package Pickups, Package Labels, Key Lockouts)

**Automation Tool for Front Desk Logging**

Desk Services, Campus Housing, University of Waterloo

Version: Production 
Last updated: February 2026

---

## Overview

Standard front desk logging in StarRez requires staff to manually read a student number, copy a room code, format the entry correctly, and note the time. This takes approximately 20 seconds per entry and introduces room for error, particularly during busy periods.

This Chrome extension eliminates that process. It reads the student data already visible on screen and produces a correctly formatted log entry with a single click. Package logs, lockout logs, and package labels are generated automatically, always in the correct format.

The extension adds buttons directly to the StarRez interface. No new tabs, no switching between windows.

---

## Installation

This extension should only be installed by an authorized person on designated desk workstations.

1. Download the extension folder (the folder containing `manifest.json`)
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer Mode** using the toggle in the top right corner
4. Click **Load Unpacked** and select the extension folder
5. Open any student profile in StarRez to confirm the buttons are visible

To update to a newer version, replace the folder contents and click the refresh icon on the extension card in `chrome://extensions`.

The extension displays a default icon in the Chrome toolbar. This is expected and does not affect functionality.

---

## How to Use

### Logging a Package

Open the student profile in StarRez and navigate to the Parcels section. A **Copy Log** button appears next to the standard Issue button. Click it and paste the result into the log spreadsheet.

If the student has more than one parcel, an additional button appears showing the total count (for example, **Copy 3 pkgs**), allowing all packages to be logged in a single action.

**Format copied to clipboard:**
```
J.S (20112233) V1-N6-109a 1 pkg @ 2:30 pm - A.B
```

The entry includes student initials, student number, room code, package count, time of action, and the logged-in staff member's initials. All values are pulled automatically from what is visible on screen.

---

### Printing a Package Label

On any student profile, a **Print Label** button appears to the left of the Entry Actions button in the top right area of the screen. Click it and paste the result into your label software or Word template.

**Format copied to clipboard:**
```
1/23/2026 2:30p.m.
20112233
Jordan Smith
V1-N6-109a
FDA: A.B
```

---

### Logging a Lockout

Open the student profile. A **Copy Lockout** button appears in the Keys section of the Rez 360 sidebar on the right side of the screen.

When clicked, a small prompt appears asking for the reason for the lockout (for example, "forgot key in room" or "lost key"). Enter the reason and press Enter or click **Copy Log**. Paste the result into the lockout log.

The tool reads key codes directly from the Keys card on the student profile, including Bedroom, Floor, Suite, and any active Loaner keys. If active loaner keys are present, those are used. Otherwise, all listed keys are included.

**Format copied to clipboard:**
```
J.S (20112233) V1-N6-109a KC: 26AA21; forgot key in room - A.B
```

> If the tool returns "No loaner keys found," the student has no keys listed in their profile. This is intentional. Do not attempt to force an entry. Complete a manual log if needed.

---

### Activity History

A **History** button appears near the Entry Actions button. Clicking it opens a panel showing recent activity logged during the current session.

From the history panel, staff can:
- Filter entries by the last 5, last 10, all entries, or a custom number
- Click any entry to copy it to clipboard again
- Delete individual entries or clear all at once

A small count below the History button displays how many packages have been logged today versus yesterday, useful for a quick check during shift handover.

---

## Technical Notes

*This section is intended for IT Services or management reviewing the extension for approval or deployment.*

The extension is built to Chrome's Manifest V3 standard, which is the current and most restrictive extension architecture available.

- **Read-only access** — The extension only reads text that is already rendered on screen. It does not access StarRez's backend, API, or any data not already visible to the logged-in user.
- **No network requests** — All processing is done locally in the browser. No data is sent to any external server.
- **No raw student data stored** — The activity log is saved in the browser's localStorage on the local machine only. It contains formatted log strings and timestamps. No additional student data is retained beyond what appears in those strings.
- **Domain scoped** — The extension activates only on `uwaterloo.starrezhousing.com`. It does not run on any other website.

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
