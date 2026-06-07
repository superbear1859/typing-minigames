/**
 * NEON GRID // CAR LANE SWITCHER MINIGAME ENGINE
 * Handles Canvas 3D rendering, game loop, physics collision, obstacles, particle effects,
 * and the custom real-time typing command parser.
 */

class LaneSwitcherGame {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Core game state
    this.gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
    this.timer = 300; // 5 minutes (300 seconds)
    this.timerInterval = null;
    this.score = 0;
    this.shields = 3;
    this.lastFrameTime = 0;

    // Game constants
    this.maxLanes = 5;
    this.playerLane = 2; // Start in middle lane (0, 1, 2, 3, 4)
    this.carVisualX = 0; // Interpolated X position for smooth lane changes
    this.carVisualY = 0;
    this.carRotation = 0; // For spin animation

    // Spin ability variables
    this.spinDuration = 500; // 0.5 seconds (in ms)
    this.spinTimeRemaining = 0; // ms

    // Immunity after hit
    this.immunityDuration = 800; // shorter invulnerability period
    this.immunityTimeRemaining = 0; // ms

    // Obstacles
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 1800; // ms (faster obstacle spawn)
    this.baseSpeed = 0.12; // Slightly faster base speed
    this.currentSpeed = 0.12;

    // Typing system
    this.currentInput = "";
    this.overlayInput = ""; // Buffer for start/restart/resume input
    this.commands = ['left', 'right', 'spin'];
    this.overlayCommands = {
      'start': 'start',
      'restart': 'restart',
      'resume': 'resume',
      'exit': 'exit'
    };

    // Typing statistics
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.startTime = 0;
    this.gameTimeElapsed = 0; // seconds

    // Cooldown state
    this.cooldownRemaining = 0;

    // Visual assets / particles
    this.particles = [];
    this.roadOffset = 0; // For road scrolling lines

    // Bind resize
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();

    // Input Handling
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

  }

  /* ==========================================================================
     CANVAS SIZE MANAGEMENT
     ========================================================================== */
  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Recalculate car position
    this.carVisualY = this.canvas.height * 0.82;
    this.carVisualX = this.getLaneX(this.playerLane);
  }

  /* ==========================================================================
     GAME LOOP MANAGEMENT (RUN, UPDATE, RENDER)
     ========================================================================== */
  reset() {
    this.gameState = 'start';
    this.timer = 300;
    this.score = 0;
    this.shields = 3;
    this.playerLane = 2;
    this.carRotation = 0;
    this.spinTimeRemaining = 0;
    this.immunityTimeRemaining = 0;
    this.cooldownRemaining = 0;
    this.obstacles = [];
    this.particles = [];
    this.currentInput = "";
    this.overlayInput = "";
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    if (this.app.sixSevenMode) {
      this.commands = ['6 7', '4 1', '7 11'];
    } else {
      this.commands = ['left', 'right', 'spin'];
    }

    // Clear interval if any
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Set speed based on difficulty settings
    const diff = this.app.difficulty;
    if (diff === 'hyper') {
      this.baseSpeed = 0.18;
      this.obstacleSpawnInterval = 1200;
    } else if (diff === 'overload') {
      this.baseSpeed = 0.28;
      this.obstacleSpawnInterval = 800;
    } else {
      this.baseSpeed = 0.12; // tougher normal difficulty
      this.obstacleSpawnInterval = 1800; // tougher normal difficulty
    }
    this.currentSpeed = this.baseSpeed;
    this.obstacleSpawnTimer = 0;

    this.resizeCanvas();
    this.updateHUD();
    this.updateTypingUI();

    // Reset overlays
    this.toggleOverlay('game-start-overlay', true);
    this.toggleOverlay('game-over-overlay', false);
    this.toggleOverlay('game-paused-overlay', false);

    // Setup start overlay instructions dynamically for Lane Switcher
    const leftCmd = this.app.sixSevenMode ? '6 7' : 'left';
    const rightCmd = this.app.sixSevenMode ? '4 1' : 'right';
    const spinCmd = this.app.sixSevenMode ? '7 11' : 'spin';

    document.getElementById('start-overlay-title').innerText = "LANE SWITCHER";
    document.getElementById('start-overlay-title').className = "flicker glow-text-cyan";
    document.getElementById('start-overlay-instructions').innerHTML = `
      <p class="instruction-line"><span class="highlight">TYPE THE COMMANDS</span> to navigate the car:</p>
      <div class="control-legend">
        <div class="control-key"><span>${leftCmd}</span> <span class="action-desc">→ Switch left 1 lane</span></div>
        <div class="control-key"><span>${rightCmd}</span> <span class="action-desc">→ Switch right 1 lane</span></div>
        <div class="control-key"><span>${spinCmd}</span> <span class="action-desc">→ 0.5s Invincibility / Destroy obstacles</span></div>
      </div>
      <p class="warning-text">${this.app.sixSevenMode ? 'SIX SEVEN MODE ACTIVE: Commands restricted to digits "6 7", "4 1", "7 11".' : 'Survival window: 5 minutes. Do not crash into orange blocks!'}</p>
    `;

    // Setup helper hints
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

    // Game timer countdown loop (once per second)
    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing') {
        this.timer--;
        this.gameTimeElapsed++;
        this.score += 10; // passive survival score
        this.updateHUD();

        // Dynamic speed scaling: slowly accelerate as time goes on
        this.currentSpeed = this.baseSpeed + (this.gameTimeElapsed * 0.0002); // accelerate faster over time

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

    // Play sounds
    if (isVictory) {
      this.app.playSynthSound('commandComplete');
      document.getElementById('game-over-title').innerText = "SYSTEM SECURED";
      document.getElementById('game-over-title').className = "glow-text-cyan flicker";
      document.getElementById('game-over-reason').innerText = "Hyper-highway grid successfully mapped.";
    } else {
      this.app.playSynthSound('gameOver');
      document.getElementById('game-over-title').innerText = "SYSTEM FAILURE";
      document.getElementById('game-over-title').className = "glow-text-magenta flicker-slow";
      document.getElementById('game-over-reason').innerText = "Shield integrity fully compromised.";
    }

    // Calculations
    const timeStr = this.getFormattedTime(300 - this.timer);
    const wpm = this.calculateWPM();

    document.getElementById('final-score-val').innerText = this.score;
    document.getElementById('final-time-val').innerText = timeStr;
    document.getElementById('final-wpm-val').innerText = `${wpm} words per minute`;

    // Save score to local storage
    this.app.saveHighScore(this.score, wpm, timeStr);

    this.toggleOverlay('game-over-overlay', true);
  }

  loop(currentTime) {
    if (this.app.activeGame !== this) {
      this.animationFrameId = null;
      return; // Stop requesting frames if not active
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

    // Run frame updates
    this.update(dt);
    this.render();
  }

  /* ==========================================================================
     GAME LOGIC & PHYSICS UPDATE
     ========================================================================== */
  update(dt) {
    if (this.app.activeGame !== this) return;
    // Road speed scrolls even when in start or pause overlay, for aesthetic vibe
    const scrollFactor = this.gameState === 'playing' ? this.currentSpeed * 2.5 : 0.08;
    this.roadOffset = (this.roadOffset + scrollFactor * dt) % 80;

    if (this.gameState !== 'playing') {
      // Still update particles for dashboard animations
      this.updateParticles(dt);
      return;
    }

    // Update cooldown
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= dt;
      if (this.cooldownRemaining <= 0) {
        this.cooldownRemaining = 0;
        this.currentInput = "";
      }
      this.updateTypingUI();
    }

    // Update spin mechanics
    if (this.spinTimeRemaining > 0) {
      this.spinTimeRemaining -= dt;
      if (this.spinTimeRemaining < 0) this.spinTimeRemaining = 0;
    }

    // Update immunity frames
    if (this.immunityTimeRemaining > 0) {
      this.immunityTimeRemaining -= dt;
      if (this.immunityTimeRemaining < 0) this.immunityTimeRemaining = 0;
    }

    // Smooth lane changing interpolation (easing)
    const targetX = this.getLaneX(this.playerLane);
    this.carVisualX += (targetX - this.carVisualX) * 0.15;

    // Rotate car during spin
    if (this.spinTimeRemaining > 0) {
      // 0.7 seconds total -> spin 2 rotations (4 * PI)
      const ratio = this.spinTimeRemaining / this.spinDuration;
      this.carRotation = ratio * Math.PI * 4;
    } else {
      this.carRotation = 0;
    }

    // Manage particles
    this.updateParticles(dt);
    if (this.app.particlesEnabled) {
      // Spawn exhaust trail sparks
      if (Math.random() < 0.3) {
        this.particles.push({
          x: this.carVisualX + (Math.random() * 10 - 5),
          y: this.carVisualY + 15,
          vx: Math.random() * 0.1 - 0.05,
          vy: 0.15 + Math.random() * 0.1,
          size: 2 + Math.random() * 3,
          color: this.spinTimeRemaining > 0 ? this.app.themeColors.magenta : this.app.themeColors.cyan,
          alpha: 1.0,
          decay: 0.003
        });
      }
    }

    // Obstacles Management
    this.obstacleSpawnTimer += dt;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    // Move obstacles and check collisions
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += this.currentSpeed * dt;

      // Check collision
      const checkY = this.canvas.height * 0.82;
      const collisionThreshold = 25; // Box bounding radius

      // Compute actual horizontal position at this Y coordinate
      const obsVisualX = this.getPerspectiveX(obs.lane, obs.y);

      if (Math.abs(obs.y - checkY) < 30) {
        // Is player in the same lane?
        // Note: Compare active lane directly rather than visual X, to feel solid
        if (obs.lane === this.playerLane) {

          if (this.spinTimeRemaining > 0) {
            // Spin destroy!
            this.obstacles.splice(i, 1);
            this.score += 150;
            this.updateHUD();
            this.spawnExplosion(obsVisualX, obs.y, 'magenta');
            this.app.playSynthSound('commandComplete');
            continue;
          } else if (this.immunityTimeRemaining <= 0) {
            // Normal hit!
            this.obstacles.splice(i, 1);
            this.shields--;
            this.immunityTimeRemaining = this.immunityDuration;
            this.spawnExplosion(this.carVisualX, this.carVisualY, 'cyan');
            this.triggerScreenShake();
            this.updateHUD();
            this.app.playSynthSound('crash');

            if (this.shields <= 0) {
              this.endGame(false);
            }
            continue;
          }
        }
      }

      // Remove offscreen obstacles
      if (obs.y > this.canvas.height + 40) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  spawnObstacle() {
    if (this.canvas.width < 100 || this.canvas.height < 100) return;
    // Determine how many boxes to spawn in this wave
    let maxToSpawn = 1;
    const rand = Math.random();
    const diff = this.app.difficulty;

    if (diff === 'overload') {
      if (rand < 0.4) maxToSpawn = 4; // up to 4 lanes blocked!
      else if (rand < 0.85) maxToSpawn = 3;
      else maxToSpawn = 2;
    } else if (diff === 'hyper') {
      if (rand < 0.25) maxToSpawn = 3;
      else if (rand < 0.7) maxToSpawn = 2;
    } else { // normal
      if (rand < 0.6) maxToSpawn = 2; // 60% chance of spawning 2 boxes
      else if (rand < 0.8) maxToSpawn = 3; // 20% chance of spawning 3 boxes
    }

    // Ensure we do not block all 5 lanes (max 4 on overload, 3 on hyper, 3 on normal)
    const maxAllowed = diff === 'overload' ? 4 : 3;
    maxToSpawn = Math.min(maxToSpawn, maxAllowed);

    // Keep track of lanes chosen in this spawn cycle
    const chosenLanes = new Set();

    for (let i = 0; i < maxToSpawn; i++) {
      let lane;
      let attempts = 0;
      do {
        lane = Math.floor(Math.random() * this.maxLanes);
        attempts++;
      } while (chosenLanes.has(lane) && attempts < 15);

      if (chosenLanes.has(lane)) continue;

      // Prevent spawning directly on top of an existing obstacle in the lane
      const tooClose = this.obstacles.some(o => o.lane === lane && o.y < 125);
      if (!tooClose) {
        chosenLanes.add(lane);
        this.obstacles.push({
          lane: lane,
          y: this.canvas.height * 0.1, // starts near road horizon
          size: 15,
          type: 'standard'
        });
      }
    }
  }

  spawnExplosion(x, y, theme) {
    if (!this.app.particlesEnabled) return;

    const count = theme === 'magenta' ? 30 : 20;
    const color = theme === 'magenta' ? this.app.themeColors.magenta : this.app.themeColors.yellow;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.45;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: color,
        alpha: 1.0,
        decay: 0.0015 + Math.random() * 0.002
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
    const cabinet = document.getElementById('arcade-screen');
    cabinet.classList.add('damage-flash');
    this.canvas.classList.add('shake');
    setTimeout(() => {
      cabinet.classList.remove('damage-flash');
      this.canvas.classList.remove('shake');
    }, 350);
  }

  /* ==========================================================================
     RENDERING / DRAWING ENGINE (PSEUDO-3D)
     ========================================================================== */
  render() {
    if (this.app.activeGame !== this) return;
    // Clear canvas
    this.ctx.fillStyle = '#060012';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Cyber Grid Horizon Glow
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#100028');
    gradient.addColorStop(0.3, '#0b001c');
    gradient.addColorStop(1, '#050010');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Moving Road & Lanes
    this.drawRoad();

    // Draw Obstacles
    this.drawObstacles();

    // Draw Particles
    this.drawParticles();

    // Draw Player Car
    this.drawPlayer();
  }

  drawRoad() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizonY = h * 0.1;

    // Draw horizon neon sunset / glow line
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.app.themeColors.purple;
    this.ctx.strokeStyle = this.app.themeColors.purple;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(w, horizonY);
    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowBlur = 0;

    // Road Dimensions
    const topWidth = w * 0.25;
    const bottomWidth = w * 0.85;

    const roadTopLeft = (w - topWidth) / 2;
    const roadTopRight = roadTopLeft + topWidth;
    const roadBottomLeft = (w - bottomWidth) / 2;
    const roadBottomRight = roadBottomLeft + bottomWidth;

    // Draw solid road boundaries
    this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.4)';
    this.ctx.lineWidth = 3;

    // Left boundary
    this.ctx.beginPath();
    this.ctx.moveTo(roadTopLeft, horizonY);
    this.ctx.lineTo(roadBottomLeft, h);
    this.ctx.stroke();

    // Right boundary
    this.ctx.beginPath();
    this.ctx.moveTo(roadTopRight, horizonY);
    this.ctx.lineTo(roadBottomRight, h);
    this.ctx.stroke();

    // Draw lane lines (Perspective lines)
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    this.ctx.lineWidth = 1.5;

    for (let i = 1; i < this.maxLanes; i++) {
      const topLaneX = roadTopLeft + (topWidth / this.maxLanes) * i;
      const bottomLaneX = roadBottomLeft + (bottomWidth / this.maxLanes) * i;

      this.ctx.beginPath();
      this.ctx.moveTo(topLaneX, horizonY);
      this.ctx.lineTo(bottomLaneX, h);
      this.ctx.stroke();
    }

    // Draw scrolling horizontal dash lines (3D illusion)
    this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.3)';
    this.ctx.lineWidth = 2;

    // Draw horizontal perspective lines at exponential spacings
    const numHorizontalLines = 14;
    for (let i = 0; i < numHorizontalLines; i++) {
      // Scroll horizontal lines downwards
      const rawPos = (i * (h / numHorizontalLines) + this.roadOffset) % (h - horizonY);
      const relativeY = horizonY + rawPos;

      // Calculate perspective width at this specific Y
      const progress = (relativeY - horizonY) / (h - horizonY);
      const currentRoadWidth = topWidth + (bottomWidth - topWidth) * progress;
      const currentLeftX = (w - currentRoadWidth) / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(currentLeftX, relativeY);
      this.ctx.lineTo(currentLeftX + currentRoadWidth, relativeY);
      this.ctx.stroke();
    }
  }

  drawPlayer() {
    // If invisible due to immunity frames, blink the car
    if (this.immunityTimeRemaining > 0) {
      if (Math.floor(this.immunityTimeRemaining / 100) % 2 === 0) {
        return; // skip drawing
      }
    }

    this.ctx.save();
    this.ctx.translate(this.carVisualX, this.carVisualY);

    // Apply spin rotation
    if (this.carRotation !== 0) {
      this.ctx.rotate(this.carRotation);
    }

    // Draw glowing shields boundary if spin is active
    if (this.spinTimeRemaining > 0) {
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = this.app.themeColors.magenta;
      this.ctx.strokeStyle = this.app.themeColors.magenta;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 32, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.fillStyle = 'rgba(255, 0, 91, 0.1)';
      this.ctx.fill();
    }

    // Reset shadow
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.app.themeColors.cyan;

    // Draw sports car vector model
    this.ctx.strokeStyle = this.app.themeColors.cyan;
    this.ctx.lineWidth = 2.5;
    this.ctx.fillStyle = '#060214';

    this.ctx.beginPath();
    // Front hood
    this.ctx.moveTo(-10, -25);
    this.ctx.lineTo(10, -25);
    // Front tires width
    this.ctx.lineTo(14, -18);
    // Body sides
    this.ctx.lineTo(12, 10);
    // Rear spoiler flares
    this.ctx.lineTo(18, 22);
    this.ctx.lineTo(-18, 22);
    this.ctx.lineTo(-12, 10);
    this.ctx.lineTo(-14, -18);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Windshield (Cabin glow)
    this.ctx.strokeStyle = this.app.themeColors.cyan;
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(-6, -10);
    this.ctx.lineTo(6, -10);
    this.ctx.lineTo(8, 2);
    this.ctx.lineTo(-6, 2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Tail lights
    this.ctx.fillStyle = this.app.themeColors.magenta;
    this.ctx.fillRect(-14, 18, 4, 3);
    this.ctx.fillRect(10, 18, 4, 3);

    this.ctx.restore();
    this.ctx.shadowBlur = 0; // reset
  }

  drawObstacles() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizonY = h * 0.1;

    this.ctx.lineWidth = 2;
    this.ctx.font = "bold 11px 'Share Tech Mono', monospace";
    this.ctx.textAlign = 'center';

    this.obstacles.forEach(obs => {
      // Calculate scale based on Y position (perspective scale)
      const progress = (obs.y - horizonY) / (h - horizonY);
      const scale = 0.2 + 0.8 * progress; // small at horizon, full size at bottom
      const size = 30 * scale;

      const visualX = this.getPerspectiveX(obs.lane, obs.y);

      // Draw wireframe orange glowing cube
      this.ctx.save();
      this.ctx.translate(visualX, obs.y);
      this.ctx.shadowBlur = 8 * scale;
      this.ctx.shadowColor = this.app.themeColors.yellow;
      this.ctx.strokeStyle = this.app.themeColors.yellow;

      // Face fill
      this.ctx.fillStyle = 'rgba(255, 196, 0, 0.08)';
      this.ctx.beginPath();
      this.ctx.rect(-size / 2, -size / 2, size, size);
      this.ctx.fill();
      this.ctx.stroke();

      // Inner tech lines (cyber box details)
      this.ctx.strokeStyle = 'rgba(255, 196, 0, 0.4)';
      this.ctx.beginPath();
      this.ctx.moveTo(-size / 2, 0);
      this.ctx.lineTo(size / 2, 0);
      this.ctx.moveTo(0, -size / 2);
      this.ctx.lineTo(0, size / 2);
      this.ctx.stroke();

      // Text label inside block
      if (scale > 0.45) {
        this.ctx.fillStyle = this.app.themeColors.yellow;
        this.ctx.fillText("DATA", 0, 4);
      }

      this.ctx.restore();
    });
    this.ctx.shadowBlur = 0;
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

  /* ==========================================================================
     MATHEMATICAL PERSPECTIVE COORDINATE TRANSLATORS
     ========================================================================== */
  /**
   * Returns X coordinate of a lane at the bottom of the screen.
   */
  getLaneX(lane) {
    return this.getPerspectiveX(lane, this.carVisualY);
  }

  /**
   * Returns X coordinate of a lane mapped through perspective scaling at specific Y height.
   */
  getPerspectiveX(lane, y) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizonY = h * 0.1;

    // Road Dimensions
    const topWidth = w * 0.25;
    const bottomWidth = w * 0.85;

    // Calculate perspective scaling progress (0 = horizon, 1 = screen bottom)
    const progress = (y - horizonY) / (h - horizonY);

    const roadWidthAtY = topWidth + (bottomWidth - topWidth) * progress;
    const roadLeftXAtY = (w - roadWidthAtY) / 2;
    const laneWidthAtY = roadWidthAtY / this.maxLanes;

    return roadLeftXAtY + laneWidthAtY * (lane + 0.5);
  }

  /* ==========================================================================
     TYPING COMMAND PARSER & INPUT PROCESSOR
     ========================================================================== */
  handleKeyDown(e) {
    if (this.app.activeGame !== this) return;
    // If not in active views, don't capture typing
    if (this.app.views.game.classList.contains('active') === false) return;

    const key = e.key;

    // Check for "menu" keyword bypass
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

    // Pause game toggle using ESC
    if (key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    // Handle overlay typing (Start screen, gameover screen, paused screen)
    if (this.gameState === 'start') {
      this.parseOverlayInput(key, 'start');
      return;
    }

    if (this.gameState === 'gameover') {
      // Gameover overlay accepts "restart" or "exit"
      this.parseOverlayInput(key, 'gameover');
      return;
    }

    if (this.gameState === 'paused') {
      // Pause overlay accepts "resume" or "exit"
      this.parseOverlayInput(key, 'paused');
      return;
    }

    // Handle normal gameplay typing input
    if (this.gameState === 'playing') {
      if (this.cooldownRemaining > 0) {
        return; // block typing during cooldown
      }
      // Only process printable alphabet, digits, and space keys
      if (key.length === 1 && /[a-zA-Z0-9 ]/.test(key)) {
        this.processKeystroke(key.toLowerCase());
      }
    }
  }

  processKeystroke(char) {
    this.totalKeystrokes++;
    const testInput = this.currentInput + char;

    // Check if testInput is a prefix of any active commands (left, right, spin)
    const matchesPrefix = this.commands.some(cmd => cmd.startsWith(testInput));

    if (matchesPrefix) {
      this.currentInput = testInput;
      this.correctKeystrokes++;
      this.app.playSynthSound('typeSuccess');

      // Update UI buffer immediately
      this.updateTypingUI();

      // Check if any command is fully complete
      const completedCommand = this.commands.find(cmd => cmd === this.currentInput);
      if (completedCommand) {
        this.executeCommand(completedCommand);
      }
    } else {
      // Typo! Clear buffer, shake screen feedback, play audio warning, lockout for 500ms
      this.currentInput = "";
      this.cooldownRemaining = 500; // 500ms typo penalty lockout!
      this.app.playSynthSound('fail');
      this.triggerBufferErrorFeedback();
    }
  }

  executeCommand(cmd) {
    this.currentInput = ""; // clear buffer
    this.cooldownRemaining = 600; // 600ms cooldown (down from 1.5s to allow fast maneuvering)
    this.updateTypingUI();

    if (cmd === 'left' || cmd === 'six seven' || cmd === '6 7') {
      if (this.playerLane > 0) {
        this.playerLane--;
        this.app.playSynthSound('click');
      } else {
        this.app.playSynthSound('fail'); // wall bounce warning
      }
    } else if (cmd === 'right' || cmd === 'four one' || cmd === '4 1') {
      if (this.playerLane < this.maxLanes - 1) {
        this.playerLane++;
        this.app.playSynthSound('click');
      } else {
        this.app.playSynthSound('fail');
      }
    } else if (cmd === 'spin' || cmd === 'seven eleven' || cmd === '7 11') {
      this.spinTimeRemaining = this.spinDuration;
      this.app.playSynthSound('spin');

      // Emit heavy spin sparks
      if (this.app.particlesEnabled) {
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push({
            x: this.carVisualX,
            y: this.carVisualY,
            vx: Math.cos(angle) * 0.35,
            vy: Math.sin(angle) * 0.35,
            size: 2 + Math.random() * 3,
            color: this.app.themeColors.magenta,
            alpha: 1.0,
            decay: 0.002
          });
        }
      }
    }
  }

  /* Overlay typing handler (e.g. typing "start" to initiate) */
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

      // Check prefix
      const matches = targets.some(tgt => tgt.startsWith(testInput));
      if (matches) {
        this.overlayInput = testInput;
        this.app.playSynthSound('typeSuccess');

        // Update overlay guide text
        this.updateOverlayTargetHint(overlayType);

        // Check complete
        const completed = targets.find(tgt => tgt === this.overlayInput);
        if (completed) {
          this.overlayInput = ""; // reset

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
        // Mistake
        this.overlayInput = "";
        this.app.playSynthSound('fail');
        this.updateOverlayTargetHint(overlayType);
      }
    }
  }

  /* ==========================================================================
     UI PRESENTATION LAYERS & UPDATES
     ========================================================================== */
  updateHUD() {
    // Score pads to 6 digits
    document.getElementById('hud-score').innerText = String(this.score).padStart(6, '0');

    // Timer format MM:SS
    document.getElementById('hud-timer').innerText = this.getFormattedTime(this.timer);

    // Shields indicators
    const container = document.getElementById('hud-shields');
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const cell = document.createElement('span');
      cell.className = `shield-cell ${i < this.shields ? 'active' : ''}`;
      container.appendChild(cell);
    }
  }

  updateTypingUI() {
    if (this.cooldownRemaining > 0) {
      const pct = Math.ceil(this.cooldownRemaining / 150); // 0 to 10 blocks
      const progressBlocks = "█".repeat(pct) + "░".repeat(10 - pct);
      document.getElementById('typing-buffer').innerText = progressBlocks;
      document.getElementById('typing-feedback').className = 'feedback-text warning';
      document.getElementById('typing-feedback').innerText = `SYSTEM RECHARGING: ${(this.cooldownRemaining / 1000).toFixed(1)}s`;
    } else {
      // Buffer input display
      document.getElementById('typing-buffer').innerText = this.currentInput;
      document.getElementById('typing-feedback').className = 'feedback-text';
      document.getElementById('typing-feedback').innerText = this.currentInput ? 'PROCESSING FRAME...' : 'AWAITING KEYSTROKE...';
    }

    // Highlight command dictionary words letters
    const htmlIds = ['left', 'right', 'spin'];
    this.commands.forEach((cmd, idx) => {
      const el = document.getElementById(`cmd-${htmlIds[idx]}`);
      if (!el) return;

      const typedEl = el.querySelector('.highlight-typed');
      const remEl = el.querySelector('.text-to-type');

      if (this.currentInput && cmd.startsWith(this.currentInput)) {
        el.classList.add('active-prefix');
        typedEl.innerText = this.currentInput;
        remEl.innerText = cmd.substring(this.currentInput.length);
      } else {
        el.classList.remove('active-prefix');
        typedEl.innerText = "";
        remEl.innerText = cmd;
      }
    });
  }

  triggerBufferErrorFeedback() {
    const wrapper = document.querySelector('.input-display-wrapper');
    const feedback = document.getElementById('typing-feedback');

    // UI Shake animation triggers
    wrapper.classList.add('shake');
    feedback.className = 'feedback-text error';
    feedback.innerText = 'KEYSTROKE ERROR // BUFFER RESET';

    // Clear buffer text visual
    document.getElementById('typing-buffer').innerText = "";

    setTimeout(() => {
      wrapper.classList.remove('shake');
    }, 250);

    // Reset highlighting dictionary
    this.updateTypingUI();
  }

  updateOverlayTargetHint(overlayType) {
    // Finds active overlay's hint indicators
    let overlayId = "";
    let baseWord = "start";

    if (overlayType === 'start') {
      overlayId = 'game-start-overlay';
      baseWord = 'start';
    } else if (overlayType === 'gameover') {
      overlayId = 'game-over-overlay';
      // In game over, they can type "restart" or "exit"
      // Show hint dynamically depending on what they started typing
      if (this.overlayInput && 'exit'.startsWith(this.overlayInput)) {
        baseWord = 'exit';
      } else {
        baseWord = 'restart'; // default
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

  /* Helper time formatter: seconds to MM:SS */
  getFormattedTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  calculateWPM() {
    if (this.totalKeystrokes === 0 || this.gameTimeElapsed === 0) return 0;

    // Standard formula: WPM = (correct Keystrokes / 5) / (Minutes)
    const minutes = this.gameTimeElapsed / 60;
    const wpm = (this.correctKeystrokes / 5) / minutes;
    return Math.round(wpm) || 0;
  }
}
