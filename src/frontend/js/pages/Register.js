import { api } from '../api.js';
import { Toast } from '../components/Toast.js';

export class RegisterPage {
  static render(container) {
    container.innerHTML = `
      <div style="max-width: 640px; margin: 30px auto;">
        <div class="forensic-card">
          <div class="forensic-card-header">
            <div>
              <span class="card-title">INVESTIGATOR TEAM ENROLLMENT</span>
              <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 4px;">
                CASE ENLISTMENT: TLA-026 // CYRA FORENSIC DIVISION
              </div>
            </div>
            <span class="badge badge-emerald">NEW DOSSIER</span>
          </div>

          <form id="register-form">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Full Name of Lead Investigator *</label>
                <input type="text" class="form-input" id="reg-name" placeholder="e.g. Dhruv Saxena" required />
              </div>

              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Institutional / Official Email *</label>
                <input type="email" class="form-input" id="reg-email" placeholder="e.g. investigator@ssec.ac.in" required />
              </div>

              <div class="form-group">
                <label class="form-label">College / Institution *</label>
                <input type="text" class="form-input" id="reg-college" value="Sree Sakthi Engineering College" required />
              </div>

              <div class="form-group">
                <label class="form-label">Department *</label>
                <input type="text" class="form-input" id="reg-dept" placeholder="e.g. Computer Science & Eng" required />
              </div>

              <div class="form-group">
                <label class="form-label">Year of Study *</label>
                <select class="form-select" id="reg-year">
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year / Final Year" selected>4th Year / Final Year</option>
                  <option value="Postgraduate / Research">Postgraduate / Research</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Team Name (Optional / Auto-Assign)</label>
                <input type="text" class="form-input" id="reg-team" placeholder="e.g. CipherTrack Alpha" />
              </div>

              <div class="form-group">
                <label class="form-label">Password *</label>
                <input type="password" class="form-input" id="reg-password" placeholder="Minimum 8 characters" required minlength="8" />
              </div>

              <div class="form-group">
                <label class="form-label">Confirm Password *</label>
                <input type="password" class="form-input" id="reg-confirm" placeholder="Re-type password" required minlength="8" />
              </div>
            </div>

            <div style="margin-top: 24px;">
              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" id="register-submit-btn">
                <span>Complete Registration & Enter Briefing</span>
              </button>
            </div>
          </form>

          <div style="margin-top: 20px; text-align: center; font-size: 0.85rem; color: var(--text-dim);">
            Already have an active investigator profile?
            <a href="/login" data-link style="color: var(--forensic-emerald); font-weight: 600;">Sign In Here</a>
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = container.querySelector('#register-submit-btn');

      const name = container.querySelector('#reg-name').value.trim();
      const email = container.querySelector('#reg-email').value.trim();
      const college = container.querySelector('#reg-college').value.trim();
      const dept = container.querySelector('#reg-dept').value.trim();
      const year = container.querySelector('#reg-year').value;
      const team = container.querySelector('#reg-team').value.trim();
      const password = container.querySelector('#reg-password').value;
      const confirm = container.querySelector('#reg-confirm').value;

      if (password !== confirm) {
        Toast.error('Passwords do not match.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="pulse-dot"></span> Generating investigator credentials...';

      try {
        const response = await api.register({
          full_name: name,
          email,
          college,
          department: dept,
          year_of_study: year,
          team_name: team,
          password,
          confirm_password: confirm
        });

        Toast.success('Credentials registered successfully. Welcome to Case TLA-026.');
        if (window.appInstance) {
          window.appInstance.setUser(response.user);
          window.appInstance.navigate('/rules');
        }
      } catch (err) {
        Toast.error(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Complete Registration & Enter Briefing</span>';
      }
    });
  }
}
