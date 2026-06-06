/**
 * NEON GRID // MAIN APP CONTROLLER
 * Manages view routing, audio synthesis, settings, and local storage database.
 */

class NeonArcadeApp {
  constructor() {
    // App settings state
    this.soundEnabled = true;
    this.particlesEnabled = true;
    this.difficulty = 'normal';
    
    // Web Audio System
    this.audioCtx = null;
    
    // UI Elements
    this.views = {
      dashboard: document.getElementById('dashboard-view'),
      game: document.getElementById('game-view'),
      scores: document.getElementById('high-scores-view'),
      settings: document.getElementById('settings-view')
    };

    // Game Instances
    this.laneSwitcher = null;
    this.wordDefender = null;
    this.cyberDrift = null;
    this.activeGame = null;

    // Initialize systems
    this.loadSettings();
    
    // Resolve CSS variables for canvas context compatibility (fallback to default retro values)
    const rootStyle = getComputedStyle(document.documentElement);
    this.themeColors = {
      cyan: rootStyle.getPropertyValue('--color-neon-cyan').trim() || '#00f0ff',
      magenta: rootStyle.getPropertyValue('--color-neon-magenta').trim() || '#ff005b',
      purple: rootStyle.getPropertyValue('--color-neon-purple').trim() || '#9d00ff',
      yellow: rootStyle.getPropertyValue('--color-neon-yellow').trim() || '#ffc400',
      white: rootStyle.getPropertyValue('--color-text-white').trim() || '#f5f0fa'
    };

    this.initEventListeners();
    this.updateDashboardStats();
    
    // Initialize Game Engines
    if (typeof LaneSwitcherGame !== 'undefined') {
      this.laneSwitcher = new LaneSwitcherGame(this);
    }
    if (typeof WordDefenderGame !== 'undefined') {
      this.wordDefender = new WordDefenderGame(this);
    }
    if (typeof CyberDriftGame !== 'undefined') {
      this.cyberDrift = new CyberDriftGame(this);
    }

    // Auto-boot game from URL query parameter (for headless verification)
    const urlParams = new URLSearchParams(window.location.search);
    const bootGame = urlParams.get('boot');
    if (bootGame === 'laneSwitcher') {
      setTimeout(() => {
        const btn = document.getElementById('btn-play-lane-switcher');
        if (btn) btn.click();
      }, 200);
    } else if (bootGame === 'wordDefender') {
      setTimeout(() => {
        const btn = document.getElementById('btn-play-word-defender');
        if (btn) btn.click();
      }, 200);
    } else if (bootGame === 'cyberDrift') {
      setTimeout(() => {
        const btn = document.getElementById('btn-play-cyber-drift');
        if (btn) btn.click();
      }, 200);
    }
  }

  /* ==========================================================================
     INITIALIZATION & EVENTS
     ========================================================================= */
  initEventListeners() {
    // Dashboard actions - Lane Switcher
    document.getElementById('btn-play-lane-switcher').addEventListener('click', () => {
      this.initAudioContext();
      this.playSynthSound('gameStart');
      
      // Clean up layout overrides
      document.getElementById('game-view').classList.remove('mode-word-defender');
      document.getElementById('game-view').classList.remove('mode-cyber-drift');
      
      this.activeGame = this.laneSwitcher;
      this.showView('game');
      if (this.laneSwitcher) {
        this.laneSwitcher.reset();
      }
    });

    // Dashboard actions - Word Defender
    document.getElementById('btn-play-word-defender').addEventListener('click', () => {
      this.initAudioContext();
      this.playSynthSound('gameStart');
      
      // Set layout overrides
      document.getElementById('game-view').classList.remove('mode-cyber-drift');
      document.getElementById('game-view').classList.add('mode-word-defender');
      
      this.activeGame = this.wordDefender;
      this.showView('game');
      if (this.wordDefender) {
        this.wordDefender.reset();
      }
    });

    // Dashboard actions - Cyber Drift
    const btnPlayCyberDrift = document.getElementById('btn-play-cyber-drift');
    if (btnPlayCyberDrift) {
      btnPlayCyberDrift.addEventListener('click', () => {
        this.initAudioContext();
        this.playSynthSound('gameStart');
        
        // Set layout overrides
        document.getElementById('game-view').classList.remove('mode-word-defender');
        document.getElementById('game-view').classList.add('mode-cyber-drift');
        
        this.activeGame = this.cyberDrift;
        this.showView('game');
        if (this.cyberDrift) {
          this.cyberDrift.reset();
        }
      });
    }

    document.getElementById('btn-show-scores').addEventListener('click', () => {
      this.initAudioContext();
      this.playSynthSound('click');
      this.renderHighScores();
      this.showView('scores');
    });

    document.getElementById('btn-show-settings').addEventListener('click', () => {
      this.initAudioContext();
      this.playSynthSound('click');
      this.showView('settings');
    });

    // Sub-view Return Navigation
    document.getElementById('btn-scores-back').addEventListener('click', () => {
      this.playSynthSound('click');
      this.showView('dashboard');
    });

    document.getElementById('btn-settings-back').addEventListener('click', () => {
      this.playSynthSound('click');
      this.saveSettings();
      this.showView('dashboard');
    });

    // Centralized Gameplay Controls (Pause/Abort)
    document.getElementById('btn-pause-game').addEventListener('click', () => {
      this.playSynthSound('click');
      if (this.activeGame) {
        this.activeGame.togglePause();
      }
    });

    document.getElementById('btn-quit-game').addEventListener('click', () => {
      if (this.activeGame) {
        this.activeGame.abortGame();
      }
    });

    // Settings adjustments
    const soundToggle = document.getElementById('setting-sound-toggle');
    soundToggle.addEventListener('change', (e) => {
      this.soundEnabled = e.target.checked;
      this.initAudioContext();
      if (this.soundEnabled) this.playSynthSound('typeSuccess');
    });

    const particlesToggle = document.getElementById('setting-particles-toggle');
    particlesToggle.addEventListener('change', (e) => {
      this.particlesEnabled = e.target.checked;
      this.playSynthSound('click');
    });

    const diffSelect = document.getElementById('setting-difficulty');
    diffSelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.playSynthSound('click');
    });

    // Purge records button
    document.getElementById('btn-purge-scores').addEventListener('click', () => {
      if (confirm("PURGE ALL FLIGHT LOG RECORDS? THIS CANNOT BE UNDONE.")) {
        this.purgeHighScores();
      }
    });
  }

  /* ==========================================================================
     VIEW NAVIGATION ROUTING
     ========================================================================== */
  showView(viewName) {
    if (viewName !== 'game') {
      this.activeGame = null;
    }

    Object.keys(this.views).forEach(key => {
      if (key === viewName) {
        this.views[key].classList.add('active');
      } else {
        this.views[key].classList.remove('active');
      }
    });
    
    // If returning to dashboard, refresh dashboard stats
    if (viewName === 'dashboard') {
      this.updateDashboardStats();
    }
  }

  /* ==========================================================================
     PERSISTENT DATA MANAGEMENT (LOCAL STORAGE)
     ========================================================================== */
  loadSettings() {
    // Sound settings
    const savedSound = localStorage.getItem('neonGrid_sound');
    this.soundEnabled = savedSound !== null ? savedSound === 'true' : true;
    document.getElementById('setting-sound-toggle').checked = this.soundEnabled;

    // Particle settings
    const savedParticles = localStorage.getItem('neonGrid_particles');
    this.particlesEnabled = savedParticles !== null ? savedParticles === 'true' : true;
    document.getElementById('setting-particles-toggle').checked = this.particlesEnabled;

    // Difficulty settings
    const savedDiff = localStorage.getItem('neonGrid_difficulty');
    this.difficulty = savedDiff !== null ? savedDiff : 'normal';
    document.getElementById('setting-difficulty').value = this.difficulty;
  }

  saveSettings() {
    localStorage.setItem('neonGrid_sound', this.soundEnabled);
    localStorage.setItem('neonGrid_particles', this.particlesEnabled);
    localStorage.setItem('neonGrid_difficulty', this.difficulty);
  }

  getHighScores() {
    const scoresJSON = localStorage.getItem('neonGrid_highScores');
    return scoresJSON ? JSON.parse(scoresJSON) : [];
  }

  saveHighScore(score, wpm, timeElapsed) {
    const scores = this.getHighScores();
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });

    let gameName = "LANE_SWITCHER";
    if (this.activeGame === this.wordDefender) {
      gameName = "WORD_DEFENDER";
    } else if (this.activeGame === this.cyberDrift) {
      gameName = "CYBER_DRIFT";
    }

    const newRecord = {
      game: gameName,
      score: parseInt(score),
      wpm: parseInt(wpm),
      time: timeElapsed,
      date: formattedDate,
      pilot: "CYBER_" + Math.floor(1000 + Math.random() * 9000)
    };

    scores.push(newRecord);
    
    // Sort descending by score, limit to top 10
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10);
    localStorage.setItem('neonGrid_highScores', JSON.stringify(topScores));

    // Update aggregate stats
    const totalRuns = parseInt(localStorage.getItem('neonGrid_totalRuns') || 0) + 1;
    localStorage.setItem('neonGrid_totalRuns', totalRuns);

    const peakWpm = Math.max(parseInt(localStorage.getItem('neonGrid_peakWpm') || 0), wpm);
    localStorage.setItem('neonGrid_peakWpm', peakWpm);
  }

  updateDashboardStats() {
    const scores = this.getHighScores();
    
    // Lane Switcher high score
    const lsScores = scores.filter(s => s.game === "LANE_SWITCHER" || !s.game);
    const lsHighest = lsScores.length > 0 ? lsScores[0].score : 0;
    document.getElementById('dash-high-score').innerText = String(lsHighest).padStart(4, '0');

    // Word Defender high score
    const wdScores = scores.filter(s => s.game === "WORD_DEFENDER");
    const wdHighest = wdScores.length > 0 ? wdScores[0].score : 0;
    const wdScoreEl = document.getElementById('dash-high-score-defender');
    if (wdScoreEl) {
      wdScoreEl.innerText = String(wdHighest).padStart(4, '0');
    }

    // Cyber Drift high score
    const cdScores = scores.filter(s => s.game === "CYBER_DRIFT");
    const cdHighest = cdScores.length > 0 ? cdScores[0].score : 0;
    const cdScoreEl = document.getElementById('dash-high-score-cyber-drift');
    if (cdScoreEl) {
      cdScoreEl.innerText = String(cdHighest).padStart(4, '0');
    }

    // Aggregate stats
    const totalRuns = localStorage.getItem('neonGrid_totalRuns') || 0;
    const peakWpm = localStorage.getItem('neonGrid_peakWpm') || 0;

    document.getElementById('stat-total-runs').innerText = totalRuns;
    document.getElementById('stat-peak-wpm').innerText = `${peakWpm} WPM`;
  }

  renderHighScores() {
    const scores = this.getHighScores();
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    if (scores.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--color-text-dim);">NO FLIGHT LOGS ARCHIVED</td></tr>`;
      return;
    }

    scores.forEach((item, index) => {
      const row = document.createElement('tr');
      row.className = `rank-${index + 1}`;
      
      const isWD = item.game === "WORD_DEFENDER";
      const isCD = item.game === "CYBER_DRIFT";
      let gameLabel = "LANE SWITCHER";
      let gameColor = "cyan";
      if (isWD) {
        gameLabel = "WORD DEFENDER";
        gameColor = "magenta";
      } else if (isCD) {
        gameLabel = "CYBER DRIFT";
        gameColor = "yellow";
      }
      
      row.innerHTML = `
        <td>#${index + 1}</td>
        <td><span class="glow-text-${gameColor}" style="font-size:0.8rem; font-weight:bold;">${gameLabel}</span></td>
        <td>${item.pilot}</td>
        <td>${String(item.score).padStart(6, '0')}</td>
        <td>${item.wpm} WPM</td>
        <td>${item.time}</td>
        <td>${item.date}</td>
      `;
      tbody.appendChild(row);
    });
  }

  purgeHighScores() {
    localStorage.removeItem('neonGrid_highScores');
    localStorage.setItem('neonGrid_totalRuns', 0);
    localStorage.setItem('neonGrid_peakWpm', 0);
    this.updateDashboardStats();
    this.renderHighScores();
    this.playSynthSound('crash');
  }

  /* ==========================================================================
     WEB AUDIO API SYNTHESIZER SYSTEM
     ========================================================================== */
  initAudioContext() {
    if (!this.audioCtx) {
      // AudioContext compatibility
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    // Resume context if suspended (browser security autoplays restriction)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Generates retro synthesized sound effects in real time.
   * @param {string} type - The sound preset to play.
   */
  playSynthSound(type) {
    if (!this.soundEnabled || !this.audioCtx) return;
    
    // Prevent errors if context is suspended or failed to init
    if (this.audioCtx.state === 'suspended') return;

    const time = this.audioCtx.currentTime;

    switch (type) {
      case 'click': {
        // Short, dull tick sound
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, time);
        
        gainNode.gain.setValueAtTime(0.08, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.06);
        break;
      }

      case 'typeSuccess': {
        // High pitched snappy synthesizer click
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(1400, time + 0.06);
        
        gainNode.gain.setValueAtTime(0.12, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.09);
        break;
      }

      case 'commandComplete': {
        // Sci-fi rising laser chord
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(440, time);
        osc1.frequency.exponentialRampToValueAtTime(1200, time + 0.25);

        osc2.frequency.setValueAtTime(554.37, time); // Major third harmony
        osc2.frequency.exponentialRampToValueAtTime(1500, time + 0.25);

        gainNode.gain.setValueAtTime(0.1, time);
        gainNode.gain.linearRampToValueAtTime(0.15, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc1.start(time);
        osc2.start(time);
        
        osc1.stop(time + 0.3);
        osc2.stop(time + 0.3);
        break;
      }

      case 'fail': {
        // Low negative warning buzz
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, time);
        osc.frequency.linearRampToValueAtTime(90, time + 0.2);
        
        gainNode.gain.setValueAtTime(0.18, time);
        gainNode.gain.linearRampToValueAtTime(0.001, time + 0.25);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        osc.start(time);
        osc.stop(time + 0.26);
        break;
      }

      case 'spin': {
        // Modulated vibrato sci-fi whoosh (0.7s)
        const osc = this.audioCtx.createOscillator();
        const mod = this.audioCtx.createOscillator();
        const modGain = this.audioCtx.createGain();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'triangle';
        mod.type = 'sine';

        osc.frequency.setValueAtTime(250, time);
        osc.frequency.exponentialRampToValueAtTime(800, time + 0.7);

        mod.frequency.setValueAtTime(25, time); // FM speed
        modGain.gain.setValueAtTime(150, time); // FM intensity

        gainNode.gain.setValueAtTime(0.15, time);
        gainNode.gain.linearRampToValueAtTime(0.2, time + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        mod.start(time);
        osc.start(time);
        
        mod.stop(time + 0.7);
        osc.stop(time + 0.7);
        break;
      }

      case 'crash': {
        // Low-frequency noisy bass explosion
        const bufferSize = this.audioCtx.sampleRate * 0.4; // 0.4 seconds
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        // Low pass filter to make it sound like a rumble
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, time);
        filter.frequency.exponentialRampToValueAtTime(20, time + 0.4);

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.35, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        noiseNode.start(time);
        noiseNode.stop(time + 0.4);
        
        // Double with a low sine wave for heavy punch
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.linearRampToValueAtTime(40, time + 0.2);
        oscGain.gain.setValueAtTime(0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(oscGain);
        oscGain.connect(this.audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
        break;
      }

      case 'gameStart': {
        // Cool retro console boot arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gainNode = this.audioCtx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time + index * 0.08);
          
          gainNode.gain.setValueAtTime(0.0, time);
          gainNode.gain.setValueAtTime(0.12, time + index * 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + index * 0.08 + 0.35);
          
          osc.connect(gainNode);
          gainNode.connect(this.audioCtx.destination);
          
          osc.start(time + index * 0.08);
          osc.stop(time + index * 0.08 + 0.4);
        });
        break;
      }

      case 'gameOver': {
        // Melodramatic minor scale descending arpeggio
        const notes = [440.00, 415.30, 349.23, 293.66, 220.00]; // A4, Ab4, F4, D4, A3
        notes.forEach((freq, index) => {
          const osc = this.audioCtx.createOscillator();
          const gainNode = this.audioCtx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, time + index * 0.15);
          
          gainNode.gain.setValueAtTime(0.0, time);
          gainNode.gain.setValueAtTime(0.1, time + index * 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + index * 0.15 + 0.5);
          
          osc.connect(gainNode);
          gainNode.connect(this.audioCtx.destination);
          
          osc.start(time + index * 0.15);
          osc.stop(time + index * 0.15 + 0.6);
        });
        break;
      }
    }
  }
}

// Instantiate App when document is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new NeonArcadeApp();
});
