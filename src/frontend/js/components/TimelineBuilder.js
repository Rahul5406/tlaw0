import { api } from '../api.js';
import { Toast } from './Toast.js';
import { Modal } from './Modal.js';

export class TimelineBuilderComponent {
  constructor({ containerId }) {
    this.container = document.getElementById(containerId);
    this.events = [];
    this.suspects = [];
    this.evidence = [];
    this.activePeriod = 'PM'; // Default incident time period on 24-Sep-2026
  }

  async init() {
    try {
      const [eventsRes, suspectsRes, evidenceRes] = await Promise.all([
        api.getTimeline(),
        api.getSuspects().catch(() => ({ suspects: [] })),
        api.getEvidence().catch(() => ({ evidence: [] }))
      ]);

      this.events = eventsRes.events || [];
      this.suspects = suspectsRes.suspects || [];
      this.evidence = evidenceRes.evidence || [];
      this.render();
    } catch (err) {
      Toast.error('Failed to load timeline records: ' + err.message);
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="timeline-builder-layout">
        <!-- New Event Form -->
        <div class="timeline-form-card">
          <div class="forensic-card-header">
            <span class="card-title">RECORD CHRONOLOGY EVENT</span>
            <span class="badge badge-emerald">AM/PM LOCK</span>
          </div>

          <form id="timeline-add-form">
            <div class="form-group">
              <label class="form-label">Incident Date (YYYY-MM-DD)</label>
              <input type="date" class="form-input" id="tl-date" value="2026-09-24" required />
            </div>

            <div class="form-group">
              <label class="form-label">Time & Period (12-Hour Accurate)</label>
              <div class="time-input-group">
                <input type="text" class="form-input" id="tl-time" placeholder="09:36" value="09:36" required pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$" title="HH:MM format (e.g. 09:36)" />
                <div class="ampm-toggle-buttons">
                  <button type="button" class="ampm-btn ${this.activePeriod === 'AM' ? 'active' : ''}" id="ampm-am-btn">AM</button>
                  <button type="button" class="ampm-btn ${this.activePeriod === 'PM' ? 'active' : ''}" id="ampm-pm-btn">PM</button>
                </div>
              </div>
              <span class="form-hint">Time format is strictly preserved without unintended conversion.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Event Description</label>
              <textarea class="form-textarea" id="tl-desc" rows="3" placeholder="e.g. Emergency override keypad triggered on Lab 3 door using PIN 7729*" required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Associated Suspect</label>
              <select class="form-select" id="tl-suspect">
                <option value="">-- None / Unidentified --</option>
                ${this.suspects.map(s => `<option value="${s.name}">${s.name} (${s.role})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Corroborating Evidence</label>
              <select class="form-select" id="tl-evidence">
                <option value="">-- None / Direct Observation --</option>
                ${this.evidence.map(e => `<option value="${e.evidence_code}">${e.evidence_code}: ${escapeHtml(e.display_name)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Investigator Confidence</label>
              <select class="form-select" id="tl-confidence">
                <option value="High">High (Direct physical or cryptographic log)</option>
                <option value="Medium">Medium (Corroborated by testimony)</option>
                <option value="Low">Low (Unverified claim)</option>
                <option value="Speculative">Speculative (Hypothesis under test)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Investigator Notes</label>
              <input type="text" class="form-input" id="tl-notes" placeholder="Notes on sensor anomaly or discrepancy" />
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
              <span>Anchor Event to Timeline</span>
            </button>
          </form>
        </div>

        <!-- Chronological Timeline Stream -->
        <div class="timeline-stream-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-highlight);">
              RECONSTRUCTED EVENT CHRONOLOGY (<span id="event-count-badge">${this.events.length}</span>)
            </h3>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim);">
              ORDER: CHRONOLOGICAL ASCENDING
            </span>
          </div>

          <div class="timeline-stream" id="timeline-stream-outlet">
            ${this.renderTimelineStream()}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderTimelineStream() {
    if (this.events.length === 0) {
      return `
        <div class="alert alert-info">
          No timeline events recorded yet. Use the form on the left to reconstruct the incident sequence on 24-SEP-2026.
        </div>
      `;
    }

    return this.events.map(ev => `
      <div class="timeline-event-card">
        <div class="timeline-event-node"></div>
        <div class="timeline-event-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="timeline-timestamp">${ev.event_date} ${ev.event_time} ${ev.time_period}</span>
            <span class="confidence-chip confidence-${ev.confidence_level}">${ev.confidence_level} CONFIDENCE</span>
          </div>
          <button class="btn btn-outline btn-sm delete-event-btn" data-id="${ev.id}" title="Remove entry" style="color: var(--forensic-red); border-color: rgba(239, 68, 68, 0.4);">&times;</button>
        </div>

        <div style="font-size: 0.92rem; color: var(--text-main); margin-bottom: 10px; line-height: 1.45;">
          ${escapeHtml(ev.description)}
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.78rem; font-family: var(--font-mono);">
          ${ev.associated_suspect ? `
            <span style="background: var(--forensic-teal-dim); color: var(--forensic-teal); padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid rgba(251, 113, 133, 0.35);">
              SUSPECT: ${escapeHtml(ev.associated_suspect)}
            </span>
          ` : ''}
          ${ev.associated_evidence ? `
            <span style="background: var(--forensic-emerald-dim); color: var(--forensic-emerald); padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid rgba(225, 29, 72, 0.35);">
              EVIDENCE: ${escapeHtml(ev.associated_evidence)}
            </span>
          ` : ''}
        </div>

        ${ev.notes ? `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-subtle); font-size: 0.8rem; color: var(--text-dim); font-style: italic;">
            Notes: ${escapeHtml(ev.notes)}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  bindEvents() {
    const amBtn = this.container.querySelector('#ampm-am-btn');
    const pmBtn = this.container.querySelector('#ampm-pm-btn');
    const form = this.container.querySelector('#timeline-add-form');

    amBtn.addEventListener('click', () => {
      this.activePeriod = 'AM';
      amBtn.classList.add('active');
      pmBtn.classList.remove('active');
    });

    pmBtn.addEventListener('click', () => {
      this.activePeriod = 'PM';
      pmBtn.classList.add('active');
      amBtn.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = this.container.querySelector('#tl-date').value;
      const time = this.container.querySelector('#tl-time').value;
      const desc = this.container.querySelector('#tl-desc').value;
      const suspect = this.container.querySelector('#tl-suspect').value;
      const evidence = this.container.querySelector('#tl-evidence').value;
      const confidence = this.container.querySelector('#tl-confidence').value;
      const notes = this.container.querySelector('#tl-notes').value;

      try {
        const { event: newEv } = await api.createTimelineEvent({
          event_date: date,
          event_time: time,
          time_period: this.activePeriod,
          description: desc,
          associated_suspect: suspect,
          associated_evidence: evidence,
          confidence_level: confidence,
          notes
        });

        this.events.push(newEv);
        // Sort chronologically
        this.events.sort((a, b) => {
          const dtA = `${a.event_date} ${a.time_period === 'PM' && parseInt(a.event_time) < 12 ? parseInt(a.event_time) + 12 : a.event_time}`;
          const dtB = `${b.event_date} ${b.time_period === 'PM' && parseInt(b.event_time) < 12 ? parseInt(b.event_time) + 12 : b.event_time}`;
          return dtA.localeCompare(dtB);
        });

        Toast.success('Timeline event anchored successfully.');
        this.container.querySelector('#tl-desc').value = '';
        this.container.querySelector('#tl-notes').value = '';
        
        const streamOutlet = this.container.querySelector('#timeline-stream-outlet');
        const countBadge = this.container.querySelector('#event-count-badge');
        streamOutlet.innerHTML = this.renderTimelineStream();
        countBadge.textContent = this.events.length;
        this.attachDeleteHandlers();
      } catch (err) {
        Toast.error('Failed to anchor timeline event: ' + err.message);
      }
    });

    this.attachDeleteHandlers();
  }

  attachDeleteHandlers() {
    this.container.querySelectorAll('.delete-event-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const confirmed = await Modal.confirm({
          title: 'Remove Timeline Event',
          message: 'Are you sure you want to remove this event from your reconstructed timeline?',
          confirmText: 'Remove Event',
          isDanger: true
        });
        if (confirmed) {
          try {
            await api.deleteTimelineEvent(id);
            this.events = this.events.filter(ev => String(ev.id) !== String(id));
            const streamOutlet = this.container.querySelector('#timeline-stream-outlet');
            const countBadge = this.container.querySelector('#event-count-badge');
            streamOutlet.innerHTML = this.renderTimelineStream();
            countBadge.textContent = this.events.length;
            this.attachDeleteHandlers();
            Toast.success('Event removed from timeline.');
          } catch (err) {
            Toast.error('Failed to remove event: ' + err.message);
          }
        }
      });
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
