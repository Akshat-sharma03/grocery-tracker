---
name: grocery-tracker-webapp
description: >
  Build a doodle-themed, dual-user grocery tracking web app with smart item suggestions,
  auto emoji assignment, push notification reminders, and GitHub Pages hosting.
  Use this skill whenever the user wants to create, extend, or debug a grocery tracker,
  shopping list app, or any browser-based list app with push notifications, localStorage
  persistence, PWA features, or collaborative (multi-user) list management — even if they
  don't use the exact phrase "grocery tracker". Also triggers for tasks like "add emoji
  to list items", "autocomplete from history", or "deploy static app to GitHub Pages".
---

# Grocery Tracker Web App Skill

A complete playbook for building and deploying a client-side grocery tracker app with:
- Dual-user support on a single shared list
- Smart suggestions from purchase history
- Auto emoji assignment per item
- Browser push notification reminders
- Doodle/paper/colorful UI theme
- GitHub Pages deployment via GitHub Actions

---

## Agent Responsibilities

This project uses a **split-agent model**:

| Agent | Owns |
|---|---|
| **Claude Code** | App logic, data layer, service worker, GitHub Actions CI/CD |
| **Gemini / UI Agent** | Visual design, CSS theme, component styling, animations |

When working solo (no Gemini), Claude handles both columns.

---

## Step 1 — Scaffold the Project

Create this file structure:

```
grocery-tracker/
├── index.html
├── style.css
├── app.js
├── emoji-map.js
├── suggestions.js
├── users.js
├── notifications.js
├── sw.js              ← Service Worker
├── manifest.json      ← PWA manifest
└── .github/
    └── workflows/
        └── deploy.yml
```

All logic is **client-side only** — no backend, no server, no build step required.

---

## Step 2 — Data Layer (localStorage)

**Key**: `grocery_app_data`

```js
{
  users: [
    { id: "u1", name: "Alex", color: "#FF6B6B" },
    { id: "u2", name: "Sam",  color: "#4ECDC4" }
  ],
  items: [
    {
      id: "item_abc123",
      name: "Milk",
      emoji: "🥛",
      addedBy: "u1",
      done: false,
      addedAt: 1712000000000
    }
  ],
  history: {
    "u1": { "Milk": 4, "Eggs": 2 },   // item → frequency count
    "u2": { "Yogurt": 3 }
  },
  reminder: { time: "18:00", enabled: true, lastNotified: null }
}
```

**Rules:**
- Always read/write the full object atomically (`JSON.parse` / `JSON.stringify`)
- Update `history[userId][itemName]++` whenever an item is added
- Never store sensitive data — this is a public-facing static app

---

## Step 3 — Emoji Mapping

Build a dictionary of ≥150 common grocery keywords → emoji in `emoji-map.js`.
Lookup is **case-insensitive, partial-match**: split item name into words, check each word.

```js
export function getEmoji(itemName) {
  const words = itemName.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (emojiMap[word]) return emojiMap[word];
  }
  return "🛒"; // fallback
}
```

**Seed entries** (expand to 150+):

| Keyword | Emoji | Keyword | Emoji |
|---------|-------|---------|-------|
| milk | 🥛 | eggs | 🥚 |
| bread | 🍞 | butter | 🧈 |
| apple | 🍎 | banana | 🍌 |
| chicken | 🍗 | beef | 🥩 |
| rice | 🍚 | pasta | 🍝 |
| cheese | 🧀 | yogurt | 🫙 |
| coffee | ☕ | tea | 🍵 |
| soap | 🧴 | toilet paper | 🧻 |
| water | 💧 | juice | 🧃 |

---

## Step 4 — Suggestion Engine

```js
// suggestions.js
export function getSuggestions(query, userId, history) {
  if (!query || query.length < 2) return [];
  const userHistory = history[userId] || {};
  return Object.entries(userHistory)
    .filter(([item]) => item.toLowerCase().startsWith(query.toLowerCase()))
    .sort((a, b) => b[1] - a[1])  // sort by frequency desc
    .slice(0, 5)
    .map(([item]) => item);
}
```

- Trigger on every `input` event with debounce of 150ms
- Render suggestions as a floating list below the input
- Clicking a suggestion fills the input and focus it

---

## Step 5 — Push Notifications

### Permission
```js
// Ask on first meaningful interaction (button click), not on page load
async function requestNotificationPermission() {
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}
```

### Service Worker (sw.js)
```js
self.addEventListener("push", event => {
  event.waitUntil(
    self.registration.showNotification("🛒 Grocery Reminder", {
      body: "Time to check your grocery list!",
      icon: "/icon-192.png",
      badge: "/icon-72.png"
    })
  );
});
```

### Scheduling (client-side polling)
```js
// Check every 60 seconds; fire if time matches and not already fired today
setInterval(() => {
  const data = loadData();
  if (!data.reminder.enabled) return;
  const now = new Date();
  const [hh, mm] = data.reminder.time.split(":").map(Number);
  const isTime = now.getHours() === hh && now.getMinutes() === mm;
  const today = now.toDateString();
  if (isTime && data.reminder.lastNotified !== today) {
    showNotification();
    data.reminder.lastNotified = today;
    saveData(data);
  }
}, 60_000);
```

### Safari Compatibility
- Safari 15 and below: Web Push not supported → show an **in-page banner** instead
- Safari 16.4+: Web Push works on HTTPS with a valid service worker
- Detect: `"PushManager" in window` — if false, use fallback banner

---

## Step 6 — UI Theme (Doodle / Paper)

> **If using Gemini for UI**: pass the design spec below verbatim. Claude Code provides semantic HTML; Gemini applies styling.

### Design Tokens

```css
:root {
  --bg:          #FDFBF3;
  --text:        #2C2C2C;
  --user1:       #FF6B6B;
  --user2:       #4ECDC4;
  --accent-yellow: #FFE66D;
  --accent-green:  #95E1A3;
  --shadow:      3px 4px 0px rgba(0,0,0,0.15);
  --font-heading: 'Caveat', cursive;
  --font-body:    'Patrick Hand', cursive;
}
```

### Key UI Rules
1. Load from Google Fonts: `Caveat:wght@400;700` + `Patrick Hand`
2. Paper texture: use `filter: url(#paper-noise)` SVG filter or CSS `background-image` with `noise.png`
3. Cards: `border: 2px solid var(--text)`, slight random rotation (`transform: rotate(-0.5deg)` to `rotate(0.8deg)`)
4. Buttons: solid border, offset shadow, scale on hover (`transform: scale(1.04)`)
5. Strikethrough: SVG `<line>` drawn via JS animation over completed items
6. Empty state: inline SVG of a hand-drawn empty basket

### Component Map

| Component | Notes |
|---|---|
| Header | App name in Caveat 700, cart SVG doodle beside it |
| User Cards | Side-by-side, colored top border matching `--user1` / `--user2` |
| Input Bar | Sketchy underline input + "Add ✏️" button |
| Suggestions Dropdown | Yellow sticky-note style, max 5 items |
| Item Card | Emoji + name + user tag + checkbox + delete (✕) |
| Reminder Modal | Paper ticket style, time input, toggle switch |
| Notification Banner | Safari fallback — yellow top banner with bell icon |

---

## Step 7 — PWA Manifest

```json
{
  "name": "Grocery Tracker",
  "short_name": "Groceries",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FDFBF3",
  "theme_color": "#FF6B6B",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Link in `<head>`: `<link rel="manifest" href="/manifest.json">`

---

## Step 8 — GitHub Actions Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

After first push:
1. Go to repo **Settings → Pages**
2. Set Source to `gh-pages` branch, root `/`
3. App live at `https://<username>.github.io/grocery-tracker/`

**HTTPS is required** for Service Workers and Push Notifications — GitHub Pages provides this automatically.

---

## Step 9 — Cross-Browser Checklist

| Feature | Chrome | Safari 16.4+ | Safari <16.4 |
|---|---|---|---|
| localStorage | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ fallback banner |
| PWA Install | ✅ | ✅ | ✅ |
| CSS Variables | ✅ | ✅ | ✅ |

Test on both browsers before deploying. Use `console.warn` not `console.error` for graceful degradation messages.

---

## Acceptance Criteria

- [ ] Two users named, color-coded, switchable
- [ ] Items get correct emoji (or 🛒 fallback)
- [ ] Autocomplete shows past items while typing
- [ ] Push notification fires at set time (Chrome + Safari 16.4+)
- [ ] Safari fallback banner shown on older Safari
- [ ] App installable as PWA (manifest + service worker)
- [ ] Works offline after first load
- [ ] Data survives browser refresh
- [ ] Deployed live on GitHub Pages via CI/CD
- [ ] Doodle/paper/colorful theme matches spec

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Push permission asked on page load | Ask on user gesture (button click) |
| Service worker not updating | Add version const to sw.js; increment on change |
| Safari not registering SW | Ensure served over HTTPS and SW path is root-relative |
| Suggestions not showing | Check debounce and that `history` is keyed by userId |
| Emoji fallback missing | Always return `"🛒"` at end of `getEmoji()` |
| localStorage quota exceeded | Cap `history[userId]` to most recent 100 unique items |
