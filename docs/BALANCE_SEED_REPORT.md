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

## Scaling Rewrite — 2026-08-29

The old curve made investment cancel itself out. `calculatePartyPower()` summed
`attack + armor + maxHp/10 + range + speed/2`, and `scaleEnemy()` multiplied enemy HP,
attack and armor by that number. Buying a shield therefore raised enemy attack, and a
fully geared region 3 party met enemies that had grown at almost exactly the rate the
party had.

Measured before the change, against a typical region 3 elite (34 hp / 12 atk / 4 arm):

| Party | partyPower | scale | enemy | rounds to kill | Alira rounds to die |
|---|---:|---:|---|---:|---:|
| start, no gear | 53.9 | 1.00 | 34 / 8 / 2 | 2.00 | 2.7 |
| region 3, full gear | 106.1 | 1.82 | 62 / 14 / 4 | 1.51 | 2.1 |

Roughly 40 battles and 2500 gold bought half a round of time to kill, while the archer's
survival got *worse*.

### New rules

- `calculatePartyPower()` counts `attack + maxHp/10` only. Armor, range and speed are
  excluded, so defensive purchases no longer arm the enemy.
- Enemy HP follows `sqrt(partyPower / 30)`, clamped to `[1, 1.8]`. Diminishing coupling
  means offensive investment outruns the curve instead of being matched by it.
- Enemy attack and armor are authored per region and no longer scale at all:
  R1 `x0.65 / x0.50`, R2 `x0.82 / x0.66`, R3 `x0.98 / x0.82`.
- Region 1 numbers are bit-identical to the old curve, so the opening and the tutorial
  are unchanged.

After the change, the same region 3 elite is 49 / 12 / 3: it dies in 1.11 rounds instead
of 1.46, and Alira survives 2.7 rounds instead of 2.1. Gear is felt on both sides of the
exchange. Boss profiles are fixed and were not touched, so trash melts while bosses stay
the real test.

### Coverage note

`balance-seeds.mjs` scores waves from base enemy definitions and never calls
`scaleEnemy()`, so `balance:check` cannot detect a regression here. The contract is
guarded by `test:items` instead: pure-armor gear must not move party power, enemy attack
must be regional, and enemy HP must still answer offensive investment.

## Damage Preview Parity Fix — 2026-08-29

`heroDamagePreview()` added `weapon.mods.attack` on top of `attacker.attack`, but
equipment stats are already baked into the persistent hero stats by
`recalcHeroFromEquipment()`, and `dealDamage()` deliberately does not add them again.
Every equipped weapon therefore inflated the previewed number by its own attack mod.

Measured with Alira and the War Crossbow (+6 attack) against armour 3: the panel showed
17, the roll dealt 11. Fireball was affected too, since its damage is a flat 15 that
never took a weapon bonus.

The line is removed. `test:items` now asserts preview/roll parity through the production
equip path, so the drift cannot come back. This was the condition the scorecard rule
names: readability cannot be scored above 8 while the preview disagrees with the roll.

## Act Proportions, Internal Walls And Purchase Economy — 2026-08-30

### What changed on the board

Layout 3 moves rows between regions: region 1 now owns 2 rows, regions 2 and 3 own 3 each.
Roughly a third of every region is non-combat, including a new camp node that restores 25%
of each hero's max HP once.

| | cells | missions | dungeons | cities | camps | events | arenas | battles |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Region 1 | 24 | 9 | 2 | 3 | 3 | 6 | 0 | 12 |
| Region 2 | 36 | 13 | 3 | 4 | 4 | 7 | 2 | 18 |
| Region 3 | 36 | 12 | 4 | 3 | 4 | 7 | 2 | 19 |
| **Total** | 96 | 34 | 9 | 10 | 11 | 20 | 4 | **49** |

Before: 64 battles, with the opening act carrying 26 of them and the finale 15. Arenas and
wanderers stay capped at one use per region, so the battle column counts one arena each.

### Why the economy had to move with it

Gold per battle was flat: a region 3 mission paid exactly what a region 1 mission paid.
Most of a run's money was therefore earned in the opening act, where nothing worth buying
exists, and the region 3 gear tier — the one that now carries unique rules — stayed out of
reach. Cutting region 1 from 26 battles to 12 would have made that worse.

Gold now scales by region (`REGION_GOLD_MULTIPLIER` x1 / x1.4 / x1.8 on missions, dungeons
and arenas) and bosses are authored per region (`REGION_BOSS_GOLD`, final 380).

| Region | battles | income | two cheapest epics of that tier |
|---|---:|---:|---:|
| 1 | 12 | 753 | 160 |
| 2 | 18 | 1357 | 345 |
| 3 | 19 | 2109 | 1330 |

Total campaign income is about 4200 against roughly 4000 before, so the run is not richer —
the money simply arrives where the expensive gear is. Region 3 previously earned about 900
against epics costing 650-750; it now covers two or three of them.

`npm run balance:seeds` computes this from the shipped constants and fails if a region
cannot afford its own tier or if income stops growing across the campaign.

### Experience

Region 1 lost half its battles, so its base experience rises from 30 to 42 per fight
(`REGION_XP_BASE` 42 / 40 / 50). The party reaches level 5 — the level that unlocks all
three ultimates — on exactly the last fight before the Leshy, which is where it stood
before the act was shortened. Total campaign experience is 2684 against the 1400 needed to
cap at level 8, and the cap now lands around the region 2 boss instead of mid-region-2.

Raising the cap to 10 with capstones (design notes, section 2) is still the open item: at
cap 8 the whole of region 3 grants no character progression, only purchases.

### Threat curve

Unchanged by this pass: `R1:228 R2:427 R3:499` with medians `229 / 426 / 498`. The region
2 tail inversion documented in the design notes is still open.

## Difficulty Curve, Level Cap And Elite Affixes — 2026-08-30

### The region 2 tail inversion is fixed

`waveCompositionAllows` capped a group called `heavyElites` at one per wave, but the
group held only three of the five enemies flagged `miniBoss`. The Dark Knight was not in
it and duplicates were allowed up to two, so an ordinary region 2 mission could field two
Dark Knights plus a Stone Golem — three mini-bosses — while region 3, whose two
mini-bosses were both listed, was capped at one.

The rule is now stated in terms of what the data actually says:

- `WAVE_MINI_BOSSES` covers every enemy flagged `miniBoss`, capped at one per wave in
  regions 1-2 and two in region 3, so the finale may field an elite pair and earlier acts
  may not.
- `WAVE_HEAVY_ARMOR` (Orc Guard, Shieldbearer) is capped at one, which stops two armour-6
  bodies stalling a wave.

| | before | after |
|---|---:|---:|
| R1 mission peak | 271 | 271 |
| R2 mission peak | **753** | **557** |
| R3 mission peak | 605 | **673** |
| R2 dungeon peak | 730 | 554 |
| R3 dungeon peak | 600 | 652 |

Medians move from `229 / 426 / 498` to `229 / 407 / 514`.

The caps in `balance-seeds.mjs` sat far above the observed maxima, which is why the
inversion reported PASS for two balance passes. They now describe the intended curve
(330 / 430, 620 / 620, 760 / 760), and a new assertion requires the *peak* of each act to
exceed the peak of the one before it, for missions and dungeons alike. Medians alone hid
this once already.

### Threat on the map follows the wave

`mapNodeIntel` derived threat from the node type, so a 271-point mission and a 673-point
mission both read "medium threat". It now scores the actual wave with the same heuristic
this report uses, against per-region bands, and adds a fourth level (`threatExtreme`).
The wave it scores is the one after campaign mutators, because `feral_packs` appends an
enemy and the old preview under-reported the count.

### Level cap 10 and branch capstones

The cap was 8, reached around the region 2 boss, so the whole finale granted no character
progression. `HERO_LEVEL_CAP` is now 10 on the same `level * 50` curve: 2250 experience
against the 2684 the campaign grants, so level 10 lands shortly before the final boss.

Every perk branch gains a fourth node that only becomes available once its first three are
taken. That is nine perk points against twelve nodes, so a capstone costs four points in
one branch and committing to one is a real trade.

| Hero | Branch | Capstone | Effect |
|---|---|---|---|
| Garet | defense | Unbreakable | Block 40% and it also stops magic |
| Garet | attack | Execution | A kill returns the turn, once per round |
| Garet | leader | Banner | Allies within 2 tiles deal +2 damage |
| Alira | accuracy | Deadeye | Attacks ignore 3 armor |
| Alira | speed | Windrunner | +2 movement, shot after moving +45% |
| Alira | traps | Minefield | Traps deal 8 damage and poison |
| Seris | destruction | Incinerate | Every magic hit burns for 3 turns |
| Seris | control | Deep Freeze | Freeze spreads to a neighbour |
| Seris | mystic | Wellspring | +4 maximum mana and +4 mana each turn |

Each reuses an existing code path (pierce, burn, chain freeze, mana regen, the Hourglass
resume), so the capstones add rules rather than new systems.

### Elite affixes

One table multiplies wave variety without new art, AI or enemy types. A wave slot may roll
an affix; the affixed body keeps its familiar silhouette but has to be answered
differently.

| Affix | Effect |
|---|---|
| Armored | +3 armor |
| Swift | +2 movement, +2 speed |
| Venomous | Poisons on hit for 2 turns |
| Unstable | Detonates on death for 8 damage to adjacent heroes |
| Warlord | Enemies within 2 tiles deal +2 damage |

Every elite also carries +25% HP and pays `ELITE_KILL_GOLD` (14) on death, which is a
small bounty the economy check does not count, so reported income is conservative.

Rules that keep it honest:

- Bosses and mini-bosses never roll an affix; their profiles are authored.
- Chance per slot is 10% / 16% / 22% by region, capped at one elite per wave in regions
  1-2 and two in region 3.
- The roll is a hash of the cell id, not `Math.random`, so the map preview and the battle
  that follows always agree. The elite shows as an `ELITE` threat tag, raises the threat
  band, and is named in the Scout Eye lineup.

