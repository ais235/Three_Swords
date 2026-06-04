# Three Blades UX / Gameplay Overhaul Plan

Initial baseline commit: `257c0d1` (`chore: baseline before gameplay ux overhaul`).
Phase 2 baseline commit: `b5f2e91` (`fix: phase 1 map sdk inventory offline`).

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

Status: complete in `e45ffdc` with a repeatable audit command.

1. [done] Commit the current baseline.
2. [done] Fix Yandex SDK loading path according to the current docs.
3. [done] Fix map action consistency: clicking a node and pressing Enter must trigger the same logic.
4. [done] Add offline fallbacks for wanderer and arena so local development remains playable without SDK.
5. [done] Fix broken responsive selectors for the current inventory DOM.
6. [done] Add a simple local audit script for selector/platform checks.

Definition of Done:

- `docs/UX_GAMEPLAY_OVERHAUL_PLAN.md` is in git.
- `npm run audit` checks the current `index.html` for key platform and layout invariants.
- Manual smoke checklist is documented: map click equals Enter, wanderer/arena work without SDK, inventory is checked at desktop, 768px, and mobile landscape widths.

### Phase 1.5 - Pre-UI Polish

1. [done] Confirm `LoadingAPI.ready()` is sent after Yandex SDK init.
2. [done] Verify Garet Berserk naming/cooldown consistency in code and UI.
3. [done] Keep SFX auditor disabled in normal play; expose only via explicit dev flag.
4. [done] Treat `b5f2e91` as the Phase 2 baseline.

### Phase 2 - Make The UI Feel Like A Game

Target viewports:

- Desktop landscape: at least 900x520; battle canvas remains primary, side panels together stay secondary.
- Mobile landscape: 667x375 and 812x375.
- Mobile portrait: acceptable graceful degradation is allowed if the tactical UI cannot remain readable.

Reference assets:

- Use `assets/ui/2026-05-09_*.png`, `assets/ui/boy.png`, `assets/ui/menyu.png`, `assets/ui/karta_mira.png`, and `assets/ui/snaryazhenie.png` as visual direction, not as strict layouts.

Tasks:

1. [done] Define target viewports in CSS and audit notes.
2. [in progress] Rework battle HUD around icon-first commands, portraits, threat markers, and large skill buttons.
3. [in progress] Reduce text panels in battle; move explanations into tooltips and bestiary.
4. [done initial pass] Rework victory screen into a reward moment: loot, level-up, new skill, power delta.
5. [in progress] Rework inventory into a no-scroll primary workflow on desktop and mobile landscape.

Definition of Done:

- Battle actions are icon-first and large enough to use without reading a text wall.
- Victory clearly shows loot and level-up stat deltas (`before -> after`) when applicable.
- Inventory's main equip flow does not require vertical scrolling on desktop landscape.

### Phase 3 - Make Progression Feel Powerful

1. Add level-up presentation with before/after stat deltas.
2. Give new skills strong unlock feedback.
3. [done initial pass] Add visible equipment comparison and "best candidate" hints.
4. [done initial pass] Strengthen perk descriptions so each branch promises a playstyle, not only numbers.
5. [in progress] Add battle feedback for perk/item effects: crit, pierce, reflect, aura, dodge, revive.

Definition of Done:

- Every implemented perk/item proc has visible feedback in combat: battle log plus at least one of flash, sound, icon, or floating marker.

### Phase 4 - Make Gameplay More Gripping

1. [in progress] Add enemy threat badges: healer, summoner, assassin, explosive, controller, boss.
2. [in progress] Ensure every enemy in the bestiary matches actual behavior.
3. Add attack/skill danger previews on hover/select.
4. Review region difficulty curve with repeatable test seeds.
5. Add positional mechanics after the UI is readable: flank/backstab, guard zones, cover clarity.

Definition of Done:

- Each `ENEMY_IDS` entry has matching `enemyAbilityText`, bestiary tactic, and code behavior.
- Any new positional mechanic is added only after battle HUD readability is verified.

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

Definition of Done:

- Release packaging excludes `chatgpt_*`, `_debug_*`, source ZIPs under `assets/`, and other scratch files.
- Release archive keeps only `index.html` in root and runtime files in ascii-named folders.

## Out Of Scope For This Overhaul

- Do not add new enemies, regions, or long-term meta-progression in this milestone.
- Do not change wave/gold balance blindly; every balance change needs a note in the commit or plan.
- Do not start Phase 5 until Phase 2 and Phase 3 are visually checked at least on desktop.
- Keep one logical block per commit.
- Add new UI strings through `I18N` / translation helpers; avoid hardcoded Russian in HTML.
- Do not rewrite the app into React/Vue or another framework.

## First Implementation Slice

- Yandex SDK path corrected.
- Map node action unified.
- Offline wanderer and arena playable.
- Current inventory responsive CSS repaired.
