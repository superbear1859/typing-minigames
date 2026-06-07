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
    this.sixSevenMode = false;
    
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
    this.cyberCore = null;
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
    this.initHoverInfo();
    
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
    if (typeof CyberCoreGame !== 'undefined') {
      this.cyberCore = new CyberCoreGame(this);
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
    } else if (bootGame === 'cyberCore') {
      setTimeout(() => {
        const btn = document.getElementById('btn-play-cyber-core');
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
      document.getElementById('game-view').classList.remove('mode-cyber-core');
      
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
      document.getElementById('game-view').classList.remove('mode-cyber-core');
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
        document.getElementById('game-view').classList.remove('mode-cyber-core');
        document.getElementById('game-view').classList.add('mode-cyber-drift');
        
        this.activeGame = this.cyberDrift;
        this.showView('game');
        if (this.cyberDrift) {
          this.cyberDrift.reset();
        }
      });
    }

    // Dashboard actions - Cyber Core
    const btnPlayCyberCore = document.getElementById('btn-play-cyber-core');
    if (btnPlayCyberCore) {
      btnPlayCyberCore.addEventListener('click', () => {
        this.initAudioContext();
        this.playSynthSound('gameStart');
        
        // Set layout overrides
        document.getElementById('game-view').classList.remove('mode-word-defender');
        document.getElementById('game-view').classList.remove('mode-cyber-drift');
        document.getElementById('game-view').classList.add('mode-cyber-core');
        
        this.activeGame = this.cyberCore;
        this.showView('game');
        if (this.cyberCore) {
          this.cyberCore.reset();
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

    const sixSevenToggle = document.getElementById('setting-sixseven-toggle');
    sixSevenToggle.addEventListener('change', (e) => {
      this.sixSevenMode = e.target.checked;
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

    // Six Seven mode settings
    const savedSixSeven = localStorage.getItem('neonGrid_sixSeven');
    this.sixSevenMode = savedSixSeven !== null ? savedSixSeven === 'true' : false;
    document.getElementById('setting-sixseven-toggle').checked = this.sixSevenMode;
  }

  saveSettings() {
    localStorage.setItem('neonGrid_sound', this.soundEnabled);
    localStorage.setItem('neonGrid_particles', this.particlesEnabled);
    localStorage.setItem('neonGrid_difficulty', this.difficulty);
    localStorage.setItem('neonGrid_sixSeven', this.sixSevenMode);
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
    } else if (this.activeGame === this.cyberCore) {
      gameName = "CYBER_CORE";
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

    // Cyber Core high score
    const ccScores = scores.filter(s => s.game === "CYBER_CORE");
    const ccHighest = ccScores.length > 0 ? ccScores[0].score : 0;
    const ccScoreEl = document.getElementById('dash-high-score-cyber-core');
    if (ccScoreEl) {
      ccScoreEl.innerText = String(ccHighest).padStart(4, '0');
    }

    // Aggregate stats
    const totalRuns = localStorage.getItem('neonGrid_totalRuns') || 0;
    const peakWpm = localStorage.getItem('neonGrid_peakWpm') || 0;

    document.getElementById('stat-total-runs').innerText = totalRuns;
    document.getElementById('stat-peak-wpm').innerText = `${peakWpm} WPM`;

    // Update game card descriptions dynamically based on Six Seven Mode
    const descLS = this.sixSevenMode 
      ? 'Navigate a 5-lane hyper-highway using numeric inputs. Dodge obstacles by typing "6 7" or "4 1". Type "7 11" to activate a 0.5s overdrive shield.'
      : 'Navigate a 5-lane hyper-highway. Dodge obstacles by typing "left" or "right". Destroy barricades by typing "spin" to enter a 0.5s overdrive.';
    const descWD = this.sixSevenMode
      ? 'A retro space shooter. Words descend from the sky; type only "six seven", "four one", and "seven eleven" before shields breach.'
      : 'A retro space shooter. Words descend from the sky; type them down before they breach your thermal shields.';
    const descCD = this.sixSevenMode
      ? 'Speed-run test of pure typing velocity. Negotiate highway gates by typing only "six seven", "four one", and "seven eleven" to activate boost mode.'
      : 'Speed-run test of pure typing velocity. Drifting down a winding highway; type prompt words to negotiate drift gates and activate boost mode.';
    const descCC = this.sixSevenMode
      ? 'Aim and fire orbital turrets at network vulnerabilities. Threats converge from 360 degrees; defend the core by typing only "six seven", "four one", and "seven eleven".'
      : 'Aim and fire orbital turrets at network vulnerabilities. Threats converge on the core from 360 degrees; type words to fire energy beams before they hit rotating shields.';

    const elLS = document.querySelector('#card-lane-switcher .game-desc');
    if (elLS) elLS.innerText = descLS;
    const elWD = document.querySelector('#card-word-defender .game-desc');
    if (elWD) elWD.innerText = descWD;
    const elCD = document.querySelector('#card-cyber-drift .game-desc');
    if (elCD) elCD.innerText = descCD;
    const elCC = document.querySelector('#card-cyber-core .game-desc');
    if (elCC) elCC.innerText = descCC;
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
      } else if (item.game === "CYBER_CORE") {
        gameLabel = "CYBER CORE";
        gameColor = "purple";
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

  initHoverInfo() {
    const tipPanel = document.querySelector('.tip-panel');
    if (!tipPanel) return;

    const defaultHtml = tipPanel.innerHTML;

    const getGameInfo = (id) => {
      if (id === 'card-lane-switcher') {
        const leftCmd = this.sixSevenMode ? '6 7' : 'left';
        const rightCmd = this.sixSevenMode ? '4 1' : 'right';
        const spinCmd = this.sixSevenMode ? '7 11' : 'spin';
        const objective = this.sixSevenMode
          ? 'Navigate a 5-lane highway using numeric inputs. Dodge obstacles by typing commands.'
          : 'Navigate a 5-lane highway and dodge orange barricades.';
        return `
          <h3 class="panel-title">// TRANSMISSION: LANE_SWITCHER</h3>
          <div class="tip-detail" style="animation: flickerEffect 0.3s ease;">
            <p class="tip-text" style="color: var(--color-neon-cyan); margin-bottom: 8px;"><strong>OBJECTIVE:</strong> ${objective}</p>
            <p class="tip-text" style="margin-bottom: 6px;"><strong>COMMANDS:</strong></p>
            <ul style="list-style: none; padding-left: 10px; font-size: 0.85rem; line-height: 1.35rem; font-family: var(--font-mono); margin-bottom: 8px;">
              <li>• <span style="color: var(--color-neon-cyan)">${leftCmd}</span> - Shift Left 1 Lane</li>
              <li>• <span style="color: var(--color-neon-cyan)">${rightCmd}</span> - Shift Right 1 Lane</li>
              <li>• <span style="color: var(--color-neon-magenta)">${spinCmd}</span> - Overdrive Spin (0.5s Shield)</li>
            </ul>
            <p class="tip-text" style="font-style: italic;">"PRO-TIP: Typing errors trigger a 500ms input lockout. Focus on accuracy over raw speed!"</p>
          </div>
        `;
      } else if (id === 'card-word-defender') {
        const desc = this.sixSevenMode 
          ? "OBJECTIVE: Shoot down incoming space code nodes by typing only 'six seven', 'four one', and 'seven eleven'."
          : "OBJECTIVE: Shoot down incoming space code words before shields breach.";
        return `
          <h3 class="panel-title">// TRANSMISSION: WORD_DEFENDER</h3>
          <div class="tip-detail" style="animation: flickerEffect 0.3s ease;">
            <p class="tip-text" style="color: var(--color-neon-magenta); margin-bottom: 8px;"><strong>${desc}</strong></p>
            <p class="tip-text" style="margin-bottom: 6px;"><strong>COMMANDS:</strong></p>
            <ul style="list-style: none; padding-left: 10px; font-size: 0.85rem; line-height: 1.35rem; font-family: var(--font-mono); margin-bottom: 8px;">
              <li>• Type letters of descending words to lock lasers.</li>
              <li>• Complete word spelling to launch interceptor missiles.</li>
            </ul>
            <p class="tip-text" style="font-style: italic;">"PRO-TIP: Completed words freeze in place while missiles are in flight. Target low-altitude threats first!"</p>
          </div>
        `;
      } else if (id === 'card-cyber-drift') {
        const desc = this.sixSevenMode
          ? "OBJECTIVE: Drift through highway gates by typing only 'six seven', 'four one', and 'seven eleven'."
          : "OBJECTIVE: Drift through highway gates at high velocity.";
        return `
          <h3 class="panel-title">// TRANSMISSION: CYBER_DRIFT</h3>
          <div class="tip-detail" style="animation: flickerEffect 0.3s ease;">
            <p class="tip-text" style="color: var(--color-neon-yellow); margin-bottom: 8px;"><strong>${desc}</strong></p>
            <p class="tip-text" style="margin-bottom: 6px;"><strong>COMMANDS:</strong></p>
            <ul style="list-style: none; padding-left: 10px; font-size: 0.85rem; line-height: 1.35rem; font-family: var(--font-mono); margin-bottom: 8px;">
              <li>• Type first letter of gate to lock track route.</li>
              <li>• Type full word to align vehicle chassis.</li>
            </ul>
            <p class="tip-text" style="font-style: italic;">"PRO-TIP: Successfully drifting 5 gates consecutively activates dual exhaust TURBO BOOST for double points!"</p>
          </div>
        `;
      } else if (id === 'card-cyber-core') {
        const desc = this.sixSevenMode
          ? "OBJECTIVE: Protect generator core by typing only 'six seven', 'four one', and 'seven eleven'."
          : "OBJECTIVE: Protect the generator core from 360-degree convergence.";
        return `
          <h3 class="panel-title">// TRANSMISSION: CYBER_CORE</h3>
          <div class="tip-detail" style="animation: flickerEffect 0.3s ease;">
            <p class="tip-text" style="color: var(--color-neon-purple); margin-bottom: 8px;"><strong>${desc}</strong></p>
            <p class="tip-text" style="margin-bottom: 6px;"><strong>COMMANDS:</strong></p>
            <ul style="list-style: none; padding-left: 10px; font-size: 0.85rem; line-height: 1.35rem; font-family: var(--font-mono); margin-bottom: 8px;">
              <li>• Type first letter of node to aim plasma turret.</li>
              <li>• Complete word spelling to discharge instant energy lasers.</li>
            </ul>
            <p class="tip-text" style="font-style: italic;">"PRO-TIP: Watch core's revolving shields. They absorb node collisions but let laser beams pass outwards!"</p>
          </div>
        `;
      }
      return '';
    };

    const cardIds = ['card-lane-switcher', 'card-word-defender', 'card-cyber-drift', 'card-cyber-core'];

    cardIds.forEach(id => {
      const card = document.getElementById(id);
      if (card) {
        card.addEventListener('mouseenter', () => {
          tipPanel.innerHTML = getGameInfo(id);
          this.playSynthSound('click');
          
          // Smoothly scroll the card fully into view if it is cut off
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        card.addEventListener('mouseleave', () => {
          tipPanel.innerHTML = defaultHtml;
        });
      }
    });
  }
}

// Instantiate App when document is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new NeonArcadeApp();
});
