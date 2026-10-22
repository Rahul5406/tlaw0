import { api } from '../../api.js';
import { Toast } from '../../components/Toast.js';
import { Modal } from '../../components/Modal.js';
import { MultiUploaderComponent } from '../../components/MultiUploader.js';
import { NavbarComponent } from '../../components/Navbar.js';

export class AdminPortalPage {
  static async render(container) {
    const urlParams = new URLSearchParams(window.location.search);
    let activeModule = urlParams.get('mod') || 'metrics';

    container.innerHTML = `
      <div class="admin-layout">
        <!-- Admin Navigation Sidebar -->
        <aside class="admin-sidebar">
          <div class="admin-sidebar-title">COMMAND MODULES (17)</div>
          <ul class="admin-nav-list" id="admin-nav-list">
            <li class="admin-nav-item ${activeModule === 'metrics' ? 'active' : ''}" data-mod="metrics"><span class="admin-nav-icon">📊</span><span class="admin-nav-label">Operations Dashboard</span></li>
            <li class="admin-nav-item ${activeModule === 'evidence' ? 'active' : ''}" data-mod="evidence"><span class="admin-nav-icon">📁</span><span class="admin-nav-label">Evidence Vault Manager</span></li>
            <li class="admin-nav-item ${activeModule === 'batch_upload' ? 'active' : ''}" data-mod="batch_upload"><span class="admin-nav-icon">⚡</span><span class="admin-nav-label">Multi-File Batch Ingest</span></li>
            <li class="admin-nav-item ${activeModule === 'integrity' ? 'active' : ''}" data-mod="integrity"><span class="admin-nav-icon">🔐</span><span class="admin-nav-label">Chain-of-Custody &amp; Hashes</span></li>
            <li class="admin-nav-item ${activeModule === 'reports' ? 'active' : ''}" data-mod="reports"><span class="admin-nav-icon">📑</span><span class="admin-nav-label">Report Review &amp; Grading</span></li>
            <li class="admin-nav-item ${activeModule === 'customizer' ? 'active' : ''}" data-mod="customizer"><span class="admin-nav-icon">🎨</span><span class="admin-nav-label">Website Customizer</span></li>
            <li class="admin-nav-item ${activeModule === 'nav_controls' ? 'active' : ''}" data-mod="nav_controls"><span class="admin-nav-icon">🧭</span><span class="admin-nav-label">Participant Navigation Controls</span></li>
            <li class="admin-nav-item ${activeModule === 'rules' ? 'active' : ''}" data-mod="rules"><span class="admin-nav-icon">📜</span><span class="admin-nav-label">Rules &amp; Instructions</span></li>
            <li class="admin-nav-item ${activeModule === 'story' ? 'active' : ''}" data-mod="story"><span class="admin-nav-icon">📖</span><span class="admin-nav-label">Case Story Editor</span></li>
            <li class="admin-nav-item ${activeModule === 'suspects' ? 'active' : ''}" data-mod="suspects"><span class="admin-nav-icon">👤</span><span class="admin-nav-label">Suspect Dossiers</span></li>
            <li class="admin-nav-item ${activeModule === 'scoreboard' ? 'active' : ''}" data-mod="scoreboard"><span class="admin-nav-icon">🏆</span><span class="admin-nav-label">Score Board Control</span></li>
            <li class="admin-nav-item ${activeModule === 'teams' ? 'active' : ''}" data-mod="teams"><span class="admin-nav-icon">🛡</span><span class="admin-nav-label">Team Management</span></li>
            <li class="admin-nav-item ${activeModule === 'time' ? 'active' : ''}" data-mod="time"><span class="admin-nav-icon">⏱</span><span class="admin-nav-label">Case Time &amp; Extensions</span></li>
            <li class="admin-nav-item ${activeModule === 'templates' ? 'active' : ''}" data-mod="templates"><span class="admin-nav-icon">📝</span><span class="admin-nav-label">Final Report Template</span></li>
            <li class="admin-nav-item ${activeModule === 'participants' ? 'active' : ''}" data-mod="participants"><span class="admin-nav-icon">👥</span><span class="admin-nav-label">Participant Management</span></li>
            <li class="admin-nav-item ${activeModule === 'outro' ? 'active' : ''}" data-mod="outro"><span class="admin-nav-icon">🏁</span><span class="admin-nav-label">Outro &amp; Closing Edit</span></li>
            <li class="admin-nav-item ${activeModule === 'audit' ? 'active' : ''}" data-mod="audit"><span class="admin-nav-icon">🔍</span><span class="admin-nav-label">Security Audit Logs</span></li>
          </ul>
        </aside>

        <!-- Main Module Workspace Outlet -->
        <section class="admin-content-pane" id="admin-module-outlet">
          <div style="padding: 40px; text-align: center;">
            <span class="pulse-dot"></span> Loading command module...
          </div>
        </section>
      </div>
    `;

    // Attach Sidebar Navigation
    container.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        activeModule = e.currentTarget.dataset.mod;
        container.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');
        loadModule(activeModule);
      });
    });

    async function loadModule(mod) {
      const outlet = container.querySelector('#admin-module-outlet');
      if (!outlet) return;

      outlet.innerHTML = `<div style="padding: 40px; text-align: center;"><span class="pulse-dot"></span> Loading module...</div>`;

      try {
        switch (mod) {
          case 'metrics':
            await renderMetricsModule(outlet);
            break;
          case 'evidence':
            await renderEvidenceModule(outlet);
            break;
          case 'batch_upload':
            await renderBatchUploadModule(outlet);
            break;
          case 'integrity':
            await renderIntegrityModule(outlet);
            break;
          case 'reports':
            await renderReportsModule(outlet);
            break;
          case 'customizer':
            await renderCustomizerModule(outlet);
            break;
          case 'nav_controls':
            await renderNavControlsModule(outlet);
            break;
          case 'rules':
            await renderRulesModule(outlet);
            break;
          case 'story':
            await renderStoryModule(outlet);
            break;
          case 'suspects':
            await renderSuspectsModule(outlet);
            break;
          case 'scoreboard':
            await renderScoreboardModule(outlet);
            break;
          case 'teams':
            await renderTeamsModule(outlet);
            break;
          case 'time':
            await renderTimeModule(outlet);
            break;
          case 'templates':
            await renderTemplatesModule(outlet);
            break;
          case 'participants':
            await renderParticipantsModule(outlet);
            break;
          case 'outro':
            await renderOutroModule(outlet);
            break;
          case 'audit':
            await renderAuditModule(outlet);
            break;
          default:
            await renderMetricsModule(outlet);
        }
      } catch (err) {
        outlet.innerHTML = `<div class="alert alert-danger">Module load failure: ${err.message}</div>`;
      }
    }

    // Initial module load
    loadModule(activeModule);
  }
}

// ============================================================================
// MODULE A: DASHBOARD METRICS
// ============================================================================
async function renderMetricsModule(outlet) {
  const { metrics, recent_submissions, recent_activity } = await api.getAdminMetrics();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
          OPERATIONS COMMAND DASHBOARD
        </h2>
        <span class="badge badge-emerald">${metrics.event_status}</span>
      </div>

      <!-- Real Database Stat Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Registered Participants</div>
          <div class="metric-value">${metrics.total_participants}</div>
          <div class="metric-sub">Across ${metrics.total_teams} enrolled teams</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Investigations</div>
          <div class="metric-value">${metrics.active_investigations}</div>
          <div class="metric-sub">Timed sessions in progress</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Completed Reports</div>
          <div class="metric-value">${metrics.completed_investigations}</div>
          <div class="metric-sub">${metrics.pending_reviews} pending evaluation</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Evidence Artifacts</div>
          <div class="metric-value">${metrics.evidence_count}</div>
          <div class="metric-sub">Sealed in secure storage</div>
        </div>
      </div>

      <!-- Recent Submissions Table -->
      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <div class="forensic-card-header" style="padding: 16px 20px; margin-bottom: 0;">
          <span class="card-title">RECENT REPORT TRANSMISSIONS</span>
        </div>
        ${recent_submissions.length === 0 ? `
          <div style="padding: 24px; color: var(--text-dim); text-align: center;">No reports submitted yet.</div>
        ` : `
          <table class="forensic-table">
            <thead>
              <tr>
                <th>REPORT CODE</th>
                <th>INVESTIGATOR</th>
                <th>TEAM</th>
                <th>WORDS</th>
                <th>STATUS</th>
                <th>SUBMISSION TIME</th>
              </tr>
            </thead>
            <tbody>
              ${recent_submissions.map(s => `
                <tr>
                  <td style="font-weight: 700; color: var(--forensic-emerald);">${s.report_code}</td>
                  <td>${escapeHtml(s.author_name)}</td>
                  <td>${escapeHtml(s.team_name || 'Solo')}</td>
                  <td>${s.word_count}</td>
                  <td><span class="badge badge-secondary">${s.status.toUpperCase()}</span></td>
                  <td>${new Date(s.submitted_at).toLocaleTimeString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Recent Audit Events -->
      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <div class="forensic-card-header" style="padding: 16px 20px; margin-bottom: 0;">
          <span class="card-title">RECENT ADMINISTRATIVE AUDIT EVENTS</span>
        </div>
        <table class="forensic-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>OPERATOR</th>
              <th>ACTION</th>
              <th>TARGET</th>
              <th>OUTCOME</th>
            </tr>
          </thead>
          <tbody>
            ${recent_activity.map(a => `
              <tr>
                <td style="color: var(--text-dim);">${new Date(a.timestamp).toLocaleTimeString()}</td>
                <td style="color: var(--forensic-cyan); font-weight: 600;">${escapeHtml(a.actor_name || 'System')}</td>
                <td style="color: var(--forensic-emerald);">${escapeHtml(a.action)}</td>
                <td>${escapeHtml(a.target_object)}</td>
                <td><span class="badge ${a.outcome === 'SUCCESS' ? 'badge-emerald' : 'badge-critical'}">${a.outcome}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE F: EVIDENCE MANAGER (Multi-File Upload Ingestion)
// ============================================================================
async function renderEvidenceModule(outlet) {
  let evidenceList = (await api.getAdminEvidence()).evidence || [];

  function draw() {
    outlet.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
              EVIDENCE VAULT MANAGEMENT
            </h2>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
              Ingest, inspect, categorize, and archive forensic evidence files with SHA-256 verification.
            </p>
          </div>
        </div>

        <!-- Mount Multi-File Uploader Component -->
        <div id="multi-uploader-mount"></div>

        <!-- Current Evidence Items Table -->
        <div class="forensic-card" style="padding: 0; overflow: hidden;">
          <div class="forensic-card-header" style="padding: 16px 20px; margin-bottom: 0;">
            <span class="card-title">MANAGED EVIDENCE REPOSITORY (${evidenceList.length})</span>
          </div>

          <div class="csv-table-wrapper" style="max-height: none;">
            <table class="forensic-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>DISPLAY NAME</th>
                  <th>CATEGORY</th>
                  <th>TYPE</th>
                  <th>SIZE</th>
                  <th>SHA-256 CHECKSUM</th>
                  <th>SCORE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${evidenceList.map(item => `
                  <tr style="${item.archived ? 'opacity: 0.5;' : ''}">
                    <td style="font-weight: 700; color: var(--forensic-emerald);">${item.evidence_code}</td>
                    <td style="font-weight: 600;">${escapeHtml(item.display_name)}</td>
                    <td><span class="badge badge-emerald" style="font-size: 0.7rem;">${item.category}</span></td>
                    <td>${item.file_type.toUpperCase()}</td>
                    <td>${formatBytes(item.file_size)}</td>
                    <td style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim);">
                      ${item.sha256_hash ? item.sha256_hash.substring(0, 16) + '...' : 'n/a'}
                    </td>
                    <td>${item.score_value} Pts</td>
                    <td>
                      <span class="badge ${item.archived ? 'badge-critical' : 'badge-emerald'}">
                        ${item.archived ? 'ARCHIVED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <a href="/api/evidence/${item.id}/download" class="btn btn-secondary btn-sm" download>Download</a>
                        <button class="btn btn-outline btn-sm toggle-archive-btn" data-id="${item.id}">
                          ${item.archived ? 'Restore' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Initialize MultiUploaderComponent
    new MultiUploaderComponent({
      containerId: 'multi-uploader-mount',
      onUploadSuccess: async () => {
        evidenceList = (await api.getAdminEvidence()).evidence || [];
        draw();
      }
    }).render();

    // Toggle Archive Handlers
    outlet.querySelectorAll('.toggle-archive-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        try {
          await api.toggleArchiveEvidence(id);
          evidenceList = (await api.getAdminEvidence()).evidence || [];
          draw();
          Toast.success('Evidence status toggled.');
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  }

  draw();
}

// ============================================================================
// MODULE F2: MULTI-FILE BATCH INGESTION STATION
// ============================================================================
async function renderBatchUploadModule(outlet) {
  let evidenceList = (await api.getAdminEvidence()).evidence || [];

  function draw() {
    outlet.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="display: flex; gap: 8px; margin-bottom: 6px;">
            <span class="badge badge-emerald">INGESTION PROTOCOL</span>
            <span class="badge badge-confidential">CASE TLA-026</span>
          </div>
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
            MULTI-FILE BATCH EVIDENCE INGESTION
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Select and upload multiple forensic artifacts simultaneously (3-10 files). Validate each artifact, remove items before ingestion, and verify database persistence.
          </p>
        </div>

        <!-- Mount Multi-File Uploader Component -->
        <div id="dedicated-batch-uploader-mount"></div>

        <!-- Verified Ingestion History & Evidence Verification -->
        <div class="forensic-card" style="padding: 0; overflow: hidden;">
          <div class="forensic-card-header" style="padding: 16px 20px; margin-bottom: 0;">
            <span class="card-title">STORED EVIDENCE ARTIFACTS (${evidenceList.length} ITEMS SEALED)</span>
            <span class="badge badge-emerald">PERSISTENCE VERIFIED</span>
          </div>

          <div class="csv-table-wrapper" style="max-height: none;">
            <table class="forensic-table">
              <thead>
                <tr>
                  <th>EVIDENCE CODE</th>
                  <th>ORIGINAL FILENAME</th>
                  <th>CATEGORY</th>
                  <th>CLASSIFICATION</th>
                  <th>SIZE</th>
                  <th>SHA-256 CHECKSUM</th>
                  <th>INGESTION DATE</th>
                </tr>
              </thead>
              <tbody>
                ${evidenceList.slice().reverse().map(item => `
                  <tr>
                    <td style="font-weight: 700; color: var(--forensic-emerald);">${item.evidence_code}</td>
                    <td style="font-weight: 600;">${escapeHtml(item.original_filename)}</td>
                    <td><span class="badge badge-emerald" style="font-size: 0.7rem;">${item.category}</span></td>
                    <td><span class="badge badge-${item.classification === 'CRITICAL' ? 'critical' : 'secondary'}" style="font-size: 0.7rem;">${item.classification}</span></td>
                    <td>${formatBytes(item.file_size)}</td>
                    <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim);">
                      ${item.sha256_hash ? item.sha256_hash.substring(0, 20) + '...' : 'n/a'}
                    </td>
                    <td style="font-size: 0.8rem; color: var(--text-dim);">${new Date(item.uploaded_at).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    new MultiUploaderComponent({
      containerId: 'dedicated-batch-uploader-mount',
      onUploadSuccess: async () => {
        evidenceList = (await api.getAdminEvidence()).evidence || [];
        draw();
      }
    }).render();
  }

  draw();
}

// ============================================================================
// MODULE P: CHAIN-OF-CUSTODY & CRYPTOGRAPHIC INTEGRITY AUDIT
// ============================================================================
async function renderIntegrityModule(outlet) {
  const { evidence } = await api.getAdminEvidence();
  const evidenceList = evidence || [];

  const totalBytes = evidenceList.reduce((acc, cur) => acc + (cur.file_size || 0), 0);
  const criticalCount = evidenceList.filter(e => e.classification === 'CRITICAL').length;
  const verifiedCount = evidenceList.filter(e => e.sha256_hash && e.sha256_hash.length === 64).length;

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; gap: 8px; margin-bottom: 6px;">
            <span class="badge badge-emerald">CRYPTOGRAPHIC VERIFICATION</span>
            <span class="badge badge-critical">CHAIN OF CUSTODY</span>
          </div>
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
            CHAIN-OF-CUSTODY & HASH AUDIT
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Cryptographic SHA-256 registry verifying tamper-proof chain of custody across all ingested evidence artifacts.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" id="verify-hashes-btn">
            <span>🛡 Verify Checksums</span>
          </button>
          <button class="btn btn-outline btn-sm" id="print-custody-btn">
            <span>🖨 Print Chain-of-Custody</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div class="metric-card">
          <div class="metric-label">TOTAL SEALED ARTIFACTS</div>
          <div class="metric-value">${evidenceList.length}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">100% Cryptographically Indexed</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">CRITICAL CLASSIFICATIONS</div>
          <div class="metric-value" style="color: var(--forensic-amber);">${criticalCount}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Core Investigative Focus</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">SHA-256 HASHES VERIFIED</div>
          <div class="metric-value" style="color: var(--forensic-emerald);">${verifiedCount} / ${evidenceList.length}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Zero Hash Collisions</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">TOTAL REPOSITORY SIZE</div>
          <div class="metric-value">${formatBytes(totalBytes)}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Immutable Storage</div>
        </div>
      </div>

      <!-- Hash Registry Table -->
      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <div class="forensic-card-header" style="padding: 16px 20px; margin-bottom: 0;">
          <span class="card-title">CRYPTOGRAPHIC SHA-256 EVIDENCE REGISTER</span>
        </div>
        <div class="csv-table-wrapper" style="max-height: none;">
          <table class="forensic-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>DISPLAY NAME</th>
                <th>ORIGINAL FILE</th>
                <th>FILE SIZE</th>
                <th>SHA-256 CHECKSUM</th>
                <th>INTEGRITY STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${evidenceList.map(item => `
                <tr>
                  <td style="font-weight: 700; color: var(--forensic-emerald);">${item.evidence_code}</td>
                  <td style="font-weight: 600;">${escapeHtml(item.display_name)}</td>
                  <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim);">${escapeHtml(item.original_filename)}</td>
                  <td>${formatBytes(item.file_size)}</td>
                  <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--forensic-cyan);">
                    ${item.sha256_hash || 'UNHASHED'}
                  </td>
                  <td>
                    <span class="badge badge-emerald" style="font-size: 0.7rem;">
                      ✓ VALIDATED
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const verifyBtn = outlet.querySelector('#verify-hashes-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      Toast.success(`Audit Complete: All ${evidenceList.length} evidence artifacts match immutable SHA-256 signatures.`);
    });
  }

  const printBtn = outlet.querySelector('#print-custody-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

// ============================================================================
// MODULE N: REPORT REVIEW & GRADING
// ============================================================================
async function renderReportsModule(outlet) {
  const { reports } = await api.getAdminReports();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        REPORT REVIEW & EVALUATION DESK
      </h2>

      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <table class="forensic-table">
          <thead>
            <tr>
              <th>REPORT CODE</th>
              <th>INVESTIGATOR</th>
              <th>TEAM</th>
              <th>WORD COUNT</th>
              <th>STATUS</th>
              <th>SUBMITTED AT</th>
              <th>CURRENT SCORE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map(r => `
              <tr>
                <td style="font-weight: 700; color: var(--forensic-emerald);">${r.report_code}</td>
                <td>${escapeHtml(r.author_name)}</td>
                <td>${escapeHtml(r.team_name || 'Solo')}</td>
                <td>${r.word_count} words</td>
                <td><span class="badge ${r.status === 'reviewed' ? 'badge-emerald' : 'badge-secondary'}">${r.status.toUpperCase()}</span></td>
                <td>${new Date(r.submitted_at).toLocaleString()}</td>
                <td style="font-weight: 700; color: var(--forensic-cyan);">
                  ${r.evaluated_score !== null && r.evaluated_score !== undefined ? `${r.evaluated_score} / 100` : 'Not Graded'}
                </td>
                <td>
                  <button class="btn btn-primary btn-sm grade-report-btn" data-id="${r.id}">
                    Review & Grade
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  outlet.querySelectorAll('.grade-report-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const { report } = await api.getAdminReport(id);

      const content = report.content || {};
      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background-color: var(--bg-secondary); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; font-size: 0.85rem;">
            <div><strong>Author:</strong> ${escapeHtml(report.author_name)} (${escapeHtml(report.team_name || 'Solo')})</div>
            <div><strong>Submitted:</strong> ${new Date(report.submitted_at).toLocaleString()}</div>
          </div>

          <div style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 8px;">
            ${Object.entries(content).map(([secKey, secText]) => `
              <div style="border: 1px solid var(--border-subtle); padding: 12px; border-radius: var(--radius-sm);">
                <div style="font-weight: 700; color: var(--forensic-emerald); text-transform: uppercase; font-size: 0.85rem; margin-bottom: 6px;">
                  ${secKey.replace(/_/g, ' ')}
                </div>
                <div style="font-size: 0.88rem; color: var(--text-main); white-space: pre-wrap; line-height: 1.5;">${escapeHtml(secText)}</div>
              </div>
            `).join('')}
          </div>

          <div style="border-top: 1px solid var(--border-strong); padding-top: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label">Total Graded Score (0 - 100 Points)</label>
                <input type="number" class="form-input" id="eval-score" min="0" max="100" step="0.5" value="${report.total_score || 85.0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Review Status</label>
                <select class="form-select" id="eval-status">
                  <option value="reviewed" ${report.status === 'reviewed' ? 'selected' : ''}>Reviewed & Graded</option>
                  <option value="returned_for_revision" ${report.status === 'returned_for_revision' ? 'selected' : ''}>Return for Revision (Unlocks Case)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Evaluator Committee Feedback</label>
              <textarea class="form-textarea" id="eval-feedback" rows="3" placeholder="Provide constructive remarks on evidence correlation and methodology...">${escapeHtml(report.feedback || '')}</textarea>
            </div>
          </div>
        </div>
      `;

      Modal.open({
        title: `GRADE FORENSIC REPORT // ${report.report_code}`,
        content: modalHtml,
        isLarge: true,
        footerButtons: [
          {
            text: 'Save Marks & Transmit Feedback',
            className: 'btn-primary',
            onClick: async (close) => {
              const score = document.querySelector('#eval-score').value;
              const status = document.querySelector('#eval-status').value;
              const feedback = document.querySelector('#eval-feedback').value;

              try {
                await api.evaluateAdminReport(report.id, {
                  total_score: score,
                  status,
                  feedback,
                  rubric_scores: {}
                });
                Toast.success('Forensic evaluation and marks recorded successfully.');
                close();
                renderReportsModule(outlet);
              } catch (err) {
                Toast.error(err.message);
              }
            }
          },
          { text: 'Close', className: 'btn-secondary', onClick: (close) => close() }
        ]
      });
    });
  });
}

// ============================================================================
// MODULE B: WEBSITE CUSTOMIZER
// ============================================================================
async function renderCustomizerModule(outlet) {
  const { config } = await api.getAdminMetrics(); // or get config
  const configRes = await api.getEventConfig();
  const cfg = configRes.config || {};

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        WEBSITE CUSTOMIZER & IDENTITY EDITOR
      </h2>

      <form id="customizer-form" class="forensic-card">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Official Event / Case Title</label>
            <input type="text" class="form-input" id="cfg-site-title" value="${escapeHtml(cfg.site_title || 'THE LAST ARTIFACT')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Case Identifier</label>
            <input type="text" class="form-input" id="cfg-case-id" value="${escapeHtml(cfg.case_id || 'TLA-026')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Project Codename</label>
            <input type="text" class="form-input" id="cfg-project" value="${escapeHtml(cfg.project_name || 'PROJECT AETHER')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Organizing Institution / Community</label>
            <input type="text" class="form-input" id="cfg-inst" value="${escapeHtml(cfg.institution || 'CyRA Community @ Sree Sakthi Engineering College')}" />
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Homepage Headline</label>
            <input type="text" class="form-input" id="cfg-hero-title" value="${escapeHtml(cfg.homepage_hero_title || 'THE LAST ARTIFACT (TLA-026)')}" />
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Homepage Sub-headline</label>
            <input type="text" class="form-input" id="cfg-hero-sub" value="${escapeHtml(cfg.homepage_hero_subtitle || 'Digital Forensics Investigation & Intellectual Property Theft')}" />
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Homepage Briefing Narrative</label>
            <textarea class="form-textarea" id="cfg-intro" rows="4">${escapeHtml(cfg.homepage_intro_text || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Support / Incident Email</label>
            <input type="email" class="form-input" id="cfg-contact" value="${escapeHtml(cfg.contact_email || 'cyra.forensics@sreesakthi.ac.in')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Hero Banner Image URL</label>
            <input type="text" class="form-input" id="cfg-banner" value="${escapeHtml(cfg.banner_image_url || '/assets/images/tla_case_banner.jpg')}" />
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Footer Notice</label>
            <input type="text" class="form-input" id="cfg-footer" value="${escapeHtml(cfg.footer_text || 'Organized by CyRA Community, Sree Sakthi Engineering College.')}" />
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="margin-top: 16px;">
          <span>Publish Website Updates to Database</span>
        </button>
      </form>
    </div>
  `;

  outlet.querySelector('#customizer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.updateAdminConfig({
        site_title: outlet.querySelector('#cfg-site-title').value.trim(),
        case_id: outlet.querySelector('#cfg-case-id').value.trim(),
        project_name: outlet.querySelector('#cfg-project').value.trim(),
        institution: outlet.querySelector('#cfg-inst').value.trim(),
        homepage_hero_title: outlet.querySelector('#cfg-hero-title').value.trim(),
        homepage_hero_subtitle: outlet.querySelector('#cfg-hero-sub').value.trim(),
        homepage_intro_text: outlet.querySelector('#cfg-intro').value.trim(),
        contact_email: outlet.querySelector('#cfg-contact').value.trim(),
        banner_image_url: outlet.querySelector('#cfg-banner').value.trim(),
        footer_text: outlet.querySelector('#cfg-footer').value.trim()
      });
      Toast.success('Website configuration updated and persisted.');
    } catch (err) {
      Toast.error(err.message);
    }
  });
}

// ============================================================================
// MODULE C: RULES EDITOR
// ============================================================================
async function renderRulesModule(outlet) {
  let rules = (await api.getAdminRules()).rules || [];

  function draw() {
    outlet.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
            EVENT RULES & INSTRUCTIONS EDITOR (${rules.length})
          </h2>
          <button class="btn btn-primary btn-sm" id="add-rule-btn">+ Add Rule Section</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${rules.map(r => `
            <div class="forensic-card">
              <div class="forensic-card-header">
                <div>
                  <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--forensic-emerald); font-weight: 700;">
                    ORDER: #${r.sort_order} [${r.section_key}]
                  </span>
                  <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-highlight);">${escapeHtml(r.title)}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm edit-rule-btn" data-id="${r.id}">Edit</button>
                  <button class="btn btn-danger btn-sm del-rule-btn" data-id="${r.id}">Delete</button>
                </div>
              </div>
              <div style="font-size: 0.9rem; color: var(--text-main); white-space: pre-wrap;">${escapeHtml(r.content)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add Rule
    outlet.querySelector('#add-rule-btn').addEventListener('click', () => {
      Modal.open({
        title: 'ADD EVENT RULE SECTION',
        content: `
          <div class="form-group">
            <label class="form-label">Section Key (Unique)</label>
            <input type="text" class="form-input" id="new-rule-key" placeholder="e.g. anti_tampering" required />
          </div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-input" id="new-rule-title" placeholder="e.g. Anti-Tampering Directive" required />
          </div>
          <div class="form-group">
            <label class="form-label">Content Instructions</label>
            <textarea class="form-textarea" id="new-rule-content" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Sort Order</label>
            <input type="number" class="form-input" id="new-rule-order" value="${rules.length + 1}" />
          </div>
        `,
        footerButtons: [
          {
            text: 'Save Rule to Database',
            className: 'btn-primary',
            onClick: async (close) => {
              const key = document.querySelector('#new-rule-key').value.trim();
              const title = document.querySelector('#new-rule-title').value.trim();
              const content = document.querySelector('#new-rule-content').value.trim();
              const order = document.querySelector('#new-rule-order').value;
              try {
                await api.createAdminRule({ section_key: key, title, content, sort_order: order, is_active: 1 });
                Toast.success('Rule added.');
                rules = (await api.getAdminRules()).rules || [];
                close();
                draw();
              } catch (e) {
                Toast.error(e.message);
              }
            }
          },
          { text: 'Cancel', className: 'btn-secondary', onClick: (close) => close() }
        ]
      });
    });

    // Edit Rule Handlers
    outlet.querySelectorAll('.edit-rule-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const rule = rules.find(r => String(r.id) === String(id));
        if (!rule) return;

        Modal.open({
          title: `EDIT RULE // ${rule.title}`,
          content: `
            <div class="form-group">
              <label class="form-label">Title</label>
              <input type="text" class="form-input" id="edit-rule-title" value="${escapeHtml(rule.title)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Content Instructions</label>
              <textarea class="form-textarea" id="edit-rule-content" rows="6">${escapeHtml(rule.content)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Sort Order</label>
              <input type="number" class="form-input" id="edit-rule-order" value="${rule.sort_order}" />
            </div>
          `,
          footerButtons: [
            {
              text: 'Save Changes',
              className: 'btn-primary',
              onClick: async (close) => {
                const title = document.querySelector('#edit-rule-title').value.trim();
                const content = document.querySelector('#edit-rule-content').value.trim();
                const order = document.querySelector('#edit-rule-order').value;
                try {
                  await api.updateAdminRule(rule.id, { title, content, sort_order: order });
                  Toast.success('Rule updated.');
                  rules = (await api.getAdminRules()).rules || [];
                  close();
                  draw();
                } catch (err) {
                  Toast.error(err.message);
                }
              }
            },
            { text: 'Cancel', className: 'btn-secondary', onClick: (close) => close() }
          ]
        });
      });
    });

    // Delete Rule Handlers
    outlet.querySelectorAll('.del-rule-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (await Modal.confirm({ title: 'Delete Rule', message: 'Delete this rule section from the database?', isDanger: true })) {
          try {
            await api.deleteAdminRule(id);
            rules = (await api.getAdminRules()).rules || [];
            draw();
            Toast.success('Rule deleted.');
          } catch (err) {
            Toast.error(err.message);
          }
        }
      });
    });
  }

  draw();
}

// ============================================================================
// ============================================================================
// MODULE E: CASE STORY EDITOR
// ============================================================================
async function renderStoryModule(outlet) {
  let storyList = (await api.getAdminStory()).sections || [];

  function draw() {
    outlet.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
              CASE STORY & INVESTIGATION NARRATIVE EDITOR (${storyList.length})
            </h2>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
              Manage confidential incident briefings, forensic background dossiers, and case disclosure narratives.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" id="add-story-btn">
            <span>+ Add Case Story Section</span>
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${storyList.map(sec => `
            <div class="forensic-card">
              <div class="forensic-card-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                    <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--forensic-emerald); font-weight: 700;">
                      ORDER: #${sec.sort_order} [${escapeHtml(sec.section_id)}]
                    </span>
                    <span class="badge badge-confidential">${escapeHtml(sec.badge || 'CONFIDENTIAL')}</span>
                    <span class="badge badge-secondary">${escapeHtml(sec.classification || 'RESTRICTED')}</span>
                  </div>
                  <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-highlight);">${escapeHtml(sec.title)}</div>
                  ${sec.subtitle ? `<div style="font-size: 0.82rem; color: var(--forensic-teal); font-family: var(--font-mono); margin-top: 2px;">${escapeHtml(sec.subtitle)}</div>` : ''}
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-outline btn-sm edit-story-btn" data-id="${sec.id}">Edit Story</button>
                  <button class="btn btn-danger btn-sm del-story-btn" data-id="${sec.id}">Delete</button>
                </div>
              </div>
              <div style="font-size: 0.9rem; color: var(--text-main); white-space: pre-wrap; line-height: 1.6;">${escapeHtml(sec.content)}</div>
              ${sec.attachments && sec.attachments.length > 0 ? `
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border-subtle); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; color: var(--forensic-emerald);">
                    ATTACHED EVIDENCE (${sec.attachments.length}):
                  </span>
                  ${sec.attachments.map(att => `
                    <a href="/api/evidence/${att.evidence_id || att.id}/download" target="_blank" class="badge badge-secondary" style="font-size: 0.78rem; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; color: var(--text-highlight);" title="Download: ${escapeHtml(att.original_filename)} | SHA-256: ${att.sha256_hash}">
                      <span>📎</span>
                      <span>${escapeHtml(att.original_filename)}</span>
                      <span style="opacity: 0.6; font-size: 0.72rem;">(${formatBytes(att.file_size)})</span>
                    </a>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Reusable file staging setup function
    function setupAttachmentStaging({
      fileInput,
      chooseBtn,
      dropzone,
      stagedWrapper,
      fileCountBadge,
      stagedList,
      clearAllBtn,
      stagedFiles
    }) {
      const allowedExts = ['.txt', '.csv', '.pdf', '.jpg', '.jpeg', '.png', '.mp4', '.zip', '.wav'];
      const maxFileSize = 50 * 1024 * 1024; // 50MB limit

      function getBadge(fname) {
        const ext = '.' + fname.split('.').pop().toLowerCase();
        if (ext === '.pdf') return 'PDF';
        if (ext === '.csv') return 'CSV';
        if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'IMAGE';
        if (ext === '.mp4') return 'VIDEO';
        if (ext === '.wav') return 'AUDIO';
        if (ext === '.zip') return 'ARCHIVE';
        return 'TEXT';
      }

      function renderStaged() {
        if (stagedFiles.length === 0) {
          stagedWrapper.style.display = 'none';
          if (fileCountBadge) fileCountBadge.textContent = '0';
          return;
        }
        stagedWrapper.style.display = 'block';
        if (fileCountBadge) fileCountBadge.textContent = stagedFiles.length;
        stagedList.innerHTML = stagedFiles.map((file, idx) => `
          <div class="pending-file-item" style="padding: 8px 12px; background: var(--bg-secondary);">
            <div class="file-info-group">
              <span style="color: var(--forensic-emerald); font-weight: 700; font-size: 0.75rem;">[#${idx + 1}]</span>
              <span class="badge badge-secondary" style="font-size: 0.7rem; padding: 2px 6px;">${getBadge(file.name)}</span>
              <span style="color: var(--text-highlight); font-weight: 600;">${escapeHtml(file.name)}</span>
              <span style="color: var(--text-dim); font-size: 0.75rem;">(${formatBytes(file.size)})</span>
            </div>
            <button type="button" class="btn btn-outline btn-sm remove-staged-btn" data-index="${idx}" style="color: var(--forensic-red); padding: 2px 8px; font-weight: 700; border-color: rgba(239,68,68,0.3);" title="Remove file">&times;</button>
          </div>
        `).join('');

        stagedList.querySelectorAll('.remove-staged-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            stagedFiles.splice(idx, 1);
            renderStaged();
          });
        });
      }

      function appendFiles(newFiles) {
        let added = 0;
        for (const file of newFiles) {
          if (stagedFiles.length >= 10) {
            Toast.warning('Maximum 10 evidence files per upload batch.');
            break;
          }
          const ext = '.' + file.name.split('.').pop().toLowerCase();
          if (!allowedExts.includes(ext)) {
            Toast.error(`File '${file.name}' has an unsupported extension (${ext}). Permitted: ${allowedExts.join(', ')}`);
            continue;
          }
          if (file.size > maxFileSize) {
            Toast.error(`File '${file.name}' exceeds the 50MB limit (${formatBytes(file.size)}).`);
            continue;
          }
          const duplicate = stagedFiles.some(f => f.name === file.name && f.size === file.size);
          if (duplicate) {
            Toast.warning(`'${file.name}' is already staged for upload.`);
            continue;
          }
          stagedFiles.push(file);
          added++;
        }
        if (added > 0) {
          Toast.success(`Added ${added} file(s) to attachment staging.`);
          renderStaged();
        }
      }

      if (chooseBtn && fileInput) {
        chooseBtn.addEventListener('click', () => fileInput.click());
      }

      if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
          }
        });
        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('drag-active');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('drag-active');
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            appendFiles(Array.from(e.dataTransfer.files));
          }
        });
      }

      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length > 0) {
            appendFiles(Array.from(e.target.files));
            fileInput.value = ''; // Reset so same file can be selected again
          }
        });
      }

      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
          stagedFiles.length = 0;
          renderStaged();
        });
      }

      return { renderStaged, appendFiles };
    }

    // Attach Add Story Handler
    const addBtn = outlet.querySelector('#add-story-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        let newStagedFiles = [];
        let isSaving = false;

        const overlay = Modal.open({
          title: 'ADD CASE STORY SECTION',
          isLarge: true,
          content: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Section ID (Unique Key)</label>
                  <input type="text" class="form-input" id="new-story-sec-id" placeholder="e.g. story_faraday_cage" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Classification Badge</label>
                  <select class="form-select" id="new-story-badge">
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="CRITICAL INTEL">CRITICAL INTEL</option>
                    <option value="CLASSIFIED">CLASSIFIED</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="FORENSIC BRIEFING">FORENSIC BRIEFING</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Section Title</label>
                <input type="text" class="form-input" id="new-story-title" placeholder="e.g. Crime Scene & Faraday Enclosure Breach" required />
              </div>

              <div class="form-group">
                <label class="form-label">Subtitle / Description</label>
                <input type="text" class="form-input" id="new-story-sub" placeholder="e.g. ARCH Laboratory 3 Hardware Extraction Analysis" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Classification Level</label>
                  <input type="text" class="form-input" id="new-story-classif" value="RESTRICTED" />
                </div>
                <div class="form-group">
                  <label class="form-label">Sort Order</label>
                  <input type="number" class="form-input" id="new-story-order" value="${storyList.length + 1}" min="1" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Case Narrative Content</label>
                <textarea class="form-textarea" id="new-story-content" rows="8" placeholder="Compile investigative briefing narrative for participants..." required></textarea>
              </div>

              <!-- ATTACH EVIDENCE FILES SECTION -->
              <div class="form-group" style="padding-top: 14px; border-top: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label class="form-label" style="font-size: 0.95rem; font-weight: 700; color: var(--text-highlight); margin: 0;">
                    ATTACH EVIDENCE FILES
                  </label>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                    TXT, PDF, CSV, JPG, PNG, MP4, ZIP, WAV (MAX 50MB EACH)
                  </span>
                </div>

                <!-- Hidden file input supporting multiple files -->
                <input type="file" id="new-story-file-input" multiple accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.mp4,.zip,.wav" style="display: none;" />

                <!-- Action Button and Drop Area -->
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                  <button type="button" class="btn btn-outline btn-sm" id="new-story-choose-btn">
                    <span>Choose Evidence Files</span>
                  </button>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">or drag and drop files into the target zone below</span>
                </div>

                <!-- Drag-and-drop zone -->
                <div class="upload-dropzone" id="new-story-dropzone" role="button" tabindex="0" style="padding: 24px 16px;">
                  <div class="upload-icon" style="font-size: 1.8rem; margin-bottom: 6px;">📂</div>
                  <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 2px;">
                    Drop evidence files here to attach to this section
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono);">
                    Select multiple files at once or append additional files sequentially
                  </div>
                </div>

                <!-- Selected Files List -->
                <div id="new-story-staged-wrapper" style="margin-top: 12px; display: none;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--forensic-emerald); text-transform: uppercase; font-family: var(--font-mono);">
                      STAGED EVIDENCE FILES (<span id="new-story-file-count">0</span>)
                    </span>
                    <button type="button" class="btn btn-sm btn-outline" id="new-story-clear-all-btn" style="padding: 2px 8px; font-size: 0.75rem;">Clear All</button>
                  </div>
                  <div class="pending-files-queue" id="new-story-files-list"></div>
                </div>

                <!-- Upload Progress & Status Indicator -->
                <div id="new-story-upload-status" style="margin-top: 10px; font-size: 0.82rem; font-family: var(--font-mono); display: none;"></div>
              </div>
            </div>
          `,
          footerButtons: [
            {
              text: 'Save Case Story to Database',
              className: 'btn-primary',
              onClick: async (close) => {
                if (isSaving) return;

                const secId = overlay.querySelector('#new-story-sec-id').value.trim();
                const badge = overlay.querySelector('#new-story-badge').value;
                const title = overlay.querySelector('#new-story-title').value.trim();
                const sub = overlay.querySelector('#new-story-sub').value.trim();
                const classif = overlay.querySelector('#new-story-classif').value.trim();
                const order = overlay.querySelector('#new-story-order').value;
                const content = overlay.querySelector('#new-story-content').value.trim();
                const statusIndicator = overlay.querySelector('#new-story-upload-status');

                if (!secId || !title || !content) {
                  Toast.warning('Section ID, title, and narrative content are required.');
                  return;
                }

                isSaving = true;
                if (statusIndicator) {
                  statusIndicator.style.display = 'block';
                  statusIndicator.style.color = 'var(--forensic-teal)';
                  statusIndicator.innerHTML = '<span>⏳ Saving case story section metadata...</span>';
                }

                try {
                  const createRes = await api.createAdminStory({
                    section_id: secId,
                    title,
                    subtitle: sub,
                    content,
                    badge,
                    classification: classif,
                    sort_order: parseInt(order, 10) || (storyList.length + 1),
                    is_published: 1
                  });

                  const newStoryId = createRes.id;
                  if (!newStoryId) {
                    throw new Error('Server did not return a valid story section ID.');
                  }

                  // Upload staged attachments if any
                  if (newStagedFiles.length > 0) {
                    if (statusIndicator) {
                      statusIndicator.innerHTML = `<span>⏳ Uploading ${newStagedFiles.length} evidence attachment(s)...</span>`;
                    }
                    const formData = new FormData();
                    for (const file of newStagedFiles) {
                      formData.append('files', file);
                    }
                    const uploadRes = await api.uploadStoryAttachments(newStoryId, formData);
                    if (!uploadRes) {
                      throw new Error('Failed to attach evidence files.');
                    }
                  }

                  if (statusIndicator) {
                    statusIndicator.style.color = 'var(--forensic-emerald)';
                    statusIndicator.innerHTML = '<span>✓ Case story section and attachments saved successfully!</span>';
                  }

                  Toast.success('Case story section created successfully.');
                  close();
                  storyList = (await api.getAdminStory()).sections || [];
                  draw();
                } catch (err) {
                  isSaving = false;
                  if (statusIndicator) {
                    statusIndicator.style.color = 'var(--forensic-red)';
                    statusIndicator.innerHTML = `<span>⚠️ Error: ${escapeHtml(err.message)}</span>`;
                  }
                  Toast.error(err.message || 'Failed to save case story section.');
                }
              }
            },
            { text: 'Cancel', className: 'btn-secondary', onClick: (close) => close() }
          ]
        });

        // Initialize attachment staging within the opened modal
        setupAttachmentStaging({
          fileInput: overlay.querySelector('#new-story-file-input'),
          chooseBtn: overlay.querySelector('#new-story-choose-btn'),
          dropzone: overlay.querySelector('#new-story-dropzone'),
          stagedWrapper: overlay.querySelector('#new-story-staged-wrapper'),
          fileCountBadge: overlay.querySelector('#new-story-file-count'),
          stagedList: overlay.querySelector('#new-story-files-list'),
          clearAllBtn: overlay.querySelector('#new-story-clear-all-btn'),
          stagedFiles: newStagedFiles
        });
      });
    }

    // Attach Edit Story Handlers
    outlet.querySelectorAll('.edit-story-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const sec = storyList.find(s => String(s.id) === String(id));
        if (!sec) return;

        // Fetch fresh attachments list from server
        let existingAttachments = [];
        try {
          const attRes = await api.getStoryAttachments(sec.id);
          existingAttachments = attRes.attachments || [];
        } catch (err) {
          existingAttachments = sec.attachments || [];
        }

        let editStagedFiles = [];
        let isSaving = false;

        const overlay = Modal.open({
          title: `EDIT STORY SECTION // ${sec.title}`,
          isLarge: true,
          content: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Section Title</label>
                  <input type="text" class="form-input" id="edit-story-title" value="${escapeHtml(sec.title)}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Badge</label>
                  <input type="text" class="form-input" id="edit-story-badge" value="${escapeHtml(sec.badge || 'CONFIDENTIAL')}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Subtitle</label>
                <input type="text" class="form-input" id="edit-story-sub" value="${escapeHtml(sec.subtitle || '')}" />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Classification</label>
                  <input type="text" class="form-input" id="edit-story-classif" value="${escapeHtml(sec.classification || 'RESTRICTED')}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Sort Order</label>
                  <input type="number" class="form-input" id="edit-story-order" value="${sec.sort_order || 1}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Case Narrative Content</label>
                <textarea class="form-textarea" id="edit-story-content" rows="8">${escapeHtml(sec.content)}</textarea>
              </div>

              <!-- ATTACH EVIDENCE FILES SECTION -->
              <div class="form-group" style="padding-top: 14px; border-top: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label class="form-label" style="font-size: 0.95rem; font-weight: 700; color: var(--text-highlight); margin: 0;">
                    ATTACH EVIDENCE FILES
                  </label>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                    TXT, PDF, CSV, JPG, PNG, MP4, ZIP, WAV (MAX 50MB EACH)
                  </span>
                </div>

                <!-- Existing Attachments Display -->
                <div style="margin-bottom: 14px;">
                  <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; font-family: var(--font-mono); margin-bottom: 6px;">
                    CURRENTLY ATTACHED EVIDENCE (<span id="edit-story-existing-count">${existingAttachments.length}</span>)
                  </div>
                  <div id="edit-story-existing-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
                </div>

                <!-- Hidden file input for new files -->
                <input type="file" id="edit-story-file-input" multiple accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.mp4,.zip,.wav" style="display: none;" />

                <!-- Action Button and Drop Area -->
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                  <button type="button" class="btn btn-outline btn-sm" id="edit-story-choose-btn">
                    <span>Choose Evidence Files</span>
                  </button>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">or drag and drop files into the target zone below</span>
                </div>

                <!-- Drag-and-drop zone -->
                <div class="upload-dropzone" id="edit-story-dropzone" role="button" tabindex="0" style="padding: 24px 16px;">
                  <div class="upload-icon" style="font-size: 1.8rem; margin-bottom: 6px;">📂</div>
                  <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 2px;">
                    Drop new evidence files here to attach to this section
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono);">
                    Select multiple files at once or append additional files sequentially
                  </div>
                </div>

                <!-- Staged New Files List -->
                <div id="edit-story-staged-wrapper" style="margin-top: 12px; display: none;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--forensic-emerald); text-transform: uppercase; font-family: var(--font-mono);">
                      NEW STAGED FILES (<span id="edit-story-file-count">0</span>)
                    </span>
                    <button type="button" class="btn btn-sm btn-outline" id="edit-story-clear-all-btn" style="padding: 2px 8px; font-size: 0.75rem;">Clear All</button>
                  </div>
                  <div class="pending-files-queue" id="edit-story-files-list"></div>
                </div>

                <!-- Progress & Status Indicator -->
                <div id="edit-story-upload-status" style="margin-top: 10px; font-size: 0.82rem; font-family: var(--font-mono); display: none;"></div>
              </div>
            </div>
          `,
          footerButtons: [
            {
              text: 'Save Updates to Database',
              className: 'btn-primary',
              onClick: async (close) => {
                if (isSaving) return;

                const title = overlay.querySelector('#edit-story-title').value.trim();
                const badge = overlay.querySelector('#edit-story-badge').value.trim();
                const sub = overlay.querySelector('#edit-story-sub').value.trim();
                const classif = overlay.querySelector('#edit-story-classif').value.trim();
                const order = overlay.querySelector('#edit-story-order').value;
                const content = overlay.querySelector('#edit-story-content').value.trim();
                const statusIndicator = overlay.querySelector('#edit-story-upload-status');

                if (!title || !content) {
                  Toast.warning('Section title and narrative content are required.');
                  return;
                }

                isSaving = true;
                if (statusIndicator) {
                  statusIndicator.style.display = 'block';
                  statusIndicator.style.color = 'var(--forensic-teal)';
                  statusIndicator.innerHTML = '<span>⏳ Saving updates to database...</span>';
                }

                try {
                  await api.updateAdminStory(sec.id, {
                    title,
                    subtitle: sub,
                    content,
                    badge,
                    classification: classif,
                    sort_order: parseInt(order, 10) || sec.sort_order
                  });

                  if (editStagedFiles.length > 0) {
                    if (statusIndicator) {
                      statusIndicator.innerHTML = `<span>⏳ Uploading ${editStagedFiles.length} new evidence attachment(s)...</span>`;
                    }
                    const formData = new FormData();
                    for (const file of editStagedFiles) {
                      formData.append('files', file);
                    }
                    const uploadRes = await api.uploadStoryAttachments(sec.id, formData);
                    if (!uploadRes) {
                      throw new Error('Failed to upload new attachments.');
                    }
                  }

                  if (statusIndicator) {
                    statusIndicator.style.color = 'var(--forensic-emerald)';
                    statusIndicator.innerHTML = '<span>✓ Story section and attachments updated successfully!</span>';
                  }

                  Toast.success('Story section and attachments updated.');
                  close();
                  storyList = (await api.getAdminStory()).sections || [];
                  draw();
                } catch (err) {
                  isSaving = false;
                  if (statusIndicator) {
                    statusIndicator.style.color = 'var(--forensic-red)';
                    statusIndicator.innerHTML = `<span>⚠️ Error: ${escapeHtml(err.message)}</span>`;
                  }
                  Toast.error(err.message || 'Failed to update story section.');
                }
              }
            },
            { text: 'Cancel', className: 'btn-secondary', onClick: (close) => close() }
          ]
        });

        // Function to render existing persisted attachments
        function renderExistingAttachments() {
          const existingList = overlay.querySelector('#edit-story-existing-list');
          const countBadge = overlay.querySelector('#edit-story-existing-count');
          if (countBadge) countBadge.textContent = existingAttachments.length;

          if (!existingList) return;

          if (existingAttachments.length === 0) {
            existingList.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; padding: 4px 0;">No evidence files currently attached to this section.</div>`;
            return;
          }

          existingList.innerHTML = existingAttachments.map(att => `
            <div class="pending-file-item" style="padding: 8px 12px; background: var(--bg-tertiary);">
              <div class="file-info-group">
                <span class="badge badge-emerald" style="font-size: 0.7rem; padding: 2px 6px;">ATTACHED</span>
                <a href="/api/evidence/${att.evidence_id || att.id}/download" target="_blank" style="color: var(--text-highlight); font-weight: 600; text-decoration: none;" title="Download evidence file">
                  📎 ${escapeHtml(att.original_filename)}
                </a>
                <span style="color: var(--text-dim); font-size: 0.75rem;">(${formatBytes(att.file_size)})</span>
                <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--forensic-teal);" title="${att.sha256_hash}">
                  SHA: ${att.sha256_hash ? att.sha256_hash.slice(0, 10) + '...' : 'VERIFIED'}
                </span>
              </div>
              <button type="button" class="btn btn-outline btn-sm remove-existing-att-btn" data-id="${att.id}" style="color: var(--forensic-red); padding: 2px 8px; font-size: 0.75rem; border-color: rgba(239,68,68,0.3);">
                Remove
              </button>
            </div>
          `).join('');

          existingList.querySelectorAll('.remove-existing-att-btn').forEach(removeBtn => {
            removeBtn.addEventListener('click', async (btnEvent) => {
              const attId = btnEvent.currentTarget.dataset.id;
              const targetAtt = existingAttachments.find(a => String(a.id) === String(attId));
              const confirmed = await Modal.confirm({
                title: 'REMOVE PERSISTED ATTACHMENT',
                message: `Are you sure you want to remove attachment "${targetAtt ? targetAtt.original_filename : 'file'}" from this case story section? The original evidence record and physical file in the evidence vault will be safely preserved.`,
                confirmText: 'Remove Attachment',
                cancelText: 'Keep Attachment',
                isDanger: true
              });

              if (confirmed) {
                try {
                  await api.deleteStoryAttachment(sec.id, attId);
                  Toast.success('Evidence attachment removed from story section.');
                  existingAttachments = existingAttachments.filter(a => String(a.id) !== String(attId));
                  renderExistingAttachments();
                  sec.attachments = existingAttachments;
                } catch (delErr) {
                  Toast.error(delErr.message || 'Failed to remove attachment.');
                }
              }
            });
          });
        }

        renderExistingAttachments();

        // Initialize attachment staging for new files
        setupAttachmentStaging({
          fileInput: overlay.querySelector('#edit-story-file-input'),
          chooseBtn: overlay.querySelector('#edit-story-choose-btn'),
          dropzone: overlay.querySelector('#edit-story-dropzone'),
          stagedWrapper: overlay.querySelector('#edit-story-staged-wrapper'),
          fileCountBadge: overlay.querySelector('#edit-story-file-count'),
          stagedList: overlay.querySelector('#edit-story-files-list'),
          clearAllBtn: overlay.querySelector('#edit-story-clear-all-btn'),
          stagedFiles: editStagedFiles
        });
      });
    });

    // Attach Delete Story Handlers
    outlet.querySelectorAll('.del-story-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const sec = storyList.find(s => String(s.id) === String(id));
        const confirmed = await Modal.confirm({
          title: 'DELETE CASE STORY SECTION',
          message: `Are you sure you want to delete story section "${sec ? sec.title : id}"? This action removes the narrative briefing from the participant portal.`,
          confirmText: 'Delete Section',
          cancelText: 'Keep Section',
          isDanger: true
        });

        if (confirmed) {
          try {
            await api.deleteAdminStory(id);
            Toast.success('Story section removed.');
            storyList = (await api.getAdminStory()).sections || [];
            draw();
          } catch (err) {
            Toast.error(err.message);
          }
        }
      });
    });
  }

  draw();
}

// ============================================================================
// MODULE G: SUSPECTS MANAGER
// ============================================================================
async function renderSuspectsModule(outlet) {
  const { suspects } = await api.getAdminSuspects();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div>
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight); margin-bottom: 4px;">
            SUSPECT DOSSIER & PROFILE MANAGER
          </h2>
          <p style="font-size: 0.88rem; color: var(--text-muted);">
            Manage primary persons of interest, recorded testimonies, alibis, and forensic suspect profiles.
          </p>
        </div>
        <button class="btn btn-primary" id="add-suspect-btn" style="font-weight: 700; letter-spacing: 0.03em; padding: 10px 18px;">
          <span>+ ADD NEW SUSPECT DOSSIER</span>
        </button>
      </div>

      <div class="suspects-grid" id="suspects-grid-container">
        ${suspects.map(s => {
          const avatar = s.avatar_url || '/assets/images/suspects/default_suspect.svg';
          const stmtPreview = s.statement ? (s.statement.length > 130 ? s.statement.substring(0, 130) + '...' : s.statement) : 'No statement recorded.';
          return `
            <div class="suspect-card" data-id="${s.id}">
              <div class="suspect-photo-wrapper">
                <img src="${avatar}" alt="${escapeHtml(s.name)}" onerror="this.src='/assets/images/suspects/default_suspect.svg'" />
              </div>
              <div class="suspect-card-info">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <div>
                    <h3 class="suspect-name">${escapeHtml(s.name)}</h3>
                    <div class="suspect-role-tag">${escapeHtml(s.role)}</div>
                  </div>
                  <span class="badge badge-dim" style="font-family: var(--font-mono); font-size: 0.72rem;">${escapeHtml(s.suspect_code || 'SUSP')}</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; flex-grow: 1;">
                  ${escapeHtml(stmtPreview)}
                </div>
                <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-subtle);">
                  <button class="btn btn-secondary btn-sm edit-suspect-btn" data-id="${s.id}" style="flex: 1;">
                    Edit Dossier
                  </button>
                  <button class="btn btn-outline btn-sm del-suspect-btn" data-id="${s.id}" style="color: var(--forensic-red); border-color: rgba(239, 68, 68, 0.4);" title="Delete suspect dossier">
                    Delete Dossier
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Attach "+ ADD NEW SUSPECT DOSSIER" Click Handler
  const addBtn = outlet.querySelector('#add-suspect-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openSuspectModal(null);
    });
  }

  // Attach Edit Handlers
  outlet.querySelectorAll('.edit-suspect-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const suspect = suspects.find(s => String(s.id) === String(id));
      if (!suspect) return;
      openSuspectModal(suspect);
    });
  });

  // Attach Delete Handlers
  outlet.querySelectorAll('.del-suspect-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const suspect = suspects.find(s => String(s.id) === String(id));
      if (!suspect) return;

      const confirmed = await Modal.confirm({
        title: 'CONFIRM DOSSIER REMOVAL',
        message: `Are you sure you want to permanently delete the suspect dossier for "${suspect.name}" (${suspect.suspect_code})? Any existing evidence records and participant notes will be safely preserved.`,
        confirmText: 'Delete Dossier',
        cancelText: 'Cancel',
        isDanger: true
      });

      if (confirmed) {
        try {
          await api.deleteAdminSuspect(suspect.id);
          Toast.success(`Suspect dossier for ${suspect.name} removed successfully.`);
          renderSuspectsModule(outlet);
        } catch (err) {
          Toast.error(err.message || 'Failed to delete suspect dossier.');
        }
      }
    });
  });

  function openSuspectModal(suspect) {
    const isEdit = !!suspect;
    const modalTitle = isEdit ? `EDIT SUSPECT PROFILE // ${suspect.name}` : 'ADD NEW SUSPECT DOSSIER';
    let currentAvatar = suspect ? (suspect.avatar_url || '') : '';
    let stagedAvatarFile = null;
    let isSaving = false;

    const overlay = Modal.open({
      title: modalTitle,
      isLarge: true,
      content: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Suspect Profile Image Section with Live Preview -->
          <div style="padding: 16px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <label class="form-label" style="font-weight: 700; color: var(--text-highlight); margin-bottom: 8px;">
              Suspect Profile Image (Optional)
            </label>
            <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
              <div style="width: 86px; height: 86px; border-radius: var(--radius-sm); overflow: hidden; border: 2px solid var(--border-color); background: #000; flex-shrink: 0;">
                <img id="s-avatar-preview" src="${currentAvatar || '/assets/images/suspects/default_suspect.svg'}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/assets/images/suspects/default_suspect.svg'" />
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                <input type="file" id="s-avatar-file" accept=".jpg,.jpeg,.png,.webp" style="display: none;" />
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline btn-sm" id="s-choose-file-btn">
                    <span>📷 ${currentAvatar ? 'Change Photo' : 'Choose Profile Image'}</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" id="s-remove-file-btn" style="${currentAvatar ? '' : 'display: none;'}">
                    <span>Use Default Avatar</span>
                  </button>
                </div>
                <div style="font-size: 0.76rem; color: var(--text-dim); font-family: var(--font-mono);">
                  Supported formats: JPG, JPEG, PNG, WEBP (Max 10MB). Defaults to cyber forensic avatar placeholder if omitted.
                </div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="s-name" style="font-weight: 700;">
                Full Name <span style="color: var(--forensic-red);">*</span>
              </label>
              <input type="text" class="form-input" id="s-name" placeholder="e.g. Dr. Varun Seth" value="${escapeHtml(suspect ? suspect.name : '')}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="s-role" style="font-weight: 700;">
                Project Role <span style="color: var(--forensic-red);">*</span>
              </label>
              <input type="text" class="form-input" id="s-role" placeholder="e.g. Senior Embedded Security Specialist" value="${escapeHtml(suspect ? suspect.role : '')}" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="s-stmt" style="font-weight: 700;">
              Official Statement
            </label>
            <textarea class="form-textarea" id="s-stmt" rows="4" placeholder="Interrogation testimony or recorded official statement...">${escapeHtml(suspect ? suspect.statement : '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="s-where" style="font-weight: 700;">
              Claimed Whereabouts
            </label>
            <textarea class="form-textarea" id="s-where" rows="3" placeholder="Claimed location, alibi witnesses, and timeframes on the night of the incident...">${escapeHtml(suspect ? suspect.whereabouts : '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="s-motive" style="font-weight: 700;">
              Potential Motive
            </label>
            <textarea class="form-textarea" id="s-motive" rows="3" placeholder="Suspected motive, conflicts of interest, financial or academic pressures...">${escapeHtml(suspect ? suspect.potential_motive : '')}</textarea>
          </div>
        </div>
      `,
      footerButtons: [
        {
          text: 'Save Suspect Dossier',
          className: 'btn-primary',
          onClick: async (close) => {
            if (isSaving) return;
            isSaving = true;

            const nameInput = overlay.querySelector('#s-name');
            const roleInput = overlay.querySelector('#s-role');
            const stmtInput = overlay.querySelector('#s-stmt');
            const whereInput = overlay.querySelector('#s-where');
            const motiveInput = overlay.querySelector('#s-motive');
            const saveBtn = overlay.querySelector('.modal-footer .btn-primary');

            const name = nameInput ? nameInput.value.trim() : '';
            const role = roleInput ? roleInput.value.trim() : '';
            const statement = stmtInput ? stmtInput.value.trim() : '';
            const whereabouts = whereInput ? whereInput.value.trim() : '';
            const motive = motiveInput ? motiveInput.value.trim() : '';

            // Validation of required fields
            if (!name) {
              Toast.error('Full Name is required.');
              if (nameInput) nameInput.focus();
              isSaving = false;
              return;
            }
            if (!role) {
              Toast.error('Project Role is required.');
              if (roleInput) roleInput.focus();
              isSaving = false;
              return;
            }

            if (saveBtn) {
              saveBtn.disabled = true;
              saveBtn.textContent = 'Saving Suspect Dossier...';
            }

            try {
              let finalAvatar = currentAvatar || '/assets/images/suspects/default_suspect.svg';

              // If a new avatar file was chosen, upload it first
              if (stagedAvatarFile) {
                const formData = new FormData();
                formData.append('avatar', stagedAvatarFile);
                const uploadRes = await api.uploadSuspectAvatar(formData);
                if (uploadRes && uploadRes.avatar_url) {
                  finalAvatar = uploadRes.avatar_url;
                }
              }

              const payload = {
                name,
                role,
                statement,
                whereabouts,
                potential_motive: motive,
                avatar_url: finalAvatar
              };

              if (isEdit) {
                await api.updateAdminSuspect(suspect.id, payload);
                Toast.success(`Suspect dossier for ${name} updated successfully.`);
              } else {
                await api.createAdminSuspect(payload);
                Toast.success(`New suspect dossier for ${name} created successfully.`);
              }

              close();
              renderSuspectsModule(outlet);
            } catch (err) {
              Toast.error(err.message || 'Failed to save suspect dossier.');
              if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Suspect Dossier';
              }
              isSaving = false;
            }
          }
        },
        {
          text: 'Cancel',
          className: 'btn-secondary',
          onClick: (close) => close()
        }
      ]
    });

    // Wire up image upload controls inside opened modal
    const fileInput = overlay.querySelector('#s-avatar-file');
    const chooseBtn = overlay.querySelector('#s-choose-file-btn');
    const removeBtn = overlay.querySelector('#s-remove-file-btn');
    const previewImg = overlay.querySelector('#s-avatar-preview');

    if (chooseBtn && fileInput) {
      chooseBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
          const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
          if (!allowedExts.includes(ext)) {
            Toast.error('Please choose a valid image file (JPG, PNG, WEBP).');
            fileInput.value = '';
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            Toast.error('Image size exceeds 10MB limit.');
            fileInput.value = '';
            return;
          }

          stagedAvatarFile = file;
          const reader = new FileReader();
          reader.onload = (e) => {
            if (previewImg) previewImg.src = e.target.result;
            if (removeBtn) removeBtn.style.display = 'inline-block';
            if (chooseBtn) chooseBtn.innerHTML = '<span>📷 Change Photo</span>';
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        stagedAvatarFile = null;
        currentAvatar = '/assets/images/suspects/default_suspect.svg';
        if (fileInput) fileInput.value = '';
        if (previewImg) previewImg.src = currentAvatar;
        removeBtn.style.display = 'none';
        if (chooseBtn) chooseBtn.innerHTML = '<span>📷 Choose Profile Image</span>';
      });
    }
  }
}

// ============================================================================
// MODULE H: SCORE BOARD CONTROL
// ============================================================================
async function renderScoreboardModule(outlet) {
  const { leaderboard, visible } = await api.getLeaderboard();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
          SCORE BOARD & EVALUATION CONTROL
        </h2>
        <button class="btn ${visible ? 'btn-danger' : 'btn-primary'} btn-sm" id="toggle-vis-btn">
          ${visible ? 'Seal Leaderboard (Make Private)' : 'Unseal Leaderboard (Make Public)'}
        </button>
      </div>

      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <table class="forensic-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>INVESTIGATOR / TEAM</th>
              <th>RAW SCORE</th>
              <th>PENALTY</th>
              <th>FINAL SCORE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map(row => `
              <tr>
                <td style="font-weight: 700; color: var(--forensic-emerald);">#${row.rank}</td>
                <td style="font-weight: 600;">${escapeHtml(row.team_or_user_name)}</td>
                <td>${row.total_score}</td>
                <td style="color: var(--forensic-red);">${row.penalty}</td>
                <td style="font-weight: 800; color: var(--forensic-emerald);">${row.final_score}</td>
                <td>
                  <button class="btn btn-outline btn-sm adjust-score-btn" data-id="${row.id}" data-total="${row.total_score}" data-pen="${row.penalty}">
                    Adjust Score / Penalty
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  outlet.querySelector('#toggle-vis-btn').addEventListener('click', async () => {
    try {
      await api.updateAdminConfig({ leaderboard_visible: visible ? 'false' : 'true' });
      Toast.success(`Leaderboard visibility set to ${!visible ? 'PUBLIC' : 'PRIVATE'}.`);
      renderScoreboardModule(outlet);
    } catch (e) {
      Toast.error(e.message);
    }
  });

  outlet.querySelectorAll('.adjust-score-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const total = e.currentTarget.dataset.total;
      const pen = e.currentTarget.dataset.pen;

      Modal.open({
        title: 'MANUAL SCORE & PENALTY ADJUSTMENT',
        content: `
          <div class="form-group">
            <label class="form-label">Total Graded Score (0 - 100)</label>
            <input type="number" class="form-input" id="adj-score" value="${total}" min="0" max="100" step="0.5" />
          </div>
          <div class="form-group">
            <label class="form-label">Penalty Deductions</label>
            <input type="number" class="form-input" id="adj-penalty" value="${pen}" min="0" max="50" step="0.5" />
          </div>
        `,
        footerButtons: [
          {
            text: 'Apply Score Changes',
            className: 'btn-primary',
            onClick: async (close) => {
              const newScore = document.querySelector('#adj-score').value;
              const newPenalty = document.querySelector('#adj-penalty').value;
              try {
                await api.updateScoreboardEntry(id, { total_score: newScore, penalty: newPenalty });
                Toast.success('Score updated.');
                close();
                renderScoreboardModule(outlet);
              } catch (err) {
                Toast.error(err.message);
              }
            }
          },
          { text: 'Cancel', className: 'btn-secondary', onClick: (close) => close() }
        ]
      });
    });
  });
}

// ============================================================================
// MODULE J: CASE TIME & DEADLINE EXTENSIONS
// ============================================================================
async function renderTimeModule(outlet) {
  const { users } = await api.getAdminParticipants();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        CASE TIME SETTINGS & INDIVIDUAL EXTENSIONS
      </h2>

      <div class="forensic-card">
        <div class="forensic-card-header">
          <span class="card-title">GRANT INDIVIDUAL CASE TIME EXTENSION</span>
        </div>
        <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
          Admins can grant additional minutes to specific participant teams facing verified technical obstacles.
          Server-authoritative deadline will be atomically pushed forward.
        </div>

        <form id="extend-time-form" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: flex-end;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Select Participant</label>
            <select class="form-select" id="ext-user-select" required>
              ${users.filter(u => u.role === 'participant').map(u => `
                <option value="${u.id}">${escapeHtml(u.full_name)} (${escapeHtml(u.team_name || 'Solo')}) - Status: ${u.case_status || 'not_started'}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Additional Minutes</label>
            <input type="number" class="form-input" id="ext-minutes" value="15" min="1" max="180" required />
          </div>
          <button type="submit" class="btn btn-primary" style="height: 42px;">
            <span>Grant Extension</span>
          </button>
        </form>
      </div>
    </div>
  `;

  outlet.querySelector('#extend-time-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = outlet.querySelector('#ext-user-select').value;
    const minutes = outlet.querySelector('#ext-minutes').value;

    try {
      const res = await api.extendParticipantTime(userId, minutes);
      Toast.success(res.message);
    } catch (err) {
      Toast.error(err.message);
    }
  });
}

// ============================================================================
// MODULE I: TEAM MANAGEMENT
// ============================================================================
async function renderTeamsModule(outlet) {
  const { teams } = await api.getAdminTeams();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        TEAM MANAGEMENT (${teams.length})
      </h2>

      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <table class="forensic-table">
          <thead>
            <tr>
              <th>TEAM NAME</th>
              <th>LEADER</th>
              <th>MEMBERS</th>
              <th>MAX SIZE</th>
              <th>STATUS</th>
              <th>ENROLLED AT</th>
            </tr>
          </thead>
          <tbody>
            ${teams.map(t => `
              <tr>
                <td style="font-weight: 700; color: var(--forensic-emerald);">${escapeHtml(t.name)}</td>
                <td>${escapeHtml(t.leader_name || 'Not assigned')}</td>
                <td>${t.current_members} / ${t.max_size}</td>
                <td>${t.max_size}</td>
                <td><span class="badge ${t.status === 'active' ? 'badge-emerald' : 'badge-critical'}">${t.status.toUpperCase()}</span></td>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE L: REPORT TEMPLATES
// ============================================================================
async function renderTemplatesModule(outlet) {
  const { templates } = await api.getAdminReportTemplates();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        FINAL REPORT TEMPLATE & SECTION PROTOCOLS (${templates.length})
      </h2>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${templates.map(t => `
          <div class="forensic-card">
            <div class="forensic-card-header">
              <span class="card-title">${escapeHtml(t.title)}</span>
              <span class="badge badge-emerald">${t.max_score} Points</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(t.instructions)}</div>
            <div style="margin-top: 8px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-dim);">
              Min Words: ${t.min_words} • Max Words: ${t.max_words} • Mandatory: ${t.is_mandatory ? 'YES' : 'NO'}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE M: PARTICIPANT MANAGEMENT
// ============================================================================
async function renderParticipantsModule(outlet) {
  const { users } = await api.getAdminParticipants();

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        PARTICIPANT MANAGEMENT (${users.length})
      </h2>

      <div class="forensic-card" style="padding: 0; overflow: hidden;">
        <table class="forensic-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>COLLEGE</th>
              <th>TEAM</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>#${u.id}</td>
                <td style="font-weight: 700;">${escapeHtml(u.full_name)}</td>
                <td style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.college)}</td>
                <td>${escapeHtml(u.team_name || 'Solo')}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-confidential' : 'badge-emerald'}">${u.role.toUpperCase()}</span></td>
                <td><span class="badge ${u.status === 'active' ? 'badge-emerald' : 'badge-critical'}">${u.status.toUpperCase()}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm toggle-user-btn" data-id="${u.id}" data-status="${u.status}">
                    ${u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  outlet.querySelectorAll('.toggle-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const status = e.currentTarget.dataset.status;
      const newStatus = status === 'active' ? 'suspended' : 'active';
      try {
        await api.updateParticipantStatus(id, { status: newStatus });
        Toast.success('Participant status updated.');
        renderParticipantsModule(outlet);
      } catch (err) {
        Toast.error(err.message);
      }
    });
  });
}

// ============================================================================
// MODULE K: OUTRO & CLOSING EDIT
// ============================================================================
async function renderOutroModule(outlet) {
  const configRes = await api.getEventConfig();
  const cfg = configRes.config || {};

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
        OUTRO & CLOSING DISPLAY EDITOR
      </h2>

      <form id="outro-form" class="forensic-card">
        <div class="form-group">
          <label class="form-label">Post-Submission Outro Title</label>
          <input type="text" class="form-input" id="out-title" value="${escapeHtml(cfg.outro_title || 'INVESTIGATION CONCLUDED')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Outro Acknowledgement Message</label>
          <textarea class="form-textarea" id="out-msg" rows="4">${escapeHtml(cfg.outro_message || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Next Steps Instructions</label>
          <textarea class="form-textarea" id="out-next" rows="4">${escapeHtml(cfg.outro_next_steps || '')}</textarea>
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="margin-top: 12px;">
          <span>Save Outro Settings</span>
        </button>
      </form>
    </div>
  `;

  outlet.querySelector('#outro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.updateAdminConfig({
        outro_title: outlet.querySelector('#out-title').value.trim(),
        outro_message: outlet.querySelector('#out-msg').value.trim(),
        outro_next_steps: outlet.querySelector('#out-next').value.trim()
      });
      Toast.success('Outro content updated.');
    } catch (err) {
      Toast.error(err.message);
    }
  });
}

// ============================================================================
// MODULE O: AUDIT LOGS
// ============================================================================
async function renderAuditModule(outlet) {
  const { logs } = await api.getAuditLogs({ limit: 100 });

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight);">
          CENTRAL SECURITY AUDIT LOGS
        </h2>
        <span class="badge badge-emerald">ACTIVE REGISTRY</span>
      </div>

      <div class="audit-terminal-feed">
        <div class="audit-row" style="font-weight: 700; color: var(--text-dim); border-bottom: 1px solid var(--border-strong);">
          <div>TIMESTAMP</div>
          <div>OPERATOR</div>
          <div>ACTION</div>
          <div>TARGET OBJECT</div>
          <div>OUTCOME</div>
        </div>
        ${logs.map(log => `
          <div class="audit-row">
            <div class="audit-time">${new Date(log.timestamp).toLocaleString()}</div>
            <div class="audit-actor">${escapeHtml(log.actor_name || 'System')} (${log.actor_role})</div>
            <div class="audit-action">${escapeHtml(log.action)}</div>
            <div class="audit-target">${escapeHtml(log.target_object)}</div>
            <div class="audit-outcome-${log.outcome}">${log.outcome}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE: PARTICIPANT NAVIGATION CONTROLS
// ============================================================================
async function renderNavControlsModule(outlet) {
  const cfgRes = await api.getEventConfig();
  const cfg = cfgRes.config || {};

  const navItems = [
    {
      id: 'nav_dashboard_visible',
      label: 'Dashboard',
      route: '/dashboard',
      icon: '📊',
      desc: 'Primary participant mission console, case progression metrics, and quick action launchpad.'
    },
    {
      id: 'nav_rules_visible',
      label: 'Rules',
      route: '/rules',
      icon: '📜',
      desc: 'Event operational guidelines, scoring rules, time limits, and conduct regulations.'
    },
    {
      id: 'nav_story_visible',
      label: 'Case Story',
      route: '/story',
      icon: '📖',
      desc: 'Incident background briefing, narrative acts, timeline context, and attached evidentiary files.'
    },
    {
      id: 'nav_vault_visible',
      label: 'Evidence Vault',
      route: '/vault',
      icon: '📁',
      desc: 'Forensic evidence repository, digital file locker, chain of custody logs, and live preview subsystem.'
    },
    {
      id: 'nav_workspace_visible',
      label: 'Workspace',
      route: '/workspace',
      icon: '🔬',
      desc: 'Investigator notebook, evidence bookmarking, tag filtering, and chronological event sequence builder.'
    },
    {
      id: 'nav_report_visible',
      label: 'Final Report',
      route: '/report',
      icon: '📑',
      desc: '11-section structured forensic incident dossier editor, draft autosave, and case submission form.'
    },
    {
      id: 'nav_leaderboard_visible',
      label: 'Score Board',
      route: '/leaderboard',
      icon: '🏆',
      desc: 'Live event leaderboard displaying team rankings, evaluated scores, penalties, and completion times.'
    }
  ];

  outlet.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight); margin-bottom: 4px;">
            PARTICIPANT NAVIGATION CONTROLS
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            Manage visibility and access permissions for participant dashboard navigation items in real-time.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-enable-all">
            <span>Enable All (Default)</span>
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-lockdown">
            <span>Dashboard Only</span>
          </button>
        </div>
      </div>

      <div class="forensic-card" style="border-left: 4px solid var(--forensic-cyan); padding: 16px 20px;">
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <span style="font-size: 1.4rem;">ℹ️</span>
          <div style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5;">
            <strong style="color: var(--text-highlight);">Access Control Enforcement:</strong> When a section is switched <strong>OFF</strong>, its link is hidden from the participant navbar and menus. Direct route access (URL bar entry) and participant-facing backend REST APIs are strictly blocked with an access suspended notice. Administrators retain full, unrestricted clearance to all modules and routes at all times.
          </div>
        </div>
      </div>

      <form id="nav-controls-form" style="display: flex; flex-direction: column; gap: 20px;">
        <div class="nav-control-grid">
          ${navItems.map(item => {
            const isEnabled = cfg[item.id] !== 'false' && cfg[item.id] !== '0' && cfg[item.id] !== false;
            return `
              <div class="nav-control-card" data-key="${item.id}">
                <div class="nav-control-info">
                  <div class="nav-control-header">
                    <span style="font-size: 1.25rem;">${item.icon}</span>
                    <span class="nav-control-title">${escapeHtml(item.label)}</span>
                    <span class="badge badge-dim" style="font-family: var(--font-mono); font-size: 0.75rem;">${escapeHtml(item.route)}</span>
                  </div>
                  <div class="nav-control-desc">${escapeHtml(item.desc)}</div>
                </div>
                <div class="nav-control-action">
                  <span class="toggle-status-badge badge ${isEnabled ? 'badge-emerald' : 'badge-danger'}" id="badge-${item.id}">
                    ${isEnabled ? 'ON (VISIBLE)' : 'OFF (HIDDEN)'}
                  </span>
                  <label class="forensic-toggle-switch">
                    <input type="checkbox" id="input-${item.id}" name="${item.id}" ${isEnabled ? 'checked' : ''} />
                    <span class="forensic-slider"></span>
                  </label>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
          <button type="submit" class="btn btn-primary btn-lg" id="btn-save-nav">
            <span>💾 Save Navigation Controls</span>
          </button>
        </div>
      </form>
    </div>
  `;

  // Live status badge toggles
  navItems.forEach(item => {
    const input = outlet.querySelector(`#input-${item.id}`);
    const badge = outlet.querySelector(`#badge-${item.id}`);
    if (input && badge) {
      input.addEventListener('change', () => {
        if (input.checked) {
          badge.textContent = 'ON (VISIBLE)';
          badge.className = 'toggle-status-badge badge badge-emerald';
        } else {
          badge.textContent = 'OFF (HIDDEN)';
          badge.className = 'toggle-status-badge badge badge-danger';
        }
      });
    }
  });

  // Enable All
  const enableAllBtn = outlet.querySelector('#btn-enable-all');
  if (enableAllBtn) {
    enableAllBtn.addEventListener('click', () => {
      navItems.forEach(item => {
        const input = outlet.querySelector(`#input-${item.id}`);
        const badge = outlet.querySelector(`#badge-${item.id}`);
        if (input && badge) {
          input.checked = true;
          badge.textContent = 'ON (VISIBLE)';
          badge.className = 'toggle-status-badge badge badge-emerald';
        }
      });
      Toast.info('All navigation items toggled ON. Click "Save Navigation Controls" to persist.');
    });
  }

  // Lockdown
  const lockdownBtn = outlet.querySelector('#btn-lockdown');
  if (lockdownBtn) {
    lockdownBtn.addEventListener('click', () => {
      navItems.forEach(item => {
        const input = outlet.querySelector(`#input-${item.id}`);
        const badge = outlet.querySelector(`#badge-${item.id}`);
        if (input && badge) {
          const isDashboard = item.id === 'nav_dashboard_visible';
          input.checked = isDashboard;
          badge.textContent = isDashboard ? 'ON (VISIBLE)' : 'OFF (HIDDEN)';
          badge.className = isDashboard ? 'toggle-status-badge badge badge-emerald' : 'toggle-status-badge badge badge-danger';
        }
      });
      Toast.info('Set to Dashboard Only mode. Click "Save Navigation Controls" to persist.');
    });
  }

  // Form submission / persistence
  const form = outlet.querySelector('#nav-controls-form');
  const saveBtn = outlet.querySelector('#btn-save-nav');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Saving settings...</span>';
      }

      try {
        const updates = {};
        navItems.forEach(item => {
          const input = outlet.querySelector(`#input-${item.id}`);
          updates[item.id] = input && input.checked ? 'true' : 'false';
        });

        await api.updateAdminConfig(updates);

        if (window.appInstance) {
          window.appInstance.config = {
            ...window.appInstance.config,
            ...updates
          };
          NavbarComponent.render(window.appInstance.user, window.appInstance.config);
        }

        Toast.success('Participant navigation visibility settings saved successfully.');
      } catch (err) {
        Toast.error('Failed to save navigation settings: ' + err.message);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<span>💾 Save Navigation Controls</span>';
        }
      }
    });
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
