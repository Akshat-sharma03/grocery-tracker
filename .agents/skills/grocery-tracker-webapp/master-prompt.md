# Master Prompt: Grocery Tracker Web App

**Project Overview**
Build a modernized, doodle-themed grocery listing and tracking web app that runs entirely in the browser (Chrome & Safari compatible), supports two users per grocery list, and is hosted on GitHub Pages.

## Core Features
- **Dual-User Grocery List** — Two named users can be added to a single shared grocery list. Items are tagged by who added them.
- **Smart Item Suggestions** — As a user types, the app suggests grocery items based on their past entries using localStorage history.
- **Auto Emoji Assignment** — Each item automatically gets a relevant emoji when added.
- **Push Notification Reminders** — Users can set reminders for grocery runs; the app sends browser push notifications at the scheduled time.
- **Doodle & Paper UI Theme** — The UI uses a hand-drawn, notebook/doodle aesthetic with colorful accents, sketch-like borders, and paper textures.

## Roles
- **Claude Code**: Application Logic, Data Architecture, Storage layer, Algorithms (autosuggest, emoji map), Service Worker background logic, GitHub Actions CI/CD implementation.
- **Gemini / Google Banana**: User Interface Design, CSS, Animations, Visual Layout, DOM structuring, applying the "Doodle/Paper" visual specification.

## UI Design Specification (Gemini)
*   **Theme**: Doodle notebook / paper scrapbook
*   **Background**: Off-white `#FDFBF3` with subtle paper grain texture.
*   **Borders & Shadows**: Wavy/sketchy SVG borders or `border-radius` with slight rotation on cards. Soft drop shadows (`box-shadow: 3px 4px 0px rgba(0,0,0,0.15)`).
*   **Buttons**: Slightly rotated (-1deg to +1deg), bold outline, fill on hover.
*   **Color Palette**:
    *   Background: `#FDFBF3`
    *   User 1 Accent: `#FF6B6B`
    *   User 2 Accent: `#4ECDC4`
    *   Highlight: `#FFE66D`
    *   Add Button: `#95E1A3`
    *   Text: `#2C2C2C`
*   **Typography**: "Caveat" (700 wt) for headers. "Patrick Hand" for body. Emoji size 1.4em.
*   **Components**: Header (with doodle SVG), User Panel (two side-by-side cards), Add Item Bar (sketchy input + dropdown), Grocery List (with strikethrough animation on complete), Reminder Modal (paper-ticket style), Empty State (Doodle basket).

## Logic Specification (Claude Code)
1.  **localStorage (`grocery_app_data`) Schema**:
    *   `users`: Array of two user objects (id, name, color).
    *   `items`: Array of list item objects (id, name, emoji, addedBy, done, addedAt).
    *   `history`: Object holding frequency data per user for the suggestion engine.
    *   `reminder`: Object capturing reminder configurations `time`, `enabled`, `lastNotified`.
2.  **Emoji Mapping (`emoji-map.js`)**: Include ~150+ keywords targeting emojis with fallback `🛒`.
3.  **Suggestion Engine (`suggestions.js`)**: Sort history keys by frequency for active user, suggest top 5 matching queries on keystrokes.
4.  **Push Notifications (`notifications.js`)**: Request Notification permission on first load. Register Service Worker. Poll checking time match each minute, trigger ServiceWorker push if matching. Fallback to `new Notification()` for older unsupported Safari builds.
5.  **GitHub Actions**: Deploy using standard static assets `peaceiris/actions-gh-pages@v3` via `deploy.yml`.

## Deployment
Host static app on GitHub Pages via repo `main` branch pushes utilizing GitHub actions. Requires HTTPS configuration (provided automatically via GitHub). PWA manifest enabled.
