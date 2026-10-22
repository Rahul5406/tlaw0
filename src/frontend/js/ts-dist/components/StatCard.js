import { esc } from '../core/dom.js';
const TONE_ACCENT = {
    critical: 'border-l-blood-500 text-blood-500',
    warning: 'border-l-gold-500 text-gold-500',
    info: 'border-l-rose-400 text-rose-400',
    success: 'border-l-crimson-500 text-crimson-500',
};
const TONE_TEXT = {
    critical: 'text-blood-500',
    warning: 'text-gold-500',
    info: 'text-rose-400',
    success: 'text-crimson-500',
};
export const StatCard = {
    render(props) {
        const { label, value, unit, hint, linkHref, linkText } = props;
        const tone = props.tone ?? 'success';
        return `
      <div class="forensic-card stat-card border-l-[3px] ${TONE_ACCENT[tone]}">
        <div class="stat-label">${esc(label)}</div>
        <div class="stat-value">
          ${esc(value)}${unit ? ` <span class="stat-unit ${TONE_TEXT[tone]}">${esc(unit)}</span>` : ''}
        </div>
        ${hint ? `<div class="stat-hint">${esc(hint)}</div>` : ''}
        ${linkHref && linkText
            ? `<a href="${esc(linkHref)}" data-link class="stat-link ${TONE_TEXT[tone]} hover:underline">${esc(linkText)} &rarr;</a>`
            : ''}
      </div>`;
    },
    /** Render a grid of stat cards. */
    renderGrid(cards, extraClass = '') {
        const inner = cards.map((c) => StatCard.render(c)).join('\n');
        return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${extraClass}">${inner}</div>`;
    },
};
//# sourceMappingURL=StatCard.js.map