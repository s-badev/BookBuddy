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
