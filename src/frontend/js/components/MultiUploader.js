import { Toast } from './Toast.js';
import { api } from '../api.js';

export class MultiUploaderComponent {
  constructor({ containerId, onUploadSuccess }) {
    this.container = document.getElementById(containerId);
    this.onUploadSuccess = onUploadSuccess;
    this.pendingFiles = [];
    this.allowedExtensions = ['.txt', '.csv', '.pdf', '.jpg', '.jpeg', '.png', '.mp4', '.zip', '.wav'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.maxFileCount = 10;
    this.isUploading = false;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="forensic-card" style="margin-bottom: 24px;">
        <div class="forensic-card-header">
          <span class="card-title">BATCH EVIDENCE INGESTION PROTOCOL</span>
          <span class="badge badge-emerald">MULTI-FILE UPLOAD ENABLED</span>
        </div>

        <div style="margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted);">
          Select 1 to 10 digital forensic artifacts simultaneously (.txt, .csv, .pdf, .jpg, .png, .mp4, .wav, .zip).
          Each file will be assigned a unique evidence tracking ID and cryptographically hashed with SHA-256 upon intake.
        </div>

        <!-- Hidden Multiple File Input -->
        <input type="file" id="batch-file-input" multiple style="display: none;" />

        <!-- Drag & Drop Zone -->
        <div class="upload-dropzone" id="upload-dropzone-box" role="button" tabindex="0">
          <div class="upload-icon">📁</div>
          <div style="font-size: 1rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 4px;">
            Drag & drop multiple evidence files here, or <span style="color: var(--forensic-emerald); text-decoration: underline;">browse</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono);">
            Supports TXT, CSV, PDF, JPG, PNG, MP4, WAV, ZIP • Max 50MB per file
          </div>
        </div>

        <!-- Pending Files Queue -->
        <div id="pending-queue-wrapper" style="margin-top: 16px; display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Selected Artifacts Queue (<span id="queue-count-badge">0</span>)
            </span>
            <button class="btn btn-outline btn-sm" id="clear-queue-btn">Clear All</button>
          </div>
          <div class="pending-files-queue" id="pending-files-list"></div>

          <!-- Batch Metadata Settings -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <div class="form-group">
              <label class="form-label">Evidence Category</label>
              <select class="form-select" id="batch-category-select">
                <option value="System Logs">System Logs</option>
                <option value="Network Packet">Network Packet</option>
                <option value="Memory Dump">Memory Dump</option>
                <option value="Physical Audio/Video">Physical Audio/Video</option>
                <option value="Document">Document</option>
                <option value="Encrypted Archive">Encrypted Archive</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Classification</label>
              <select class="form-select" id="batch-classif-select">
                <option value="CRITICAL">CRITICAL</option>
                <option value="SECONDARY">SECONDARY</option>
                <option value="BACKGROUND">BACKGROUND</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Score Value (Pts)</label>
              <input type="number" class="form-input" id="batch-score-input" value="15" min="1" max="50" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Batch Ingestion Notes / Description</label>
            <input type="text" class="form-input" id="batch-desc-input" placeholder="e.g. Forensics dump from ARCH laboratory station B" />
          </div>

          <!-- Progress and Action Bar -->
          <div style="margin-top: 16px; display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
            <div id="upload-status-indicator" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--forensic-emerald);"></div>
            <button class="btn btn-primary" id="start-upload-btn">
              <span>Ingest Artifacts to Vault</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const fileInput = this.container.querySelector('#batch-file-input');
    const dropzone = this.container.querySelector('#upload-dropzone-box');
    const clearBtn = this.container.querySelector('#clear-queue-btn');
    const uploadBtn = this.container.querySelector('#start-upload-btn');

    // Click dropzone triggers file picker
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    // Drag and drop events
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.addFiles(Array.from(e.dataTransfer.files));
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.addFiles(Array.from(e.target.files));
        fileInput.value = ''; // Reset so the same files can be re-selected if removed
      }
    });

    // Clear queue
    clearBtn.addEventListener('click', () => {
      this.pendingFiles = [];
      this.renderQueue();
    });

    // Start Upload
    uploadBtn.addEventListener('click', () => this.executeBatchUpload());
  }

  addFiles(files) {
    let addedCount = 0;
    for (const file of files) {
      if (this.pendingFiles.length >= this.maxFileCount) {
        Toast.warning(`Maximum batch size is ${this.maxFileCount} files.`);
        break;
      }

      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!this.allowedExtensions.includes(ext)) {
        Toast.error(`File '${file.name}' has an unsupported extension (${ext}).`);
        continue;
      }

      if (file.size > this.maxFileSize) {
        Toast.error(`File '${file.name}' exceeds the 50MB size limit.`);
        continue;
      }

      // Check duplicate in pending list
      const alreadyInQueue = this.pendingFiles.some(f => f.name === file.name && f.size === file.size);
      if (alreadyInQueue) {
        Toast.warning(`'${file.name}' is already in the upload queue.`);
        continue;
      }

      this.pendingFiles.push(file);
      addedCount++;
    }

    if (addedCount > 0) {
      Toast.success(`Added ${addedCount} file(s) to pending queue.`);
    }
    this.renderQueue();
  }

  removeFile(index) {
    this.pendingFiles.splice(index, 1);
    this.renderQueue();
  }

  renderQueue() {
    const queueWrapper = this.container.querySelector('#pending-queue-wrapper');
    const queueList = this.container.querySelector('#pending-files-list');
    const countBadge = this.container.querySelector('#queue-count-badge');

    if (this.pendingFiles.length === 0) {
      queueWrapper.style.display = 'none';
      return;
    }

    queueWrapper.style.display = 'block';
    countBadge.textContent = this.pendingFiles.length;

    queueList.innerHTML = this.pendingFiles.map((file, idx) => `
      <div class="pending-file-item">
        <div class="file-info-group">
          <span style="color: var(--forensic-emerald); font-weight: 700;">[#${idx + 1}]</span>
          <span style="color: var(--text-highlight); font-weight: 600;">${escapeHtml(file.name)}</span>
          <span style="color: var(--text-dim); font-size: 0.75rem;">(${this.formatBytes(file.size)})</span>
        </div>
        <button class="remove-file-btn" data-index="${idx}" title="Remove file from batch">&times;</button>
      </div>
    `).join('');

    // Attach individual remove handlers
    queueList.querySelectorAll('.remove-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.removeFile(idx);
      });
    });
  }

  async executeBatchUpload() {
    if (this.pendingFiles.length === 0 || this.isUploading) return;

    const category = this.container.querySelector('#batch-category-select').value;
    const classification = this.container.querySelector('#batch-classif-select').value;
    const scoreVal = this.container.querySelector('#batch-score-input').value;
    const desc = this.container.querySelector('#batch-desc-input').value;
    const statusIndicator = this.container.querySelector('#upload-status-indicator');
    const uploadBtn = this.container.querySelector('#start-upload-btn');

    this.isUploading = true;
    uploadBtn.disabled = true;
    statusIndicator.innerHTML = '<span class="pulse-dot"></span> Calculating SHA-256 and uploading files...';

    const formData = new FormData();
    for (const file of this.pendingFiles) {
      formData.append('files', file);
    }
    formData.append('category', category);
    formData.append('classification', classification);
    formData.append('score_value', scoreVal);
    formData.append('description', desc);

    try {
      const response = await api.uploadEvidenceBatch(formData);
      Toast.success(response.message || 'Artifacts successfully ingested into Evidence Vault.');

      // Clear queue
      this.pendingFiles = [];
      this.renderQueue();
      statusIndicator.textContent = '';

      if (typeof this.onUploadSuccess === 'function') {
        this.onUploadSuccess(response);
      }
    } catch (err) {
      Toast.error('Upload failed: ' + err.message);
      statusIndicator.textContent = 'Upload failed. Please retry.';
    } finally {
      this.isUploading = false;
      uploadBtn.disabled = false;
    }
  }

  formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
