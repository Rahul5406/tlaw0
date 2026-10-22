import { Modal } from './Modal.js';
import { Toast } from './Toast.js';
import { api } from '../api.js';

export class EvidenceViewerComponent {
  static async open(evidenceId) {
    try {
      const { evidence } = await api.getEvidenceItem(evidenceId);
      if (!evidence) {
        Toast.error('Evidence record could not be loaded.');
        return;
      }

      let viewerHtml = '';

      if (evidence.file_type === 'text') {
        const previewData = await api.previewEvidence(evidence.id, 'text');
        const lines = (previewData.content || '').split('\n');
        const formattedCode = lines.map((l, idx) => `<span style="color: var(--text-dim); user-select: none; margin-right: 12px; display: inline-block; width: 32px; text-align: right;">${idx + 1}</span>${escapeHtml(l)}`).join('\n');
        
        viewerHtml = `
          <div class="viewer-container">
            <div class="text-viewer-box"><code>${formattedCode}</code></div>
          </div>
        `;
      } else if (evidence.file_type === 'csv') {
        const previewData = await api.previewEvidence(evidence.id, 'text');
        const rows = parseCSV(previewData.content || '');
        if (rows.length > 0) {
          const headers = rows[0];
          const dataRows = rows.slice(1);
          viewerHtml = `
            <div class="viewer-container">
              <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim);">Records: ${dataRows.length} rows</span>
                <input type="text" id="csv-filter-input" placeholder="Search rows..." class="form-input" style="max-width: 250px; padding: 4px 10px; font-size: 0.8rem;" />
              </div>
              <div class="csv-table-wrapper">
                <table class="forensic-table" id="csv-preview-table">
                  <thead>
                    <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
                  </thead>
                  <tbody>
                    ${dataRows.map(r => `<tr>${r.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        } else {
          viewerHtml = '<div class="alert alert-info">CSV file is empty.</div>';
        }
      } else if (evidence.file_type === 'image') {
        viewerHtml = `
          <div class="viewer-container">
            <div class="media-viewer-box">
              <div class="media-overlay-stamp">CAM-04 CORRIDOR ARCH // 24-SEP-2026</div>
              <img src="/api/evidence/${evidence.id}/preview" alt="${escapeHtml(evidence.display_name)}" />
            </div>
          </div>
        `;
      } else if (evidence.file_type === 'pdf') {
        viewerHtml = `
          <div class="viewer-container">
            <iframe src="/api/evidence/${evidence.id}/preview" style="width: 100%; height: 500px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: #fff;" title="PDF Preview"></iframe>
          </div>
        `;
      } else if (evidence.file_type === 'video') {
        viewerHtml = `
          <div class="viewer-container">
            <div class="media-viewer-box">
              <video controls src="/api/evidence/${evidence.id}/preview"></video>
            </div>
          </div>
        `;
      } else if (evidence.file_type === 'audio') {
        viewerHtml = `
          <div class="viewer-container">
            <div style="background-color: #0b0608; padding: 32px 24px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); text-align: center;">
              <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--forensic-emerald); margin-bottom: 16px;">
                ACOUSTIC SENSOR SPECTRUM STREAM // ARCH-MIC-03
              </div>
              <audio controls src="/api/evidence/${evidence.id}/preview" style="width: 100%; max-width: 500px;"></audio>
            </div>
          </div>
        `;
      } else {
        viewerHtml = `
          <div class="alert alert-info">
            Direct browser preview is not available for this file type (${evidence.file_type}). Please download the artifact to analyze with external forensic utilities.
          </div>
        `;
      }

      // Metadata Header Block
      const fullContent = `
        <div>
          <div class="viewer-header-info">
            <div>
              <span class="evidence-code">${evidence.evidence_code}</span>
              <span class="badge badge-${evidence.classification === 'CRITICAL' ? 'critical' : 'secondary'}" style="margin-left: 8px;">${evidence.classification}</span>
              <span class="badge badge-emerald" style="margin-left: 4px;">${evidence.category}</span>
            </div>
            <div>
              <span style="color: var(--text-dim);">FILE:</span> ${escapeHtml(evidence.original_filename)} (${formatBytes(evidence.file_size)})
            </div>
          </div>

          <div style="margin: 12px 0 16px; font-size: 0.88rem; color: var(--text-muted); line-height: 1.5;">
            ${escapeHtml(evidence.description)}
          </div>

          ${evidence.hints ? `
            <div class="alert alert-warning" style="margin-bottom: 16px; font-size: 0.82rem;">
              <strong>INVESTIGATIVE LEAD:</strong> ${escapeHtml(evidence.hints)}
            </div>
          ` : ''}

          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: 4px;">SHA-256 CHECKSUM (CHAIN OF CUSTODY)</div>
            <div class="evidence-hash-snippet">${evidence.sha256_hash}</div>
          </div>

          ${viewerHtml}
        </div>
      `;

      const overlay = Modal.open({
        title: `EVIDENCE INSPECTOR // ${evidence.evidence_code}`,
        content: fullContent,
        isLarge: true,
        footerButtons: [
          {
            text: 'Download Raw Evidence',
            className: 'btn-primary',
            onClick: () => {
              window.location.href = `/api/evidence/${evidence.id}/download`;
            }
          },
          {
            text: 'Close',
            className: 'btn-secondary',
            onClick: (close) => close()
          }
        ]
      });

      // Attach client-side CSV table filter if CSV
      const filterInput = overlay.querySelector('#csv-filter-input');
      if (filterInput) {
        filterInput.addEventListener('input', (e) => {
          const val = e.target.value.toLowerCase();
          const table = overlay.querySelector('#csv-preview-table');
          const bodyRows = table.querySelectorAll('tbody tr');
          bodyRows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(val) ? '' : 'none';
          });
        });
      }
    } catch (err) {
      Toast.error('Could not open evidence inspector: ' + err.message);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.map(line => {
    const cells = [];
    let insideQuotes = false;
    let currentCell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    return cells;
  });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
