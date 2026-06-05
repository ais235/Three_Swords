# Balance Seed Report

Baseline command:

```bash
npm run balance:seeds
```

Current default seeds:

- `12345`
- `phase4-a`
- `phase4-b`
- `phase4-c`
- `phase4-d`

## Current Findings

- Repeatable seed support is available through `index.html?seed=12345`.
- Region boss mapping now follows the intended curve: Shaman -> Fire Titan -> Hydra -> Dark Lord.
- The current mission threat curve across default seeds is `R1:300 R2:294 R3:379`.
- Region 2 mission threat is slightly below Region 1 by this heuristic, while Region 2 dungeons and bosses remain clearly higher pressure.
- Next balance pass should test whether Region 2 missions feel harder in play because of control/armor enemies before changing wave counts.

## Heuristic Notes

The script estimates wave threat from enemy HP, attack, armor, range, movement, speed, size, and boss flags. It does not simulate tactical positioning, player skill use, loot state, or enemy AI tempo. Use it to detect suspicious curves, then verify with seeded manual runs.
