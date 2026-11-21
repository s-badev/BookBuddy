// Shared motion helpers. Durations, easing and colours come from the CSS tokens
// in styles/style.css; reduced motion always means "show the final state now".
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function motionToken(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function motionMs(name, fallback) {
    return parseFloat(motionToken(name)) || fallback;
}

/* ---------- Kinetic title ---------- */
// Words longer than this would overflow on phones once split into letters,
// so such titles stay as plain text.
const KINETIC_MAX_WORD = 14;

/**
 * Renders a heading letter by letter. Screen readers get the whole text
 * (aria-label plus a visually hidden copy); the letters are aria-hidden.
 * The animation runs only when the text changes.
 */
function setKineticText(element, text) {
    if (!element || element.dataset.kineticText === text) return;
    element.dataset.kineticText = text;
    const words = text.split(/\s+/).filter(Boolean);

    if (reducedMotion.matches || words.some(word => [...word].length > KINETIC_MAX_WORD)) {
        element.classList.remove('kinetic');
        element.removeAttribute('aria-label');
        element.textContent = text;
        return;
    }

    const fragment = document.createDocumentFragment();
    const spoken = document.createElement('span');
    spoken.className = 'visually-hidden';
    spoken.textContent = text;
    fragment.append(spoken);

    let index = 0;
    words.forEach((word, position) => {
        if (position) {
            const space = document.createElement('span');
            space.setAttribute('aria-hidden', 'true');
            space.textContent = ' ';
            fragment.append(space);
        }
        const wordElement = document.createElement('span');
        wordElement.className = 'kinetic__word';
        wordElement.setAttribute('aria-hidden', 'true');
        for (const letter of word) {
            const letterElement = document.createElement('span');
            letterElement.className = 'kinetic__ch';
            letterElement.style.setProperty('--i', index++);
            letterElement.textContent = letter;
            wordElement.append(letterElement);
        }
        fragment.append(wordElement);
    });

    element.classList.add('kinetic');
    element.setAttribute('aria-label', text);
    element.replaceChildren(fragment);
}

/* ---------- Finish stamp ---------- */
/**
 * Shows the "Прочетено" stamp inside `host` (which must be positioned),
 * holds it for four --dur-slow, then lets it fade out. With reduced motion
 * it appears at once and is removed without a fade.
 */
function playFinishStamp(host, variant, startDelay = 0) {
    if (!host) return;
    host.querySelector(':scope > .finish-stamp')?.remove();
    const stamp = document.createElement('span');
    stamp.className = 'finish-stamp finish-stamp--' + variant;
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = 'Прочетено';
    if (startDelay && !reducedMotion.matches) stamp.style.animationDelay = startDelay + 'ms';
    host.append(stamp);

    setTimeout(() => {
        if (!stamp.isConnected) return;
        if (reducedMotion.matches) {
            stamp.remove();
            return;
        }
        stamp.classList.add('is-leaving');
        Promise.all(stamp.getAnimations().map(animation => animation.finished))
            .catch(() => {})
            .finally(() => stamp.remove());
    }, startDelay + motionMs('--dur-slow', 480) * 4);
}

/* ---------- Count-up numbers ---------- */
// Easing function for a cubic-bezier() token, so JS motion follows the CSS curve.
function motionEasing(name) {
    const match = motionToken(name).match(/cubic-bezier\(([^)]+)\)/);
    const [x1, y1, x2, y2] = match ? match[1].split(',').map(Number) : [0.2, 0.7, 0.2, 1];
    const curve = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return progress => {
        if (progress <= 0) return 0;
        if (progress >= 1) return 1;
        let low = 0;
        let high = 1;
        let t = progress;
        for (let i = 0; i < 24; i++) {
            t = (low + high) / 2;
            if (curve(t, x1, x2) < progress) low = t;
            else high = t;
        }
        return curve(t, y1, y2);
    };
}

const countStates = new Map();
let countObserver = null;

/**
 * Shows `value` in `element` (needs an id). The first time the element
 * becomes visible the number counts up from 0; later updates are instant.
 * The final value is always in the accessible text, and the animated digits
 * keep the final width so nothing around them moves.
 */
function setCountUp(element, value, format = String) {
    if (!element) return;
    const state = countStates.get(element.id) || { done: false };
    countStates.set(element.id, state);
    if (state.element && state.element !== element) countObserver?.unobserve(state.element);
    Object.assign(state, { element, value, format });
    const finalText = format(value);

    if (state.done || reducedMotion.matches || !('IntersectionObserver' in window)) {
        state.done = true;
        element.textContent = finalText;
        return;
    }
    if (!value) {
        // Nothing to count yet; a later non-zero value may still count up once.
        element.textContent = finalText;
        countObserver?.unobserve(element);
        return;
    }

    const visual = document.createElement('span');
    visual.className = 'count';
    visual.setAttribute('aria-hidden', 'true');
    visual.textContent = finalText;
    const spoken = document.createElement('span');
    spoken.className = 'visually-hidden';
    spoken.textContent = finalText;
    element.replaceChildren(visual, spoken);
    visual.style.minWidth = visual.getBoundingClientRect().width + 'px';
    visual.textContent = format(0);
    state.visual = visual;

    countObserver ??= new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            countObserver.unobserve(entry.target);
            const current = countStates.get(entry.target.id);
            if (current && current.element === entry.target && !current.done) {
                current.done = true;
                runCountUp(current);
            }
        }
    }, { threshold: 0.6 });
    countObserver.observe(element);
}

function runCountUp({ element, visual, value, format }) {
    const slow = motionMs('--dur-slow', 480);
    // Between one and two --dur-slow; bigger numbers take a little longer.
    const duration = slow * (1 + Math.min(1, Math.log10(value + 1) / 4));
    const ease = motionEasing('--ease-out');
    const startTime = performance.now();
    const step = now => {
        if (!visual.isConnected) return;
        const progress = Math.min(1, (now - startTime) / duration);
        visual.textContent = format(Math.round(value * ease(progress)));
        if (progress < 1) requestAnimationFrame(step);
        else element.textContent = format(value);
    };
    requestAnimationFrame(step);
}
