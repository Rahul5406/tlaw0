import { api } from '../api.js';
import { Toast } from './Toast.js';

export class NavbarComponent {
  static currentConfig = {};

  static setConfig(cfg) {
    if (cfg && typeof cfg === 'object') {
      this.currentConfig = cfg;
    }
  }

  static isVisible(key, config = null) {
    const cfg = config || this.currentConfig || (window.appInstance ? window.appInstance.config : null);
    if (!cfg) return true;
    const val = cfg[key];
    if (val === undefined || val === null) return true;
    return val !== 'false' && val !== '0' && val !== false;
  }

  static render(user, config = null) {
    if (config) {
      this.setConfig(config);
    }
    const navLinks = document.getElementById('main-nav-links');
    const authMount = document.getElementById('nav-auth-mount');
    const path = window.location.pathname;

    if (!navLinks || !authMount) return;

    let linksHtml = '';

    if (!user) {
      const showRules = this.isVisible('nav_rules_visible');
      const showStory = this.isVisible('nav_story_visible');
      const showLeaderboard = this.isVisible('nav_leaderboard_visible') && this.isVisible('leaderboard_visible');

      linksHtml = `
        <li><a href="/" data-link class="nav-link ${path === '/' ? 'active' : ''}">Briefing</a></li>
        ${showRules ? `<li><a href="/rules" data-link class="nav-link ${path === '/rules' ? 'active' : ''}">Event Rules</a></li>` : ''}
        ${showStory ? `<li><a href="/story" data-link class="nav-link ${path === '/story' ? 'active' : ''}">Case Story</a></li>` : ''}
        ${showLeaderboard ? `<li><a href="/leaderboard" data-link class="nav-link ${path === '/leaderboard' ? 'active' : ''}">Score Board</a></li>` : ''}
      `;

      authMount.innerHTML = `
        <a href="/login" data-link class="btn btn-secondary btn-sm">Investigator Login</a>
        <a href="/register" data-link class="btn btn-primary btn-sm">Register Team</a>
      `;
    } else {
      if (user.role === 'admin') {
        linksHtml = `
          <li><a href="/" data-link class="nav-link ${path === '/' ? 'active' : ''}">Home</a></li>
          <li><a href="/admin" data-link class="nav-link ${path.startsWith('/admin') ? 'active' : ''}" style="color: var(--forensic-cyan); font-weight: 700;">Admin Command</a></li>
          <li><a href="/vault" data-link class="nav-link ${path === '/vault' ? 'active' : ''}">Evidence Vault</a></li>
          <li><a href="/story" data-link class="nav-link ${path === '/story' ? 'active' : ''}">Case Story</a></li>
          <li><a href="/leaderboard" data-link class="nav-link ${path === '/leaderboard' ? 'active' : ''}">Score Board</a></li>
        `;
      } else {
        const showDashboard = this.isVisible('nav_dashboard_visible');
        const showRules = this.isVisible('nav_rules_visible');
        const showStory = this.isVisible('nav_story_visible');
        const showVault = this.isVisible('nav_vault_visible');
        const showWorkspace = this.isVisible('nav_workspace_visible');
        const showReport = this.isVisible('nav_report_visible');
        const showLeaderboard = this.isVisible('nav_leaderboard_visible') && this.isVisible('leaderboard_visible');

        linksHtml = `
          ${showDashboard ? `<li><a href="/dashboard" data-link class="nav-link ${path === '/dashboard' ? 'active' : ''}">Dashboard</a></li>` : ''}
          ${showRules ? `<li><a href="/rules" data-link class="nav-link ${path === '/rules' ? 'active' : ''}">Rules</a></li>` : ''}
          ${showStory ? `<li><a href="/story" data-link class="nav-link ${path === '/story' ? 'active' : ''}">Story</a></li>` : ''}
          ${showVault ? `<li><a href="/vault" data-link class="nav-link ${path === '/vault' ? 'active' : ''}">Evidence Vault</a></li>` : ''}
          ${showWorkspace ? `<li><a href="/workspace" data-link class="nav-link ${path === '/workspace' ? 'active' : ''}">Workspace</a></li>` : ''}
          ${showReport ? `<li><a href="/report" data-link class="nav-link ${path === '/report' ? 'active' : ''}">Final Report</a></li>` : ''}
          ${showLeaderboard ? `<li><a href="/leaderboard" data-link class="nav-link ${path === '/leaderboard' ? 'active' : ''}">Score Board</a></li>` : ''}
        `;
      }

      authMount.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; flex-direction: column; text-align: right; line-height: 1.2;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-highlight);">${escapeHtml(user.full_name)}</span>
            <span style="font-size: 0.72rem; color: var(--forensic-emerald); font-family: var(--font-mono);">
              ${user.role === 'admin' ? '[CHIEF EVALUATOR]' : user.team_name ? `TEAM: ${escapeHtml(user.team_name)}` : '[SOLO AGENT]'}
            </span>
          </div>
          <button id="logout-btn" class="btn btn-outline btn-sm" title="Sign out of forensic session">Logout</button>
        </div>
      `;

      const logoutBtn = authMount.querySelector('#logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await api.logout();
          Toast.info('Investigator session terminated.');
          if (window.appInstance) {
            window.appInstance.setUser(null);
            window.appInstance.navigate('/');
          }
        });
      }
    }

    navLinks.innerHTML = linksHtml;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
