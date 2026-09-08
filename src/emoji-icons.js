/* Three Blades — pixel-art replacements for legacy emoji glyphs. */
(function () {
  'use strict';

  const BASE = 'assets/ui/emoji/';
  const ICONS = {
    '⚔': 'sword', '🗡': 'sword', '⚔️': 'sword', '🗡️': 'sword',
    '🏹': 'bow', '🔱': 'sword', '🔨': 'sword', '🪓': 'sword',
    '🔮': 'orb', '🌀': 'orb', '✦': 'orb', '✨': 'orb', '🌟': 'orb',
    '🛡': 'shield', '🛡️': 'shield', '🔰': 'shield',
    '🧥': 'cloak', '👟': 'cloak',
    '🧪': 'potion', '💊': 'potion',
    '💎': 'crystal', '💠': 'crystal', '🔵': 'crystal',
    '👁': 'eye', '👁️': 'eye', '🔍': 'eye',
    '🔥': 'fire', '🌋': 'fire', '♨': 'fire',
    '⏳': 'hourglass', '⌛': 'hourglass',
    '🌊': 'water', '💧': 'water', '🧊': 'water',
    '🌿': 'roots', '🌱': 'roots', '🌳': 'roots', '🌲': 'roots', '🍄': 'roots',
    '🗺': 'map', '🗺️': 'map', '🚩': 'map', '🚩': 'map',
    '📖': 'book', '📜': 'book', '📚': 'book',
    '🎒': 'backpack', '📦': 'backpack', '💰': 'crystal', '🪙': 'crystal',
    '💀': 'skull', '☠': 'skull', '☠️': 'skull',
    '🐗': 'roots', '🐺': 'roots', '🐀': 'roots', '🐍': 'roots', '🕷': 'roots', '🕷️': 'roots',
    '🧟': 'skull', '👻': 'skull', '👾': 'skull', '😱': 'skull',
    '⚠': 'fire', '⚡': 'fire', '💥': 'fire', '💣': 'fire',
    '🎯': 'eye', '🔭': 'eye', '❓': 'eye',
    '🏆': 'crystal', '🎁': 'backpack', '🎲': 'crystal',
    '🏰': 'book', '🏘': 'map', '🏕': 'map', '⛏': 'sword', '⛰': 'roots', '🪨': 'roots',
    '✓': 'crystal', '✕': 'skull', '✚': 'potion', '★': 'crystal', '☄': 'fire',
    '🧭': 'map', '☰': 'book', '⚙': 'crystal', '🔒': 'skull', '🤝': 'roots',
    '🌑': 'skull', '🌙': 'eye', '🌧': 'water', '🌪': 'water', '💨': 'water',
    '💪': 'sword', '📢': 'book', '🔄': 'hourglass', '👑': 'crystal',
    '👥': 'roots', '🩸': 'fire', '🥀': 'roots', '🕯': 'fire', '🕳': 'skull',
    '⛓': 'sword', '🧙': 'orb', '🧿': 'eye', '🪨': 'roots',
  };

  // Variation selectors are presentation details, not part of our lookup key.
  const normalized = value => String(value || '').replace(/[\uFE0E\uFE0F]/g, '');
  const lookup = value => ICONS[value] || ICONS[normalized(value)] || null;
  const escapeAttr = value => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  window.gameEmojiIconMarkup = function (value, size, alt) {
    const icon = lookup(value);
    if (!icon) return String(value || '');
    const px = Math.max(10, Number(size) || 20);
    return `<img class="emoji-icon-pixel" src="${BASE}${icon}.png" alt="${escapeAttr(alt || '')}" aria-hidden="${alt ? 'false' : 'true'}" width="${px}" height="${px}" decoding="async" loading="lazy" style="width:${px}px;height:${px}px;object-fit:contain;vertical-align:middle;display:inline-block" />`;
  };

  const tokens = Object.keys(ICONS).sort((a, b) => b.length - a.length);
  const tokenRe = new RegExp(tokens.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
  const skipTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE']);

  function replaceTextNode(node) {
    if (!node || !node.parentNode) return;
    const text = node.nodeValue;
    if (!text || !tokenRe.test(text)) { tokenRe.lastIndex = 0; return; }
    tokenRe.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let last = 0;
    text.replace(tokenRe, (match, offset) => {
      if (offset > last) fragment.appendChild(document.createTextNode(text.slice(last, offset)));
      const holder = document.createElement('span');
      holder.className = 'emoji-icon-inline';
      holder.innerHTML = gameEmojiIconMarkup(match, 20);
      fragment.appendChild(holder);
      last = offset + match.length;
      return match;
    });
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    if (node.parentNode) node.parentNode.replaceChild(fragment, node);
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!skipTags.has(node.parentElement?.tagName) && !node.parentElement?.closest('.emoji-icon-inline')) nodes.push(node);
    }
    nodes.forEach(replaceTextNode);
  }

  function install() {
    scan(document.body);
    const observer = new MutationObserver(records => records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node.nodeType === 3) replaceTextNode(node);
        else if (node.nodeType === 1 && !node.classList.contains('emoji-icon-inline')) scan(node);
      });
    }));
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
