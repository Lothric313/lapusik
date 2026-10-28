'use strict';

const siteHeader = document.querySelector('.header-shell');
function updateHeaderAppearance() {
  siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', updateHeaderAppearance, { passive: true });
window.addEventListener('pageshow', updateHeaderAppearance);
updateHeaderAppearance();

// The cutout's chest rests at 88.756% of its height; its ears start at 2.711%.
// Keep that chest on the ledge while the ears overlap the last title line.
const hero = document.querySelector('.hero');
const heroTitle = document.querySelector('#hero-title');
const heroPets = document.querySelector('.hero-pets');
const desktopHero = window.matchMedia('(min-width: 761px)');
function alignHeroPets() {
  if (!desktopHero.matches) {
    heroPets.style.removeProperty('--pet-size');
    return;
  }
  const titleBounds = heroTitle.getBoundingClientRect();
  const ledge = hero.getBoundingClientRect().bottom;
  const overlap = Math.min(42, Math.max(22, titleBounds.height * .15));
  const size = (ledge - titleBounds.bottom + overlap) / (.88756 - .02711);
  heroPets.style.setProperty('--pet-size', `${Math.max(240, size).toFixed(2)}px`);
}
const heroResizeObserver = new ResizeObserver(alignHeroPets);
heroResizeObserver.observe(hero);
heroResizeObserver.observe(heroTitle);
desktopHero.addEventListener('change', alignHeroPets);
alignHeroPets();

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

// Smooth wheel input on desktop; touch, zoom and nested scrollers stay native.
const wheelPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let wheelFrame = 0;
let wheelPosition = 0;
let wheelTarget = 0;
let wheelLastTime = 0;
let wheelAppliedPosition = 0;

function stopWheelScroll() {
  cancelAnimationFrame(wheelFrame);
  wheelFrame = 0;
  wheelLastTime = 0;
  document.documentElement.classList.remove('is-wheel-scrolling');
}

function animateWheelScroll(time) {
  const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  wheelTarget = Math.max(0, Math.min(limit, wheelTarget));
  const elapsed = wheelLastTime ? Math.min(time - wheelLastTime, 48) : 16.67;
  wheelLastTime = time;
  wheelPosition += (wheelTarget - wheelPosition) * (1 - Math.exp(-elapsed / 90));
  const finished = Math.abs(wheelTarget - wheelPosition) < .5;
  if (finished) wheelPosition = wheelTarget;
  window.scrollTo({ top: wheelPosition, behavior: 'auto' });
  wheelAppliedPosition = window.scrollY;
  if (finished) stopWheelScroll();
  else wheelFrame = requestAnimationFrame(animateWheelScroll);
}

function hasNativeWheelTarget(event) {
  for (const node of event.composedPath()) {
    if (!(node instanceof Element) || node === document.body || node === document.documentElement) continue;
    if (node.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, .map-card, [data-native-scroll]')) return true;
    if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll|overlay/.test(getComputedStyle(node).overflowY)) return true;
  }
  return false;
}

window.addEventListener('wheel', event => {
  if (motionPreference.matches || !wheelPointer.matches || event.defaultPrevented || !event.cancelable ||
      event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) || document.querySelector('dialog[open]') || hasNativeWheelTarget(event)) {
    stopWheelScroll();
    return;
  }
  const lineHeight = parseFloat(getComputedStyle(document.body).lineHeight) || 18;
  const delta = event.deltaY * (event.deltaMode === 1 ? lineHeight : event.deltaMode === 2 ? window.innerHeight : 1);
  if (!wheelFrame) {
    wheelPosition = window.scrollY;
    wheelTarget = wheelPosition;
  } else if (Math.sign(delta) !== Math.sign(wheelTarget - wheelPosition)) {
    wheelTarget = wheelPosition;
  }
  const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const nextTarget = Math.max(0, Math.min(limit, wheelTarget + delta));
  if (!wheelFrame && Math.abs(nextTarget - wheelPosition) < .5) return;
  event.preventDefault();
  wheelTarget = nextTarget;
  document.documentElement.classList.add('is-wheel-scrolling');
  if (!wheelFrame) {
    wheelAppliedPosition = window.scrollY;
    wheelFrame = requestAnimationFrame(animateWheelScroll);
  }
}, { passive: false });

// Let links, keyboard input and the scrollbar interrupt wheel momentum.
window.addEventListener('pointerdown', stopWheelScroll, { passive: true, capture: true });
window.addEventListener('touchstart', stopWheelScroll, { passive: true, capture: true });
window.addEventListener('click', stopWheelScroll, { capture: true });
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) stopWheelScroll();
});
window.addEventListener('scroll', () => {
  if (wheelFrame && Math.abs(window.scrollY - wheelAppliedPosition) > 2) stopWheelScroll();
}, { passive: true });
window.addEventListener('resize', stopWheelScroll, { passive: true });
document.addEventListener('visibilitychange', stopWheelScroll);
motionPreference.addEventListener('change', stopWheelScroll);
wheelPointer.addEventListener('change', stopWheelScroll);

const revealElements = document.querySelectorAll('.section-heading, .service-card, .service-footnote, .about-art, .about-copy, .contact-copy, .map-card, .footer-main > *, .footer-bottom');
let revealObserver;
function setupScrollReveals() {
  revealObserver?.disconnect();
  revealElements.forEach(element => element.classList.remove('motion-reveal', 'is-visible'));
  if (motionPreference.matches || !('IntersectionObserver' in window)) return;

  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });

  revealElements.forEach(element => {
    // Content already on screen stays visible, including direct anchor visits.
    if (element.getBoundingClientRect().top < window.innerHeight - 24) return;
    const delay = element.classList.contains('service-card')
      ? Array.from(element.parentElement.children).indexOf(element) * 85 : 0;
    element.style.setProperty('--reveal-delay', `${delay}ms`);
    element.classList.add('motion-reveal');
    revealObserver.observe(element);
  });
}
motionPreference.addEventListener('change', setupScrollReveals);
setupScrollReveals();

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
  navigation.classList.remove('is-open');
}
menuButton.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? 'Закрыть меню' : 'Открыть меню');
  navigation.classList.toggle('is-open', opening);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

const services = {
  "haircut": {
    "title": "Стрижка и комплексный уход",
    "items": [
      [
        "Бишон-фризе",
        "2 000 ₽"
      ],
      [
        "Пудель",
        "2 000 ₽"
      ],
      [
        "Цвергшнауцер",
        "1 900 ₽"
      ],
      [
        "Спаниель",
        "2 500 ₽"
      ],
      [
        "Мальтипу",
        "1 800 ₽"
      ],
      [
        "Китайская хохлатая",
        "1 800 ₽"
      ],
      [
        "Ши-тцу",
        "2 000 ₽"
      ],
      [
        "Мальтийская болонка",
        "2 000 ₽"
      ],
      [
        "Шпиц · классика",
        "1 800 ₽"
      ],
      [
        "Йорк · классика",
        "1 800 ₽"
      ],
      [
        "Стрижка кошки",
        "1 500 ₽"
      ]
    ],
    "note": "Комплекс для собак: модельная стрижка, когти, двойная помывка, укладка, чистка ушей и параанальных желез. Для кошек: стрижка корпуса, когтей и чистка ушей."
  },
  "bath": {
    "title": "Гигиена и SPA",
    "items": [
      [
        "Пудель",
        "1 800 ₽"
      ],
      [
        "Мальтипу",
        "1 800 ₽"
      ],
      [
        "Китайская хохлатая",
        "1 600 ₽"
      ],
      [
        "Ши-тцу",
        "1 800 ₽"
      ],
      [
        "Мальтийская болонка",
        "1 600 ₽"
      ],
      [
        "Шпиц",
        "1 800 ₽"
      ],
      [
        "Йорк",
        "1 600 ₽"
      ],
      [
        "SPA-комплекс",
        "1 800 ₽"
      ]
    ],
    "note": "Гигиена с помывкой: уход за мордочкой, хвостом и лапами, когти, купание, укладка, чистка ушей и параанальных желез. SPA включает ванны, двойную помывку и маски."
  },
  "details": {
    "title": "Дополнительный уход",
    "items": [
      [
        "Вычёсывание колтунов · 1 час",
        "1 000 ₽"
      ],
      [
        "Санация ротовой полости",
        "1 500 ₽"
      ]
    ],
    "note": "Состав процедур и итоговую стоимость уточняйте при записи по телефону салона."
  }
};
const dialog = document.querySelector('#service-dialog');
document.querySelectorAll('[data-service]').forEach(button => {
  button.addEventListener('click', () => {
    const service = services[button.dataset.service];
    document.querySelector('#dialog-title').textContent = service.title;
    const content = document.querySelector('#dialog-content');
    const list = document.createElement('ul');
    service.items.forEach(item => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = item[0];
      const price = document.createElement('strong');
      price.textContent = item[1];
      row.append(label, price);
      list.append(row);
    });
    const note = document.createElement('p');
    note.textContent = service.note;
    content.replaceChildren(list, note);
    dialog.showModal();
  });
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
