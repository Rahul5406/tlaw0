import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';

export class FinalReportPage {
  static async render(container) {
    let templates = [];
    let draft = {};
    let submission = null;
    let autosaveTimer = null;
    let lastSavedAt = null;

    try {
      const [tplRes, draftRes, subRes] = await Promise.all([
        api.getReportTemplate(),
        api.getReportDraft().catch(() => ({ draft: {} })),
        api.getMySubmission().catch(() => ({ submission: null }))
      ]);

      templates = tplRes.sections || [];
      draft = draftRes.draft || {};
      lastSavedAt = draftRes.last_saved_at;
      submission = subRes.submission || null;
    } catch (e) {
      Toast.error('Failed to load report templates: ' + e.message);
    }

    const isSubmitted = submission && submission.status !== 'returned_for_revision';

    container.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Report Header Banner -->
        <div class="report-header-banner">
          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              <span class="badge badge-critical">OFFICIAL DELIVERABLE</span>
              <span class="badge badge-emerald">CASE TLA-026</span>
              <span class="badge badge-${isSubmitted ? 'emerald' : 'secondary'}">
                STATUS: ${isSubmitted ? submission.status.toUpperCase() : 'DRAFT IN PROGRESS'}
              </span>
            </div>
            <h1 style="font-size: 1.8rem; font-weight: 800; color: var(--text-highlight);">
              FORENSIC INCIDENT INVESTIGATION REPORT
            </h1>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
              Standardized 11-Section Digital Forensics Submission • CyRA Examination Protocol
            </p>
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="btn btn-secondary btn-sm" id="print-report-btn">
                <span>🖨 Export / Print PDF Dossier</span>
              </button>
              ${!isSubmitted ? `
                <button class="btn btn-primary btn-sm" id="submit-report-btn">
                  <span>Submit Final Report &rarr;</span>
                </button>
              ` : `
                <span class="badge badge-emerald" style="padding: 6px 12px;">
                  SUBMITTED: ${submission.report_code}
                </span>
              `}
            </div>

            <div id="report-autosave-indicator" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--forensic-emerald);">
              ${lastSavedAt ? `Database Draft Synced: ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Autosave active (every change saved)'}
            </div>
          </div>
        </div>

        <!-- Evaluation Results if graded -->
        ${submission && submission.evaluated_score !== null && submission.evaluated_score !== undefined ? `
          <div class="forensic-card" style="border-left: 4px solid var(--forensic-emerald); background-color: rgba(225, 29, 72, 0.05);">
            <div class="forensic-card-header">
              <span class="card-title">OFFICIAL EVALUATION & MARKS</span>
              <span class="badge badge-emerald">GRADED: ${submission.evaluated_score} / 100 PTS</span>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px;">
              <strong>Evaluator Feedback:</strong> ${escapeHtml(submission.feedback || 'Investigation report verified by CyRA Evaluation Committee.')}
            </div>
          </div>
        ` : ''}

        <!-- 11 Sections Form -->
        <form id="final-report-form">
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${templates.map(tpl => {
              const currentText = isSubmitted && submission.content ? (submission.content[tpl.section_key] || '') : (draft[tpl.section_key] || '');
              const wordCount = countWords(currentText);
              const isValid = (!tpl.min_words || wordCount >= tpl.min_words) && (!tpl.is_mandatory || wordCount > 0);

              return `
                <div class="report-section-card" data-key="${tpl.section_key}">
                  <div class="section-card-header">
                    <div>
                      <h3 class="section-title">${escapeHtml(tpl.title)}</h3>
                      <div style="font-size: 0.75rem; color: var(--forensic-cyan); font-family: var(--font-mono); margin-top: 2px;">
                        Max Score: ${tpl.max_score} Pts • ${tpl.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}
                      </div>
                    </div>
                    ${tpl.is_mandatory ? `<span class="badge badge-critical">REQUIRED</span>` : `<span class="badge badge-secondary">OPTIONAL</span>`}
                  </div>

                  <div class="section-instructions">
                    ${escapeHtml(tpl.instructions)}
                  </div>

                  <div class="form-group">
                    <textarea
                      class="form-textarea report-section-input"
                      data-key="${tpl.section_key}"
                      data-min="${tpl.min_words}"
                      data-mand="${tpl.is_mandatory}"
                      rows="6"
                      placeholder="Compile forensic narrative for this section..."
                      ${isSubmitted ? 'readonly style="background-color: var(--bg-surface); opacity: 0.9;"' : ''}
                    >${escapeHtml(currentText)}</textarea>

                    <div class="word-count-meter ${isValid ? 'valid' : 'invalid'}" id="meter-${tpl.section_key}">
                      <span>Words: <strong class="word-counter">${wordCount}</strong> / Min required: ${tpl.min_words} (Max: ${tpl.max_words})</span>
                      <span class="meter-status">${isValid ? '✓ Minimum requirement satisfied' : '⚠ Below minimum word limit'}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${!isSubmitted ? `
            <div style="margin-top: 24px; padding: 20px; background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div>
                <div style="font-weight: 700; color: var(--text-highlight);">Ready to seal and submit investigation?</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Submission will halt the investigation timer and seal your report for evaluator grading.
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-lg">
                <span>Finalize & Submit Forensic Dossier</span>
              </button>
            </div>
          ` : ''}
        </form>

        <!-- Hidden printable dossier container rendered for window.print() -->
        <div id="printable-dossier-outlet" class="official-dossier-view" style="display: none;"></div>
      </div>
    `;

    // Real-time word count meters & draft autosaving
    const form = container.querySelector('#final-report-form');
    const textareas = container.querySelectorAll('.report-section-input');
    const indicator = container.querySelector('#report-autosave-indicator');

    if (!isSubmitted) {
      textareas.forEach(ta => {
        ta.addEventListener('input', (e) => {
          const key = e.target.dataset.key;
          const min = parseInt(e.target.dataset.min, 10);
          const mand = e.target.dataset.mand === '1';
          const text = e.target.value;
          const words = countWords(text);

          const meter = container.querySelector(`#meter-${key}`);
          if (meter) {
            const counter = meter.querySelector('.word-counter');
            const status = meter.querySelector('.meter-status');
            counter.textContent = words;
            const valid = (!min || words >= min) && (!mand || words > 0);
            meter.className = `word-count-meter ${valid ? 'valid' : 'invalid'}`;
            status.textContent = valid ? '✓ Minimum requirement satisfied' : '⚠ Below minimum word limit';
          }

          // Trigger debounced autosave
          draft[key] = text;
          clearTimeout(autosaveTimer);
          autosaveTimer = setTimeout(async () => {
            if (indicator) indicator.textContent = 'Saving draft to database...';
            try {
              await api.autosaveReportDraft(draft);
              if (indicator) indicator.textContent = `Database Draft Synced: ${new Date().toLocaleTimeString()}`;
            } catch (err) {
              if (indicator) indicator.textContent = 'Autosave failed. Check connection.';
            }
          }, 800);
        });

        ta.addEventListener('blur', async () => {
          if (autosaveTimer) {
            clearTimeout(autosaveTimer);
            autosaveTimer = null;
            if (indicator) indicator.textContent = 'Saving draft to database...';
            try {
              await api.autosaveReportDraft(draft);
              if (indicator) indicator.textContent = `Database Draft Synced: ${new Date().toLocaleTimeString()}`;
            } catch (err) {
              if (indicator) indicator.textContent = 'Autosave failed. Check connection.';
            }
          }
        });
      });
    }

    // Submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitted) return;

      // Extract all section texts
      const content = {};
      const validationErrors = [];

      templates.forEach(tpl => {
        const ta = container.querySelector(`.report-section-input[data-key="${tpl.section_key}"]`);
        const text = ta ? ta.value.trim() : '';
        const words = countWords(text);
        content[tpl.section_key] = text;

        if (tpl.is_mandatory && (!text || words === 0)) {
          validationErrors.push(`"${tpl.title}" is mandatory.`);
        } else if (tpl.min_words > 0 && words < tpl.min_words) {
          validationErrors.push(`"${tpl.title}" needs at least ${tpl.min_words} words (currently ${words}).`);
        }
      });

      if (validationErrors.length > 0) {
        Modal.open({
          title: 'SUBMISSION VALIDATION ERRORS',
          content: `
            <div class="alert alert-danger" style="margin-bottom: 12px;">
              Please complete all mandatory sections before official submission:
            </div>
            <ul style="padding-left: 20px; font-size: 0.88rem; color: var(--text-main); display: flex; flex-direction: column; gap: 6px;">
              ${validationErrors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
            </ul>
          `
        });
        return;
      }

      const confirmed = await Modal.confirm({
        title: 'CONFIRM FINAL REPORT TRANSMISSION',
        message: 'Are you sure you want to officially seal and submit this forensic report? Once transmitted, the report is locked for evaluation and your team session status will be marked as SUBMITTED.',
        confirmText: 'Submit Official Report',
        cancelText: 'Return to Editing',
        isDanger: false
      });

      if (confirmed) {
        try {
          const res = await api.submitFinalReport(content);
          Toast.success(res.message);
          // Reload page to display submitted status
          FinalReportPage.render(container);
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });

    // Printable Dossier Handler
    const printBtn = container.querySelector('#print-report-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const outlet = container.querySelector('#printable-dossier-outlet');
        const reportContent = isSubmitted && submission.content ? submission.content : draft;
        const user = window.appInstance ? window.appInstance.user : null;

        outlet.innerHTML = `
          <div class="dossier-header">
            <div class="dossier-classification-stamp">OFFICIAL FORENSIC INCIDENT DOSSIER</div>
            <div class="dossier-title">CENTRAL DIGITAL FORENSICS INVESTIGATION REPORT</div>
            <div style="font-family: var(--font-sans); font-size: 0.9rem; color: #4b5563;">
              CyRA Community • Sree Sakthi Engineering College • Forensic Division
            </div>
          </div>

          <table class="dossier-meta-table">
            <tr>
              <td><strong>CASE IDENTIFIER:</strong> TLA-026</td>
              <td><strong>DATE OF INCIDENT:</strong> 24 September 2026</td>
            </tr>
            <tr>
              <td><strong>PROJECT CODENAME:</strong> PROJECT AETHER</td>
              <td><strong>INCIDENT LOCATION:</strong> ARCH Research Lab 3</td>
            </tr>
            <tr>
              <td><strong>VICTIM:</strong> Prof. Alok Mathur (54)</td>
              <td><strong>REPORT REF:</strong> ${submission ? submission.report_code : 'DRAFT-TLA-026'}</td>
            </tr>
            <tr>
              <td><strong>INVESTIGATOR:</strong> ${user ? escapeHtml(user.full_name) : 'Agent Dhruv Saxena'}</td>
              <td><strong>TEAM ASSIGNMENT:</strong> ${user && user.team_name ? escapeHtml(user.team_name) : 'CipherTrack Alpha'}</td>
            </tr>
          </table>

          ${templates.map(tpl => `
            <div class="dossier-section">
              <div class="dossier-section-title">${escapeHtml(tpl.title)}</div>
              <div class="dossier-section-content">${escapeHtml(reportContent[tpl.section_key] || '[No findings recorded]')}</div>
            </div>
          `).join('')}

          <div class="dossier-signature-block">
            <div>
              <div>_______________________________</div>
              <div style="margin-top: 4px; font-weight: 700;">Lead Forensics Investigator</div>
              <div style="font-size: 0.75rem; color: #6b7280;">CyRA Certification Seal Affixed</div>
            </div>
            <div style="text-align: right;">
              <div>_______________________________</div>
              <div style="margin-top: 4px; font-weight: 700;">Chief Evaluating Officer</div>
              <div style="font-size: 0.75rem; color: #6b7280;">Chain-of-Custody Cryptographic Signature</div>
            </div>
          </div>
        `;

        outlet.style.display = 'block';
        window.print();
        setTimeout(() => {
          outlet.style.display = 'none';
        }, 1000);
      });
    }
  }
}

function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
