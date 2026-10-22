import { api } from '../api.js';
import { Toast } from '../components/Toast.js';

export class LeaderboardPage {
  static async render(container) {
    let leaderboardData = [];
    let isVisible = true;
    let tieBreakingPolicy = '';
    let lastUpdated = '';

    async function loadLeaderboard() {
      try {
        const res = await api.getLeaderboard();
        isVisible = res.visible;
        leaderboardData = res.leaderboard || [];
        tieBreakingPolicy = res.tie_breaking_policy || 'Primary: Final Score -> Secondary: Least Time -> Tertiary: Submission Timestamp';
        lastUpdated = res.last_updated;
      } catch (e) {
        Toast.error('Failed to load scoreboard data: ' + e.message);
      }
    }

    await loadLeaderboard();

    function formatDuration(seconds) {
      if (!seconds) return '--';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h}h ${m}m ${s}s`;
    }

    container.innerHTML = `
      <div style="max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Header Banner -->
        <div class="forensic-card" style="border-left: 4px solid var(--forensic-emerald);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span class="badge badge-emerald">OFFICIAL STANDINGS</span>
                <span class="badge badge-confidential">CASE TLA-026</span>
              </div>
              <h1 style="font-size: 2rem; font-weight: 800; color: var(--text-highlight);">
                CYRA FORENSIC SCORE BOARD & RANKINGS
              </h1>
              <p style="font-size: 0.92rem; color: var(--text-muted); margin-top: 4px;">
                Official evaluation standings based on timeline precision, evidence correlation, suspect interrogation, and report rigor.
              </p>
            </div>
            <div style="text-align: right;">
              <button class="btn btn-secondary btn-sm" id="refresh-board-btn">
                <span>🔄 Refresh Standings</span>
              </button>
              <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); margin-top: 6px;">
                Last Synced: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Live'}
              </div>
            </div>
          </div>
        </div>

        <!-- Tie-Breaking Protocol Callout -->
        <div class="alert alert-info" style="margin-bottom: 0;">
          <div>
            <strong>OFFICIAL TIE-BREAKING POLICY:</strong> ${escapeHtml(tieBreakingPolicy)}
          </div>
        </div>

        <!-- Scoreboard Table Card -->
        <div class="forensic-card" style="padding: 0; overflow: hidden;">
          ${!isVisible ? `
            <div style="padding: 48px 24px; text-align: center;">
              <div style="font-size: 2rem; margin-bottom: 12px;">🔒</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 8px;">
                Score Board Currently Sealed
              </h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 500px; margin: 0 auto;">
                The official score board has been sealed by the CyRA Examination Board while final report evaluations and integrity audits are conducted.
              </p>
            </div>
          ` : leaderboardData.length === 0 ? `
            <div style="padding: 48px 24px; text-align: center; color: var(--text-muted);">
              No submitted investigations evaluated yet. Rankings will appear as reports are reviewed.
            </div>
          ` : `
            <div class="csv-table-wrapper" style="max-height: none;">
              <table class="forensic-table">
                <thead>
                  <tr>
                    <th style="width: 80px;">RANK</th>
                    <th>INVESTIGATOR / TEAM</th>
                    <th style="text-align: right;">RAW SCORE</th>
                    <th style="text-align: right;">PENALTY</th>
                    <th style="text-align: right;">FINAL SCORE</th>
                    <th style="text-align: right;">TIME ELAPSED</th>
                    <th style="text-align: center;">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  ${leaderboardData.map((row) => {
                    let rankBadge = `<span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.95rem;">#${row.rank}</span>`;
                    let rankStyle = '';
                    if (row.rank === 1) {
                      rankBadge = `<span class="badge badge-emerald" style="font-size: 0.8rem;">🥇 1ST</span>`;
                      rankStyle = 'background-color: rgba(225, 29, 72, 0.07);';
                    } else if (row.rank === 2) {
                      rankBadge = `<span class="badge badge-secondary" style="font-size: 0.8rem;">🥈 2ND</span>`;
                    } else if (row.rank === 3) {
                      rankBadge = `<span class="badge badge-background" style="font-size: 0.8rem;">🥉 3RD</span>`;
                    }

                    return `
                      <tr style="${rankStyle}">
                        <td>${rankBadge}</td>
                        <td>
                          <div style="font-weight: 700; color: var(--text-highlight); font-size: 0.95rem;">
                            ${escapeHtml(row.team_or_user_name)}
                          </div>
                          <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono);">
                            Submitted: ${row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() + ' ' + new Date(row.submitted_at).toLocaleTimeString() : 'In Progress'}
                          </div>
                        </td>
                        <td style="text-align: right; font-family: var(--font-mono);">${Number(row.total_score || 0).toFixed(1)}</td>
                        <td style="text-align: right; font-family: var(--font-mono); color: ${Number(row.penalty) > 0 ? 'var(--forensic-red)' : 'var(--text-dim)'};">
                          ${Number(row.penalty) > 0 ? `-${Number(row.penalty).toFixed(1)}` : '0.0'}
                        </td>
                        <td style="text-align: right; font-family: var(--font-mono); font-size: 1.1rem; font-weight: 800; color: var(--forensic-emerald);">
                          ${Number(row.final_score || 0).toFixed(1)}
                        </td>
                        <td style="text-align: right; font-family: var(--font-mono); color: var(--text-muted); font-size: 0.82rem;">
                          ${formatDuration(row.time_taken_seconds)}
                        </td>
                        <td style="text-align: center;">
                          <span class="badge ${row.investigation_status === 'submitted' || row.reports_submitted > 0 ? 'badge-emerald' : 'badge-secondary'}">
                            ${row.investigation_status === 'submitted' || row.reports_submitted > 0 ? 'VERIFIED' : 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    const refreshBtn = container.querySelector('#refresh-board-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        await loadLeaderboard();
        LeaderboardPage.render(container);
        Toast.success('Score Board refreshed.');
      });
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
