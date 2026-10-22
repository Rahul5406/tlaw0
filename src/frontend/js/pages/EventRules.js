import { api } from '../api.js';
import { Toast } from '../components/Toast.js';

export class EventRulesPage {
  static async render(container) {
    let rules = [];
    let isAcknowledged = false;

    try {
      const [rulesRes, sessionRes] = await Promise.all([
        api.getEventRules(),
        api.getCaseSession().catch(() => ({ session: null }))
      ]);
      rules = rulesRes.rules || [];
      if (sessionRes.session) {
        isAcknowledged = !!sessionRes.session.rules_acknowledged;
      }
    } catch (e) {
      Toast.error('Could not load official event rules.');
    }

    container.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <div class="forensic-card" style="border-left: 4px solid var(--forensic-emerald);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span class="badge badge-emerald">OFFICIAL OPERATIONAL DIRECTIVE</span>
                <span class="badge badge-confidential">CASE TLA-026</span>
              </div>
              <h1 style="font-size: 1.8rem; font-weight: 800; color: var(--text-highlight);">
                EVENT RULES & FORENSIC PROTOCOL
              </h1>
              <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">
                All investigators are mandated to review and acknowledge the terms of investigation before initiating timer countdown.
              </p>
            </div>
            ${isAcknowledged ? `
              <div class="badge badge-emerald" style="padding: 6px 12px; font-size: 0.8rem;">
                ✓ RULES ACKNOWLEDGED BY TEAM
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Rules Accordion / Cards List -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${rules.map((rule, idx) => `
            <div class="forensic-card">
              <div class="forensic-card-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: var(--forensic-emerald);">
                    SECTION ${idx + 1}
                  </span>
                  <span class="card-title">${escapeHtml(rule.title)}</span>
                </div>
              </div>
              <div style="font-size: 0.92rem; color: var(--text-main); line-height: 1.7; white-space: pre-wrap;">${escapeHtml(rule.content)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Acknowledgement Bar -->
        <div class="forensic-card" style="background-color: var(--bg-surface-elevated); border-color: var(--border-strong);">
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="rules-ack-checkbox" ${isAcknowledged ? 'checked disabled' : ''} style="margin-top: 4px; width: 18px; height: 18px; accent-color: var(--forensic-emerald);" />
              <span style="font-size: 0.92rem; color: var(--text-highlight); line-height: 1.5;">
                I hereby declare that our team has comprehensively reviewed the official CyRA digital forensics rules, agree to maintain chain of custody on all extracted evidence, and will not engage in unauthorized collusion.
              </span>
            </label>

            <div style="display: flex; justify-content: flex-end; gap: 12px; align-items: center;">
              ${!isAcknowledged ? `
                <button class="btn btn-primary btn-lg" id="confirm-ack-btn">
                  <span>Acknowledge & Proceed to Dashboard &rarr;</span>
                </button>
              ` : `
                <a href="/dashboard" data-link class="btn btn-primary btn-lg">
                  <span>Proceed to Investigation Dashboard &rarr;</span>
                </a>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    const ackCheckbox = container.querySelector('#rules-ack-checkbox');
    const ackBtn = container.querySelector('#confirm-ack-btn');

    if (ackBtn) {
      ackBtn.addEventListener('click', async () => {
        if (!ackCheckbox.checked) {
          Toast.warning('Please check the acknowledgement checkbox before proceeding.');
          return;
        }

        try {
          await api.acknowledgeRules();
          Toast.success('Investigation protocol confirmed and logged in CyRA registry.');
          if (window.appInstance) {
            window.appInstance.navigate('/dashboard');
          }
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
