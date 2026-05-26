# Техническое описание игры

## Стек и доставка

- **Чистый клиент**: один HTML-файл с встроенными `<style>` и `<script>`.
- **Язык**: JavaScript (без сборщика в репозитории для основной игры).
- **Хранение прогресса**: `localStorage` как гостевой fallback (ключи `threeHeroesSave` и дублирующий `save`), плюс облачные сохранения Яндекс Игр через `ysdk.getPlayer().setData/getData`; отдельно `threeBladesRecordsV1` для рекордов.
- **Платформа**: ориентир на **Яндекс Игры** (в HTML закомментирован SDK; есть хуки рекламы `showRewardedAd`, интервалы `AD_MIN_INTERVAL_MS`, `BONUS_GOLD_CD_MS`).

## Основной файл

`index.html` — монолит, логически разбит комментариями:

- SECTION 1: константы (`CELL`, `GRID`, тайлы, статусы).
- SECTION 2: `GameState`, данные врагов, героев, `PERK_TREES`, магазин, пул предметов.
- SECTION 3+: бой, отрисовка canvas, карта, UI, сохранения.

## Ключевые константы боя

| Имя | Значение | Назначение |
|-----|----------|------------|
| `CELL` | 64 | пикселей на клетку при отрисовке |
| `GRID_W` / `GRID_H` | 12 / 8 | размер поля боя (клетки) |
| `CANVAS_W` / `CANVAS_H` | 768 / 512 | размер canvas |
| `MAP_COLS` / `MAP_ROWS` | 12 / 8 | карта мира 12×8 |

## Типы тайлов поля боя (`TILE`)

`GROUND`, `FOREST`, `MOUNTAIN`, `WATER`, `FORT`, `FIRE`. Влияют на проходимость, укрытие для дальнобойных атак, урон от огня в конце хода и т.д.

## Генерация карты мира (`buildWorldMap`)

- Сетка `MAP_COLS × MAP_ROWS`, у каждой клетки: `id`, `x`, `y`, `region` (1–3 по строке `y`), `type`, `completed`, `visited`, `emoji`.
- Для каждого региона случайно назначаются узлы типов согласно квотам (`mission`, `city`, `dungeon`, `event`, `boss`, опционально `wanderer`, `arena`, `final`).
- Стартовая клетка `(0,0)` — миссия.

## Состояние игры (`GameState`) — важные поля

- `screen`, `gold`, `heroes`, `currentBattle`, `mapGrid`, `playerPos`, `regionUnlocked`, `shopStock`, `inventory`, `pendingPerks`, `difficulty`, `stats` (`battles`, `kills`, `goldEarned`), `defeatedBosses`, служебные флаги арены/странника/города, `adMeta`, `lastSafeSave`, `battleReviveUsed`.

## Узел боя

При входе в бой создаётся объект с полями вроде: `nodeId`, `region`, `type`, `enemyWave`, флаги `boss`/`final`, фаза `deploy` | `combat`, `units`, `grid`, `order` (инициатива), `activeIndex`, `round`, `battleLog`, `globalBuffs` (например `watcherDeadMove`).

## Известные особенности кода

- У врага `chaos` при спавне задаётся `bossVar: { aoeTurn: 0 }`; в `runEnemyTurn` он читает и инкрементирует это поле для ближнего магического импульса вокруг себя.
- Подрывник: `ENEMY_IDS.SUICIDE`, строковое значение `'suicide'` (не путать с именем файла спрайта `bomber.png`).
- В карточке героя в бою массив `cdKeys` для Гарета содержит третьим ключом **`inspire`**, тогда как реальный кулдаун умения хранится в **`cds.berserk`** — иконка «готовности» для берсерка может не совпадать с фактическим CD до исправления.

## Ассеты

- Спрайты героев/врагов могут лежать в `assets/` (см. `assets/README.md` при наличии).
- Текстуры подгружаются по соглашению в коде (имена файлов должны совпадать с ожиданиями функций вроде `getHeroTexture` / враги).
