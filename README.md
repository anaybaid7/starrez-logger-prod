# StarRez Logger Production Plugin (Campus Housing - Desk Services - University of Waterloo (ON))
StarRez Logger (Package Pickups, Package Labels, Key Lockouts)

# StarRez Logging Automation Tool
**Maintained by:** Anay Baid  
**Last updated:** February 20th, 2026 (Friday)
**Version:** Final

---

## What this is

Front desk logging in StarRez is slow. Opening a profile, reading the student number, copying the room code, typing it all out in the right format, checking the time — it takes 20+ seconds per entry and there's always room to make a mistake, especially at 3am during a busy night.

This Chrome extension fixes that. It reads the student data already on your screen and generates the correctly-formatted log entry with one click. Package logs, lockout logs, and package labels — all done in under a second, always in the right format.

It works by injecting a few extra buttons directly into the StarRez interface. No new tabs, no switching windows, no typing.

---

## Installation

This should only be installed by Anay Baid or an authorized person on designated desk workstations. It's not complicated, but it's not meant to be a self-serve thing for general staff.

**Steps:**

1. Download the extension folder (the one containing `manifest.json`)
2. Open Chrome and go to `chrome://extensions`
3. Toggle **Developer Mode** on (top right corner)
4. Click **Load unpacked** and select the extension folder
5. Open any student profile in StarRez — if you see the new buttons, you're good

When a new version comes out, just replace the folder contents and hit the refresh icon on the extension card in `chrome://extensions`.

The extension shows a default puzzle-piece icon in the Chrome toolbar. That's expected — there's no custom icon. It doesn't affect anything.

---

## How to use it

### Logging a package

1. Open the student's profile in StarRez
2. Go to the **Parcels** section — you'll see a **Copy Log** button next to the standard Issue button
3. Click it. Button turns green, log is on your clipboard
4. Paste into the spreadsheet

If the student has more than one parcel, a second button appears showing the count (e.g. **Copy 3 pkgs**) so you can log all of them at once.

**What gets copied:**
```
A.B (20990921) UWP-BECK-204a 1 pkg @ 2:30 pm - J.D
```
Student initials, student number, room code, package count, time of click, your initials. All pulled automatically from what's on screen.

---

### Printing a package label

1. Open the student's profile
2. Look near the **Entry Actions** button in the top right — there's a **Print Label** button just to the left of it
3. Click it, paste into your label software or Word template

**What gets copied:**
```
1/23/2026 2:30p.m.
20990921
Anay Baid
UWP-BECK-204a
FDA: J.D
```

---

### Logging a lockout

1. Open the student's profile
2. A **Copy Lockout** button appears in the Keys section of the Rez 360 sidebar (right side of the profile)
3. Click it — a small prompt appears asking for the reason (e.g. "lost key", "forgot in room")
4. Type the reason and hit Enter or click Copy Log
5. Paste into the lockout log

The tool reads the key codes directly from the Keys card on the student's profile — Bedroom, Floor, Suite, or any LOANER keys assigned to them. If there are active loaner keys, those get used. If not, it falls back to whatever keys are listed.

**What gets copied:**
```
A.B (12345678) BH-204a KC: 26AA21; forgot key in room - J.D
```

If the tool says "No loaner keys found" — that means there genuinely aren't any keys listed on that student's profile. Don't force it, do a manual entry.

---

### Activity history

There's a **History** button that appears near Entry Actions. Click it to see a panel with your recent activity — everything that's been logged this session. You can filter by the last 5, 10, or all entries, or enter a custom number. Click any entry to copy it again. There's a delete button on each entry, and a Clear All if you want to wipe it.

Below the History button you'll also see a small count showing how many packages have been logged today vs yesterday — useful for a quick sanity check during shift handover.

---

## Technical notes (for IST / management)

The extension is built to Chrome's MV3 standard — the current and most restrictive extension architecture.

- **Read-only:** It only reads text already rendered on screen. It cannot access StarRez's backend, API, or any data not visible to the logged-in user
- **No network requests:** All processing happens locally in the browser. Nothing is sent anywhere
- **No student data stored:** The activity log is kept in the browser's localStorage on the local machine only. It contains the formatted log strings (the same text you'd paste into a spreadsheet) and timestamps. No raw student data beyond what's in those strings
- **Scoped to one domain:** The extension only activates on `uwaterloo.starrezhousing.com` — no other sites

**Permissions the extension uses:**

| Permission | Why |
|---|---|
| `clipboardWrite` | To copy the log entry to clipboard when a button is clicked |
| `storage` | Local activity log storage |
| `activeTab` + `scripting` | So the popup can read the activity log from the active StarRez tab |
| `host: uwaterloo.starrezhousing.com` | Scopes the extension to StarRez only |

The extension does not request access to browsing history, other tabs, network traffic, or any other website.

---

## Troubleshooting

**Buttons didn't appear after opening a profile**  
StarRez is a single-page app — it updates the page content without doing a full reload. The extension detects this and injects buttons automatically, usually within half a second. If they don't show up, wait a couple seconds and try a page refresh (F5).

**Switched to a different student but something looks off**  
The extension watches for navigation changes and refreshes everything when it detects a new profile. If something looks stale, F5 fixes it.

**Copy Lockout says "No loaner keys found"**  
That student has no keys listed in their Keys section. The tool won't generate a blank entry — that's intentional. Do a manual log entry if you need to proceed.

**The Keys section / Copy Lockout button took a few seconds to appear**  
The Rez 360 sidebar loads separately from the rest of the profile. The extension watches for it and injects the button as soon as the Keys section appears. On slower connections this can take a few seconds — it'll get there.

**Something's broken and F5 doesn't fix it**  
Email Anay Baid with a screenshot. For anything urgent at the desk, manual entry in the meantime.

---

## Questions or bugs

Email Anay Baid or drop a message with a screenshot of what happened. Please don't try to modify the extension files yourself — it'll likely break something and make it harder to debug later.

---

*Related: Mail Processing · Daily Tasks · Lockout Procedure · Submitting an IST Ticket*


