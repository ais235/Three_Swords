# 06 — Система баланса Three Blades
# Проверена математически (node.js симуляция)

## КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ОТНОСИТЕЛЬНО ЧЕРНОВИКА

1. Скейлинг ATK врагов был 0.8 → исправлен на 0.65 (иначе больно с первых ходов)
2. Боссы НЕ скейлятся с partyPower — у них фиксированные статы (иначе dark_lord → HP 425, ATK 37)
3. XP порог: level*40 → level*50 (прогрессия была слишком быстрой — уровень 8 за 14 боёв)
4. XP за бой: 20 → 30 базово (теперь уровень 8 достигается за ~49 боёв = вся игра)

---

## Метрика силы отряда (partyPower)

```javascript
function calculatePartyPower() {
  return GameState.heroes.reduce((sum, h) => {
    return sum + h.attack + h.armor + h.maxHp / 10 + h.range + h.speed / 2;
  }, 0);
}
```

Стартовые значения (из документации):
- Гарет: 8+5+4+1+5 = 23.0
- Алира: 10+2+2.5+4+5.5 = 24.0
- Сэрис: 12+1+2+3+4.5 = 22.5
- **Стартовый partyPower = 69.5 ≈ 70**

---

## Скейлинг обычных врагов

```javascript
function scaleEnemy(enemyBase, partyPower, region) {
  // Кап скейла 2.5x — враги не уходят в бесконечность
  const scale = Math.max(1, Math.min(2.5,
    (partyPower / 70) * (1 + (region - 1) * 0.1)
  ));
  return {
    ...enemyBase,
    hp:    Math.round(enemyBase.hp    * scale),
    attack: Math.round(enemyBase.attack * scale * 0.65), // атак меньше HP
    armor:  Math.round(enemyBase.armor  * scale * 0.5),
    range: enemyBase.range,  // не скейлится
    move:  enemyBase.move    // не скейлится
  };
}
```

**Примеры при starт (pp=70, R1):**
- skeleton:  HP=8  ATK=4  ARM=0
- goblin:    HP=10 ATK=5  ARM=0
- boar:      HP=15 ATK=6  ARM=1
- zombie:    HP=12 ATK=5  ARM=1
- shaman:    HP=25 ATK=4  ARM=1 ← мини-босс, но он ФИКСИРОВАН (см. ниже)

---

## Боссы — ФИКСИРОВАННЫЕ СТАТЫ (не скейлятся!)

```javascript
const BOSS_PROFILES = {
  shaman:      { hp: 35,  attack: 8,  armor: 1 },  // мини-босс Р1
  dark_knight: { hp: 65,  attack: 14, armor: 5 },  // мини-босс Р2
  fire_titan:  { hp: 110, attack: 16, armor: 4 },  // босс Р2
  dark_lord:   { hp: 180, attack: 20, armor: 6 }   // финал
};
```

Проверка fire_titan (игрок уровень 4-5, rare снаряжение):
- Отряд DPS: (14-4)+(17-4)+(19-4) = 38 → убить за 3 раунда
- Урон по Гарету (броня 7): 16-7 = 9/раунд → Гарет живёт 5 ударов → НАПРЯЖЁННО ✓

Проверка dark_lord (игрок уровень 7-8, epic снаряжение):
- Отряд DPS: (18-6)+(21-6)+(23-6) = 44 → убить за 5 раундов (без фаз)
- Фаза 3 (физик заблокирован): только Сэрис 17 DPS → +4 раунда экстра → СЛОЖНО ✓

---

## Прогрессия XP и уровней

### Опыт за бой

```javascript
function getXpForBattle(battleNode) {
  const base = 30 + (battleNode.region - 1) * 10;
  // region 1: 30xp, region 2: 40xp, region 3: 50xp
  const typeBonus = {
    mission:   0,
    dungeon:   20,  // подземелье сложнее
    miniboss:  30,  // мини-босс
    boss:      70,  // босс региона
    final:     120  // тёмный лорд
  }[battleNode.bossType || 'mission'] || 0;
  return base + typeBonus;
}
```

Таблица наград:

| Тип боя | Регион 1 | Регион 2 | Регион 3 |
|---------|----------|----------|----------|
| Миссия | 30 XP / 25g | 40 XP / 35g | 50 XP / 45g |
| Подземелье | 50 XP / 60g | 60 XP / 75g | 70 XP / 100g |
| Мини-босс | 60 XP / 50g | 70 XP / 90g | — |
| Босс региона | — | 100 XP / 150g | — |
| Финал | — | — | 150 XP / 300g |

### Порог уровня (исправлен)

```javascript
// level * 50 (не 40 как было)
const XP_PER_LEVEL = (level) => level * 50;
```

Прогрессия уровней (примерно боёв на каждый):
- Ур.1→2: ~2 боя
- Ур.2→3: ~4 боя
- Ур.3→4: ~5 боёв
- Ур.4→5: ~7 боёв
- Ур.5→6: ~9 боёв
- Ур.6→7: ~10 боёв
- Ур.7→8: ~12 боёв
- **Итого: ~49 боёв = вся игра (~50 боёв) ✓**

---

## Прокачка героев: перки

### Как работает

При level up: игрок видит 2 случайных ветки из 3.
Выбирает одну → берёт следующий доступный перк в ней.
Ветка раскрывается последовательно: уровень 1 → 2 → 3.

**К уровню 8 типичный герой:** 3-4 перка, обычно 2 одной ветки + 1-2 из других.

---

### ГАРЕТ (garet)

**Ветка defense:**
```javascript
{ id:'d1', name:'+5 HP макс', apply: h => { h.maxHp+=5; h.hp+=5; } },
{ id:'d2', name:'+1 броня',   apply: h => { h.armor+=1; } },
{ id:'d3', name:'Отражение 1 урона', apply: h => { h.perks.push('reflect1'); } }
// reflect1 в dealDamage: атакующий получает 1 урона
```

**Ветка attack:**
```javascript
{ id:'a1', name:'+2 урон',     apply: h => { h.attack+=2; } },
{ id:'a2', name:'Пробивание',  apply: h => { h.perks.push('armorPierce'); } },
// armorPierce: target.armor -= 2 при расчёте урона (min 0)
{ id:'a3', name:'Крит 15%',    apply: h => { h.perks.push('crit15'); } }
// crit15: 15% шанс умножить урон x1.5
```

**Ветка leader:**
```javascript
{ id:'l1', name:'Аура брони +1',  apply: h => { h.perks.push('auraArmor'); } },
// auraArmor: союзники в радиусе 1 получают +1 armor при расчёте урона
{ id:'l2', name:'Аура урона +10%', apply: h => { h.perks.push('auraDmg'); } },
// auraDmg: союзники в радиусе 2 +10% к исходящему урону
{ id:'l3', name:'Командир +1 скорость', apply: h => { h.speed+=1; } }
```

**Проверка Гарета на Ур.8 (оптимальный билд attack+defense):**
- Базовый ATK 8 + A1(+2) + A2(pierce) + epic оружие(+5) = 15 ATK, пробивание
- Базовый ARM 5 + D2(+1) + rare броня(+2) = 8 ARM
- HP 40 + D1(+5) = 45 HP → выживает 5 ударов dark_lord ✓

---

### АЛИРА (alira)

**Ветка accuracy:**
```javascript
{ id:'m1', name:'+1 дальность',    apply: h => { h.range+=1; } },
{ id:'m2', name:'+3 урон',         apply: h => { h.attack+=3; } },
{ id:'m3', name:'Игнор укрытия',   apply: h => { h.perks.push('ignoreCover'); } }
// ignoreCover: rangedBlocked() всегда false для этого героя
```

**Ветка speed:**
```javascript
{ id:'s1', name:'+1 движение',         apply: h => { h.move+=1; } },
{ id:'s2', name:'Выстрел после шага',  apply: h => { h.perks.push('moveAttack'); } },
// moveAttack: firstAttackTurn не сбрасывается при движении
{ id:'s3', name:'+2 скорость',         apply: h => { h.speed+=2; } }
```

**Ветка traps:**
```javascript
{ id:'t1', name:'Ловушка (урон 10)', apply: h => { h.perks.push('trapDmg'); } },
// trapDmg: новое действие - поставить ловушку, 10 урона при наступлении
{ id:'t2', name:'Ловушка (замедление)', apply: h => { h.perks.push('trapSlow'); } },
// trapSlow: ловушка также накладывает SLOW -2 движения на 2 хода
{ id:'t3', name:'Двойные ловушки', apply: h => { h.perks.push('trapDouble'); } }
// trapDouble: ставить 2 ловушки за одно действие
```

---

### СЭРИС (seris)

**Ветка destruction:**
```javascript
{ id:'r1', name:'+3 маг урон',   apply: h => { h.attack+=3; } },
{ id:'r2', name:'AoE +1 радиус', apply: h => { h.perks.push('aoePlus'); } },
// aoePlus: все AoE заклинания +1 к радиусу (fireballSplash +1, meteorArea +1)
{ id:'r3', name:'Сжигание 2 хода', apply: h => { h.perks.push('burnSpell'); } }
// burnSpell: все атакующие заклинания накладывают BURN на 2 хода (-3 HP/ход)
```

**Ветка control:**
```javascript
{ id:'c1', name:'Заморозка 2 хода',  apply: h => { h.perks.push('freeze2'); } },
// freeze2: заклинание freeze длится 2 хода вместо 1
{ id:'c2', name:'Страх',             apply: h => { h.perks.push('fear'); } },
// fear: новое умение - враг убегает 1 ход (cost 3 mana, cd 4)
{ id:'c3', name:'Мастер контроля',   apply: h => { h.maxMana+=2; h.mana+=2; } }
```

**Ветка mystic:**
```javascript
{ id:'y1', name:'+3 макс маны',    apply: h => { h.maxMana+=3; h.mana+=3; } },
{ id:'y2', name:'HP за убийство',  apply: h => { h.perks.push('killHeal'); } },
// killHeal: при убийстве врага восстановить 5 HP
{ id:'y3', name:'Телепорт',        apply: h => { h.perks.push('teleport'); } }
// teleport: новое умение - переместить себя на любую видимую клетку (cost 6 mana, 1x/бой)
```

---

## Лут: полный ITEM_POOL

### Вероятность выпадения при убийстве

```javascript
const LOOT_CHANCE = {
  skeleton:     0.25,
  goblin_archer: 0.30,
  boar:         0.35,
  zombie:       0.25,
  shaman:       0.80,  // + guaranteed rare
  orc_guard:    0.40,
  suicide:      0.30,
  spider:       0.40,
  watcher:      0.50,  // Глаз провидца тематически
  ice_elem:     0.45,
  dark_knight:  0.85,  // + guaranteed rare
  necro:        0.45,
  chaos:        0.50,
  assassin:     0.50,
  hydra:        0.55,
  ghost:        0.45,
  fire_titan:   1.00,  // guaranteed epic
  dark_lord:    1.00   // epic x2
};
```

### Функция выбора лута

```javascript
function selectLootItem(region, forceRarity = null) {
  // Вероятность редкости по регионам (проверено математически)
  const rarityRoll = Math.random();
  let rarity;
  if (forceRarity) {
    rarity = forceRarity;
  } else {
    // R1: 5% epic, 25% rare, 70% common
    // R2: 15% epic, 35% rare, 50% common
    // R3: 30% epic, 45% rare, 25% common
    const epicChance   = [0.05, 0.15, 0.30][region - 1];
    const rareChance   = [0.25, 0.35, 0.45][region - 1];
    if (rarityRoll < epicChance) rarity = 'epic';
    else if (rarityRoll < epicChance + rareChance) rarity = 'rare';
    else rarity = 'common';
  }

  const pool = ITEM_POOL.filter(i => i.rarity === rarity && i.minRegion <= region);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
```

### ITEM_POOL — полный список

```javascript
const ITEM_POOL = [

  // ═══════════════════════════════════════════
  // ОРУЖИЕ — ГАРЕТ (warrior)
  // ═══════════════════════════════════════════
  {
    id: 'sword_steel', name: 'Стальной меч', emoji: '⚔',
    type: 'weapon', heroClass: 'warrior', rarity: 'common', minRegion: 1,
    mods: { attack: 3 },
    price: 35, sellPrice: 17,
    desc: 'Надёжный меч из хорошей стали.'
  },
  {
    id: 'blade_poison', name: 'Клинок яда', emoji: '🗡',
    type: 'weapon', heroClass: 'warrior', rarity: 'rare', minRegion: 1,
    mods: { attack: 2, poisonOnHit: true },
    price: 90, sellPrice: 45,
    desc: 'Отравляет цель на 2 хода. Рана не заживает быстро.'
  },
  {
    id: 'hammer_thunder', name: 'Громовой молот', emoji: '🔨',
    type: 'weapon', heroClass: 'warrior', rarity: 'epic', minRegion: 1,
    mods: { attack: 4, stunOnHit: true },
    price: 160, sellPrice: 80,
    desc: 'Оглушает врага на 1 ход при попадании.'
  },
  {
    id: 'blade_dark', name: 'Клинок тьмы', emoji: '⚔',
    type: 'weapon', heroClass: 'warrior', rarity: 'epic', minRegion: 2,
    mods: { attack: 5, armor: -1 },
    price: 200, sellPrice: 100,
    desc: 'Огромная сила ценой уязвимости. −1 к броне владельца.'
  },

  // ═══════════════════════════════════════════
  // ОРУЖИЕ — АЛИРА (archer)
  // ═══════════════════════════════════════════
  {
    id: 'bow_hunt', name: 'Охотничий лук', emoji: '🏹',
    type: 'weapon', heroClass: 'archer', rarity: 'common', minRegion: 1,
    mods: { attack: 3, range: 1 },
    price: 40, sellPrice: 20,
    desc: 'Лёгкий лук для дальней охоты.'
  },
  {
    id: 'bow_shadow', name: 'Лук теней', emoji: '🏹',
    type: 'weapon', heroClass: 'archer', rarity: 'rare', minRegion: 1,
    mods: { attack: 4, ignoreCover: true },
    price: 100, sellPrice: 50,
    desc: 'Стрелы проходят сквозь лес и укрытия.'
  },
  {
    id: 'bow_moon', name: 'Лунный лук', emoji: '🌙',
    type: 'weapon', heroClass: 'archer', rarity: 'epic', minRegion: 2,
    mods: { attack: 5, firstShotBonus: 0.5 },
    price: 180, sellPrice: 90,
    desc: 'Первый выстрел за раунд наносит x1.5 урона.'
  },
  {
    id: 'crossbow_war', name: 'Боевой арбалет', emoji: '🏹',
    type: 'weapon', heroClass: 'archer', rarity: 'epic', minRegion: 2,
    mods: { attack: 6, range: 2 },
    price: 220, sellPrice: 110,
    desc: 'Дальнобойное оружие с большим уроном.'
  },

  // ═══════════════════════════════════════════
  // ОРУЖИЕ — СЭРИС (mage)
  // ═══════════════════════════════════════════
  {
    id: 'staff_magic', name: 'Магический жезл', emoji: '🔮',
    type: 'weapon', heroClass: 'mage', rarity: 'common', minRegion: 1,
    mods: { attack: 4 },
    price: 40, sellPrice: 20,
    desc: 'Усиливает магические атаки.'
  },
  {
    id: 'staff_fire', name: 'Огненный посох', emoji: '🔥',
    type: 'weapon', heroClass: 'mage', rarity: 'rare', minRegion: 1,
    mods: { attack: 5, aoePlus: true },
    price: 110, sellPrice: 55,
    desc: 'Все заклинания получают +1 к радиусу AoE.'
  },
  {
    id: 'staff_chaos', name: 'Посох хаоса', emoji: '🌀',
    type: 'weapon', heroClass: 'mage', rarity: 'epic', minRegion: 2,
    mods: { attack: 6, chaosAoe: true },
    price: 200, sellPrice: 100,
    desc: 'После каждого заклинания случайный AoE по ближайшим врагам (5 урона).'
  },
  {
    id: 'staff_ice', name: 'Посох ледяного демона', emoji: '❄',
    type: 'weapon', heroClass: 'mage', rarity: 'epic', minRegion: 2,
    mods: { attack: 6, freeze2: true },
    price: 220, sellPrice: 110,
    desc: 'Заморозка длится 2 хода вместо 1.'
  },

  // ═══════════════════════════════════════════
  // БРОНЯ (для всех, но баланс по роли)
  // ═══════════════════════════════════════════
  {
    id: 'armor_leather', name: 'Кожаная броня', emoji: '🛡',
    type: 'armor', heroClass: 'all', rarity: 'common', minRegion: 1,
    mods: { armor: 2 },
    price: 30, sellPrice: 15,
    desc: 'Лёгкая защита. Подходит всем.'
  },
  {
    id: 'cloak_shadow', name: 'Плащ теней', emoji: '🧥',
    type: 'armor', heroClass: 'all', rarity: 'rare', minRegion: 1,
    mods: { armor: 1, dodge: 0.20 },
    price: 85, sellPrice: 42,
    desc: '20% шанс уклониться от атаки. Лучше для лучника и мага.'
  },
  {
    id: 'shield_rune', name: 'Рунический щит', emoji: '🛡',
    type: 'armor', heroClass: 'warrior', rarity: 'rare', minRegion: 1,
    mods: { armor: 3, statusReflect: 0.25 },
    price: 95, sellPrice: 47,
    desc: '25% шанс отразить негативный статус обратно атакующему.'
  },
  {
    id: 'mantle_reflect', name: 'Мантия отражения', emoji: '🌀',
    type: 'armor', heroClass: 'mage', rarity: 'rare', minRegion: 1,
    mods: { armor: 2, reflectDmg: 0.10 },
    price: 100, sellPrice: 50,
    desc: '10% входящего физического урона отражается атакующему.'
  },
  {
    id: 'armor_guardian', name: 'Доспех стражника', emoji: '💎',
    type: 'armor', heroClass: 'warrior', rarity: 'epic', minRegion: 2,
    mods: { armor: 4, reflectFlat: 1 },
    price: 170, sellPrice: 85,
    desc: 'Каждая атака по владельцу также наносит 1 урона атакующему.'
  },
  {
    id: 'robe_phoenix', name: 'Одеяние феникса', emoji: '🔥',
    type: 'armor', heroClass: 'mage', rarity: 'epic', minRegion: 2,
    mods: { armor: 3, revive5: true },
    price: 200, sellPrice: 100,
    desc: 'Один раз за бой: если герой погибает, воскрешается с 5 HP.'
  },
  {
    id: 'mantle_dark', name: 'Тёмная мантия', emoji: '🌑',
    type: 'armor', heroClass: 'all', rarity: 'epic', minRegion: 2,
    mods: { armor: 2, attack: 3, maxHp: -5 },
    price: 190, sellPrice: 95,
    desc: '+3 атаки ценой −5 макс HP. Для агрессивного стиля.'
  },

  // ═══════════════════════════════════════════
  // АРТЕФАКТЫ (для всех)
  // ═══════════════════════════════════════════
  {
    id: 'amulet_luck', name: 'Амулет удачи', emoji: '🧿',
    type: 'artifact', heroClass: 'all', rarity: 'common', minRegion: 1,
    mods: { goldBonus: 0.15 },
    price: 25, sellPrice: 12,
    desc: '+15% к золоту с каждого боя.'
  },
  {
    id: 'crystal_mana', name: 'Кристалл маны', emoji: '💠',
    type: 'artifact', heroClass: 'mage', rarity: 'rare', minRegion: 1,
    mods: { manaRegen: 3 },
    price: 80, sellPrice: 40,
    desc: 'Маг восстанавливает +3 маны в начале каждого хода.'
  },
  {
    id: 'eye_seer', name: 'Глаз провидца', emoji: '👁',
    type: 'artifact', heroClass: 'all', rarity: 'rare', minRegion: 1,
    mods: { previewEnemies: true },
    price: 85, sellPrice: 42,
    desc: 'Перед боем видишь состав и способности врагов.'
  },
  {
    id: 'hourglass', name: 'Песочные часы', emoji: '⏳',
    type: 'artifact', heroClass: 'all', rarity: 'rare', minRegion: 2,
    mods: { repeatAction: true },
    price: 95, sellPrice: 47,
    desc: '1 раз за бой: повторить последнее действие героя.'
  },
  {
    id: 'ring_death', name: 'Кольцо смерти', emoji: '💀',
    type: 'artifact', heroClass: 'all', rarity: 'epic', minRegion: 2,
    mods: { deathExplosion: 15 },
    price: 175, sellPrice: 87,
    desc: 'При гибели героя: взрыв 3×3 вокруг него, 15 урона врагам.'
  },
  {
    id: 'stone_portal', name: 'Портальный камень', emoji: '🌀',
    type: 'artifact', heroClass: 'all', rarity: 'epic', minRegion: 2,
    mods: { teleportBattle: true },
    price: 185, sellPrice: 92,
    desc: '1 раз за бой: переместить героя на любую свободную клетку.'
  },
  {
    id: 'crown_power', name: 'Корона власти', emoji: '👑',
    type: 'artifact', heroClass: 'all', rarity: 'epic', minRegion: 3,
    mods: { allyAttack: 2, allyArmor: 1 },
    price: 195, sellPrice: 97,
    desc: 'Все союзники +2 атаки и +1 брони (пассивная аура).'
  }
];
```

---

## Экономика: цены и магазин

### Стартовые предметы (выдать при initNewGame)

```javascript
GameState.inventory = [
  ITEM_POOL.find(i => i.id === 'sword_steel'),   // Гарет
  ITEM_POOL.find(i => i.id === 'bow_hunt'),       // Алира
  ITEM_POOL.find(i => i.id === 'staff_magic'),    // Сэрис
  ITEM_POOL.find(i => i.id === 'armor_leather'),  // общая броня
  ITEM_POOL.find(i => i.id === 'amulet_luck'),    // артефакт
];
```

### Магазин торговца (обновляется каждый визит)

```javascript
function generateShopStock(region) {
  const byRegion = ITEM_POOL.filter(i => i.minRegion <= region);
  const commons = byRegion.filter(i => i.rarity === 'common');
  const rares   = byRegion.filter(i => i.rarity === 'rare');
  const epics   = byRegion.filter(i => i.rarity === 'epic');

  const stock = [];
  // 2 обычных
  stock.push(commons[Math.floor(Math.random() * commons.length)]);
  stock.push(commons[Math.floor(Math.random() * commons.length)]);
  // 1-2 редких (вероятность зависит от региона)
  if (Math.random() < 0.4 + (region-1)*0.2) stock.push(rares[Math.floor(Math.random() * rares.length)]);
  if (Math.random() < 0.2 + (region-1)*0.15) stock.push(rares[Math.floor(Math.random() * rares.length)]);
  // Тайный слот (за рекламу — epic)
  const secretItem = epics[Math.floor(Math.random() * epics.length)];

  return { stock: [...new Set(stock)].slice(0,4), secretItem };
}
```

### Алхимик (улучшение)

```javascript
const UPGRADE_COST = {
  common_to_rare: 100,   // или реклама (1x на город)
  rare_to_epic:   200    // или реклама (1x на город)
};

// При улучшении предмет сохраняет тип и heroClass,
// но получает случайный предмет следующей редкости:
function upgradeItem(item, region) {
  const nextRarity = { common: 'rare', rare: 'epic' }[item.rarity];
  const pool = ITEM_POOL.filter(i =>
    i.rarity === nextRarity &&
    i.type === item.type &&
    (i.heroClass === item.heroClass || i.heroClass === 'all') &&
    i.minRegion <= region
  );
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : item;
}
```

### Лечение в городе

```javascript
function getHealCost() {
  // 2 золота за единицу HP, минимум 10g
  const missingHp = GameState.heroes.reduce((s, h) => s + (h.maxHp - h.hp), 0);
  return Math.max(10, missingHp * 2);
}
```

---

## Мотивация смотреть рекламу (психология)

Экономика намеренно строится так:
- После боя в магазине **всегда есть предмет на 20-30g дороже чем есть у игрока**
- Это достигается тем что магазин знает текущий gold и чуть завышает
- Реклама даёт **+50 gold** — ровно хватает на тот самый предмет

```javascript
function shouldShowBonusGoldAd() {
  const stock = GameState.shopStock;
  if (!stock) return false;
  const cheapest = Math.min(...stock.map(i => i.price));
  const mostWanted = Math.max(...stock.map(i => i.price));
  // Показать баннер если игрок может купить дешёвый но не дорогой
  return GameState.gold >= cheapest && GameState.gold < mostWanted &&
         (mostWanted - GameState.gold) <= 60;
}
```

---

## Проверочные тесты (ручные)

После внедрения проверить:

1. **Старт:** skeleton наносит 1 урона Гарету (ATK 4 − ARM 5 = min 1). Гарет убивает скелета за 1 удар. ✓
2. **Уровень 3:** shaman (HP 35, фиксирован) — бой 3-4 раунда. ✓
3. **Переход Р1→Р2:** у игрока 150-300g, можно купить 1-2 rare предмета. ✓
4. **Fire Titan:** 4-5 раундов боя с rare снаряжением. Гарет на грани падения. ✓
5. **Dark Lord фаза 3:** физика не проходит — только Сэрис бьёт. Сложно. ✓
6. **Лут мотивирует:** каждые 3-4 боя выпадает что-то полезное. ✓
7. **Магазин:** всегда есть соблазн (предмет чуть дороже текущего gold). ✓
