# Three Blades UX / Gameplay Overhaul Plan

Baseline commit: `257c0d1` (`chore: baseline before gameplay ux overhaul`).

## Platform Check: Yandex Games And Modules

Yandex Games allows an HTML5 game archive with `index.html` in the archive root. Current official requirements say:

- The archive root must contain a single `index.html`.
- Uncompressed archive content must be no more than 100 MB.
- File and folder names should not contain spaces or Cyrillic characters.
- For games uploaded to the Yandex server, the SDK should be connected with the relative path `/sdk.js`.
- If hosted on a custom domain, the SDK path should be absolute: `https://sdk.games.s3.yandex.net/sdk.js`.

Decision: splitting `index.html` is allowed if runtime files are placed in subfolders such as `src/`, `styles/`, and `assets/`, and all paths are relative/ascii. Because the root should contain only `index.html`, do not put `main.js`, `style.css`, or other runtime files in the root for release archives.

Risk note: ES modules are browser-native, but the safest Yandex path is either:

1. Split source files into subfolders and use classic `<script defer src="src/..."></script>` globals first.
2. Later add a build step that bundles modules back into one or several release files under subfolders.

Do not start with a huge module migration before the UI and gameplay problems are stabilized.

## Combined Diagnosis

Cursor is more optimistic about the game as a content-rich tactical prototype: strong battle core, large enemy set, many SFX, useful Yandex SDK groundwork. My assessment is stricter on player experience: the game has systems, but the interface still feels like a website and the growth loop is not emotionally strong enough.

Shared conclusions:

- `index.html` is too large and slows development.
- UI is dense, text-heavy, and hard to verify manually.
- Battle has real tactical parts, but the player does not always see why decisions matter.
- Progression exists in code, but level-ups/perks/items do not feel powerful enough.
- Some descriptions and actual mechanics drift apart.
- Local/offline behavior must not leave Yandex-only nodes dead.

## Step-by-step Plan

### Phase 1 - Stabilize The Current Build

1. Commit the current baseline.
2. Fix Yandex SDK loading path according to the current docs.
3. Fix map action consistency: clicking a node and pressing Enter must trigger the same logic.
4. Add offline fallbacks for wanderer and arena so local development remains playable without SDK.
5. Fix broken responsive selectors for the current inventory DOM.
6. Add a simple local audit script for viewport/layout checks.

### Phase 2 - Make The UI Feel Like A Game

1. Define target viewports: desktop landscape, mobile landscape, mobile portrait.
2. Rework battle HUD around icon-first commands, portraits, threat markers, and large skill buttons.
3. Reduce text panels in battle; move explanations into tooltips and bestiary.
4. Rework victory screen into a reward moment: loot, level-up, new skill, power delta.
5. Rework inventory into a no-scroll primary workflow on desktop and mobile landscape.

### Phase 3 - Make Progression Feel Powerful

1. Add level-up presentation with before/after stat deltas.
2. Give new skills strong unlock feedback.
3. Add visible equipment comparison and "best candidate" hints.
4. Strengthen perk descriptions so each branch promises a playstyle, not only numbers.
5. Add battle feedback for perk/item effects: crit, pierce, reflect, aura, dodge, revive.

### Phase 4 - Make Gameplay More Gripping

1. Add enemy threat badges: healer, summoner, assassin, explosive, controller, boss.
2. Add attack/skill danger previews on hover/select.
3. Add positional mechanics after the UI is readable: flank/backstab, guard zones, cover clarity.
4. Review region difficulty curve with repeatable test seeds.
5. Ensure every enemy in the bestiary matches actual behavior.

### Phase 5 - Architecture Refactor

1. Extract CSS into `styles/` after visual rules settle.
2. Extract data tables into `src/data/` as classic scripts or bundled modules.
3. Extract Yandex/platform wrapper into `src/platform/`.
4. Extract battle/map/inventory renderers into focused files.
5. Keep release archive Yandex-compatible: root `index.html`, all other files in ascii-named folders.

### Phase 6 - Release Hygiene

1. Create a release packaging script.
2. Exclude debug/raw/chatgpt scratch assets from the release archive.
3. Verify archive size under 100 MB uncompressed.
4. Run Yandex debug panel checks for SDK init, language, ads, saves, and game-ready event.
5. Capture final screenshots for moderation and store them separately from runtime assets.

## First Implementation Slice

- Yandex SDK path corrected.
- Map node action unified.
- Offline wanderer and arena playable.
- Current inventory responsive CSS repaired.
