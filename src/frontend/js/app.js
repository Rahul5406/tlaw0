import { api } from './api.js';
import { NavbarComponent } from './components/Navbar.js';
import { CaseTimer } from './components/CaseTimer.js';
import { AudioController } from './components/AudioController.js';
import { Toast } from './components/Toast.js';

// Page Imports
import { HomePage } from './pages/Home.js';
import { RegisterPage } from './pages/Register.js';
import { LoginPage } from './pages/Login.js';
import { EventRulesPage } from './pages/EventRules.js';
import { DashboardPage } from './pages/Dashboard.js';
import { CaseStoryPage } from './pages/CaseStory.js';
import { EvidenceVaultPage } from './pages/EvidenceVault.js';
import { WorkspacePage } from './pages/Workspace.js';
import { FinalReportPage } from './pages/FinalReport.js';
import { LeaderboardPage } from './pages/Leaderboard.js';
import { AdminPortalPage } from './pages/admin/AdminPortal.js';
import { SplashScreen } from './ts-dist/pages/SplashScreen.js';

class ForensicApplication {
  constructor() {
    this.user = null;
    this.session = null;
    this.config = {};
    this.api = api;
    this.routes = {
      '/': { component: HomePage, requiresAuth: false },
      '/register': { component: RegisterPage, requiresAuth: false },
      '/login': { component: LoginPage, requiresAuth: false },
      '/rules': { component: EventRulesPage, requiresAuth: false },
      '/dashboard': { component: DashboardPage, requiresAuth: true },
      '/story': { component: CaseStoryPage, requiresAuth: false },
      '/vault': { component: EvidenceVaultPage, requiresAuth: false },
      '/workspace': { component: WorkspacePage, requiresAuth: true },
      '/report': { component: FinalReportPage, requiresAuth: true },
      '/leaderboard': { component: LeaderboardPage, requiresAuth: false },
      '/admin': { component: AdminPortalPage, requiresAuth: true, requiresAdmin: true }
    };

    this.routeNavKeys = {
      '/dashboard': 'nav_dashboard_visible',
      '/rules': 'nav_rules_visible',
      '/story': 'nav_story_visible',
      '/vault': 'nav_vault_visible',
      '/workspace': 'nav_workspace_visible',
      '/report': 'nav_report_visible',
      '/leaderboard': 'nav_leaderboard_visible'
    };

    window.appInstance = this;
  }

  async init() {
    console.log('[TLA-026] Initializing Forensic Application Subsystem...');

    // 0. Fetch initial event config
    try {
      const cfgRes = await api.getEventConfig();
      this.config = cfgRes.config || {};
      NavbarComponent.setConfig(this.config);
    } catch (e) {
      this.config = {};
    }

    // 1. Restore User Authentication
    try {
      const meRes = await api.getMe();
      if (meRes && meRes.user) {
        this.setUser(meRes.user);
        this.session = meRes.session;
        CaseTimer.update(this.session);
      }
    } catch (e) {
      this.setUser(null);
    }

    // 2. Setup Top Command Bar Clock
    this.startServerClock();

    // 3. Attach Global Link Interceptor (HTML5 History API)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        this.navigate(href);
      }
    });

    // 4. Handle Browser History Navigation
    window.addEventListener('popstate', () => {
      this.resolveRoute();
    });

    // 5. Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-toggle-btn');
    const navLinks = document.getElementById('main-nav-links');
    if (mobileBtn && navLinks) {
      mobileBtn.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
    }

    // 6. Initialize Ambient Soundtrack Subsystem
    AudioController.init();

    // 7. Initial Route Resolution
    this.resolveRoute();

    // 8. Show welcome splash (split-flap departure board) over the ready app
    SplashScreen.show();
  }

  setUser(user) {
    this.user = user;
    NavbarComponent.render(this.user, this.config);
    if (!user) {
      this.session = null;
      CaseTimer.update(null);
    }
  }

  navigate(url) {
    window.history.pushState(null, null, url);
    // Close mobile menu if open
    const navLinks = document.getElementById('main-nav-links');
    if (navLinks) navLinks.classList.remove('open');
    this.resolveRoute();
  }

  async resolveRoute() {
    const fullPath = window.location.pathname;
    const search = window.location.search;
    const baseRoute = fullPath.split('?')[0] || '/';
    document.body.setAttribute('data-route', baseRoute);

    // Notify Audio Controller of route transitions (e.g. pause in admin portal)
    AudioController.onRouteChange(baseRoute);

    const routeConfig = this.routes[baseRoute] || this.routes['/'];
    const container = document.getElementById('main-container');

    // Route Protection Guards
    if (routeConfig.requiresAuth && !this.user) {
      Toast.warning('Access restricted. Please authenticate credentials.');
      window.history.replaceState(null, null, '/login');
      LoginPage.render(container);
      NavbarComponent.render(this.user, this.config);
      return;
    }

    if (routeConfig.requiresAdmin && (!this.user || this.user.role !== 'admin')) {
      Toast.error('Administrative security clearance required.');
      window.history.replaceState(null, null, '/');
      HomePage.render(container);
      NavbarComponent.render(this.user, this.config);
      return;
    }

    // Fetch latest config to keep navigation visibility current
    try {
      const cfgRes = await api.getEventConfig();
      if (cfgRes && cfgRes.config) {
        this.config = cfgRes.config;
      }
    } catch (e) {}

    // Check if section is disabled by administrator for participants
    const navKey = this.routeNavKeys[baseRoute];
    const isAdmin = this.user && this.user.role === 'admin';

    if (navKey && !isAdmin) {
      const isEnabled = this.config[navKey] !== 'false' && this.config[navKey] !== '0' && this.config[navKey] !== false;
      const isLeaderboardExtra = baseRoute === '/leaderboard' ? (this.config.leaderboard_visible !== 'false' && this.config.leaderboard_visible !== '0') : true;

      if (!isEnabled || !isLeaderboardExtra) {
        NavbarComponent.render(this.user, this.config);
        Toast.warning('This section is currently disabled by the administrator.');
        container.innerHTML = `
          <div style="max-width: 680px; margin: 60px auto; padding: 20px;">
            <div class="forensic-card" style="border-left: 4px solid var(--forensic-amber); text-align: center; padding: 48px 32px;">
              <div style="font-size: 3.2rem; margin-bottom: 16px;">🔒</div>
              <div style="display: inline-block; margin-bottom: 12px;">
                <span class="badge badge-warning" style="font-family: var(--font-mono); font-size: 0.8rem; padding: 4px 10px;">ACCESS RESTRICTED</span>
              </div>
              <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-highlight); letter-spacing: 0.03em; margin-bottom: 12px;">
                ACCESS SUSPENDED
              </h2>
              <p style="font-size: 1rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 28px;">
                This section is currently disabled by the administrator. Please check back later or proceed with other authorized case procedures.
              </p>
              <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <a href="/" data-link class="btn btn-secondary">
                  <span>&larr; Return to Case Briefing</span>
                </a>
                ${(this.config.nav_dashboard_visible !== 'false' && this.user) ? `
                  <a href="/dashboard" data-link class="btn btn-primary">
                    <span>Go to Dashboard &rarr;</span>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        `;
        window.scrollTo(0, 0);
        return;
      }
    }

    // Re-render Navbar to reflect active link
    NavbarComponent.render(this.user, this.config);

    // If authenticated participant, ensure timer state is current
    if (this.user && this.user.role === 'participant') {
      try {
        const { session } = await api.getCaseSession();
        this.session = session;
        CaseTimer.update(this.session);
      } catch (e) {}
    }


    // Render target view
    try {
      await routeConfig.component.render(container);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Render error:', err);
      container.innerHTML = `
        <div class="alert alert-danger" style="margin: 40px auto; max-width: 600px;">
          Failed to load module view: ${err.message}
        </div>
      `;
    }
  }

  startServerClock() {
    const clockEl = document.getElementById('server-clock-display');
    const update = () => {
      if (clockEl) {
        const d = new Date();
        clockEl.textContent = `SYSTEM CLOCK // ${d.toISOString().slice(0, 19).replace('T', ' ')} IST`;
      }
    };
    update();
    setInterval(update, 1000);
  }
}

// Boot application
const app = new ForensicApplication();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
