import { api } from '../api.js';
import { Toast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { TimelineBuilderComponent } from '../components/TimelineBuilder.js';
import { FlipCard } from '../ts-dist/components/FlipCard.js';

export class WorkspacePage {
  static async render(container) {
    const urlParams = new URLSearchParams(window.location.search);
    let activeTab = urlParams.get('tab') || 'notes';

    let notes = [];
    let suspects = [];
    let bookmarks = [];
    let selectedNote = null;
    let autosaveTimer = null;
    let suspectFlipCards = [];

    function destroySuspectFlipCards() {
      suspectFlipCards.forEach(c => {
        try { c.destroy(); } catch (e) { /* ignore */ }
      });
      suspectFlipCards = [];
    }

    async function loadWorkspaceData() {
      try {
        const [notesRes, suspectsRes, bookmarksRes] = await Promise.all([
          api.getNotes(),
          api.getSuspects().catch(() => ({ suspects: [] })),
          api.getBookmarks().catch(() => ({ bookmarks: [] }))
        ]);
        notes = notesRes.notes || [];
        suspects = suspectsRes.suspects || [];
        bookmarks = bookmarksRes.bookmarks || [];

        if (notes.length > 0 && !selectedNote) {
          selectedNote = notes[0];
        }
      } catch (e) {
        Toast.error('Failed to load workspace data.');
      }
    }

    await loadWorkspaceData();

    function renderView() {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Workspace Header -->
          <div class="workspace-header">
            <div>
              <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                <span class="badge badge-emerald">OPERATIVE WORKBENCH</span>
                <span class="badge badge-confidential">RESTRICTED TO TEAM</span>
              </div>
              <h1 style="font-size: 1.8rem; font-weight: 800; color: var(--text-highlight);">
                INVESTIGATION WORKSPACE // CRIME BOARD
              </h1>
              <p style="font-size: 0.9rem; color: var(--text-muted);">
                Isolate findings, reconstruct accurate AM/PM chronologies, cross-examine suspect alibis, and compile hypotheses.
              </p>
            </div>

            <div style="display: flex; gap: 8px;">
              <a href="/report" data-link class="btn btn-primary btn-sm">
                <span>Go to Final Report &rarr;</span>
              </a>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="workspace-tabs">
            <button class="workspace-tab ${activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
              📝 Investigation Notes (${notes.length})
            </button>
            <button class="workspace-tab ${activeTab === 'timeline' ? 'active' : ''}" data-tab="timeline">
              ⏱ Reconstructed Timeline
            </button>
            <button class="workspace-tab ${activeTab === 'suspects' ? 'active' : ''}" data-tab="suspects">
              👤 Suspect Dossiers (${suspects.length})
            </button>
            <button class="workspace-tab ${activeTab === 'bookmarks' ? 'active' : ''}" data-tab="bookmarks">
              📌 Pinned Artifacts (${bookmarks.length})
            </button>
          </div>

          <!-- Tab Content Outlet -->
          <div id="workspace-tab-outlet"></div>
        </div>
      `;

      // Attach Tab Listeners
      container.querySelectorAll('.workspace-tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', (e) => {
          activeTab = e.currentTarget.dataset.tab;
          container.querySelectorAll('.workspace-tab').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          renderTabContent();
        });
      });

      renderTabContent();
    }

    function renderTabContent() {
      const outlet = container.querySelector('#workspace-tab-outlet');
      if (!outlet) return;

      // Tear down any live flip cards before swapping tab content.
      destroySuspectFlipCards();

      if (activeTab === 'notes') {
        renderNotesTab(outlet);
      } else if (activeTab === 'timeline') {
        renderTimelineTab(outlet);
      } else if (activeTab === 'suspects') {
        renderSuspectsTab(outlet);
      } else if (activeTab === 'bookmarks') {
        renderBookmarksTab(outlet);
      }
    }

    // 1. NOTES TAB
    function renderNotesTab(outlet) {
      outlet.innerHTML = `
        <div class="notes-workspace-layout">
          <!-- Sidebar Notes List -->
          <div class="notes-sidebar">
            <div class="notes-sidebar-header">
              <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-highlight);">SAVED CLUES & NOTES</span>
              <button class="btn btn-primary btn-sm" id="create-note-btn">+ New Note</button>
            </div>
            <div style="padding: 10px;">
              <input type="text" id="notes-search-input" class="form-input" placeholder="Search notes..." style="padding: 6px 10px; font-size: 0.8rem;" />
            </div>
            <div class="notes-list" id="notes-list-outlet">
              ${notes.map(n => `
                <div class="note-item-card ${selectedNote && selectedNote.id === n.id ? 'active' : ''}" data-id="${n.id}">
                  <div class="note-item-title">
                    <span>${n.pinned ? '📌 ' : ''}${escapeHtml(n.note_title)}</span>
                    <span class="badge badge-emerald" style="font-size: 0.65rem;">${escapeHtml(n.category)}</span>
                  </div>
                  <div class="note-item-snippet">${escapeHtml(n.content || 'Empty note...')}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Notes Editor Pane -->
          <div class="notes-editor-pane">
            ${selectedNote ? `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <input type="text" class="form-input" id="edit-note-title" value="${escapeHtml(selectedNote.note_title)}" style="font-size: 1.15rem; font-weight: 700;" />
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-outline btn-sm" id="toggle-pin-btn">
                    ${selectedNote.pinned ? 'Unpin' : '📌 Pin'}
                  </button>
                  <button class="btn btn-danger btn-sm" id="delete-note-btn">Delete</button>
                </div>
              </div>

              <div style="display: flex; gap: 12px; align-items: center;">
                <label class="form-label" style="margin: 0;">Category:</label>
                <select class="form-select" id="edit-note-category" style="max-width: 200px; padding: 4px 8px; font-size: 0.82rem;">
                  <option value="General" ${selectedNote.category === 'General' ? 'selected' : ''}>General</option>
                  <option value="Alibi Discrepancy" ${selectedNote.category === 'Alibi Discrepancy' ? 'selected' : ''}>Alibi Discrepancy</option>
                  <option value="Digital Evidence" ${selectedNote.category === 'Digital Evidence' ? 'selected' : ''}>Digital Evidence</option>
                  <option value="Hypothesis" ${selectedNote.category === 'Hypothesis' ? 'selected' : ''}>Hypothesis</option>
                </select>
                <div id="note-autosave-indicator" style="margin-left: auto; font-family: var(--font-mono); font-size: 0.75rem; color: var(--forensic-emerald);">
                  Autosaved: ${new Date(selectedNote.updated_at || Date.now()).toLocaleTimeString()}
                </div>
              </div>

              <textarea class="form-textarea" id="edit-note-content" placeholder="Type your investigative notes, anomalies, and observations here...">${escapeHtml(selectedNote.content || '')}</textarea>
            ` : `
              <div class="alert alert-info" style="margin: auto 0; text-align: center;">
                No note selected. Click "+ New Note" to begin compiling clues.
              </div>
            `}
          </div>
        </div>
      `;

      // Bind Note Selection
      outlet.querySelectorAll('.note-item-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const id = parseInt(e.currentTarget.dataset.id, 10);
          selectedNote = notes.find(n => n.id === id);
          renderNotesTab(outlet);
        });
      });

      // Bind Create Note
      const createBtn = outlet.querySelector('#create-note-btn');
      if (createBtn) {
        createBtn.addEventListener('click', async () => {
          try {
            const { note } = await api.createNote({
              note_title: `Lead #${notes.length + 1}`,
              content: '',
              category: 'General'
            });
            notes.unshift(note);
            selectedNote = note;
            renderNotesTab(outlet);
            Toast.success('New note draft created.');
          } catch (err) {
            Toast.error(err.message);
          }
        });
      }

      // Bind Edit Inputs & Autosave
      if (selectedNote) {
        const titleInput = outlet.querySelector('#edit-note-title');
        const contentInput = outlet.querySelector('#edit-note-content');
        const catSelect = outlet.querySelector('#edit-note-category');
        const indicator = outlet.querySelector('#note-autosave-indicator');

        const triggerSave = () => {
          clearTimeout(autosaveTimer);
          autosaveTimer = setTimeout(async () => {
            selectedNote.note_title = titleInput.value.trim() || 'Untitled Note';
            selectedNote.content = contentInput.value;
            selectedNote.category = catSelect.value;
            indicator.textContent = 'Saving...';

            try {
              const res = await api.updateNote(selectedNote.id, {
                note_title: selectedNote.note_title,
                content: selectedNote.content,
                category: selectedNote.category
              });
              indicator.textContent = `Autosaved: ${new Date().toLocaleTimeString()}`;
            } catch (err) {
              indicator.textContent = 'Autosave error';
            }
          }, 600);
        };

        titleInput.addEventListener('input', triggerSave);
        contentInput.addEventListener('input', triggerSave);
        catSelect.addEventListener('change', triggerSave);

        // Pin Toggle
        outlet.querySelector('#toggle-pin-btn').addEventListener('click', async () => {
          try {
            const newPinned = selectedNote.pinned ? 0 : 1;
            await api.updateNote(selectedNote.id, { pinned: newPinned });
            selectedNote.pinned = newPinned;
            notes = (await api.getNotes()).notes || [];
            renderNotesTab(outlet);
          } catch (e) {}
        });

        // Delete Note
        outlet.querySelector('#delete-note-btn').addEventListener('click', async () => {
          const confirmed = await Modal.confirm({
            title: 'Delete Note',
            message: `Permanently delete note "${selectedNote.note_title}"?`,
            confirmText: 'Delete Note',
            isDanger: true
          });
          if (confirmed) {
            try {
              await api.deleteNote(selectedNote.id);
              notes = notes.filter(n => n.id !== selectedNote.id);
              selectedNote = notes.length > 0 ? notes[0] : null;
              renderNotesTab(outlet);
              Toast.success('Note removed.');
            } catch (err) {
              Toast.error(err.message);
            }
          }
        });
      }
    }

    // 2. TIMELINE TAB
    function renderTimelineTab(outlet) {
      outlet.innerHTML = `<div id="timeline-builder-mount"></div>`;
      const timelineComp = new TimelineBuilderComponent({ containerId: 'timeline-builder-mount' });
      timelineComp.init();
    }

    // 3. SUSPECTS TAB
    function renderSuspectsTab(outlet) {
      outlet.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="forensic-card" style="border-left: 3px solid var(--forensic-amber);">
            <div style="font-weight: 700; color: var(--text-highlight); margin-bottom: 4px;">
              SUSPECT DOSSIER & ALIBI MATRIX
            </div>
            <div style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.6;">
              Interrogate the official statements of the four primary Project Aether team members.
              Cross-reference their claimed whereabouts with electronic access badge logs (EVD-026-01) and surveillance frames (EVD-026-05).
              <span class="suspects-flip-hint-note">FLIP A DOSSIER TO OPEN THE FILE →</span>
            </div>
          </div>

          <div class="suspects-grid suspects-grid--flip" id="suspects-flip-grid"></div>
        </div>
      `;

      const grid = outlet.querySelector('#suspects-flip-grid');
      if (!grid) return;

      suspects.forEach(s => {
        const slot = document.createElement('div');
        slot.className = 'suspect-flip-slot';
        grid.appendChild(slot);

        const front = `
          <div class="suspect-flip-front">
            <img src="${s.avatar_url}" alt="${escapeHtml(s.name)}" onerror="this.src='/assets/images/suspects/default_suspect.svg'" />
            <div class="suspect-flip-badge">${escapeHtml(s.suspect_code)}</div>
            <div class="suspect-flip-hint">FLIP FILE →</div>
          </div>
        `;

        const back = `
          <div class="suspect-flip-back">
            <div class="suspect-flip-name">${escapeHtml(s.name)}</div>
            <div class="suspect-flip-role">${escapeHtml(s.role)}</div>
            <div class="suspect-flip-dept">${escapeHtml(s.department)}</div>
            <div class="suspect-flip-statement">
              <div class="suspect-flip-label">OFFICIAL INTERVIEW STATEMENT</div>
              <p>${escapeHtml(truncate(s.statement, 175))}</p>
            </div>
            <div class="suspect-flip-meta">
              <div><span>CLAIMED WHEREABOUTS:</span> ${escapeHtml(truncate(s.whereabouts, 70))}</div>
            </div>
            <div class="suspect-flip-foot">PROJECT AETHER • CONFIDENTIAL</div>
          </div>
        `;

        const card = new FlipCard(slot, {
          front,
          back,
          axis: 'y',
          flipOnClick: true,
          draggable: true,
          tilt: true,
          tiltMax: 10,
          glare: true,
          glareOpacity: 0.18,
          hoverScale: 1.02,
          perspective: 1100,
          width: 300,
          height: 440,
          radius: 14,
          background: 'var(--bg-surface)',
          color: 'var(--text-main)',
          shadow: true,
          shadowColor: '#000000',
          shadowOpacity: 0.5,
          ariaLabel: `Suspect dossier for ${s.name}. Press Enter or click to flip and reveal the interview statement.`
        });
        suspectFlipCards.push(card);
      });
    }

    // 4. BOOKMARKS TAB
    function renderBookmarksTab(outlet) {
      if (bookmarks.length === 0) {
        outlet.innerHTML = `
          <div class="alert alert-info" style="text-align: center; padding: 40px;">
            No evidence artifacts pinned yet. You can pin key artifacts from the Evidence Vault to quickly access them in your workspace.
          </div>
        `;
        return;
      }

      outlet.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
          ${bookmarks.map(b => `
            <div class="forensic-card">
              <div class="forensic-card-header">
                <span class="evidence-code">${b.evidence_code}</span>
                <span class="badge badge-emerald">${b.classification}</span>
              </div>
              <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 8px;">
                ${escapeHtml(b.display_name)}
              </h3>
              <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); margin-bottom: 12px;">
                CATEGORY: ${b.category} • TYPE: ${b.file_type.toUpperCase()}
              </div>
              <a href="/api/evidence/${b.evidence_id}/download" class="btn btn-secondary btn-sm" style="width: 100%;">
                Download Pinned Artifact
              </a>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderView();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str).trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '') + '…';
}
