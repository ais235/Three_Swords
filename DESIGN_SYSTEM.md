# Three Blades — Design System

## Цвета (использовать везде как CSS переменные)
```css
:root {
  --bg-dark: #0d0d1a;        /* фон страницы */
  --bg-panel: #1a1a2e;       /* фон панелей */
  --bg-card: #111128;        /* фон карточек */
  --bg-card-hover: #151530;  /* карточка при hover */
  --accent-gold: #f0a500;    /* золото, заголовки, активные */
  --accent-blue: #4a9eff;    /* кнопки, герои */
  --accent-green: #2ecc71;   /* HP, бонусы, позитив */
  --accent-red: #e74c3c;     /* враги, урон, негатив */
  --accent-purple: #9b59b6;  /* реклама, перекрёстные */
  --accent-teal: #1abc9c;    /* вторичные акценты */
  --text-main: #e8e8f0;      /* основной текст */
  --text-dim: #8888aa;       /* второстепенный текст */
  --text-hint: #555577;      /* подсказки, плейсхолдеры */
  --border: #2a2a4a;         /* границы */
  --border-active: #4a9eff;  /* активная граница */
}
```

## Шрифт
Везде: font-family: 'Courier New', monospace
Это создаёт ощущение олдскульной RPG.

## Топбар (на всех экранах кроме меню)
```css
height: 36px;
background: #1a1a2e;
border-bottom: 1px solid #2a2a4a;
padding: 0 16px;
display: flex;
align-items: center;
justify-content: space-between;
```
Слева: "⚔ ТРИ КЛИНКА" цвет #f0a500, font-size 13px
Центр: "Золото: X | Регион: X | Ход: X" цвет #8888aa
Справа: кнопка "☰ Меню"

## Кнопки — 5 вариантов
```css
/* Base */
.btn {
  background: #1a1a2e;
  border: 1px solid #4a9eff;
  color: #4a9eff;
  padding: 5px 14px;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  cursor: pointer;
}
.btn-gold  { border-color: #f0a500; color: #f0a500; }
.btn-green { border-color: #2ecc71; color: #2ecc71; }
.btn-red   { border-color: #e74c3c; color: #e74c3c; }
.btn-dim   { border-color: #2a2a4a; color: #555577; cursor: not-allowed; }
.btn-ad    { border-color: #9b59b6; color: #9b59b6; }
```

## Бейджи редкости предметов
```css
.badge { font-size: 9px; padding: 2px 6px; border-radius: 3px; }
.badge-common { background:#1a1a2e; color:#8888aa; border:1px solid #2a2a4a; }
.badge-rare   { background:#0d1520; color:#4a9eff; border:1px solid #185fa5; }
.badge-epic   { background:#1a0800; color:#f0a500; border:1px solid #854f0b; }
```

## Карточка предмета
```css
.item-card {
  background: #1a1a2e;
  border-radius: 7px;
  padding: 9px;
  border: 1px solid #2a2a4a;
  cursor: pointer;
}
.item-card:hover  { border-color: #4a9eff; }
.item-card.selected { border-color: #f0a500; background: #150f00; }
```
Структура внутри:
1. Иконка эмодзи 22px
2. Название 10px #e8e8f0
3. Стат 9px #2ecc71 ("+3 атака")
4. Цена 9-11px #f0a500

## Полоски HP/MP
```css
.bar-wrap { margin-bottom: 3px; }
.bar-label { display:flex; justify-content:space-between; 
             font-size: 9px; color: #8888aa; margin-bottom: 2px; }
.bar { height: 5px; border-radius: 3px; 
       background: #1a1a2e; overflow: hidden; }
.bar-fill-hp { background: #2ecc71; height: 100%; }
.bar-fill-mp { background: #4a9eff; height: 100%; }
```

## Панели / сайдбары
```css
background: #111128;
border-right: 1px solid #2a2a4a; /* или border-left */
padding: 10px;
```

## Карта мира — клетки
```css
.cell {
  aspect-ratio: 1;
  border-radius: 4px;
  border: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  background: #111128;
}
.cell.active  { border-color: #f0a500; background: #1a1500; }
.cell.done    { opacity: 0.4; }
.cell.locked  { opacity: 0.2; cursor: not-allowed; }
```
Под иконкой: название типа 8px цвет #555577.
НЕ показывать координаты (0,0).

## Город — структура экрана
3 колонки: 160px | 1fr | 200px
- Левая: список NPC + состояние отряда
- Центр: товары торговца (сетка 3 колонки) + детальная карточка
- Правая: услуги (алхимик, разведчик, оракул) + событие

## Инвентарь — структура экрана  
2 колонки: 180px | 1fr
- Левая: табы героев, портрет, статы с бонусами "+X" зелёным,
  3 слота снаряжения (клик = снять)
- Правая верх: сетка предметов рюкзака (4 колонки)
  Правая низ: карточка выбранного предмета + кнопки

## Боевой экран — структура
3 колонки: 140px | canvas 512px | 160px
- Левая: карточки героев с HP/MP барами и иконками скиллов
- Центр: Canvas 8×8, клетки 64px
- Правая: очередь ходов (чипы 24px) + боевой лог + кнопки действий

## Главное меню
Центрированный блок, нет topbar.
Большой заголовок "ТРИ КЛИНКА" #f0a500 letter-spacing: 4px.
Под ним иконка ⚔ 36px.
Кнопки вертикально: "▶ Новая игра" / "↩ Продолжить" / "? Об игре".
Выбор сложности: два тогл-button рядом.
Мета-данные мелко: последняя игра / рекорд.
