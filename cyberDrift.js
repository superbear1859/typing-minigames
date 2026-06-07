/**
 * NEON GRID // CYBER DRIFT MINIGAME ENGINE
 * Top-down typing racer with a winding neon-grid highway, procedural curves,
 * drift gates, exhaust flame dynamics, and a high-speed turbo boost system.
 */

class CyberDriftGame {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Core game state
    this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
    this.timer = 300; // 5 minutes
    this.timerInterval = null;
    this.score = 0;
    this.shields = 3;
    this.lastFrameTime = 0;

    // Word categories
    this.words3_4 = ['drift', 'skid', 'apex', 'turn', 'skid', 'claw', 'fast', 'gear', 'revs', 'burn', 'lane', 'warp', 'grid', 'zone', 'slip', 'neon', 'rush', 'core'];
    this.words5_6 = ['boost', 'steer', 'nitro', 'coast', 'slide', 'shift', 'brake', 'clutch', 'speed', 'turbo', 'chase', 'curve', 'vector', 'driver', 'plasma', 'torque'];
    this.words7_10 = ['accelerate', 'overdrive', 'supercharge', 'velocity', 'momentum', 'hyperdrive', 'transmission', 'tachometer', 'trajectory', 'suspension', 'differential'];

    // Track state
    this.trackPoints = [];
    this.roadWidth = 180;
    this.scrollSpeed = 0.05; // px per ms (reduced for slower driving pace)
    this.baseSpeed = 0.08;
    
    // Curvature generator parameters
    this.currentCurvature = 0;
    this.targetCurvature = 0;
    this.curveDuration = 3000; // ms
    this.curveTimer = 0;

    // Vehicle state
    this.carY = 0;
    this.carX = 0;
    this.currentLane = 1; // 0: left, 1: center, 2: right
    this.targetCarX = 0;

    // Drift Gates
    this.gates = [];
    this.distanceTraveled = 0;
    this.lastGateDistance = 0;
    this.gateMinDistance = 400; // pixels between gates

    // Streak and Boost System
    this.streak = 0;
    this.boostActive = false;

    // Background stars / depth effect
    this.stars = [];
    this.numStars = 50;
    this.initStars();

    // Particle system (sparks & speed lines)
    this.particles = [];

    // Target tracking
    this.targetedGate = null;
    this.currentInput = "";
    this.overlayInput = "";
    this.menuBuffer = "";

    // Stats
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    // Key Listener
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /* ==========================================================================
     BACKGROUND STARS SETUP
     ========================================================================== */
  initStars() {
    if (this.canvas.width < 100 || this.canvas.height < 100) return;
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1 + Math.random() * 2,
        speed: 0.05 + Math.random() * 0.15
      });
    }
  }

  /* ==========================================================================
     GAME LOOP MANAGEMENT
     ========================================================================== */
  reset() {
    this.gameState = 'start';
    this.timer = 300;
    this.score = 0;
    this.shields = 3;
    this.gates = [];
    this.particles = [];
    this.distanceTraveled = 0;
    this.lastGateDistance = 0;
    this.streak = 0;
    this.boostActive = false;
    this.targetedGate = null;
    this.currentInput = "";
    this.overlayInput = "";
    this.menuBuffer = "";
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    this.currentLane = 1; // Center lane
    this.currentCurvature = 0;
    this.targetCurvature = 0;
    this.curveDuration = 3000;
    this.curveTimer = 0;

    if (this.canvas.width >= 100) {
      this.initStars();
      this.initRoad();
    }

    if (this.timerInterval) clearInterval(this.timerInterval);

    // Apply difficulty base speed settings (slower for improved pacing)
    const diff = this.app.difficulty;
    if (diff === 'hyper') {
      this.baseSpeed = 0.13;
      this.gateMinDistance = 350;
    } else if (diff === 'overload') {
      this.baseSpeed = 0.18;
      this.gateMinDistance = 280;
    } else {
      this.baseSpeed = 0.05;
      this.gateMinDistance = 400;
    }
    this.scrollSpeed = this.baseSpeed;

    this.updateHUD();
    this.updateTypingUI();

    this.toggleOverlay('game-start-overlay', true);
    this.toggleOverlay('game-over-overlay', false);
    this.toggleOverlay('game-paused-overlay', false);

    document.getElementById('start-overlay-title').innerText = "CYBER DRIFT";
    document.getElementById('start-overlay-title').className = "flicker glow-text-yellow";
    document.getElementById('start-overlay-instructions').innerHTML = `
      <p class="instruction-line"><span class="highlight">TYPE WORDS</span> on drift gates to switch lanes and slide through gaps:</p>
      <div class="control-legend">
        <div class="control-key" style="margin-bottom:8px;">
          <span style="border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); background: rgba(255,196,0,0.1);">Target</span> 
          <span class="action-desc">→ Type first letter of approaching gate to lock target</span>
        </div>
        <div class="control-key" style="margin-bottom:8px;">
          <span style="border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); background: rgba(255,196,0,0.1);">Drift</span> 
          <span class="action-desc">→ Complete spelling to drift car into the open lane</span>
        </div>
        <div class="control-key">
          <span style="border-color: var(--color-neon-yellow); color: var(--color-neon-yellow); background: rgba(255,196,0,0.1);">Boost</span> 
          <span class="action-desc">→ Complete 5 consecutive gates to activate TURBO BOOST!</span>
        </div>
      </div>
      <p class="warning-text">${this.app.sixSevenMode ? 'SIX SEVEN MODE ACTIVE: Vocabulary limited to "six seven", "four one", "seven eleven".' : 'Survival window: 5 minutes. Wall impacts will disrupt shields!'}</p>
    `;

    this.updateOverlayTargetHint('start');

    this.lastFrameTime = performance.now();
    if (!this.animationFrameId) {
      this.loop(this.lastFrameTime);
    }
  }

  initRoad() {
    this.trackPoints = [];
    const numPoints = Math.ceil(this.canvas.height / 10) + 10;
    for (let i = 0; i < numPoints; i++) {
      this.trackPoints.push({
        x: this.canvas.width / 2,
        y: this.canvas.height - (i * 10)
      });
    }
    this.carY = this.canvas.height * 0.82;
    this.carX = this.canvas.width / 2;
    this.targetCarX = this.carX;
  }

  start() {
    this.gameState = 'playing';
    this.startTime = Date.now();
    this.toggleOverlay('game-start-overlay', false);
    this.app.playSynthSound('gameStart');

    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing') {
        this.timer--;
        this.gameTimeElapsed++;
        this.score += 10; // driving survival bonus
        this.updateHUD();

        // Speed ramps up slightly with survival time
        const multiplier = this.boostActive ? 2.2 : 1.0;
        this.scrollSpeed = (this.baseSpeed + (this.gameTimeElapsed * 0.0003)) * multiplier;

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
      document.getElementById('game-over-title').innerText = "TRACK CLEARED";
      document.getElementById('game-over-title').className = "glow-text-cyan flicker";
      document.getElementById('game-over-reason').innerText = "All race segments completed successfully.";
    } else {
      this.app.playSynthSound('gameOver');
      document.getElementById('game-over-title').innerText = "VEHICLE CRASHED";
      document.getElementById('game-over-title').className = "glow-text-magenta flicker-slow";
      document.getElementById('game-over-reason').innerText = "Chassis structural integrity zero.";
    }

    const timeStr = this.getFormattedTime(300 - this.timer);
    const wpm = this.calculateWPM();

    document.getElementById('final-score-val').innerText = this.score;
    document.getElementById('final-time-val').innerText = timeStr;
    document.getElementById('final-wpm-val').innerText = `${wpm} words per minute`;

    this.app.saveHighScore(this.score, wpm, timeStr);
    this.toggleOverlay('game-over-overlay', true);
  }

  loop(currentTime) {
    if (this.app.activeGame !== this) {
      this.animationFrameId = null;
      return;
    }

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));

    // Auto-resize handler
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.initStars();
      this.initRoad();
    }

    const dt = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.update(dt);
    this.render();
  }

  /* ==========================================================================
     CORE UPDATE LOGIC
     ========================================================================== */
  update(dt) {
    if (this.app.activeGame !== this) return;

    if (this.trackPoints.length === 0 && this.canvas.width >= 100) {
      this.initRoad();
    }

    // Scroll stars
    const starMultiplier = this.gameState === 'playing' ? (this.scrollSpeed * 10) : 0.2;
    this.stars.forEach(star => {
      star.y += star.speed * starMultiplier * dt;
      if (star.y > this.canvas.height) {
        star.y = 0;
        star.x = Math.random() * this.canvas.width;
      }
    });

    this.updateParticles(dt);

    if (this.gameState !== 'playing') return;

    // Distance computation & Procedural highway generation
    const dy = this.scrollSpeed * dt;
    this.distanceTraveled += dy;

    // Scroll track points
    this.trackPoints.forEach(p => p.y += dy);

    // Delete offscreen points
    while (this.trackPoints.length > 0 && this.trackPoints[0].y > this.canvas.height + 20) {
      this.trackPoints.shift();
    }

    // Add new points at the top of screen
    const topY = this.trackPoints.length > 0 ? this.trackPoints[this.trackPoints.length - 1].y : 0;
    const spacing = 10;

    this.curveTimer += dt;
    if (this.curveTimer >= this.curveDuration) {
      this.targetCurvature = (Math.random() - 0.5) * 160;
      this.curveDuration = 2000 + Math.random() * 2500;
      this.curveTimer = 0;
    }
    
    // Smooth highway curves interpolation
    this.currentCurvature += (this.targetCurvature - this.currentCurvature) * 0.012 * dt;
    if (Math.abs(this.currentCurvature) > 180) {
      this.currentCurvature = Math.sign(this.currentCurvature) * 180;
    }

    let currentY = topY - spacing;
    while (currentY > -60) {
      const baseCenterX = this.canvas.width / 2;
      const targetX = baseCenterX + this.currentCurvature;
      this.trackPoints.push({
        x: targetX,
        y: currentY
      });
      currentY -= spacing;
    }

    // Spawn Gates based on distance
    if (this.distanceTraveled - this.lastGateDistance >= this.gateMinDistance) {
      this.spawnGate();
    }

    // Move and update gates
    const carY = this.carY;
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i];
      gate.y += dy;

      // Intersection / Collision detection
      if (gate.y >= carY && !gate.isChecked) {
        gate.isChecked = true;
        
        // Car must be in the open lane of this gate
        if (this.currentLane === gate.lane) {
          // Success pass
          this.score += 50; // passing bonus
          this.updateHUD();
          
          // Small drift spark burst on success
          this.spawnDriftSparks(this.carX, this.carY, this.app.themeColors.cyan);
        } else {
          // Collision!
          this.shields--;
          this.streak = 0;
          this.boostActive = false;
          
          const multiplier = this.boostActive ? 2.2 : 1.0;
          this.scrollSpeed = (this.baseSpeed + (this.gameTimeElapsed * 0.0003)) * multiplier;

          this.triggerScreenShake();
          this.spawnExplosion(this.carX, this.carY);
          this.app.playSynthSound('crash');
          this.updateHUD();

          if (this.shields <= 0) {
            this.endGame(false);
          }
        }
      }

      // Cleanup past gates
      if (gate.y > this.canvas.height) {
        this.gates.splice(i, 1);
        if (this.targetedGate === gate) {
          this.targetedGate = null;
          this.currentInput = "";
          this.updateTypingUI();
        }
      }
    }

    // Smoothly interpolate player vehicle X position towards its lane location on the highway
    const roadCenterAtCar = this.getTrackCenterX(this.carY);
    const laneWidth = this.roadWidth / 3;
    const laneOffset = (this.currentLane - 1) * laneWidth;
    this.targetCarX = roadCenterAtCar + laneOffset;

    this.carX += (this.targetCarX - this.carX) * 0.015 * dt;

    // Spawn engine particles
    if (this.app.particlesEnabled) {
      // exhaust flames
      if (Math.random() < (this.boostActive ? 0.8 : 0.3)) {
        this.particles.push({
          x: this.carX + (Math.random() * 8 - 4),
          y: this.carY + 18,
          vx: Math.random() * 0.04 - 0.02,
          vy: this.scrollSpeed * 0.4 + (Math.random() * 0.05),
          size: 1.5 + Math.random() * 3,
          color: this.boostActive ? (Math.random() < 0.6 ? this.app.themeColors.yellow : this.app.themeColors.cyan) : (Math.random() < 0.65 ? this.app.themeColors.magenta : this.app.themeColors.yellow),
          alpha: 1.0,
          decay: 0.0025 + Math.random() * 0.001
        });
      }

      // speed lines in boost mode
      if (this.boostActive && Math.random() < 0.2) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: -50,
          vy: 0.9 + Math.random() * 0.5,
          vx: 0,
          length: 50 + Math.random() * 70,
          color: 'rgba(0, 240, 255, 0.15)',
          alpha: 0.6,
          isSpeedLine: true
        });
      }
    }

    // Periodic slight camera vibration during boost
    if (this.boostActive && Math.random() < 0.08) {
      this.triggerScreenShake(80);
    }
  }

  spawnGate() {
    if (this.canvas.width < 100 || this.canvas.height < 100) return;

    let wordList = [];
    if (this.app.sixSevenMode) {
      wordList = ['six seven', 'four one', 'seven eleven'];
    } else if (this.gameTimeElapsed > 90) {
      const rand = Math.random();
      if (rand < 0.3) wordList = this.words3_4;
      else if (rand < 0.65) wordList = this.words5_6;
      else wordList = this.words7_10;
    } else if (this.gameTimeElapsed > 30) {
      if (Math.random() < 0.45) wordList = this.words3_4;
      else wordList = this.words5_6;
    } else {
      wordList = this.words3_4;
    }

    const text = wordList[Math.floor(Math.random() * wordList.length)];
    const lane = Math.floor(Math.random() * 3); // 0: left, 1: center, 2: right

    this.gates.push({
      word: text,
      lane: lane,
      y: -30,
      typedLength: 0,
      isChecked: false,
      isPassed: false
    });
    this.lastGateDistance = this.distanceTraveled;
  }

  spawnExplosion(x, y) {
    if (!this.app.particlesEnabled) return;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? this.app.themeColors.yellow : this.app.themeColors.magenta,
        alpha: 1.0,
        decay: 0.002
      });
    }
  }

  spawnDriftSparks(x, y, color) {
    if (!this.app.particlesEnabled) return;
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI * 0.4 + Math.random() * Math.PI * 0.2; // project outwards/rearwards
      const speed = 0.08 + Math.random() * 0.2;
      this.particles.push({
        x: x + (Math.random() * 12 - 6),
        y: y + 10,
        vx: (Math.random() < 0.5 ? -1 : 1) * Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        size: 1 + Math.random() * 2,
        color: color || this.app.themeColors.yellow,
        alpha: 0.8,
        decay: 0.003
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.isSpeedLine) {
        p.y += p.vy * dt;
        if (p.y > this.canvas.height) {
          this.particles.splice(i, 1);
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
  }

  triggerScreenShake(duration = 280) {
    const screen = document.getElementById('arcade-screen');
    this.canvas.classList.add('shake');
    setTimeout(() => {
      this.canvas.classList.remove('shake');
    }, duration);
  }

  /* ==========================================================================
     RENDERING ENGINE
     ========================================================================== */
  render() {
    if (this.app.activeGame !== this) return;

    // Fill screen background
    this.ctx.fillStyle = '#060112';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Deep starry glow
    const radial = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 10,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.height
    );
    radial.addColorStop(0, '#100125');
    radial.addColorStop(0.6, '#060112');
    this.ctx.fillStyle = radial;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background stars
    this.ctx.fillStyle = '#fff';
    this.stars.forEach(star => {
      this.ctx.globalAlpha = star.speed * 4;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    this.ctx.globalAlpha = 1.0;

    // Draw the Scrolling Winding Road Grid
    this.drawRoad();

    // Draw Particles & Speed Lines
    this.drawParticles();

    // Draw Drift Gates & Words
    this.drawGates();

    // Draw Player Neon Racer Vehicle
    this.drawCar();

    // Draw Boost Mode alert banner if supercharged
    if (this.boostActive) {
      this.drawBoostBanner();
    }
  }

  drawRoad() {
    if (this.trackPoints.length < 2) return;

    this.ctx.save();
    this.ctx.lineWidth = 3;
    
    // Setup glowing shadow neon lines
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = this.boostActive ? this.app.themeColors.yellow : this.app.themeColors.cyan;
    this.ctx.strokeStyle = this.boostActive ? this.app.themeColors.yellow : this.app.themeColors.cyan;

    // Draw Left and Right boundaries
    this.ctx.beginPath();
    this.ctx.moveTo(this.trackPoints[0].x - this.roadWidth / 2, this.trackPoints[0].y);
    for (let i = 1; i < this.trackPoints.length; i++) {
      this.ctx.lineTo(this.trackPoints[i].x - this.roadWidth / 2, this.trackPoints[i].y);
    }
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.trackPoints[0].x + this.roadWidth / 2, this.trackPoints[0].y);
    for (let i = 1; i < this.trackPoints.length; i++) {
      this.ctx.lineTo(this.trackPoints[i].x + this.roadWidth / 2, this.trackPoints[i].y);
    }
    this.ctx.stroke();

    // Draw lane divider tracks (dotted/dashed neon-purple lines)
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = this.app.themeColors.purple;
    this.ctx.strokeStyle = this.app.themeColors.purple;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([12, 18]);

    this.ctx.beginPath();
    this.ctx.moveTo(this.trackPoints[0].x - this.roadWidth / 6, this.trackPoints[0].y);
    for (let i = 1; i < this.trackPoints.length; i++) {
      this.ctx.lineTo(this.trackPoints[i].x - this.roadWidth / 6, this.trackPoints[i].y);
    }
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.trackPoints[0].x + this.roadWidth / 6, this.trackPoints[0].y);
    for (let i = 1; i < this.trackPoints.length; i++) {
      this.ctx.lineTo(this.trackPoints[i].x + this.roadWidth / 6, this.trackPoints[i].y);
    }
    this.ctx.stroke();

    // Draw horizontal grid lines across the road segment at spaced intervals
    this.ctx.setLineDash([]);
    this.ctx.lineWidth = 1.0;
    this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.2)';
    this.ctx.shadowBlur = 0;

    for (let i = 0; i < this.trackPoints.length; i += 4) {
      const p = this.trackPoints[i];
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - this.roadWidth / 2, p.y);
      this.ctx.lineTo(p.x + this.roadWidth / 2, p.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      if (p.isSpeedLine) {
        this.ctx.globalAlpha = p.alpha;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x, p.y + p.length);
        this.ctx.stroke();
      } else {
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });
  }

  drawCar() {
    const cx = this.carX;
    const cy = this.carY;

    this.ctx.save();
    
    // Glowing cyan headlights casting illumination beams forward
    const beamGrad = this.ctx.createLinearGradient(cx, cy, cx, cy - 100);
    beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0.00)');
    this.ctx.fillStyle = beamGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 8, cy);
    this.ctx.lineTo(cx - 32, cy - 100);
    this.ctx.lineTo(cx + 32, cy - 100);
    this.ctx.lineTo(cx + 8, cy);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw Neon Racer vector shape
    this.ctx.translate(cx, cy);
    
    // Visual lean rotation angle when switching lanes
    const laneWidth = this.roadWidth / 3;
    const roadCenter = this.getTrackCenterX(this.carY);
    const targetOffset = (this.currentLane - 1) * laneWidth;
    const currentOffset = this.carX - roadCenter;
    const diff = targetOffset - currentOffset;
    this.ctx.rotate(diff * 0.008); // slide tilt

    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.app.themeColors.magenta;
    this.ctx.strokeStyle = this.app.themeColors.magenta;
    this.ctx.fillStyle = '#080112';
    this.ctx.lineWidth = 2.0;

    // Outer shell body (car chassis)
    this.ctx.beginPath();
    this.ctx.moveTo(0, -18);   // nose
    this.ctx.lineTo(8, -8);    // front right
    this.ctx.lineTo(12, 6);    // cabin right side
    this.ctx.lineTo(14, 18);   // rear fender right
    this.ctx.lineTo(9, 18);    // right rear body
    this.ctx.lineTo(5, 12);    // rear bumper inner
    this.ctx.lineTo(-5, 12);   // rear bumper inner
    this.ctx.lineTo(-9, 18);   // left rear body
    this.ctx.lineTo(-14, 18);  // rear fender left
    this.ctx.lineTo(-12, 6);   // cabin left side
    this.ctx.lineTo(-8, -8);   // front left
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Cockpit canopy shield (cyan)
    this.ctx.strokeStyle = this.app.themeColors.cyan;
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -10);
    this.ctx.lineTo(4, -2);
    this.ctx.lineTo(4, 5);
    this.ctx.lineTo(-4, 5);
    this.ctx.lineTo(-4, -2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Draw rear spoiler wing
    this.ctx.strokeStyle = this.app.themeColors.magenta;
    this.ctx.beginPath();
    this.ctx.moveTo(-16, 14);
    this.ctx.lineTo(16, 14);
    this.ctx.moveTo(-16, 12);
    this.ctx.lineTo(-16, 18);
    this.ctx.moveTo(16, 12);
    this.ctx.lineTo(16, 18);
    this.ctx.stroke();

    // Yellow headlight circles
    this.ctx.fillStyle = this.app.themeColors.yellow;
    this.ctx.beginPath();
    this.ctx.arc(-5, -12, 2, 0, Math.PI * 2);
    this.ctx.arc(5, -12, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawGates() {
    const laneWidth = this.roadWidth / 3;

    this.gates.forEach(gate => {
      const gateCenterX = this.getTrackCenterX(gate.y);
      const isTargeted = this.targetedGate === gate;

      this.ctx.save();

      // Setup gate boundary barrier line widths and neon glow shadows
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = isTargeted ? this.app.themeColors.yellow : this.app.themeColors.magenta;
      this.ctx.strokeStyle = isTargeted ? this.app.themeColors.yellow : this.app.themeColors.magenta;
      this.ctx.lineWidth = 3.0;

      // Draw barriers. A gate spans the road width but leaves the 'gate.lane' OPEN.
      // Left lane open (lane 0): draw center + right barrier
      if (gate.lane === 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(gateCenterX - laneWidth / 2, gate.y);
        this.ctx.lineTo(gateCenterX + this.roadWidth / 2, gate.y);
        this.ctx.stroke();
      }
      // Center lane open (lane 1): draw left barrier and right barrier
      else if (gate.lane === 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(gateCenterX - this.roadWidth / 2, gate.y);
        this.ctx.lineTo(gateCenterX - laneWidth / 2, gate.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(gateCenterX + laneWidth / 2, gate.y);
        this.ctx.lineTo(gateCenterX + this.roadWidth / 2, gate.y);
        this.ctx.stroke();
      }
      // Right lane open (lane 2): draw left + center barrier
      else if (gate.lane === 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(gateCenterX - this.roadWidth / 2, gate.y);
        this.ctx.lineTo(gateCenterX + laneWidth / 2, gate.y);
        this.ctx.stroke();
      }

      // Draw glowing yellow drift arrow guiding through the gap
      const arrowX = gateCenterX + (gate.lane - 1) * laneWidth;
      this.ctx.fillStyle = this.app.themeColors.yellow;
      this.ctx.shadowColor = this.app.themeColors.yellow;
      this.ctx.beginPath();
      this.ctx.moveTo(arrowX, gate.y + 12);
      this.ctx.lineTo(arrowX - 5, gate.y + 4);
      this.ctx.lineTo(arrowX - 2, gate.y + 4);
      this.ctx.lineTo(arrowX - 2, gate.y - 4);
      this.ctx.lineTo(arrowX + 2, gate.y - 4);
      this.ctx.lineTo(arrowX + 2, gate.y + 4);
      this.ctx.lineTo(arrowX + 5, gate.y + 4);
      this.ctx.closePath();
      this.ctx.fill();

      // Render typing word text
      this.ctx.textAlign = 'center';
      this.ctx.font = "bold 15px 'Share Tech Mono', monospace";

      // Dark label plate backing
      const wordWidth = this.ctx.measureText(gate.word).width + 12;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.strokeStyle = isTargeted ? this.app.themeColors.yellow : 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 1.0;
      this.ctx.fillRect(arrowX - wordWidth / 2, gate.y - 30, wordWidth, 20);
      this.ctx.strokeRect(arrowX - wordWidth / 2, gate.y - 30, wordWidth, 20);

      // Print letters
      const txt = gate.word;
      const typedLen = gate.typedLength;

      if (typedLen > 0) {
        const typedTxt = txt.substring(0, typedLen);
        const untypedTxt = txt.substring(typedLen);
        const totalW = this.ctx.measureText(txt).width;
        const startX = arrowX - totalW / 2;

        this.ctx.textAlign = 'left';
        
        // typed letters: cyan glow
        this.ctx.fillStyle = this.app.themeColors.cyan;
        this.ctx.shadowColor = this.app.themeColors.cyan;
        this.ctx.fillText(typedTxt, startX, gate.y - 16);

        // remaining letters: yellow glow (targeted) or white
        this.ctx.fillStyle = isTargeted ? this.app.themeColors.white : this.app.themeColors.yellow;
        this.ctx.shadowColor = isTargeted ? this.app.themeColors.yellow : this.app.themeColors.yellow;
        const typedW = this.ctx.measureText(typedTxt).width;
        this.ctx.fillText(untypedTxt, startX + typedW, gate.y - 16);
      } else {
        // completely untyped: neon-yellow text
        this.ctx.fillStyle = isTargeted ? this.app.themeColors.white : this.app.themeColors.yellow;
        this.ctx.shadowColor = isTargeted ? this.app.themeColors.yellow : this.app.themeColors.yellow;
        this.ctx.fillText(txt, arrowX, gate.y - 16);
      }

      this.ctx.restore();
    });
  }

  drawBoostBanner() {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.font = "bold 20px 'Orbitron', sans-serif";
    this.ctx.fillStyle = this.app.themeColors.yellow;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.app.themeColors.yellow;

    // Pulsing alpha
    this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.01) * 0.3;
    this.ctx.fillText("TURBO BOOST ACTIVE // 2x MULTIPLIER", this.canvas.width / 2, this.canvas.height * 0.15);
    this.ctx.restore();
  }

  /* ==========================================================================
     TYPING & INPUT HANDLERS
     ========================================================================== */
  handleKeyDown(e) {
    if (this.app.activeGame !== this) return;
    if (this.app.views.game.classList.contains('active') === false) return;

    const key = e.key;

    // Exit check rolling buffer
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

    // Overlays input
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

    // Standard playing gameplay keys
    if (this.gameState === 'playing') {
      if (key.length === 1 && /[a-zA-Z ]/.test(key)) {
        this.processKeystroke(key.toLowerCase());
      }
    }
  }

  processKeystroke(char) {
    this.totalKeystrokes++;

    const carY = this.carY;
    if (this.targetedGate === null) {
      // Find the closest upcoming gate starting with this letter
      const upcoming = this.gates.filter(g => g.y < carY - 20 && !g.isPassed);
      upcoming.sort((a, b) => b.y - a.y); // sort descending (closest to car first)

      const matches = upcoming.filter(g => g.word.startsWith(char));
      if (matches.length > 0) {
        this.targetedGate = matches[0];
        this.targetedGate.typedLength = 1;
        this.currentInput = char;
        this.correctKeystrokes++;
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();

        if (this.targetedGate.word.length === 1) {
          this.driftCar(this.targetedGate);
        }
      } else {
        // miskey reset
        this.currentInput = "";
        this.streak = 0;
        this.boostActive = false;
        
        const multiplier = this.boostActive ? 2.2 : 1.0;
        this.scrollSpeed = (this.baseSpeed + (this.gameTimeElapsed * 0.0003)) * multiplier;

        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
      }
    } else {
      // Check character against active target
      const targetChar = this.targetedGate.word[this.targetedGate.typedLength];
      if (char === targetChar) {
        this.targetedGate.typedLength++;
        this.currentInput += char;
        this.correctKeystrokes++;
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();

        if (this.targetedGate.typedLength === this.targetedGate.word.length) {
          this.driftCar(this.targetedGate);
        }
      } else {
        // Typo resets target locks & resets streak
        this.targetedGate.typedLength = 0;
        this.targetedGate = null;
        this.currentInput = "";
        this.streak = 0;
        this.boostActive = false;
        
        const multiplier = this.boostActive ? 2.2 : 1.0;
        this.scrollSpeed = (this.baseSpeed + (this.gameTimeElapsed * 0.0003)) * multiplier;

        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
      }
    }
  }

  driftCar(gate) {
    // Navigate car to targeted lane
    this.currentLane = gate.lane;
    gate.isPassed = true;

    // Chime drift sound fx
    this.app.playSynthSound('spin');

    // Score point calculations
    const multi = this.boostActive ? 2 : 1;
    this.score += gate.word.length * 150 * multi;
    this.updateHUD();

    // Visual sparks at wheels
    this.spawnDriftSparks(this.carX, this.carY, this.app.themeColors.cyan);

    // Reset typing buffers
    this.targetedGate = null;
    this.currentInput = "";
    this.updateTypingUI();

    // Increment streak/boost counts
    this.streak++;
    if (this.streak >= 5 && !this.boostActive) {
      this.boostActive = true;
      
      const multiplier = this.boostActive ? 2.2 : 1.0;
      this.scrollSpeed = (this.baseSpeed + (this.gameTimeElapsed * 0.0003)) * multiplier;

      this.app.playSynthSound('spin');
      this.triggerScreenShake(400);
    }
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

  /* ==========================================================================
     UI DRAWERS & HUD UTILITIES
     ========================================================================== */
  updateHUD() {
    document.getElementById('hud-score').innerText = String(this.score).padStart(6, '0');
    document.getElementById('hud-timer').innerText = this.getFormattedTime(this.timer);

    const container = document.getElementById('hud-shields');
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const cell = document.createElement('span');
      cell.className = `shield-cell ${i < this.shields ? 'active' : ''}`;
      container.appendChild(cell);
    }
  }

  updateTypingUI() {
    document.getElementById('typing-buffer').innerText = this.currentInput;
    document.getElementById('typing-feedback').className = 'feedback-text';
    document.getElementById('typing-feedback').innerText = this.targetedGate ? `STEERING CHASSIS // TYPED: ${this.currentInput}` : 'AWAITING KEYSTROKE TO DRIFT...';
  }

  triggerBufferErrorFeedback() {
    const wrapper = document.querySelector('.input-display-wrapper');
    const feedback = document.getElementById('typing-feedback');

    wrapper.classList.add('shake');
    feedback.className = 'feedback-text error';
    feedback.innerText = 'STEERING LOCKOUT // RESETTING BUFFER';
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

  getTrackCenterX(y) {
    if (this.trackPoints.length === 0) return this.canvas.width / 2;
    
    // Find closest segment point by Y coordinate
    let closest = this.trackPoints[0];
    let minDiff = Math.abs(closest.y - y);
    
    for (let i = 1; i < this.trackPoints.length; i++) {
      const diff = Math.abs(this.trackPoints[i].y - y);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this.trackPoints[i];
      }
    }
    return closest.x;
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
