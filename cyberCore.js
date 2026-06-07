/**
 * NEON GRID // CYBER CORE MINIGAME ENGINE
 * Circular defense typing game where threats converge on a central core from 360 degrees.
 * Player types words to aim, charge, and fire high-energy plasma sweeps.
 */

class CyberCoreGame {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Core game state
    this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
    this.timer = 300; // 5 minutes
    this.timerInterval = null;
    this.score = 0;
    this.shields = 100; // Shield integrity percentage (0-100%)
    this.maxShields = 100;
    this.charge = 0; // Overcharge percentage (0-100%)
    this.jamTimer = 0; // Key lock duration in ms
    this.burstTypedLength = 0; // spelling progress for ultimate
    this.purgeAnimationTimer = 0; // screen clear wave duration in ms
    this.lastFrameTime = 0;

    // Word dictionaries
    this.words3_4 = ['node', 'grid', 'core', 'link', 'data', 'sync', 'hash', 'port', 'gate', 'void', 'byte', 'chip', 'code', 'hack', 'ping', 'null', 'zone', 'flux', 'ion', 'beam'];
    this.words5_6 = ['orbit', 'cyber', 'radar', 'sonar', 'matrix', 'photon', 'vector', 'tensor', 'vertex', 'shield', 'sensor', 'system', 'engine', 'plasma', 'beacon', 'quasar'];
    this.words7_10 = ['telemetry', 'mainframe', 'singularity', 'encryption', 'processor', 'bandwidth', 'cybernetics', 'supernova', 'synthesizer', 'interceptor', 'hyperdrive'];

    // Game variables
    this.threats = [];
    this.threatSpawnTimer = 0;
    this.threatSpawnInterval = 3500; // ms
    this.threatSpeed = 0.03; // px per ms
    this.baseSpeed = 0.03;

    // Visual configurations
    this.coreRadius = 35;
    this.shieldRotation = 0;
    this.shieldRadius = 60;
    this.activeLasers = []; // Lasers currently rendering
    this.particles = [];
    
    // Background scanning lines
    this.scanLinesOffset = 0;

    // Target tracking
    this.targetedThreat = null;
    this.currentInput = "";
    this.overlayInput = "";
    this.menuBuffer = "";

    // Stats
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    // Bind resize
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();

    // Key listener
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  reset() {
    this.gameState = 'start';
    this.timer = 300;
    this.score = 0;
    this.shields = 100;
    this.charge = 0;
    this.jamTimer = 0;
    this.burstTypedLength = 0;
    this.purgeAnimationTimer = 0;
    this.threats = [];
    this.activeLasers = [];
    this.particles = [];
    this.targetedThreat = null;
    this.currentInput = "";
    this.overlayInput = "";
    this.menuBuffer = "";
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);

    // Speed and spawn interval based on difficulty
    const diff = this.app.difficulty;
    if (diff === 'hyper') {
      this.baseSpeed = 0.05;
      this.threatSpawnInterval = 2200;
    } else if (diff === 'overload') {
      this.baseSpeed = 0.08;
      this.threatSpawnInterval = 1300;
    } else {
      this.baseSpeed = 0.03;
      this.threatSpawnInterval = 3500;
    }
    this.threatSpeed = this.baseSpeed;
    this.threatSpawnTimer = 0;

    this.resizeCanvas();
    this.updateHUD();
    this.updateTypingUI();

    // Reset overlays
    this.toggleOverlay('game-start-overlay', true);
    this.toggleOverlay('game-over-overlay', false);
    this.toggleOverlay('game-paused-overlay', false);

    // Setup start overlay instructions dynamically for Cyber Core
    document.getElementById('start-overlay-title').innerText = "CYBER CORE";
    document.getElementById('start-overlay-title').className = "flicker glow-text-yellow";
    document.getElementById('start-overlay-instructions').innerHTML = `
      <p class="instruction-line"><span class="highlight">DEFEND THE CYBER CORE</span> from incoming network threats:</p>
      <div class="control-legend">
        <div class="control-key" style="margin-bottom:8px;">
          <span style="border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); background: rgba(255,196,0,0.1);">Aim</span> 
          <span class="action-desc">→ Press first letter of an approaching node to lock core's targeting system</span>
        </div>
        <div class="control-key" style="margin-bottom:8px;">
          <span style="border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); background: rgba(255,196,0,0.1);">Fire</span> 
          <span class="action-desc">→ Finish spelling to discharge a high-energy laser beam and destroy it</span>
        </div>
        <div class="control-key">
          <span style="border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); background: rgba(255,196,0,0.1);">Core</span> 
          <span class="action-desc">→ Prevent threats from penetrating the core's rotating orbit ring</span>
        </div>
      </div>
      <p class="warning-text">Survival window: 5 minutes. Protect core system integrity at all costs!</p>
    `;

    this.updateOverlayTargetHint('start');

    // Run animation frame loop
    this.lastFrameTime = performance.now();
    if (!this.animationFrameId) {
      this.loop(this.lastFrameTime);
    }
  }

  start() {
    this.gameState = 'playing';
    this.startTime = Date.now();

    this.toggleOverlay('game-start-overlay', false);
    this.app.playSynthSound('gameStart');

    // Game timer countdown loop
    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing') {
        this.timer--;
        this.gameTimeElapsed++;
        this.score += 5; // Survival score
        this.updateHUD();

        // Speed ramps up slowly over survival time
        this.threatSpeed = this.baseSpeed + (this.gameTimeElapsed * 0.0001);

        if (this.timer <= 0) {
          this.endGame(true); // Victory!
        }
      }
    }, 1000);
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.overlayInput = "";
      this.toggleOverlay('game-paused-overlay', true);
      this.app.playSynthSound('click');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.toggleOverlay('game-paused-overlay', false);
      this.app.playSynthSound('click');
    }
  }

  abortGame() {
    if (confirm("ABORT THIS SYSTEM RUN? PROGRESS WILL BE LOST.")) {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.gameState = 'start';
      this.app.showView('dashboard');
    }
  }

  exitToMenu() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.gameState = 'start';
    this.app.showView('dashboard');
    this.app.playSynthSound('click');
  }

  endGame(isVictory = false) {
    this.gameState = 'gameover';
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.overlayInput = "";
    this.updateOverlayTargetHint('restart');

    if (isVictory) {
      this.app.playSynthSound('commandComplete');
      document.getElementById('game-over-title').innerText = "CORE SECURED";
      document.getElementById('game-over-title').className = "glow-text-cyan flicker";
      document.getElementById('game-over-reason').innerText = "System core encryption fully fortified.";
    } else {
      this.app.playSynthSound('gameOver');
      document.getElementById('game-over-title').innerText = "CORE DESTROYED";
      document.getElementById('game-over-title').className = "glow-text-magenta flicker-slow";
      document.getElementById('game-over-reason').innerText = "System containment breached. Critical leak.";
    }

    const timeStr = this.getFormattedTime(300 - this.timer);
    const wpm = this.calculateWPM();
    const finalScore = Math.floor(this.score);

    document.getElementById('final-score-val').innerText = finalScore;
    document.getElementById('final-time-val').innerText = timeStr;
    document.getElementById('final-wpm-val').innerText = `${wpm} words per minute`;

    this.app.saveHighScore(finalScore, wpm, timeStr);
    this.toggleOverlay('game-over-overlay', true);
  }

  loop(currentTime) {
    if (this.app.activeGame !== this) {
      this.animationFrameId = null;
      return;
    }

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));

    // Auto-resize check
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.resizeCanvas();
    }

    const dt = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.update(dt);
    this.render();
  }

  update(dt) {
    if (this.app.activeGame !== this) return;

    // Decr jam lockout timer
    if (this.jamTimer > 0) {
      this.jamTimer = Math.max(0, this.jamTimer - dt);
    }

    // Decr purge animation timer
    if (this.purgeAnimationTimer > 0) {
      this.purgeAnimationTimer = Math.max(0, this.purgeAnimationTimer - dt);
    }

    // Rotate defensive rings
    const rotationFactor = this.gameState === 'playing' ? 0.001 : 0.0002;
    this.shieldRotation = (this.shieldRotation + rotationFactor * dt) % (Math.PI * 2);

    // Scroll scanning lines for cyber vibe grid
    this.scanLinesOffset = (this.scanLinesOffset + 0.02 * dt) % 40;

    this.updateParticles(dt);

    // Update active laser beam durations
    for (let i = this.activeLasers.length - 1; i >= 0; i--) {
      const laser = this.activeLasers[i];
      laser.duration -= dt;
      if (laser.duration <= 0) {
        this.activeLasers.splice(i, 1);
      }
    }

    if (this.gameState !== 'playing') return;

    // Move threat nodes towards center core
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    for (let i = this.threats.length - 1; i >= 0; i--) {
      const threat = this.threats[i];
      
      // Drainer (hacker) node behavior: stop and tether when close
      if (threat.type === 'drainer' && threat.distance <= 180) {
        threat.isTethered = true;
        // Drain shields (approx 5% per second)
        this.shields = Math.max(0, this.shields - 0.005 * dt);
        // Drain score (approx 2 points per second)
        this.score = Math.max(0, this.score - 0.002 * dt);
        this.updateHUD();
        
        if (this.shields <= 0) {
          this.endGame(false);
          return;
        }
      } else {
        threat.isTethered = false;
        threat.distance -= this.threatSpeed * (threat.speedMultiplier || 1.0) * dt;
      }

      // Calculate coordinates
      threat.x = cx + Math.cos(threat.angle) * threat.distance;
      threat.y = cy + Math.sin(threat.angle) * threat.distance;

      // Threat hits the core!
      if (threat.distance <= this.coreRadius + 5) {
        this.threats.splice(i, 1);

        if (this.targetedThreat === threat) {
          this.targetedThreat = null;
          this.currentInput = "";
          this.updateTypingUI();
        }

        // Damage calculations
        let damage = 15;
        let explosionColor = 'magenta';
        
        if (threat.type === 'emp') {
          damage = 15;
          this.jamTimer = 2500; // 2.5s input jam lockout
          explosionColor = 'yellow';
          // Clear current target lock as systems reboot
          this.targetedThreat = null;
          this.currentInput = "";
          this.updateTypingUI();
        } else if (threat.type === 'drainer') {
          damage = 20;
          explosionColor = 'magenta';
        } else if (threat.type === 'recovery') {
          damage = 10; // Healing packets still disrupt when colliding passively
          explosionColor = 'cyan';
        }

        this.shields = Math.max(0, this.shields - damage);
        this.triggerScreenShake();
        this.spawnExplosion(threat.x, threat.y, explosionColor);
        this.app.playSynthSound('crash');
        this.updateHUD();

        if (this.shields <= 0) {
          this.endGame(false);
          return;
        }
      }
    }

    // Threat Spawner
    this.threatSpawnTimer += dt;
    if (this.threatSpawnTimer >= this.threatSpawnInterval) {
      this.spawnThreat();
      this.threatSpawnTimer = 0;
    }
  }

  spawnThreat() {
    if (this.canvas.width < 100 || this.canvas.height < 100) return;

    // Pick word bank based on game time
    let wordList = [];
    if (this.gameTimeElapsed > 90) {
      const rand = Math.random();
      if (rand < 0.3) wordList = this.words3_4;
      else if (rand < 0.7) wordList = this.words5_6;
      else wordList = this.words7_10;
    } else if (this.gameTimeElapsed > 30) {
      if (Math.random() < 0.5) wordList = this.words3_4;
      else wordList = this.words5_6;
    } else {
      wordList = this.words3_4;
    }

    const text = wordList[Math.floor(Math.random() * wordList.length)];
    
    // Spawn threat at a random angle around center, far offscreen
    const angle = Math.random() * Math.PI * 2;
    const spawnDistance = Math.max(this.canvas.width, this.canvas.height) * 0.55;

    // Calculate coordinates
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Determine type
    const randType = Math.random();
    let type = 'standard';
    let labelPrefix = '';
    let color = Math.random() < 0.5 ? this.app.themeColors.cyan : this.app.themeColors.magenta;
    let speedMultiplier = 1.0;

    if (randType < 0.15) {
      type = 'emp';
      labelPrefix = '[EMP] ';
      color = this.app.themeColors.yellow;
      speedMultiplier = 1.6;
    } else if (randType < 0.27) {
      type = 'drainer';
      labelPrefix = '[HACK] ';
      color = this.app.themeColors.purple;
      speedMultiplier = 1.0;
    } else if (randType < 0.35) {
      type = 'recovery';
      labelPrefix = '[HEAL] ';
      color = '#00ff66'; // Neon green
      speedMultiplier = 0.8;
    }

    this.threats.push({
      text: text,
      labelPrefix: labelPrefix,
      type: type,
      angle: angle,
      distance: spawnDistance,
      x: cx + Math.cos(angle) * spawnDistance,
      y: cy + Math.sin(angle) * spawnDistance,
      typedLength: 0,
      color: color,
      speedMultiplier: speedMultiplier
    });
  }

  spawnExplosion(x, y, theme) {
    if (!this.app.particlesEnabled) return;

    const count = theme === 'magenta' ? 30 : 20;
    const color = theme === 'magenta' ? this.app.themeColors.magenta : this.app.themeColors.yellow;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.35;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: color,
        alpha: 1.0,
        decay: 0.002 + Math.random() * 0.002
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  triggerScreenShake() {
    const screen = document.getElementById('arcade-screen');
    screen.classList.add('damage-flash');
    this.canvas.classList.add('shake');
    setTimeout(() => {
      screen.classList.remove('damage-flash');
      this.canvas.classList.remove('shake');
    }, 350);
  }

  render() {
    if (this.app.activeGame !== this) return;

    // Clear background
    this.ctx.fillStyle = '#060112';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Deep grid concentric backgrounds
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    const radial = this.ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.max(cx, cy));
    radial.addColorStop(0, '#120228');
    radial.addColorStop(0.6, '#060112');
    this.ctx.fillStyle = radial;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background concentric radar lines
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.1)';
    this.ctx.lineWidth = 1;
    const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.6;
    for (let r = 80; r < maxRadius; r += 80) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Draw Hacker tethers
    this.threats.forEach(threat => {
      if (threat.isTethered) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.6)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.app.themeColors.purple;
        this.ctx.lineWidth = 2 + Math.sin(Date.now() * 0.05) * 1;
        this.ctx.setLineDash([4, 2 + Math.random() * 4]); // noise/glitch effect

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(threat.x, threat.y);
        this.ctx.stroke();
        this.ctx.restore();
      }
    });

    // Draw active laser beams
    this.drawLasers();

    // Draw Neural Purge expanding shockwave
    if (this.purgeAnimationTimer > 0) {
      this.ctx.save();
      const progress = 1 - (this.purgeAnimationTimer / 600);
      const purgeMaxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.75;
      const currentRadius = progress * purgeMaxRadius;

      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
      this.ctx.shadowBlur = 35;
      this.ctx.shadowColor = this.app.themeColors.cyan;
      this.ctx.lineWidth = 16 * (1 - progress);

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Secondary purge shockwave ring
      if (currentRadius > 40) {
        this.ctx.strokeStyle = 'rgba(255, 0, 91, 0.55)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = this.app.themeColors.magenta;
        this.ctx.lineWidth = 6 * (1 - progress);
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, currentRadius - 30, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // Draw particles
    this.drawParticles();

    // Draw threat nodes & text
    this.drawThreats();

    // Draw core turret & rotating shield segments
    this.drawCore();

    // Draw system jam warning overlay
    if (this.jamTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 196, 0, 0.08)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Flash "JAMMED" alert
      if (Math.floor(Date.now() / 250) % 2 === 0) {
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffc400';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ffc400';
        this.ctx.font = "bold 28px 'Share Tech Mono', monospace";
        this.ctx.fillText("!!! TRANSCEIVER JAMMED !!!", cx, cy - 120);
        this.ctx.font = "bold 14px 'Share Tech Mono', monospace";
        this.ctx.fillText("ATTEMPTING NEURAL DECODER REBOOT...", cx, cy - 90);
      }
      this.ctx.restore();
    }
  }

  drawLasers() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    this.activeLasers.forEach(laser => {
      this.ctx.save();
      this.ctx.strokeStyle = laser.color;
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = laser.color;
      this.ctx.lineWidth = 6 * (laser.duration / 180); // Beam narrows over duration

      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(laser.tx, laser.ty);
      this.ctx.stroke();

      // Inner core core white beam
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2 * (laser.duration / 180);
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawThreats() {
    this.threats.forEach(threat => {
      const isTargeted = this.targetedThreat === threat;

      this.ctx.save();
      this.ctx.translate(threat.x, threat.y);

      // Draw wireframe hexagon representing network threat
      this.ctx.shadowBlur = isTargeted ? 12 : 5;
      this.ctx.shadowColor = threat.color;
      this.ctx.strokeStyle = threat.color;
      this.ctx.lineWidth = isTargeted ? 2.5 : 1.5;
      this.ctx.fillStyle = 'rgba(6, 1, 18, 0.75)';

      const hexSize = 20;
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = Math.cos(angle) * hexSize;
        const hy = Math.sin(angle) * hexSize;
        if (i === 0) this.ctx.moveTo(hx, hy);
        else this.ctx.lineTo(hx, hy);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Draw threat target word label card
      this.ctx.translate(0, 32);
      this.ctx.font = "bold 14px 'Share Tech Mono', monospace";
      
      const prefix = threat.labelPrefix || '';
      const txt = threat.text;
      const fullText = prefix + txt;
      const typedLen = threat.typedLength;

      const textWidth = this.ctx.measureText(fullText).width + 12;
      this.ctx.fillStyle = isTargeted ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.5)';
      this.ctx.strokeStyle = isTargeted ? (threat.color || this.app.themeColors.cyan) : 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.rect(-textWidth / 2, -13, textWidth, 20);
      this.ctx.fill();
      this.ctx.stroke();

      // Character rendering split logic
      this.ctx.shadowBlur = isTargeted ? 8 : 4;
      const totalWidth = this.ctx.measureText(fullText).width;
      const startX = -totalWidth / 2;

      // Draw prefix if exists
      if (prefix) {
        this.ctx.fillStyle = threat.color;
        this.ctx.shadowColor = threat.color;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(prefix, startX, 2);
      }

      const prefixWidth = prefix ? this.ctx.measureText(prefix).width : 0;

      if (typedLen > 0) {
        const typedTxt = txt.substring(0, typedLen);
        const untypedTxt = txt.substring(typedLen);

        const typedWidth = this.ctx.measureText(typedTxt).width;

        // Highlight typed in cyan
        this.ctx.fillStyle = this.app.themeColors.cyan;
        this.ctx.shadowColor = this.app.themeColors.cyan;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(typedTxt, startX + prefixWidth, 2);

        // Highlight remaining in threat color (or white if locked)
        this.ctx.fillStyle = isTargeted ? '#ffffff' : threat.color;
        this.ctx.shadowColor = isTargeted ? this.app.themeColors.cyan : threat.color;
        this.ctx.fillText(untypedTxt, startX + prefixWidth + typedWidth, 2);
      } else {
        this.ctx.fillStyle = threat.color;
        this.ctx.shadowColor = threat.color;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(txt, startX + prefixWidth, 2);
      }

      this.ctx.restore();
    });
  }

  drawCore() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    this.ctx.save();
    this.ctx.translate(cx, cy);

    // Aiming laser line (if target is active)
    if (this.targetedThreat && this.gameState === 'playing') {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(this.targetedThreat.x - cx, this.targetedThreat.y - cy);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Outer revolving shields arcs (rotating circles)
    this.ctx.strokeStyle = this.app.themeColors.yellow;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.app.themeColors.yellow;
    this.ctx.lineWidth = 3;

    // Draw 3 arc segments
    const numShields = 3;
    const segmentLength = (Math.PI * 2) / numShields - 0.5; // leaving gaps
    for (let i = 0; i < numShields; i++) {
      const startAngle = this.shieldRotation + (Math.PI * 2 / numShields) * i;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.shieldRadius, startAngle, startAngle + segmentLength);
      this.ctx.stroke();
    }

    // Draw Overcharge progress ring
    if (this.gameState === 'playing') {
      const chargeRadius = 46;
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, chargeRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      const chargeAngle = (this.charge / 100) * Math.PI * 2;
      this.ctx.lineWidth = 4;
      const isCharged = this.charge >= 100;
      this.ctx.strokeStyle = isCharged 
        ? (Math.floor(Date.now() / 150) % 2 === 0 ? '#ffc400' : '#ffffff') 
        : this.app.themeColors.cyan;
      this.ctx.shadowBlur = isCharged ? 18 : 6;
      this.ctx.shadowColor = isCharged ? '#ffc400' : this.app.themeColors.cyan;
      
      this.ctx.beginPath();
      this.ctx.arc(0, 0, chargeRadius, -Math.PI / 2, -Math.PI / 2 + chargeAngle);
      this.ctx.stroke();

      // If fully charged, render a subtle prompt
      if (isCharged && Math.floor(Date.now() / 250) % 2 === 0) {
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffc400';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ffc400';
        this.ctx.font = "bold 9px 'Share Tech Mono', monospace";
        this.ctx.fillText("TYPE 'BURST'", 0, -chargeRadius - 8);
      }
      this.ctx.restore();
    }

    // Draw central generator core sphere
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.app.themeColors.cyan;
    this.ctx.strokeStyle = this.app.themeColors.cyan;
    this.ctx.fillStyle = '#070014';
    this.ctx.lineWidth = 2.5;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.coreRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Turret vector (rotates towards targeted threat)
    let turretAngle = this.shieldRotation * -1.5; // default idle spin
    if (this.targetedThreat) {
      turretAngle = Math.atan2(this.targetedThreat.y - cy, this.targetedThreat.x - cx);
    }

    this.ctx.rotate(turretAngle);

    // Draw turret barrel shape
    this.ctx.strokeStyle = this.app.themeColors.magenta;
    this.ctx.shadowColor = this.app.themeColors.magenta;
    this.ctx.fillStyle = '#070014';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.rect(0, -6, 25, 12);
    this.ctx.fill();
    this.ctx.stroke();

    // Inner glowing core dot
    this.ctx.fillStyle = this.app.themeColors.yellow;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  handleKeyDown(e) {
    if (this.app.activeGame !== this) return;
    if (this.app.views.game.classList.contains('active') === false) return;

    const key = e.key;

    // Check for "menu" bypass
    if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      this.menuBuffer = (this.menuBuffer || "") + key.toLowerCase();
      if (this.menuBuffer.length > 4) {
        this.menuBuffer = this.menuBuffer.slice(-4);
      }
      if (this.menuBuffer === 'menu') {
        this.menuBuffer = "";
        this.exitToMenu();
        return;
      }
    }

    if (key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    // Capture overlay typing
    if (this.gameState === 'start') {
      this.parseOverlayInput(key, 'start');
      return;
    }
    if (this.gameState === 'gameover') {
      this.parseOverlayInput(key, 'gameover');
      return;
    }
    if (this.gameState === 'paused') {
      this.parseOverlayInput(key, 'paused');
      return;
    }

    // Gameplay keys
    if (this.gameState === 'playing') {
      if (key.length === 1 && /[a-zA-Z]/.test(key)) {
        this.processKeystroke(key.toLowerCase());
      }
    }
  }

  processKeystroke(char) {
    // If keyboard is jammed from EMP Glitcher impact
    if (this.jamTimer > 0) {
      this.app.playSynthSound('fail');
      const wrapper = document.querySelector('.input-display-wrapper');
      const feedback = document.getElementById('typing-feedback');
      
      wrapper.classList.add('shake');
      feedback.className = 'feedback-text error';
      feedback.innerText = `SYS_ERROR: INPUT_JAMMED // LOCKOUT ${Math.ceil(this.jamTimer / 1000)}s`;
      document.getElementById('typing-buffer').innerText = "ERROR";
      
      setTimeout(() => {
        wrapper.classList.remove('shake');
      }, 250);
      return;
    }

    this.totalKeystrokes++;

    // Check if player is typing the Overdrive BURST command
    if (this.charge >= 100) {
      const nextBurstChar = 'burst'[this.burstTypedLength || 0];
      if (char === nextBurstChar) {
        this.burstTypedLength = (this.burstTypedLength || 0) + 1;
        this.currentInput = 'BURST'.substring(0, this.burstTypedLength);
        this.correctKeystrokes++;
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();
        
        // Show ultimate casting state
        const feedback = document.getElementById('typing-feedback');
        feedback.innerText = "OVERCHARGE DISCHARGE PROCESS...";
        feedback.className = "feedback-text glow-text-yellow";

        if (this.burstTypedLength === 5) {
          this.triggerNeuralPurge();
        }
        return;
      } else if (this.burstTypedLength > 0) {
        // Typo resets ultimate typing progress
        this.burstTypedLength = 0;
        this.currentInput = "";
        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
        return;
      }
    }

    if (this.targetedThreat === null) {
      // Find closest threat node that starts with this key
      const matches = this.threats
        .filter(t => t.text.startsWith(char))
        .sort((a, b) => a.distance - b.distance); // prioritize closest threat

      if (matches.length > 0) {
        this.targetedThreat = matches[0];
        this.targetedThreat.typedLength = 1;
        this.currentInput = char;
        this.correctKeystrokes++;
        this.charge = Math.min(100, this.charge + 0.5); // correct keystroke builds charge
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();

        // 1-char word
        if (this.targetedThreat.text.length === 1) {
          this.shootTarget(this.targetedThreat);
        }
      } else {
        // Miskey
        this.currentInput = "";
        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
      }
    } else {
      // Check character match on locked target
      const targetChar = this.targetedThreat.text[this.targetedThreat.typedLength];
      if (char === targetChar) {
        this.targetedThreat.typedLength++;
        this.currentInput += char;
        this.correctKeystrokes++;
        this.charge = Math.min(100, this.charge + 0.5); // correct keystroke builds charge
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();

        if (this.targetedThreat.typedLength === this.targetedThreat.text.length) {
          this.shootTarget(this.targetedThreat);
        }
      } else {
        // Typo resets word typed progress and lock
        this.targetedThreat.typedLength = 0;
        this.targetedThreat = null;
        this.currentInput = "";
        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
      }
    }
  }

  shootTarget(threat) {
    // Fire laser beam
    this.activeLasers.push({
      tx: threat.x,
      ty: threat.y,
      duration: 180, // beam renders for 180ms
      color: threat.color
    });

    // Score based on word length
    this.score += threat.text.length * 20 + 30;
    
    // Accumulate charge based on threat destroyed
    let chargeReward = 6;
    if (threat.type === 'emp') {
      chargeReward = 10;
    } else if (threat.type === 'drainer') {
      chargeReward = 10;
    } else if (threat.type === 'recovery') {
      chargeReward = 12;
      // Heal core shield
      this.shields = Math.min(100, this.shields + 15);
      this.app.playSynthSound('commandComplete');
    }
    
    this.charge = Math.min(100, this.charge + chargeReward);
    this.updateHUD();

    // Trigger visual explosion and sounds
    this.spawnExplosion(threat.x, threat.y, threat.type === 'emp' ? 'yellow' : 'cyan');
    this.app.playSynthSound('commandComplete');

    // Remove threat from list
    const index = this.threats.indexOf(threat);
    if (index > -1) {
      this.threats.splice(index, 1);
    }

    // Clear locks
    this.targetedThreat = null;
    this.currentInput = "";
    this.updateTypingUI();
  }

  triggerNeuralPurge() {
    this.purgeAnimationTimer = 600; // 600ms expansion animation
    this.app.playSynthSound('gameOver'); // Deep sweep sound
    this.triggerScreenShake();

    // Destroy all threats and award partial score
    this.threats.forEach(threat => {
      let explosionColor = 'magenta';
      if (threat.type === 'emp') explosionColor = 'yellow';
      else if (threat.type === 'recovery') explosionColor = 'cyan';
      
      this.spawnExplosion(threat.x, threat.y, explosionColor);
      this.score += threat.text.length * 10 + 15;
    });

    this.threats = [];
    this.targetedThreat = null;
    this.currentInput = "";
    this.charge = 0;
    this.burstTypedLength = 0;
    
    this.updateHUD();
    this.updateTypingUI();
  }

  parseOverlayInput(key, overlayType) {
    if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      const char = key.toLowerCase();
      const testInput = this.overlayInput + char;
      let targets = [];

      if (overlayType === 'start') {
        targets = ['start'];
      } else if (overlayType === 'gameover') {
        targets = ['restart', 'exit'];
      } else if (overlayType === 'paused') {
        targets = ['resume', 'exit'];
      }

      const matches = targets.some(tgt => tgt.startsWith(testInput));
      if (matches) {
        this.overlayInput = testInput;
        this.app.playSynthSound('typeSuccess');
        this.updateOverlayTargetHint(overlayType);

        const completed = targets.find(tgt => tgt === this.overlayInput);
        if (completed) {
          this.overlayInput = "";
          if (completed === 'start') {
            this.start();
          } else if (completed === 'restart') {
            this.reset();
          } else if (completed === 'resume') {
            this.togglePause();
          } else if (completed === 'exit') {
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.gameState = 'start';
            this.app.showView('dashboard');
          }
        }
      } else {
        this.overlayInput = "";
        this.app.playSynthSound('fail');
        this.updateOverlayTargetHint(overlayType);
      }
    }
  }

  updateHUD() {
    const roundedScore = Math.floor(this.score);
    document.getElementById('hud-score').innerText = String(roundedScore).padStart(6, '0');
    document.getElementById('hud-timer').innerText = this.getFormattedTime(this.timer);

    const container = document.getElementById('hud-shields');
    const percentage = Math.max(0, Math.round(this.shields));
    container.innerHTML = `
      <div class="cyber-shield-bar-wrapper">
        <span class="shield-pct-text">${percentage}%</span>
        <div class="cyber-shield-bar-bg">
          <div class="cyber-shield-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }

  updateTypingUI() {
    document.getElementById('typing-buffer').innerText = this.currentInput;
    document.getElementById('typing-feedback').className = 'feedback-text';
    document.getElementById('typing-feedback').innerText = this.currentInput ? 'LOCK ON TARGET...' : 'CONVERGING THREATS INCOMING...';

    // Core layout doesn't use static cmd items dictionary, hide or display empty
    const dictionary = document.querySelector('.cmd-dictionary');
    if (dictionary) {
      // Re-enable/reset commands for lane switcher fallback
      this.app.laneSwitcher.commands.forEach(cmd => {
        const el = document.getElementById(`cmd-${cmd}`);
        if (el) {
          el.classList.remove('active-prefix');
          el.querySelector('.highlight-typed').innerText = "";
          el.querySelector('.text-to-type').innerText = cmd;
        }
      });
    }
  }

  triggerBufferErrorFeedback() {
    const wrapper = document.querySelector('.input-display-wrapper');
    const feedback = document.getElementById('typing-feedback');

    wrapper.classList.add('shake');
    feedback.className = 'feedback-text error';
    feedback.innerText = 'BUFFER DETECTED GLITCH // RESETTING SIGNAL';

    document.getElementById('typing-buffer').innerText = "";

    setTimeout(() => {
      wrapper.classList.remove('shake');
    }, 250);

    this.updateTypingUI();
  }

  updateOverlayTargetHint(overlayType) {
    let overlayId = "";
    let baseWord = "start";

    if (overlayType === 'start') {
      overlayId = 'game-start-overlay';
      baseWord = 'start';
    } else if (overlayType === 'gameover') {
      overlayId = 'game-over-overlay';
      if (this.overlayInput && 'exit'.startsWith(this.overlayInput)) {
        baseWord = 'exit';
      } else {
        baseWord = 'restart';
      }
    } else if (overlayType === 'paused') {
      overlayId = 'game-paused-overlay';
      if (this.overlayInput && 'exit'.startsWith(this.overlayInput)) {
        baseWord = 'exit';
      } else {
        baseWord = 'resume';
      }
    }

    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    const typedSpan = overlay.querySelector('.typed-indicator');
    const remSpan = overlay.querySelector('.remaining-indicator');

    if (typedSpan && remSpan) {
      if (this.overlayInput && baseWord.startsWith(this.overlayInput)) {
        typedSpan.innerText = this.overlayInput;
        remSpan.innerText = baseWord.substring(this.overlayInput.length).split('').join('-');
      } else {
        typedSpan.innerText = "";
        remSpan.innerText = baseWord.split('').join('-');
      }
    }
  }

  toggleOverlay(id, show) {
    const el = document.getElementById(id);
    if (el) {
      if (show) el.classList.add('active');
      else el.classList.remove('active');
    }
  }

  getFormattedTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  calculateWPM() {
    if (this.totalKeystrokes === 0 || this.gameTimeElapsed === 0) return 0;
    const minutes = this.gameTimeElapsed / 60;
    const wpm = (this.correctKeystrokes / 5) / minutes;
    return Math.round(wpm) || 0;
  }
}
