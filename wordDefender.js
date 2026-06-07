/**
 * NEON GRID // WORD DEFENDER MINIGAME ENGINE
 * Space-invader style word shooter with a scrolling starfield background,
 * laser bolt targeting physics, neon-magenta spaceship vectors, and progressive typing.
 */

class WordDefenderGame {
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

    // Word dictionary categories
    this.words3_4 = ['grid', 'warp', 'node', 'core', 'data', 'beam', 'flux', 'ion', 'port', 'dock', 'wave', 'laser', 'link', 'byte', 'chip', 'code', 'sync', 'hack', 'ping', 'hash', 'gate', 'void', 'null', 'zone', 'vector', 'line'];
    this.words5_6 = ['orbit', 'comet', 'solar', 'radar', 'sonar', 'cyber', 'matrix', 'plasma', 'quasar', 'pulsar', 'beacon', 'tensor', 'vertex', 'photon', 'nebula', 'shield', 'probe', 'pilot', 'sensor', 'vector', 'system', 'engine', 'rocket', 'galaxy', 'planet', 'meteor'];
    this.words7_10 = ['telemetry', 'interceptor', 'singularity', 'graviton', 'wavelength', 'hyperdrive', 'supernova', 'atmosphere', 'chronometer', 'subspace', 'cybernetics', 'biosphere', 'synthesizer', 'mainframe', 'encryption', 'processor', 'bandwidth', 'artificial'];

    // Active words on screen
    this.fallingWords = [];
    this.wordSpawnTimer = 0;
    this.wordSpawnInterval = 5000; // ms
    this.wordSpeed = 0.016; // px per ms
    this.baseSpeed = 0.016;

    // Missile animations
    this.missiles = [];
    
    // Starfield background
    this.stars = [];
    this.numStars = 60;
    this.initStars();

    // Word target tracking
    this.targetedWord = null; // Reference to word object currently locked
    this.currentInput = "";
    this.overlayInput = ""; // Buffer for start/restart/resume input

    // Typing stats
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    // Particle system
    this.particles = [];

    // Keyboard handlers
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /* ==========================================================================
     STARFIELD SETUP
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
    this.fallingWords = [];
    this.missiles = [];
    this.particles = [];
    this.targetedWord = null;
    this.currentInput = "";
    this.overlayInput = "";
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    // Setup stars sizing
    if (this.stars.length === 0) {
      this.initStars();
    }

    if (this.timerInterval) clearInterval(this.timerInterval);

    // Speed setting based on difficulty settings
    const diff = this.app.difficulty;
    if (diff === 'hyper') {
      this.baseSpeed = 0.028;
      this.wordSpawnInterval = 3200;
    } else if (diff === 'overload') {
      this.baseSpeed = 0.045;
      this.wordSpawnInterval = 1800;
    } else {
      this.baseSpeed = 0.016;
      this.wordSpawnInterval = 5000;
    }
    this.wordSpeed = this.baseSpeed;
    this.wordSpawnTimer = 0;

    this.updateHUD();
    this.updateTypingUI();

    // Toggle overlays
    this.toggleOverlay('game-start-overlay', true);
    this.toggleOverlay('game-over-overlay', false);
    this.toggleOverlay('game-paused-overlay', false);

    // Dynamic instructions configuration for Word Defender
    document.getElementById('start-overlay-title').innerText = "WORD DEFENDER";
    document.getElementById('start-overlay-title').className = "flicker glow-text-magenta";
    document.getElementById('start-overlay-instructions').innerHTML = `
      <p class="instruction-line"><span class="highlight">TYPE THE WORDS</span> drifting from space to destroy them:</p>
      <div class="control-legend">
        <div class="control-key" style="margin-bottom:8px;">
          <span style="border-color: var(--color-neon-magenta); color: var(--color-neon-magenta); background: rgba(255,0,91,0.1);">Target</span> 
          <span class="action-desc">→ Press first letter of any word to target it</span>
        </div>
        <div class="control-key" style="margin-bottom:8px;">
          <span style="border-color: var(--color-neon-magenta); color: var(--color-neon-magenta); background: rgba(255,0,91,0.1);">Type</span> 
          <span class="action-desc">→ Complete target letters to lock lazers</span>
        </div>
        <div class="control-key">
          <span style="border-color: var(--color-neon-magenta); color: var(--color-neon-magenta); background: rgba(255,0,91,0.1);">Defend</span> 
          <span class="action-desc">→ Don't let words breach the bottom shield boundary!</span>
        </div>
      </div>
      <p class="warning-text">${this.app.sixSevenMode ? 'SIX SEVEN MODE ACTIVE: Vocabulary limited to "six seven", "four one", "seven eleven".' : 'Survival window: 5 minutes. Space Core under threat!'}</p>
    `;

    this.updateOverlayTargetHint('start');

    // Boot animation frame loop
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

    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing') {
        this.timer--;
        this.gameTimeElapsed++;
        this.score += 5; // Survival score
        this.updateHUD();

        // Speed increases slowly
        this.wordSpeed = this.baseSpeed + (this.gameTimeElapsed * 0.00003);

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
      document.getElementById('game-over-title').innerText = "SECTOR DEFENDED";
      document.getElementById('game-over-title').className = "glow-text-cyan flicker";
      document.getElementById('game-over-reason').innerText = "All incoming system threats eliminated.";
    } else {
      this.app.playSynthSound('gameOver');
      document.getElementById('game-over-title').innerText = "SHIELD COLLAPSE";
      document.getElementById('game-over-title').className = "glow-text-magenta flicker-slow";
      document.getElementById('game-over-reason').innerText = "Main thermal shield grid depleted.";
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
      return; // Stop requesting frames if not active
    }
    
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));

    // Auto-resize check
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.initStars(); // recreate starfield in new dimensions
    }

    const dt = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.update(dt);
    this.render();
  }

  /* ==========================================================================
     CORE LOGIC UPDATE
     ========================================================================== */
  update(dt) {
    if (this.app.activeGame !== this) return;

    // Re-initialize stars if canvas was previously 0x0 during reset
    if (this.stars.length === 0 && this.canvas.width >= 100) {
      this.initStars();
    }

    // Scroll stars even when not active for aesthetic depth
    const speedMultiplier = this.gameState === 'playing' ? this.wordSpeed * 18 : 0.2;
    this.stars.forEach(star => {
      star.y += star.speed * speedMultiplier * dt;
      if (star.y > this.canvas.height) {
        star.y = 0;
        star.x = Math.random() * this.canvas.width;
      }
    });

    if (this.gameState !== 'playing') {
      this.updateParticles(dt);
      return;
    }

    // Update particles
    this.updateParticles(dt);

    // Update missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];

      // Track the target word position as it falls
      if (missile.targetWord && this.fallingWords.includes(missile.targetWord)) {
        missile.tx = missile.targetWord.x;
        missile.ty = missile.targetWord.y;
      }

      missile.progress += missile.speed * dt;

      // Calculate current position for particle emission
      const cx = missile.sx + (missile.tx - missile.sx) * missile.progress;
      const cy = missile.sy + (missile.ty - missile.sy) * missile.progress;

      // Emit rocket engine flame / trail particles
      if (this.app.particlesEnabled && Math.random() < 0.35) {
        const angle = Math.atan2(missile.ty - missile.sy, missile.tx - missile.sx);
        const bx = cx - Math.cos(angle) * 8;
        const by = cy - Math.sin(angle) * 8;
        this.particles.push({
          x: bx,
          y: by,
          vx: -Math.cos(angle) * 0.05 + (Math.random() * 0.04 - 0.02),
          vy: -Math.sin(angle) * 0.05 + (Math.random() * 0.04 - 0.02),
          size: 1.5 + Math.random() * 2,
          color: Math.random() < 0.65 ? this.app.themeColors.yellow : this.app.themeColors.magenta,
          alpha: 0.85,
          decay: 0.003
        });
      }

      if (missile.progress >= 1.0) {
        // Impact! Spawn explosion sparks
        this.spawnExplosion(missile.tx, missile.ty, 'magenta');
        this.app.playSynthSound('crash');
        
        // Remove target word from falling list
        if (missile.targetWord) {
          const wIndex = this.fallingWords.indexOf(missile.targetWord);
          if (wIndex > -1) {
            this.fallingWords.splice(wIndex, 1);
          }
        }

        this.missiles.splice(i, 1);
      }
    }

    // Words Spawner
    this.wordSpawnTimer += dt;
    if (this.wordSpawnTimer >= this.wordSpawnInterval) {
      this.spawnWord();
      this.wordSpawnTimer = 0;
    }

    // Move falling words
    const limitY = this.canvas.height * 0.8; // Shield barrier Y
    for (let i = this.fallingWords.length - 1; i >= 0; i--) {
      const word = this.fallingWords[i];
      if (!word.isDead) {
        word.y += this.wordSpeed * dt;
      }

      // Crosses shield barrier
      if (word.y >= limitY) {
        this.fallingWords.splice(i, 1);
        
        // If targeted, clear target
        if (this.targetedWord === word) {
          this.targetedWord = null;
          this.currentInput = "";
          this.updateTypingUI();
        }

        // Penalty - only if word was NOT typed successfully
        if (!word.isDead) {
          this.shields--;
          this.triggerScreenShake();
          this.updateHUD();
          this.app.playSynthSound('fail');

          if (this.shields <= 0) {
            this.endGame(false);
          }
        }
      }
    }
  }

  spawnWord() {
    if (this.canvas.width < 100 || this.canvas.height < 100) return;
    // Pick word bank depending on game time (longer words later)
    let wordList = [];
    if (this.app.sixSevenMode) {
      wordList = ['six seven', 'four one', 'seven eleven'];
    } else if (this.gameTimeElapsed > 90) { // after 1.5 mins
      const rand = Math.random();
      if (rand < 0.3) wordList = this.words3_4;
      else if (rand < 0.75) wordList = this.words5_6;
      else wordList = this.words7_10;
    } else if (this.gameTimeElapsed > 30) { // after 30 seconds
      if (Math.random() < 0.45) wordList = this.words3_4;
      else wordList = this.words5_6;
    } else {
      wordList = this.words3_4;
    }

    const text = wordList[Math.floor(Math.random() * wordList.length)];
    
    // Choose horizontal coordinate, keeping bounds from edge
    const margin = 60;
    const x = margin + Math.random() * (this.canvas.width - margin * 2);

    this.fallingWords.push({
      text: text,
      x: x,
      y: this.canvas.height * 0.05,
      typedLength: 0
    });
  }

  spawnExplosion(x, y) {
    if (!this.app.particlesEnabled) return;
    
    // Heavy spark burst
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.38;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? this.app.themeColors.magenta : this.app.themeColors.cyan,
        alpha: 1.0,
        decay: 0.0018 + Math.random() * 0.002
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

  /* ==========================================================================
     RENDERING ENGINE
     ========================================================================== */
  render() {
    if (this.app.activeGame !== this) return;

    // Background fill
    this.ctx.fillStyle = '#050010';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Nebula depth gradient glow
    const radial = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height, 10,
      this.canvas.width / 2, this.canvas.height, this.canvas.height
    );
    radial.addColorStop(0, '#130122');
    radial.addColorStop(0.5, '#050010');
    this.ctx.fillStyle = radial;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.ctx.fillStyle = '#fff';
    this.stars.forEach(star => {
      this.ctx.globalAlpha = star.speed * 4;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    this.ctx.globalAlpha = 1.0; // reset

    // Draw Shield Barrier Line
    this.drawShieldBarrier();

    // Draw Missile Bolts
    this.drawMissiles();

    // Draw Particles
    this.drawParticles();

    // Draw Falling Words
    this.drawFallingWords();

    // Draw Player Spaceship Interceptor
    this.drawSpaceship();
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

  drawShieldBarrier() {
    const y = this.canvas.height * 0.8;
    this.ctx.save();
    this.ctx.strokeStyle = this.app.themeColors.magenta;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.app.themeColors.magenta;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawMissiles() {
    this.missiles.forEach(missile => {
      // Calculate current position
      const cx = missile.sx + (missile.tx - missile.sx) * missile.progress;
      const cy = missile.sy + (missile.ty - missile.sy) * missile.progress;

      const angle = Math.atan2(missile.ty - missile.sy, missile.tx - missile.sx);

      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(angle);

      // Setup glowing neon shadow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.app.themeColors.cyan;
      this.ctx.strokeStyle = this.app.themeColors.cyan;
      this.ctx.fillStyle = '#0a0518';
      this.ctx.lineWidth = 1.5;

      // Draw missile fuselage (pointed capsule/cylinder)
      this.ctx.beginPath();
      this.ctx.moveTo(8, 0); // Nose cone tip
      this.ctx.lineTo(2, -3); // Nose cone bottom right
      this.ctx.lineTo(-8, -3); // Fuselage right
      this.ctx.lineTo(-8, 3); // Fuselage left
      this.ctx.lineTo(2, 3); // Nose cone bottom left
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Draw red warhead tip
      this.ctx.fillStyle = this.app.themeColors.magenta;
      this.ctx.beginPath();
      this.ctx.moveTo(8, 0);
      this.ctx.lineTo(2, -3);
      this.ctx.lineTo(2, 3);
      this.ctx.closePath();
      this.ctx.fill();

      // Draw rear wings/fins
      this.ctx.strokeStyle = this.app.themeColors.magenta;
      this.ctx.beginPath();
      // Right wing fin
      this.ctx.moveTo(-5, -3);
      this.ctx.lineTo(-9, -6);
      this.ctx.lineTo(-8, -3);
      // Left wing fin
      this.ctx.moveTo(-5, 3);
      this.ctx.lineTo(-9, 6);
      this.ctx.lineTo(-8, 3);
      this.ctx.stroke();

      // Draw engine fire glow
      if (Math.random() < 0.75) {
        this.ctx.fillStyle = this.app.themeColors.yellow;
        this.ctx.beginPath();
        this.ctx.moveTo(-8, -2);
        this.ctx.lineTo(-14 - Math.random() * 5, 0);
        this.ctx.lineTo(-8, 2);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  drawSpaceship() {
    const sx = this.canvas.width / 2;
    const sy = this.canvas.height * 0.84;

    this.ctx.save();
    this.ctx.translate(sx, sy);

    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = this.app.themeColors.magenta;
    this.ctx.strokeStyle = this.app.themeColors.magenta;
    this.ctx.fillStyle = '#090117';
    this.ctx.lineWidth = 2.5;

    // Space Interceptor geometric path
    this.ctx.beginPath();
    this.ctx.moveTo(0, -26); // Nose cone
    this.ctx.lineTo(12, -8);  // Cabin deck right
    this.ctx.lineTo(26, 15);  // Right wing tip
    this.ctx.lineTo(10, 10);  // Right thruster bracket
    this.ctx.lineTo(0, 5);    // Center fuel line
    this.ctx.lineTo(-10, 10); // Left thruster bracket
    this.ctx.lineTo(-26, 15); // Left wing tip
    this.ctx.lineTo(-12, -8); // Cabin deck left
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Spaceship glass canopy
    this.ctx.strokeStyle = this.app.themeColors.cyan;
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -18);
    this.ctx.lineTo(5, -6);
    this.ctx.lineTo(0, -1);
    this.ctx.lineTo(-5, -6);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Engine exhaust flames
    if (this.gameState === 'playing' && Math.random() < 0.6) {
      this.ctx.strokeStyle = this.app.themeColors.yellow;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(-6, 10);
      this.ctx.lineTo(-6, 20);
      this.ctx.moveTo(6, 10);
      this.ctx.lineTo(6, 20);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawFallingWords() {
    this.ctx.textAlign = 'center';
    this.ctx.font = "bold 16px 'Share Tech Mono', monospace";

    this.fallingWords.forEach(word => {
      const isTargeted = this.targetedWord === word;

      this.ctx.save();
      
      // Draw a subtle dark card backing
      const wordWidth = this.ctx.measureText(word.text).width + 16;
      this.ctx.fillStyle = isTargeted ? 'rgba(255, 0, 91, 0.12)' : 'rgba(0, 0, 0, 0.45)';
      this.ctx.strokeStyle = isTargeted ? this.app.themeColors.magenta : 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(word.x - wordWidth / 2, word.y - 16, wordWidth, 26, 4);
      } else {
        this.ctx.rect(word.x - wordWidth / 2, word.y - 16, wordWidth, 26);
      }
      this.ctx.fill();
      this.ctx.stroke();

      // Setup shadows for letters
      this.ctx.shadowBlur = isTargeted ? 8 : 4;
      this.ctx.shadowColor = isTargeted ? this.app.themeColors.magenta : this.app.themeColors.yellow;

      // Text splitting for visual typed highlights
      const txt = word.text;
      const typedLen = word.typedLength;

      if (typedLen > 0) {
        // Draw typed substring
        const typedTxt = txt.substring(0, typedLen);
        const untypedTxt = txt.substring(typedLen);

        const typedWidth = this.ctx.measureText(typedTxt).width;
        const totalWidth = this.ctx.measureText(txt).width;
        const startX = word.x - totalWidth / 2;

        // Typed cyan glow
        this.ctx.fillStyle = this.app.themeColors.cyan;
        this.ctx.shadowColor = this.app.themeColors.cyan;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(typedTxt, startX, word.y + 2);

        // Remaining text yellow / dim magenta
        this.ctx.fillStyle = isTargeted ? this.app.themeColors.white : this.app.themeColors.yellow;
        this.ctx.shadowColor = isTargeted ? this.app.themeColors.magenta : this.app.themeColors.yellow;
        this.ctx.fillText(untypedTxt, startX + typedWidth, word.y + 2);
      } else {
        // Untyped entirely
        this.ctx.fillStyle = isTargeted ? this.app.themeColors.magenta : this.app.themeColors.yellow;
        this.ctx.fillText(txt, word.x, word.y + 2);
      }

      this.ctx.restore();
    });
  }

  /* ==========================================================================
     TYPING LOGIC & KEY EVENT CAPTURE
     ========================================================================== */
  handleKeyDown(e) {
    if (this.app.activeGame !== this) return;
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

    // Escape triggers pause
    if (key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    // Capture overlay configurations
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

    // Gameplay input parsing
    if (this.gameState === 'playing') {
      if (key.length === 1 && /[a-zA-Z ]/.test(key)) {
        this.processKeystroke(key.toLowerCase());
      }
    }
  }

  processKeystroke(char) {
    this.totalKeystrokes++;

    if (this.targetedWord === null) {
      // Find any falling word that starts with this key
      // prioritize words that are lower on screen (more urgent)
      const matches = this.fallingWords
        .filter(w => !w.isDead && w.text.startsWith(char))
        .sort((a, b) => b.y - a.y);

      if (matches.length > 0) {
        this.targetedWord = matches[0];
        this.targetedWord.typedLength = 1;
        this.currentInput = char;
        this.correctKeystrokes++;
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();

        // Check if 1-char word
        if (this.targetedWord.text.length === 1) {
          this.shootTarget(this.targetedWord);
        }
      } else {
        // Miskey
        this.currentInput = "";
        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
      }
    } else {
      // Check next character match on active target
      const targetChar = this.targetedWord.text[this.targetedWord.typedLength];
      if (char === targetChar) {
        this.targetedWord.typedLength++;
        this.currentInput += char;
        this.correctKeystrokes++;
        this.app.playSynthSound('typeSuccess');
        this.updateTypingUI();

        if (this.targetedWord.typedLength === this.targetedWord.text.length) {
          this.shootTarget(this.targetedWord);
        }
      } else {
        // Typos reset the word typed progress to 0 and remove target lock
        this.targetedWord.typedLength = 0;
        this.targetedWord = null;
        this.currentInput = "";
        this.app.playSynthSound('fail');
        this.triggerBufferErrorFeedback();
      }
    }
  }

  shootTarget(word) {
    const sx = this.canvas.width / 2;
    const sy = this.canvas.height * 0.84;

    // Flag word as dead/completed so it cannot be targeted and won't trigger shields penalty
    word.isDead = true;
    word.typedLength = word.text.length;

    // Create guided missile object
    this.missiles.push({
      sx: sx,
      sy: sy,
      tx: word.x,
      ty: word.y,
      progress: 0,
      speed: 0.0025, // progress per ms (approx 400ms flight time)
      targetWord: word
    });

    // Score point scale by length
    this.score += word.text.length * 100;
    this.updateHUD();

    // Trigger lasers laser arpeggio sound
    this.app.playSynthSound('commandComplete');

    // Reset target locks
    this.targetedWord = null;
    this.currentInput = "";
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

  /* ==========================================================================
     UI LAYER WRAPPER
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
    document.getElementById('typing-feedback').innerText = this.targetedWord ? `LOCKING TARGET // TYPED: ${this.currentInput}` : 'AWAITING KEYSTROKE TARGET...';
  }

  triggerBufferErrorFeedback() {
    const wrapper = document.querySelector('.input-display-wrapper');
    const feedback = document.getElementById('typing-feedback');

    wrapper.classList.add('shake');
    feedback.className = 'feedback-text error';
    feedback.innerText = 'TARGET ACQUISITION FAILURE // BUFFER RESET';
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
