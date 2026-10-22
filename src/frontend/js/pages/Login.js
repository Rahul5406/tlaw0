import { api } from '../api.js';
import { Toast } from '../components/Toast.js';

export class LoginPage {
  static render(container) {
    container.innerHTML = `
      <div style="max-width: 480px; margin: 40px auto;">
        <div class="forensic-card">
          <div class="forensic-card-header">
            <div>
              <span class="card-title">INVESTIGATOR AUTHENTICATION</span>
              <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 4px;">
                CENTRAL SECURE GATEWAY // CASE TLA-026
              </div>
            </div>
            <span class="badge badge-emerald">SECURE</span>
          </div>

          <form id="login-form">
            <div class="form-group">
              <label class="form-label">Official Email</label>
              <input type="email" class="form-input" id="login-email" placeholder="e.g. investigator@cyra.forensics" required />
            </div>

            <div class="form-group">
              <label class="form-label">Access Password</label>
              <input type="password" class="form-input" id="login-password" placeholder="Enter password" required />
            </div>

            <div style="margin-top: 24px;">
              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" id="login-submit-btn">
                <span>Authenticate Credentials &rarr;</span>
              </button>
            </div>
          </form>

          <!-- Quick Fill Testing Credentials -->
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border-subtle);">
            <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: 8px; text-transform: uppercase;">
              DEMO CREDENTIALS QUICK FILL:
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="fill-investigator-btn" style="flex: 1;">
                Fill Investigator (Dhruv)
              </button>
              <button class="btn btn-secondary btn-sm" id="fill-admin-btn" style="flex: 1;">
                Fill Administrator
              </button>
            </div>
          </div>

          <div style="margin-top: 20px; text-align: center; font-size: 0.85rem; color: var(--text-dim);">
            New investigator or team?
            <a href="/register" data-link style="color: var(--forensic-emerald); font-weight: 600;">Register Here</a>
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#login-form');
    const emailInput = container.querySelector('#login-email');
    const passwordInput = container.querySelector('#login-password');
    const submitBtn = container.querySelector('#login-submit-btn');

    // Quick fill handlers
    container.querySelector('#fill-investigator-btn').addEventListener('click', () => {
      emailInput.value = 'investigator@cyra.forensics';
      passwordInput.value = 'Investigator2026!';
    });

    container.querySelector('#fill-admin-btn').addEventListener('click', () => {
      emailInput.value = 'admin@cyra.forensics';
      passwordInput.value = 'AdminForensics2026!';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="pulse-dot"></span> Authenticating token...';

      try {
        const response = await api.login(email, password);
        Toast.success(`Welcome back, ${response.user.full_name}.`);

        if (window.appInstance) {
          window.appInstance.setUser(response.user);
          if (response.user.role === 'admin') {
            window.appInstance.navigate('/admin');
          } else {
            window.appInstance.navigate('/dashboard');
          }
        }
      } catch (err) {
        Toast.error(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Authenticate Credentials &rarr;</span>';
      }
    });
  }
}
