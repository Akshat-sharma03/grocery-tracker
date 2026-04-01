# 1. GROCERY_TRACKER_MASTER_PROMPT.md — The Master Brief

This is the project specification you hand to your agents. It covers the full feature list with a clear ownership split between logic and UI design, complete file structure, data schema, and deployment steps.

---

## 🚀 Full Feature List & Ownership Split

### 🧠 Claude Code (Logic & Architecture)
**Handles all client-side logic, storage, and infrastructure:**
- **localStorage Data Layer**: Save/load grocery lists, user profiles, and purchase history atomically.
- **Smart Suggestion Algorithm**: Frequency-based autocomplete from past entries to surface frequently bought items.
- **Emoji Engine**: Keyword-to-emoji dictionary parsing (e.g., matching "apple" -> 🍎, with fallback to 🛒).
- **Service Worker & Notifications**: `Notification.requestPermission()`, background polling, and handling Safari push logic degradation.
- **GitHub Actions CI/CD**: Automatic deployment to GitHub Pages via `.github/workflows/deploy.yml`.
- **PWA Support**: Configuring `manifest.json` for mobile home screen installations.

### 🎨 Gemini / UI Agent (Visual Design)
**Handles all DOM structuring, layout, and visual aesthetics:**
- **Doodle/Paper CSS Theme**: Hand-drawn CSS borders, SVG filters for paper textures, and sketch-style buttons.
- **Color Palette**: Off-white base (`#FDFBF3`) with warm accents (Coral `#FF6B6B`, Teal `#4ECDC4`, Yellow `#FFE66D`, Mint `#95E1A3`).
- **Typography**: Integration of Google Fonts "Caveat" (for headings) and "Patrick Hand" (for body text).
- **Component Styling**:
  - Side-by-side user-switcher avatar cards.
  - Sketchy input fields and dropdown sticky-notes for autocomplete.
  - Grocery list toggles with doodle strikethrough animations.
  - Paper-ticket styled reminder modal with CSS-only toggle switches.
  - Empty state hand-drawn basket illustration.

---

## 📁 Complete File Structure

```text
grocery-tracker/
├── index.html           # Main DOM shell and UI scaffold
├── style.css            # Doodle/paper styling and typography
├── app.js               # Core app logic and localStorage handling
├── emoji-map.js         # Dictionary mapping items to emojis
├── suggestions.js       # Frequency algorithm for user history
├── users.js             # User setup (usually integrated into app.js)
├── notifications.js     # Push notification polling and permission logic
├── sw.js                # Service Worker for PWA / background tasks
├── manifest.json        # PWA metadata configuration
└── .github/
    └── workflows/
        └── deploy.yml   # CI/CD instructions
```

---

## 💾 Data Schema (`localStorage`)

**Key:** `grocery_app_data`
```json
{
  "users": [
    { "id": "u1", "name": "Alex", "color": "#FF6B6B" },
    { "id": "u2", "name": "Sam",  "color": "#4ECDC4" }
  ],
  "items": [
    {
      "id": "item_123456789",
      "name": "Milk",
      "emoji": "🥛",
      "addedBy": "u1",
      "done": false,
      "addedAt": 1712000000000
    }
  ],
  "history": {
    "u1": { "Milk": 4, "Eggs": 2 },
    "u2": { "Yogurt": 3 }
  },
  "reminder": {
    "time": "18:00",
    "enabled": true,
    "lastNotified": "Wed Apr 01 2026"
  }
}
```

---

## 🌐 Deployment Steps

Hosted cleanly as a static web app via GitHub Pages natively over HTTPS.
1. Create a GitHub repository named `grocery-tracker` and push the project.
2. The included `.github/workflows/deploy.yml` action will automatically trigger and deploy the site on any push to `main`.
3. In the repository **Settings → Pages**, set the source branch to `gh-pages` and folder root `/`.
4. App will be live at `https://<username>.github.io/grocery-tracker/` (HTTPS is explicitly required for Service Workers and Push API functionality).
