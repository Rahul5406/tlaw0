import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { CaseTimer } from '../components/CaseTimer.js';
import { AudioController } from '../components/AudioController.js';

export class DashboardPage {
  static async render(container) {
    let sessionData = null;
    let metricsData = null;
    let user = null;
    let cfg = {};

    try {
      const [userRes, sessionRes, configRes] = await Promise.all([
        api.getMe(),
        api.getCaseSession(),
        api.getEventConfig().catch(() => ({ config: {} }))
      ]);
      user = userRes.user;
      sessionData = sessionRes.session;
      metricsData = sessionRes.metrics;
      cfg = (configRes && configRes.config) || {};

      // Update global timer state
      CaseTimer.update(sessionData);
    } catch (err) {
      Toast.error('Failed to load investigator dashboard: ' + err.message);
      return;
    }

    const isVis = (key) => cfg[key] !== 'false' && cfg[key] !== '0' && cfg[key] !== false;
    const isStarted = sessionData && (sessionData.status === 'in_progress' || sessionData.status === 'submitted' || sessionData.status === 'expired');
    const showVault = isVis('nav_vault_visible');
    const showWorkspace = isVis('nav_workspace_visible');
    const showReport = isVis('nav_report_visible');
    const showLeaderboard = isVis('nav_leaderboard_visible') && isVis('leaderboard_visible');
    const showStory = isVis('nav_story_visible');


    container.innerHTML = `
      <div class="page-stack">
        <!-- Top Case Overview Banner -->
        <div class="forensic-card" style="border-left: 4px solid var(--forensic-emerald); background: linear-gradient(90deg, rgba(28, 14, 17, 0.75) 0%, rgba(14, 7, 9, 0.7) 100%);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div style="min-width: 0;">
              <div class="badge-row" style="margin-bottom: 10px;">
                <span class="badge badge-emerald">ASSIGNED CASE: TLA-026</span>
                <span class="badge badge-confidential">PROJECT AETHER</span>
                <span class="badge badge-${sessionData.status === 'in_progress' ? 'emerald' : sessionData.status === 'submitted' ? 'secondary' : 'critical'}">
                  STATUS: ${sessionData.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <h1 style="font-size: 1.9rem; font-weight: 800; color: var(--text-highlight); letter-spacing: 0.04em; line-height: 1.25;">
                CASE TLA-026: THE LAST ARTIFACT
              </h1>
              <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 6px; line-height: 1.6;">
                Lead Investigator: <strong style="color: var(--text-main);">${escapeHtml(user.full_name)}</strong>
                • Team: <strong style="color: var(--forensic-cyan);">${escapeHtml(user.team_name || 'Individual Operative')}</strong>
                • Institution: <strong>${escapeHtml(user.college)}</strong>
              </p>
              <!-- Dashboard Audio Control Mount -->
              <div id="dashboard-audio-mount" style="margin-top: 10px;"></div>
            </div>

            <!-- Start Case / Investigation Controls -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              ${!isStarted ? `
                <button class="btn btn-primary btn-lg" id="start-case-btn" style="box-shadow: 0 0 20px var(--forensic-emerald-glow);">
                  <span>COMMENCE INVESTIGATION (START TIMER)</span>
                </button>
                <span style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono);">
                  Allocates 180m server window. Irreversible once engaged.
                </span>
              ` : sessionData.status === 'in_progress' ? `
                <div style="text-align: right;">
                  <span class="badge badge-emerald" style="padding: 8px 14px; font-size: 0.88rem;">
                    ● ACTIVE INVESTIGATION WINDOW
                  </span>
                  <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
                    Server Deadline: ${new Date(sessionData.deadline_at).toLocaleTimeString()}
                  </div>
                </div>
              ` : sessionData.status === 'submitted' ? `
                <div style="text-align: right;">
                  <span class="badge badge-emerald" style="padding: 8px 14px; font-size: 0.88rem;">
                    ✓ REPORT SUBMISSION ARCHIVED
                  </span>
                </div>
              ` : `
                <div style="text-align: right;">
                  <span class="badge badge-critical" style="padding: 8px 14px; font-size: 0.88rem;">
                    ⚠ INVESTIGATION TIME EXPIRED
                  </span>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Investigation Metrics & Progress Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          ${showVault ? `
            <div class="forensic-card stat-card">
              <div class="stat-label">Evidence Available</div>
              <div class="stat-value">
                ${metricsData.evidence_available} <span class="stat-unit">FILES</span>
              </div>
              <a href="/vault" data-link class="stat-link" style="color: var(--forensic-emerald);">Browse Evidence Vault &rarr;</a>
            </div>
          ` : ''}

          ${showWorkspace ? `
            <div class="forensic-card stat-card">
              <div class="stat-label">Workspace Notes</div>
              <div class="stat-value">
                ${metricsData.notes_count} <span class="stat-unit" style="color: var(--forensic-teal);">ENTRIES</span>
              </div>
              <a href="/workspace" data-link class="stat-link" style="color: var(--forensic-teal);">Open Notes & Clues &rarr;</a>
            </div>

            <div class="forensic-card stat-card">
              <div class="stat-label">Timeline Reconstruction</div>
              <div class="stat-value">
                ${metricsData.timeline_count} <span class="stat-unit" style="color: var(--forensic-amber);">EVENTS</span>
              </div>
              <a href="/workspace?tab=timeline" data-link class="stat-link" style="color: var(--forensic-amber);">View Chronology Grid &rarr;</a>
            </div>
          ` : ''}

          ${showReport ? `
            <div class="forensic-card stat-card">
              <div class="stat-label">Final Report Dossier</div>
              <div class="stat-value" style="font-size: 1.2rem; margin: 4px 0;">
                ${metricsData.final_report ? `<span style="color: var(--forensic-emerald);">${metricsData.final_report.status.toUpperCase()}</span>` : metricsData.has_draft ? '<span style="color: var(--forensic-amber);">DRAFT IN PROGRESS</span>' : '<span style="color: var(--text-dim);">NOT STARTED</span>'}
              </div>
              <a href="/report" data-link class="stat-link" style="color: var(--forensic-teal);">Open Report Editor &rarr;</a>
            </div>
          ` : ''}

          ${showLeaderboard ? `
            <div class="forensic-card stat-card">
              <div class="stat-label">Score Board Standing</div>
              <div class="stat-value" style="font-size: 1.55rem;">
                ${metricsData.score !== null ? `${metricsData.score} <span class="stat-unit" style="font-size: 0.85rem;">PTS (#${metricsData.rank})</span>` : '<span style="color: var(--text-dim);">PENDING</span>'}
              </div>
              <a href="/leaderboard" data-link class="stat-link" style="color: var(--forensic-emerald);">Inspect Leaderboard &rarr;</a>
            </div>
          ` : ''}
        </div>

        <!-- Investigation Actions & Quick Hub -->
        <div style="display: grid; grid-template-columns: ${showReport ? '1fr 1fr' : '1fr'}; gap: 20px;">
          <div class="forensic-card">
            <div class="forensic-card-header">
              <span class="card-title">CASE INTELLIGENCE & CRIME BOARD</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${showStory ? `
                <a href="/story" data-link class="btn btn-secondary" style="justify-content: flex-start;">
                  <span>📖 Incident Narrative & Victim Background</span>
                </a>
              ` : ''}
              ${showVault ? `
                <a href="/vault" data-link class="btn btn-secondary" style="justify-content: flex-start;">
                  <span>📂 Digital Evidence Vault (Logs, PCAP, Hex, CCTV, Audio)</span>
                </a>
              ` : ''}
              ${showWorkspace ? `
                <a href="/workspace" data-link class="btn btn-secondary" style="justify-content: flex-start;">
                  <span>🔍 Investigator Workspace & Timeline Builder</span>
                </a>
              ` : ''}
              ${!showStory && !showVault && !showWorkspace ? `
                <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                  No auxiliary case hubs are currently active.
                </div>
              ` : ''}
            </div>
          </div>

          ${showReport ? `
            <div class="forensic-card">
              <div class="forensic-card-header">
                <span class="card-title">FINAL SUBMISSION DESK</span>
              </div>
              <div style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px;">
                Your investigation must culminate in the formal 11-section forensic report.
                Drafts are automatically saved every 30 seconds. Ensure all suspect alibis are cross-examined against physical logs.
              </div>
              <a href="/report" data-link class="btn btn-primary" style="width: 100%;">
                <span>Access Official 11-Section Forensic Editor &rarr;</span>
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Handle Start Case Button
    const startBtn = container.querySelector('#start-case-btn');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        if (!sessionData.rules_acknowledged) {
          Toast.warning('You must acknowledge the Event Rules before beginning the case.');
          if (window.appInstance) window.appInstance.navigate('/rules');
          return;
        }

        const confirmed = await Modal.confirm({
          title: 'COMMENCE CASE TLA-026 INVESTIGATION',
          message: 'Starting the case engages the official 180-minute (3-hour) server-authoritative countdown. Browser reloads, closing tabs, and device changes WILL NOT pause or reset the timer. Are you ready to commence?',
          confirmText: 'Commence Investigation Now',
          cancelText: 'Cancel',
          isDanger: false
        });

        if (confirmed) {
          startBtn.disabled = true;
          startBtn.innerHTML = '<span class="pulse-dot"></span> Engaging server timer...';

          try {
            const startRes = await api.startCase();
            Toast.success(startRes.message);
            CaseTimer.update(startRes.session);
            // Re-render dashboard with updated in_progress state
            DashboardPage.render(container);
          } catch (err) {
            Toast.error(err.message);
            startBtn.disabled = false;
            startBtn.innerHTML = '<span>COMMENCE INVESTIGATION (START TIMER)</span>';
          }
        }
      });
    }

    // Mount Dashboard Audio Widget
    AudioController.renderMount('dashboard-audio-mount');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
