// Authoritative Synchronized Case Timer Component

class CaseTimerComponent {
  constructor() {
    this.mountEl = document.getElementById('case-timer-mount');
    this.remainingSeconds = null;
    this.status = 'not_started';
    this.timerInterval = null;
    this.lastTickTime = Date.now();

    // Re-synchronize when investigator tabs back into window
    window.addEventListener('focus', () => this.resync());
  }

  formatTime(totalSeconds) {
    if (totalSeconds === null || totalSeconds < 0) return '--:--:--';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  update(session) {
    if (!this.mountEl) {
      this.mountEl = document.getElementById('case-timer-mount');
      if (!this.mountEl) return;
    }

    if (!session || session.status === 'not_started') {
      this.status = 'not_started';
      this.remainingSeconds = null;
      this.clearInterval();
      this.mountEl.innerHTML = `
        <div class="timer-pill" title="Case not yet started">
          <span style="color: var(--text-dim);">TIMER:</span>
          <span>180:00 (STANDBY)</span>
        </div>
      `;
      return;
    }

    if (session.status === 'submitted') {
      this.status = 'submitted';
      this.clearInterval();
      this.mountEl.innerHTML = `
        <div class="timer-pill running" style="border-color: var(--forensic-teal); color: var(--forensic-teal);">
          <span>✓ CASE SUBMITTED</span>
        </div>
      `;
      return;
    }

    if (session.status === 'expired' || (session.remaining_seconds !== null && session.remaining_seconds <= 0)) {
      this.status = 'expired';
      this.clearInterval();
      this.mountEl.innerHTML = `
        <div class="timer-pill danger">
          <span>⚠ TIME EXPIRED</span>
        </div>
      `;
      return;
    }

    this.status = session.status;
    this.remainingSeconds = session.remaining_seconds;
    this.lastTickTime = Date.now();
    this.startInterval();
    this.render();
  }

  startInterval() {
    this.clearInterval();
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - this.lastTickTime) / 1000);
      if (elapsedSec >= 1) {
        this.remainingSeconds = Math.max(0, this.remainingSeconds - elapsedSec);
        this.lastTickTime = now;
        this.render();

        if (this.remainingSeconds <= 0) {
          this.clearInterval();
          this.status = 'expired';
          this.render();
        }
      }
    }, 500);
  }

  clearInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  render() {
    if (!this.mountEl) return;

    let pillClass = 'timer-pill running';
    if (this.remainingSeconds !== null) {
      if (this.remainingSeconds <= 300) { // 5 minutes
        pillClass = 'timer-pill danger';
      } else if (this.remainingSeconds <= 900) { // 15 minutes
        pillClass = 'timer-pill warning';
      }
    }

    this.mountEl.innerHTML = `
      <div class="${pillClass}" title="Server Authoritative Timer">
        <span class="pulse-dot ${this.remainingSeconds <= 300 ? 'danger' : this.remainingSeconds <= 900 ? 'warning' : ''}"></span>
        <span>${this.formatTime(this.remainingSeconds)}</span>
      </div>
    `;
  }

  async resync() {
    // Dynamically re-check server session when page becomes visible
    try {
      if (window.appInstance && window.appInstance.user) {
        const { session } = await window.appInstance.api.getCaseSession();
        this.update(session);
      }
    } catch (e) {}
  }
}

export const CaseTimer = new CaseTimerComponent();
