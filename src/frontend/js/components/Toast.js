// Forensic Notification Toast Subsystem

class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
  }

  show(message, type = 'info', duration = 4000) {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '⚠';
    else if (type === 'warning') icon = '⚡';

    toast.innerHTML = `
      <span style="font-weight: 800; font-family: var(--font-mono);">${icon}</span>
      <div style="flex: 1;">${message}</div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  success(msg, d) { this.show(msg, 'success', d); }
  error(msg, d) { this.show(msg, 'error', d); }
  warning(msg, d) { this.show(msg, 'warning', d); }
  info(msg, d) { this.show(msg, 'info', d); }
}

export const Toast = new ToastManager();
