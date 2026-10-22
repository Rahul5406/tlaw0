/**
 * Typed DOM helpers.
 *
 * Thin, framework-free utilities that make building UI components in
 * TypeScript ergonomic while staying compatible with the existing vanilla
 * JS app (which mounts components into the same #app container).
 */
/**
 * Escape a value for safe interpolation into an HTML template string.
 */
export function esc(value) {
    if (value === null || value === undefined)
        return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/**
 * Query a single element and throw if it is missing. Catches mount-point
 * bugs at runtime instead of silently doing nothing.
 */
export function mustQuery(root, selector) {
    const el = root.querySelector(selector);
    if (!el) {
        throw new Error(`[TLA-026] Expected element not found: ${selector}`);
    }
    return el;
}
/**
 * Attach a click handler to every matching element, with type-safe event.
 */
export function onClickAll(root, selector, handler) {
    const nodes = Array.from(root.querySelectorAll(selector));
    nodes.forEach((el) => {
        el.addEventListener('click', (e) => handler(el, e));
    });
    return nodes.length;
}
/**
 * Debounce any function — used for search inputs and autosave hooks.
 */
export function debounce(fn, wait = 300) {
    let timer;
    return (...args) => {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}
//# sourceMappingURL=dom.js.map