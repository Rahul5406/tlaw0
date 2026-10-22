import { api } from '../api.js';

export class HomePage {
  static async render(container) {
    let config = {};
    try {
      const configRes = await api.getEventConfig();
      config = configRes.config || {};
    } catch (e) {}

    const title = config.homepage_hero_title || 'THE LAST ARTIFACT (TLA-026)';
    const subtitle = config.homepage_hero_subtitle || 'Digital Forensics Investigation & Intellectual Property Theft';
    const introText = config.homepage_intro_text || 'At 22:45 IST on 24 September 2026, Dr. Alok Mathur was discovered unresponsive in ARCH Research Lab 3. Simultaneously, the core cryptographic hardware prototype for PROJECT AETHER disappeared from the high-security Faraday enclosure. As an authorized forensic analyst, your objective is to reconstruct the crime timeline, inspect physical and digital evidence, interrogate suspect testimonies, and uncover the truth behind The Last Artifact.';
    const bannerUrl = config.banner_image_url || '/assets/images/tla_case_banner.jpg';

    container.innerHTML = `
      <div class="page-stack page-stack-lg">
        <!-- Hero Case Header Banner -->
        <div class="forensic-card" style="padding: 0; overflow: hidden; position: relative;">
          <div style="position: relative; height: 380px; width: 100%; background: transparent;">
            <img src="${bannerUrl}" alt="Operations Banner" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.35;" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(10, 6, 7, 0.92) 0%, rgba(28, 14, 17, 0.35) 60%, transparent 100%);"></div>
            
            <div style="position: absolute; bottom: 32px; left: 32px; right: 32px;">
              <div class="hero-badges">
                <span class="badge badge-critical">INCIDENT CLASSIFICATION: HOMICIDE & IP THEFT</span>
                <span class="badge badge-emerald">CASE: TLA-026</span>
                <span class="badge badge-confidential">PROJECT AETHER</span>
              </div>
              <h1 class="hero-title">
                ${title}
              </h1>
              <p class="hero-subtitle">
                ${subtitle}
              </p>
            </div>
          </div>

          <div style="padding: 32px; background-color: var(--bg-surface);">
            <div style="max-width: 900px; font-size: 1.05rem; line-height: 1.75; color: var(--text-main); margin-bottom: 28px; text-align: left;">
              ${introText}
            </div>

            <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
              <a href="/dashboard" data-link class="btn btn-primary btn-lg">Access Investigation Portal &rarr;</a>
              <a href="/story" data-link class="btn btn-secondary btn-lg">Examine Case Dossier</a>
              <a href="/rules" data-link class="btn btn-outline btn-lg">Review Official Protocol</a>
            </div>
          </div>
        </div>

        <!-- Key Incident Parameters Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          <div class="forensic-card stat-card" style="border-left: 3px solid var(--forensic-emerald);">
            <div class="stat-label">Time Allocation</div>
            <div class="stat-value">180 MINUTES</div>
            <div class="stat-hint">Synchronized server countdown begins upon case initiation.</div>
          </div>

          <div class="forensic-card stat-card" style="border-left: 3px solid var(--forensic-teal);">
            <div class="stat-label">Vault Evidence Artifacts</div>
            <div class="stat-value">7 ARTIFACTS</div>
            <div class="stat-hint">Access door logs, network captures, hex dumps, autopsy report, and audio.</div>
          </div>

          <div class="forensic-card stat-card" style="border-left: 3px solid var(--forensic-amber);">
            <div class="stat-label">Key Suspect Profiles</div>
            <div class="stat-value">4 SUSPECTS</div>
            <div class="stat-hint">Arjun Dev, Kavin Raj, Meera Nair, Rohit Sen with conflicting alibis.</div>
          </div>

          <div class="forensic-card stat-card" style="border-left: 3px solid var(--forensic-red);">
            <div class="stat-label">Forensic Submission</div>
            <div class="stat-value">11 SECTIONS</div>
            <div class="stat-hint">Standardized forensic dossier evaluation with printable PDF export.</div>
          </div>
        </div>

        <!-- Investigation Overview Grid -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <div class="forensic-card">
            <div class="forensic-card-header">
              <span class="card-title">CASE SCENARIO SUMMARY: ARCH RESEARCH LAB 3</span>
              <span class="badge badge-confidential">CRIME SCENE DATA</span>
            </div>
            <div class="card-prose">
              <p>
                The victim, <strong>Prof. Alok Mathur</strong> (54), was found deceased at approximately 22:45 IST inside ARCH Lab 3. The high-security Faraday enclosure (Unit 3), containing the only operational prototype of the <strong>AETHER-Node-07</strong> cryptographic mesh transceiver, was found breached.
              </p>
              <p>
                Physical and digital anomalies include an unexplained 18-minute CCTV surveillance blackout between 21:30 and 21:48, a keypad PIN override at 21:36, a 4.2 GB encrypted network exfiltration burst to an offshore server, and an altered bootloader signature discovered in firmware memory.
              </p>
              <p>
                Investigators must systematically inspect every piece of digital evidence, cross-reference suspect statements, eliminate contradictory hypotheses, and formulate an official report identifying the culprit and recovering the missing hardware.
              </p>
            </div>
          </div>

          <div class="forensic-card">
            <div class="forensic-card-header">
              <span class="card-title">INVESTIGATION FLOW</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="step-row">
                <span class="badge badge-emerald">STEP 1</span>
                <span>Register Team & Log in</span>
              </div>
              <div class="step-row">
                <span class="badge badge-emerald">STEP 2</span>
                <span>Acknowledge Official Rules</span>
              </div>
              <div class="step-row">
                <span class="badge badge-emerald">STEP 3</span>
                <span>Activate Case Timer</span>
              </div>
              <div class="step-row">
                <span class="badge badge-emerald">STEP 4</span>
                <span>Inspect Evidence Vault</span>
              </div>
              <div class="step-row">
                <span class="badge badge-emerald">STEP 5</span>
                <span>Build Timeline in Workspace</span>
              </div>
              <div class="step-row">
                <span class="badge badge-emerald">STEP 6</span>
                <span>Submit 11-Section Final Report</span>
              </div>
              <div class="step-row">
                <span class="badge badge-emerald">STEP 7</span>
                <span>View Evaluation on Score Board</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
