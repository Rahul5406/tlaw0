// Modal & Confirmation Dialog Subsystem

class ModalManager {
  constructor() {
    this.container = document.getElementById('modal-container');
  }

  getContainer() {
    if (!this.container) {
      this.container = document.getElementById('modal-container') || document.body;
    }
    return this.container;
  }

  open({ title, content, footerButtons = [], isLarge = false, onClose = null }) {
    const container = this.getContainer();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="modal-content ${isLarge ? 'modal-lg' : ''}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body" id="modal-dynamic-body"></div>
        <div class="modal-footer" id="modal-dynamic-footer"></div>
      </div>
    `;

    const bodyOutlet = overlay.querySelector('#modal-dynamic-body');
    if (typeof content === 'string') {
      bodyOutlet.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      bodyOutlet.appendChild(content);
    }

    const footerOutlet = overlay.querySelector('#modal-dynamic-footer');
    if (footerButtons.length === 0) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-secondary';
      closeBtn.textContent = 'Close';
      closeBtn.onclick = () => this.close(overlay, onClose);
      footerOutlet.appendChild(closeBtn);
    } else {
      footerButtons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.className = `btn ${btnConfig.className || 'btn-secondary'}`;
        btn.textContent = btnConfig.text;
        btn.onclick = () => {
          if (btnConfig.onClick) {
            btnConfig.onClick(() => this.close(overlay, onClose));
          } else {
            this.close(overlay, onClose);
          }
        };
        footerOutlet.appendChild(btn);
      });
    }

    const closeBtn = overlay.querySelector('.modal-close-btn');
    closeBtn.onclick = () => this.close(overlay, onClose);

    overlay.onclick = (e) => {
      if (e.target === overlay) this.close(overlay, onClose);
    };

    container.appendChild(overlay);
    return overlay;
  }

  close(overlay, callback) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (typeof callback === 'function') callback();
  }

  confirm({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
    return new Promise((resolve) => {
      this.open({
        title,
        content: `<p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5;">${message}</p>`,
        footerButtons: [
          {
            text: cancelText,
            className: 'btn-secondary',
            onClick: (close) => {
              close();
              resolve(false);
            }
          },
          {
            text: confirmText,
            className: isDanger ? 'btn-danger' : 'btn-primary',
            onClick: (close) => {
              close();
              resolve(true);
            }
          }
        ]
      });
    });
  }
}

export const Modal = new ModalManager();
