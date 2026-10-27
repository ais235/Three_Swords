# Страница игры на itch.io

Дата: 27 октября 2026. Всё, что нужно для публикации веб-сборки на
https://ais235.itch.io/ — текст страницы, настройки и список файлов.

Загружает владелец вручную; этот файл — заготовка, а не инструкция для робота.

---

## 1. Что загружать

| Что | Откуда | Примечание |
|---|---|---|
| Сборка | `dist/three-blades-itch/` → zip | `npm run package:itch`; **index.html в корне архива**, не в подпапке |
| Обложка 630×500 | `artifacts/store/cover-630x500.png` | `npm run cover` |
| Баннер 960×350 | `artifacts/store/banner-960x350.png` | необязателен, но держит первый экран |
| Скриншоты | `artifacts/promo/*.png` | `npm run promo`, 5 кадров 1920×1080 |
| Ролик | `artifacts/promo/gameplay.webm` | можно не грузить: itch не встраивает webm, нужен YouTube |

Архив собирается так (важно: упаковывается **содержимое** папки, иначе index.html
окажется на уровень ниже и itch не найдёт точку входа):

```powershell
Compress-Archive -Path 'dist	hree-blades-itch\*' -DestinationPath 'dist	hree-blades-itch.zip' -CompressionLevel Optimal
```

Сборка — 25 МБ (архив 24 МБ), 252 файла. Лимит itch на загрузку — 1 ГБ, так что запас большой;
25 МБ важны не для лимита, а потому что их скачивают при открытии страницы.

### Настройки проекта

- **Kind of project:** HTML.
- У загруженного zip поставить галочку **«This file will be played in the
  browser»**.
- **Embed:** ширина **1280**, высота **720**, включить **Fullscreen button** и
  **Mobile friendly** не ставить. Игра только альбомная; в вертикальном окне она
  честно показывает экран «поверните устройство», и на телефоне это выглядит как
  поломка, а не как задумка.
- **Genre:** Strategy. **Tags:** `turn-based`, `tactics`, `roguelite`,
  `pixel-art`, `rpg`, `singleplayer`, `html5`.
- **Classification:** Game. Рекламы и покупок в этой сборке нет — соответствующие
  поля оставить пустыми.
- **Release status:** Released.

---

## 2. Текст страницы (английский)

Первые две строки — жанр и крючок; дальше разделы с заголовками. Вставлять в
редактор описания на странице Edit game.

> **Three heroes. One road. No second chances.**
>
> A turn-based tactics roguelite you play in the browser: a warrior who holds the
> line, an archer who punishes distance, a mage who rewrites the board with fire.
>
> ### The battle
>
> Everything happens on a grid, one unit at a time, in initiative order. Position
> beats damage: a shield bash that stuns the right enemy is worth more than a
> critical hit on the wrong one. Area spells can be aimed at an empty tile, so
> catching three enemies in one blast is a decision, not an accident. Nothing is
> timed — the battle waits while you think.
>
> ### The road
>
> Between fights there is a map: missions, camps, events with a choice, and towns
> where a trader sells gear, an alchemist brews potions and a scout tells you what
> waits ahead. Three regions, four bosses, each with its own habit — the Leshy
> calls the forest to its side, the Hydra regrows its heads, the Fire Titan hides
> behind its guards.
>
> ### The squad
>
> Ten levels, three branches per hero, and the top of a branch changes what that
> hero is: a tank Garet, a duellist Garet and a commander Garet play differently.
> A perk is chosen for good — there is no respec.
>
> ### Every run is its own
>
> The map is built anew each time. Before you set out you pick a contract
> (Pathfinders, Mercenaries, Wardens) and a difficulty; a run you liked can be
> replayed from its seed. 39 kinds of enemy, a bestiary that records what each one
> does and what it fears, three languages — English, Russian, Spanish — picked up
> from your browser and switchable in settings.
>
> ### About this project
>
> Made by one person with Claude (Anthropic) as a coding partner: the code,
> balance passes and the test suite were written in that pair. Art is generated
> and hand-picked; the interface frames are *RPG GUI construction kit* by **Lamoot**
> (CC BY 3.0, modified), icons from **game-icons.net** by Lorc, Delapouite and
> sbed (CC BY 3.0, modified), and the display face is **Press Start 2P** by
> CodeMan38 (SIL OFL 1.1). Sound effects come from CC0 libraries.
>
> Feedback is the reason this is here — if something reads as broken or unfair,
> say so in the comments.

Длина — около 2200 знаков, середина диапазона живых страниц (900–2600).

---

## 3. Тема оформления

Цвета пипеткой с арта игры (`styles/tokens.css`), чтобы страница и игра читались
как одно целое. В Edit theme поля идут по порядку: фон, колонка, текст, ссылки,
заголовки, кнопки (последние два — под «More options...»).

| Поле | Цвет | Что это в игре |
|---|---|---|
| Background | `#0a0806` | самый тёмный фон |
| Column | `#1a1611` | фон карточки |
| Text | `#ece4d6` | основной текст |
| Links | `#f0a500` | золото: ценность и действие |
| Headings | `#f0a500` | то же золото |
| Buttons | `#8a3b1e` | тёплая медь кнопки |

Фоном страницы можно поставить `assets/ui/fon.webp` — тот же ночной пейзаж, что в
меню, с повтором `no-repeat`.

---

## 4. Перед публикацией

1. Открыть страницу как посетитель (не под своим логином) в окне ноутбука:
   на первом экране должны быть видны название, кнопка запуска и первая строка
   описания.
2. Запустить игру из встраивания и проверить, что она открывается на весь блок
   1280×720 и кнопка полноэкранного режима работает.
3. Проверить, что в сборке нет рекламы: `npm run test:itch` — он обходит все
   экраны на трёх языках и падает, если где-то предлагается ролик.
4. Сверить текст описания с игрой: цифры (39 врагов, 4 босса, 10 уровней) взяты
   из кода, и если контент менялся — пересчитать.

## 5. Известные слабые места материалов

- **Скриншот карты (`artifacts/promo/2-map.png`) слабый**: почти вся сетка под
  туманом войны, кадр читается как незагрузившийся экран. Для галереи лучше снять
  карту из середины похода или заменить кадр на бестиарий.
- Ролик `gameplay.webm` itch в галерею не встроит — его место на YouTube, если
  понадобится.
