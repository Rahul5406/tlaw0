import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { EvidenceViewerComponent } from '../components/EvidenceViewer.js';

export class EvidenceVaultPage {
  static async render(container) {
    let evidenceList = [];
    let categories = [];
    let activeCategory = '';
    let searchTerm = '';

    async function loadData() {
      try {
        const res = await api.getEvidence({
          category: activeCategory || undefined,
          search: searchTerm || undefined
        });
        evidenceList = res.evidence || [];
        if (categories.length === 0) {
          categories = res.categories || [];
        }
      } catch (e) {
        Toast.error('Failed to load evidence catalog.');
      }
    }

    await loadData();

    function renderView() {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Vault Header -->
          <div class="evidence-vault-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
              <div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                  <span class="badge badge-emerald">CHAIN OF CUSTODY VERIFIED</span>
                  <span class="badge badge-confidential">CASE TLA-026 ARTIFACTS</span>
                </div>
                <h1 style="font-size: 2rem; font-weight: 800; color: var(--text-highlight); letter-spacing: 0.04em;">
                  DIGITAL EVIDENCE VAULT
                </h1>
                <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">
                  Encrypted repository of digital artifacts, access telemetry, forensic post-mortem, and firmware binaries.
                </p>
              </div>
              <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-dim); text-align: right;">
                ACTIVE ARTIFACTS: <strong style="color: var(--forensic-emerald);">${evidenceList.length}</strong>
              </div>
            </div>

            <!-- Search and Filter Bar -->
            <div class="vault-controls-bar">
              <div class="search-input-wrapper">
                <input type="text" id="vault-search-input" class="form-input" placeholder="Search by name, code (e.g. EVD-026-01), or description..." value="${escapeHtml(searchTerm)}" />
              </div>
              <div class="category-filter-chips">
                <button class="filter-chip ${activeCategory === '' ? 'active' : ''}" data-cat="">All Categories</button>
                ${categories.map(cat => `
                  <button class="filter-chip ${activeCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Evidence Grid -->
          ${evidenceList.length === 0 ? `
            <div class="alert alert-info" style="text-align: center; padding: 48px 24px;">
              No evidence artifacts found matching your filter criteria.
            </div>
          ` : `
            <div class="evidence-grid">
              ${evidenceList.map(item => `
                <div class="evidence-card" data-id="${item.id}">
                  <div class="evidence-card-top">
                    <span class="evidence-code">${item.evidence_code}</span>
                    <span class="badge badge-${item.classification === 'CRITICAL' ? 'critical' : 'secondary'}">${item.classification}</span>
                  </div>

                  <div class="evidence-card-body">
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <span class="badge badge-emerald" style="font-size: 0.68rem;">${item.category}</span>
                      <span class="badge badge-background" style="font-size: 0.68rem;">${item.file_type.toUpperCase()}</span>
                    </div>

                    <h3 class="evidence-title">${escapeHtml(item.display_name)}</h3>
                    <p class="evidence-desc">${escapeHtml(item.description)}</p>

                    <div class="evidence-meta-row">
                      <span>FILE: ${escapeHtml(item.original_filename)}</span>
                      <span>SIZE: ${formatBytes(item.file_size)}</span>
                      <span>VALUE: ${item.score_value} PTS</span>
                    </div>

                    <div>
                      <div style="font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: 2px;">SHA-256 HASH</div>
                      <div class="evidence-hash-snippet">${item.sha256_hash.substring(0, 24)}...</div>
                    </div>
                  </div>

                  <div class="evidence-card-actions">
                    <button class="btn btn-primary btn-sm inspect-evidence-btn" data-id="${item.id}">
                      <span>Inspect Artifact</span>
                    </button>
                    <a href="/api/evidence/${item.id}/download" class="btn btn-secondary btn-sm" download>
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      // Attach Search Listener
      const searchInput = container.querySelector('#vault-search-input');
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
          searchTerm = e.target.value.trim();
          await loadData();
          renderView();
        }, 300);
      });

      // Attach Filter Chip Listeners
      container.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', async (e) => {
          activeCategory = e.target.dataset.cat;
          await loadData();
          renderView();
        });
      });

      // Attach Inspect Listeners
      container.querySelectorAll('.inspect-evidence-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          EvidenceViewerComponent.open(id);
        });
      });
    }

    renderView();
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
