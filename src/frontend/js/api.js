// Unified API Client for THE LAST ARTIFACT (TLA-026)

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('tla_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('tla_token', token);
    } else {
      localStorage.removeItem('tla_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    const headers = options.headers || {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
      credentials: 'same-origin'
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // Auth Endpoints
  async register(payload) {
    const data = await this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Event & Case Endpoints
  async getEventConfig() {
    return this.request('/api/event/config');
  }

  async getEventRules() {
    return this.request('/api/event/rules');
  }

  async getCaseSession() {
    return this.request('/api/case/session');
  }

  async acknowledgeRules() {
    return this.request('/api/case/acknowledge-rules', { method: 'POST' });
  }

  async startCase() {
    return this.request('/api/case/start', { method: 'POST' });
  }

  async getCaseStory() {
    return this.request('/api/case/story');
  }

  // Evidence Endpoints
  async getEvidence(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/evidence${query ? '?' + query : ''}`);
  }

  async getEvidenceItem(id) {
    return this.request(`/api/evidence/${id}`);
  }

  async previewEvidence(id, format = 'binary') {
    return this.request(`/api/evidence/${id}/preview?format=${format}`);
  }

  // Suspects Endpoints
  async getSuspects() {
    return this.request('/api/suspects');
  }

  async getSuspect(id) {
    return this.request(`/api/suspects/${id}`);
  }

  // Workspace Endpoints
  async getNotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/workspace/notes${query ? '?' + query : ''}`);
  }

  async createNote(payload) {
    return this.request('/api/workspace/notes', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateNote(id, payload) {
    return this.request(`/api/workspace/notes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteNote(id) {
    return this.request(`/api/workspace/notes/${id}`, { method: 'DELETE' });
  }

  async getTimeline() {
    return this.request('/api/workspace/timeline');
  }

  async createTimelineEvent(payload) {
    return this.request('/api/workspace/timeline', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateTimelineEvent(id, payload) {
    return this.request(`/api/workspace/timeline/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteTimelineEvent(id) {
    return this.request(`/api/workspace/timeline/${id}`, { method: 'DELETE' });
  }

  async getBookmarks() {
    return this.request('/api/workspace/bookmarks');
  }

  async toggleBookmark(evidenceId, note = '') {
    return this.request('/api/workspace/bookmarks', { method: 'POST', body: JSON.stringify({ evidence_id: evidenceId, personal_note: note }) });
  }

  // Final Report Endpoints
  async getReportTemplate() {
    return this.request('/api/report/template');
  }

  async getReportDraft() {
    return this.request('/api/report/draft');
  }

  async autosaveReportDraft(content) {
    return this.request('/api/report/draft', { method: 'PUT', body: JSON.stringify({ content }) });
  }

  async submitFinalReport(content) {
    return this.request('/api/report/submit', { method: 'POST', body: JSON.stringify({ content }) });
  }

  async getMySubmission() {
    return this.request('/api/report/my-submission');
  }

  // Leaderboard
  async getLeaderboard() {
    return this.request('/api/leaderboard');
  }

  // Admin Endpoints
  async getAdminMetrics() {
    return this.request('/api/admin/metrics');
  }

  async updateAdminConfig(updates) {
    return this.request('/api/admin/config', { method: 'PUT', body: JSON.stringify({ updates }) });
  }

  async getAdminRules() {
    return this.request('/api/admin/rules');
  }

  async createAdminRule(payload) {
    return this.request('/api/admin/rules', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateAdminRule(id, payload) {
    return this.request(`/api/admin/rules/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteAdminRule(id) {
    return this.request(`/api/admin/rules/${id}`, { method: 'DELETE' });
  }

  async getAdminStory() {
    return this.request('/api/admin/story');
  }

  async createAdminStory(payload) {
    return this.request('/api/admin/story', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateAdminStory(id, payload) {
    return this.request(`/api/admin/story/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteAdminStory(id) {
    return this.request(`/api/admin/story/${id}`, { method: 'DELETE' });
  }

  async getStoryAttachments(storyId) {
    return this.request(`/api/admin/story/${storyId}/attachments`);
  }

  async uploadStoryAttachments(storyId, formData) {
    return this.request(`/api/admin/story/${storyId}/attachments`, {
      method: 'POST',
      body: formData
    });
  }

  async deleteStoryAttachment(storyId, attachmentId) {
    return this.request(`/api/admin/story/${storyId}/attachments/${attachmentId}`, {
      method: 'DELETE'
    });
  }

  async getAdminEvidence() {
    return this.request('/api/admin/evidence');
  }

  async uploadEvidenceBatch(formData) {
    return this.request('/api/admin/evidence/upload', { method: 'POST', body: formData });
  }

  async updateAdminEvidence(id, payload) {
    return this.request(`/api/admin/evidence/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async toggleArchiveEvidence(id) {
    return this.request(`/api/admin/evidence/${id}/archive`, { method: 'POST' });
  }

  async getAdminSuspects() {
    return this.request('/api/admin/suspects');
  }

  async uploadSuspectAvatar(formData) {
    return this.request('/api/admin/suspects/upload-avatar', {
      method: 'POST',
      body: formData
    });
  }

  async createAdminSuspect(payload) {
    return this.request('/api/admin/suspects', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateAdminSuspect(id, payload) {
    return this.request(`/api/admin/suspects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteAdminSuspect(id) {
    return this.request(`/api/admin/suspects/${id}`, { method: 'DELETE' });
  }

  async updateScoreboardEntry(id, payload) {
    return this.request(`/api/admin/scoreboard/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async getAdminTeams() {
    return this.request('/api/admin/teams');
  }

  async updateAdminTeam(id, payload) {
    return this.request(`/api/admin/teams/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async extendParticipantTime(userId, additionalMinutes) {
    return this.request('/api/admin/extend-time', { method: 'POST', body: JSON.stringify({ user_id: userId, additional_minutes: additionalMinutes }) });
  }

  async getAdminReportTemplates() {
    return this.request('/api/admin/report-templates');
  }

  async updateAdminReportTemplate(id, payload) {
    return this.request(`/api/admin/report-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async getAdminParticipants() {
    return this.request('/api/admin/participants');
  }

  async updateParticipantStatus(id, payload) {
    return this.request(`/api/admin/participants/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async getAdminReports() {
    return this.request('/api/admin/reports');
  }

  async getAdminReport(id) {
    return this.request(`/api/admin/reports/${id}`);
  }

  async evaluateAdminReport(id, payload) {
    return this.request(`/api/admin/reports/${id}/evaluate`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/admin/audit-logs${query ? '?' + query : ''}`);
  }
}

export const api = new ApiClient();
