# Страница игры на itch.io

Дата: 28 октября 2026, сборка **1.2.0**. Всё, что нужно для публикации веб-сборки на
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
Compress-Archive -Path 'dist\three-blades-itch\*' -DestinationPath 'dist\three-blades-itch.zip' -CompressionLevel Optimal
```

Сборка — 17.5 МБ (архив 16.6 МБ), 253 файла. Лимит itch на загрузку — 1 ГБ, так что запас большой;
вес важен не для лимита, а потому что его скачивают при открытии страницы.

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
> balance passes and the test suite were written in that pair. The soundtrack is
> written by the game itself — a small synthesiser and seven scores live in the
> repository, and every track is rendered from them, so the music is as much a
> part of the source as the combat rules. Art is generated and hand-picked; the
> interface frames are *RPG GUI construction kit* by **Lamoot** (CC BY 3.0,
> modified), icons from **game-icons.net** by Lorc, Delapouite and sbed
> (CC BY 3.0, modified), and the display face is **Press Start 2P** by CodeMan38
> (SIL OFL 1.1). Sound effects come from free RPG sound packs.
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
4. Прогнать матрицу окон на всех языках: `npm run test:tap:langs` — десять
   окон от 1920x1080 до 568x260 на ru, en и es, пять признаков (размер
   нажимаемого, зазор, кегль, обрезка текста, досягаемость). В `npm test`
   входит только русский ради времени, поэтому перед сборкой наружу этот
   прогон обязателен: «Hardcore», обрезанный на 22 px, по-русски не виден.
5. Сверить номер версии: он показан в настройках игры и должен совпадать с
   тем, что указан на странице. Упаковщик падает, если `GAME_VERSION` и
   `package.json` разошлись.
6. Сверить текст описания с игрой: цифры (39 врагов, 4 босса, 10 уровней) взяты
   из кода, и если контент менялся — пересчитать.

## 5. Что остаётся открытым

- **Лицензия звуковых эффектов проверена не вся.** Происхождение всех 68
  файлов записано, но лицензия доказана файлом у одного набора из шести —
  остальные опознаны по именам архивов. Разбор и что сделать:
  [AUDIO_LICENSES.md](AUDIO_LICENSES.md). Музыка этот вопрос уже не держит:
  она своя, собирается кодом репозитория.
- **Музыку никто не слышал, кроме генератора.** Я свёл её по числам и
  спектрограмме: уровни ровные, перегруза нет, форма на месте. Нравится ли
  она на слух — вопрос к живому человеку; правка дешёвая, партитуры лежат
  в `scripts/music/tracks.mjs`.
- **В игру не играл ни один незнакомый человек.** Выкладка на itch — и есть
  способ это закрыть; трёх-пяти живых прохождений хватит, чтобы увидеть то,
  чего не видит ни одна проверка.
- **Аналитики нет**: после выкладки будет неизвестно, на каком экране бросают.
  Полдня работы на пять событий, если захочется понимать отток.
- Ролик `gameplay.webm` itch в галерею не встроит — его место на YouTube,
  если понадобится.

## 6. Что починено к 1.2.0

- Своя музыка: семь треков собираются кодом репозитория
  (`npm run music`). Прежние были неизвестного происхождения; заодно сборка
  похудела с 25.1 до 17.5 МБ.

- Размеры нажимаемого: 44 px и зазор 6 px на всех окнах выше 360 px высоты,
  36 px в низких окнах браузера. Было 33 кнопки мельче 44 px на 812x375.
- Кнопки карты («Рюкзак», «Арсенал», «Бестиарий»), список героев в городе,
  «Закрыть» в инвентаре и «Ждать» в бою больше не уезжают за край без
  возможности докрутить — на 1024x640 и ниже они просто исчезали.
- Обрезанные подписи на английском и испанском.
- Нажатие по врагу вне дальности объясняет отказ вместо тишины.
- Туман войны на карте видно: был нарисован двумя почти одинаковыми чёрными,
  и первый экран читался как незагрузившаяся сетка. Кадр карты в галерее
  снимается из середины похода, а не с полностью снятым туманом.
- Название игры убрано из интерфейса: оно живёт только в `<title>` и в
  карточке площадки. Номер версии показан в настройках.
