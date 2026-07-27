# Overhaul Progress And Balance Report

## Completed Overhaul Pass — 2026-07-23

- Standard balance coverage expanded from 5 to 30 deterministic seeds; `--quick` keeps the original 5-seed daily set.
- Wave threat now includes composition synergy (healer+tank, controller+assassin, summoner+tank, ranged stacks, explosive stacks).
- Regular missions limit excessive volatile and ranged stacks.
- Region 1 missions use 3 enemies and dungeons 4; Region 2 missions use 4; Region 3 dungeons use 5.
- The quick validation curve after the pass is `R1:229`, `R2:418`, `R3:539`.
- Median quick-seed mission threat grows `R1:228 → R2:428 → R3:530`; the script fails if this order regresses.
- Release validation on this pass: 184 runtime files, 78.2 MB unpacked.

This file records what has actually changed, what is still mostly invisible to the player, and what remains before the game can feel like a finished game instead of a web prototype.

## Current Baseline

- Original overhaul baseline: `257c0d1`
- Phase 2 baseline: `b5f2e91`
- Latest checked work in this report: `674686c`

## What Was Done

### Stability And Platform

- Yandex SDK path was changed to `/sdk.js`.
- `LoadingAPI.ready()` is called after SDK init.
- Local/offline play no longer dead-ends on Wanderer and Arena nodes when Yandex SDK is absent.
- Map click and Enter now go through the same `enterMapNode()` path.
- Inventory responsive selectors were repaired for the current DOM.
- `npm run audit` checks important platform/layout invariants.

### Battle UI And Readability

- Battle actions were changed toward larger, icon-first buttons.
- Enemy threat badges were added: healer, summoner, assassin, explosive, controller, boss, tank, ranged.
- Hover previews were added for attack/skill danger zones.
- Enemy bestiary coverage is audited against `ENEMY_IDS`.
- Terrain/cover hints were added for desktop battle view.
- Mobile terrain markers are now disabled on small screens because they made the mobile battle view noisier.

### Progression Feedback

- Victory screen now has an initial reward pass with loot and level-up stat deltas.
- Inventory has "equip best" and item comparison hints.
- Perk descriptions are more playstyle-oriented.
- Some perk/item proc feedback was added in battle: dodge, revive, mana gain, etc.

### Balance Tooling

- `index.html?seed=12345` enables repeatable test runs.
- `npm run balance:seeds` prints wave threat summaries across fixed seeds.
- Region boss mapping was corrected: Shaman -> Fire Titan -> Hydra -> Dark Lord.

## What The Player Still Barely Feels

- The game still reads too much like a dense website in several screens.
- Mobile landscape is not yet a first-class layout; it is still a compressed desktop UI in places.
- Progression is mechanically present, but level-ups and new power spikes still need stronger presentation.
- Battle has tactics, but the UI does not yet create enough drama, rhythm, or clarity.
- The added audit/seed/balance work helps development, but it is mostly invisible to players.

## Current Balance Findings

Baseline command:

```bash
npm run balance:seeds
```

The default suite now contains 30 seeds grouped across early, normal, hardcore, boss, and synergy cases. Use `npm run balance:quick` for the original five-seed daily set.

Current mission threat curve across default seeds:

- `R1:229`
- `R2:418`
- `R3:539`

Notes:

- Region 2 mission pressure is now clearly above Region 1.
- Region 3 remains clearly above Region 2.
- Excessive volatile/ranged stacks are constrained in regular generated waves.
- Boss profiles and multi-hit enemies are included in the estimate; Hydra is now measured as the region-3 boss it is in play.
- Do not tune wave counts blindly from this number alone; Region 2 enemies have more control/armor, which may feel harder than the raw score.
- Next balance pass should use seeded manual runs before changing wave size or gold.

## What Remains

### Highest Priority

- Fix mobile landscape layout first: battle, inventory, victory, and map must fit without awkward scrolling or clutter.
- Make battle look and feel more like a game screen: less panel text, stronger command bar, clearer active unit, better hit/skill feedback.
- Strengthen victory and level-up moments so the player clearly feels "my heroes became stronger".

### Gameplay Feel

- Add stronger visible feedback for every important proc: crit, pierce, reflect, aura, dodge, revive.
- Add one readable positional mechanic only after mobile/desktop battle HUD is stable.
- Verify Region 2 mission difficulty through seeded manual runs.

### Later

- Refactor the monolithic `index.html` only after UI/progression are visually stable.
- Add release packaging and Yandex upload checks.

## Heuristic Notes

The balance script estimates wave threat from enemy HP, attack, armor, range, movement, speed, size, and boss flags. It does not simulate tactical positioning, player skill use, loot state, or enemy AI tempo. Use it to detect suspicious curves, then verify with seeded manual runs.

## Balance Pass — 2026-07-27

- Region 3 Hydra is now exclusive to the boss cell and cannot appear in ordinary missions or dungeons.
- Generated waves limit duplicate enemies and cap volatile, ranged, healer, summoner, controller, assassin, and heavy-elite combinations.
- Region 3 missions use four enemies to preserve the regional curve; Region 3 dungeons were reduced from five to four to remove extreme spikes.
- The 30-seed mission curve is `R1:234 → R2:427 → R3:502`.
- Median mission threat is `R1:235 → R2:430 → R3:501`.
- Verified maximums:
  - R1 mission 306 / cap 380; dungeon 378 / cap 520.
  - R2 mission 753 / cap 760; dungeon 692 / cap 820.
  - R3 mission 605 / cap 850; dungeon 600 / cap 900.
- Before this pass, Region 3 ordinary compositions reached threat 1125–1311. The new maximum is 605, while the final boss is 573.
- `npm run balance:check` performs the full 30-seed validation without printing the large per-cell table; `npm run balance:seeds` keeps the detailed report.
