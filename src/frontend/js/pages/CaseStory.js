import { api } from '../api.js';
import { Toast } from '../components/Toast.js';

export class CaseStoryPage {
  static async render(container) {
    let sections = [];
    try {
      const res = await api.getCaseStory();
      sections = res.sections || [];
    } catch (e) {
      Toast.error('Failed to load case briefing narrative.');
    }

    container.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Incident Case Header -->
        <div class="forensic-card" style="border-left: 4px solid var(--forensic-red);">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <span class="badge badge-critical">CONFIDENTIAL DOSSIER</span>
            <span class="badge badge-emerald">INCIDENT: 24-SEP-2026</span>
            <span class="badge badge-secondary">LOCATION: ARCH LAB 3</span>
          </div>
          <h1 style="font-size: 2rem; font-weight: 800; color: var(--text-highlight); letter-spacing: 0.04em;">
            CASE BRIEFING: THE LAST ARTIFACT (TLA-026)
          </h1>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">
            Primary Investigator Briefing • Project Aether Breach • Medical Examiner Report Pending
          </p>
        </div>

        <!-- Story Sections from Database -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          ${sections.map((sec, idx) => `
            <div class="forensic-card">
              <div class="forensic-card-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                    <span style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 700; color: var(--forensic-emerald);">
                      DOSSIER SECTION 0${idx + 1}
                    </span>
                    <span class="badge badge-confidential">${sec.badge || 'CONFIDENTIAL'}</span>
                  </div>
                  <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-highlight);">
                    ${escapeHtml(sec.title)}
                  </h2>
                  ${sec.subtitle ? `<div style="font-size: 0.85rem; color: var(--forensic-teal); font-family: var(--font-mono); margin-top: 2px;">${escapeHtml(sec.subtitle)}</div>` : ''}
                </div>
              </div>
              <div style="font-size: 0.95rem; color: var(--text-main); line-height: 1.7; white-space: pre-wrap;">
                ${escapeHtml(sec.content)}
              </div>
              ${sec.attachments && sec.attachments.length > 0 ? `
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border-subtle);">
                  <div style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; color: var(--forensic-emerald); margin-bottom: 8px; text-transform: uppercase;">
                    ATTACHED FORENSIC EVIDENCE (${sec.attachments.length})
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${sec.attachments.map(att => `
                      <a href="/api/evidence/${att.evidence_id || att.id}/download" target="_blank" class="badge badge-secondary" style="font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; color: var(--text-highlight);" title="Download: ${escapeHtml(att.original_filename)} | SHA-256: ${att.sha256_hash}">
                        <span>📎</span>
                        <span style="font-weight: 600;">${escapeHtml(att.original_filename)}</span>
                        <span style="opacity: 0.7; font-size: 0.72rem;">(${formatBytes(att.file_size)})</span>
                      </a>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Quick Links Action Bar -->
        <div class="forensic-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="font-weight: 700; color: var(--text-highlight);">Ready to examine raw evidence?</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">Access card logs, network PCAP, memory dumps, surveillance stills, and audio intercepts.</div>
          </div>
          <div style="display: flex; gap: 12px;">
            <a href="/vault" data-link class="btn btn-primary">Open Evidence Vault &rarr;</a>
            <a href="/workspace" data-link class="btn btn-secondary">Suspect Interrogation &rarr;</a>
          </div>
        </div>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

