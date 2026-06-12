/* ==========================================================================
   NEON GRID ARCHEV - GRID_RUNNER MINIGAME ENGINE
   ========================================================================== */

class GridRunnerGame {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.gameState = 'start'; // start, playing, paused, gameover
    
    // Grid settings
    this.cols = 19;
    this.rows = 15;
    this.grid = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
      [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    // Word lists for standard mode
    this.wordsPool = {
      'a': ['arc', 'axis', 'algo'],
      'b': ['byte', 'boot', 'base'],
      'c': ['code', 'core', 'chip'],
      'd': ['data', 'disk', 'drift'],
      'e': ['exit', 'emit', 'echo'],
      'f': ['flow', 'file', 'flux'],
      'g': ['gate', 'grid', 'glow'],
      'h': ['hack', 'host', 'hash'],
      'i': ['info', 'icon', 'input'],
      'k': ['key', 'kill', 'kernel'],
      'l': ['link', 'loop', 'logic'],
      'n': ['node', 'neon', 'net'],
      'p': ['port', 'path', 'pulse'],
      'r': ['run', 'root', 'rate'],
      's': ['sync', 'scan', 'shell'],
      't': ['test', 'time', 'task'],
      'u': ['unit', 'user', 'unix'],
      'v': ['void', 'vector', 'volt'],
      'z': ['zone', 'zero', 'zetta']
    };

    // Bind window input
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /* ==========================================================================
     GAME LIFECYCLE MANAGEMENT
     ========================================================================== */
  reset() {
    this.gameState = 'start';
    this.timer = 300; // 5 minutes survival
    this.score = 0;
    this.shields = 5;
    
    // Player Cycle State
    this.gridX = 1;
    this.gridY = 1;
    this.targetGridX = 1;
    this.targetGridY = 1;
    this.direction = 'right'; // 'up', 'down', 'left', 'right'
    this.bufferedDirection = null;
    this.moveProgress = 0;
    this.trail = [];
    this.maxTrailLength = 40;
    this.invincibilityTimer = 0;
    this.boostTimer = 0; // Speed burst
    this.autoMove = false;
    this.stepsRemaining = 0;

    // Difficulty-based speed limits
    const diff = this.app.difficulty;
    if (diff === 'hyper') {
      this.baseSpeed = 0.0035; // cells per ms
      this.droneSpeed = 0.0022;
      this.numDrones = 3;
    } else if (diff === 'overload') {
      this.baseSpeed = 0.0045;
      this.droneSpeed = 0.0030;
      this.numDrones = 4;
    } else {
      this.baseSpeed = 0.0025; // Normal
      this.droneSpeed = 0.0016;
      this.numDrones = 2;
    }
    
    this.speed = this.baseSpeed;
    
    // Entities
    this.drones = [];
    this.dataNodes = [];
    this.particles = [];
    this.bullets = [];
    this.respawnQueue = [];
    
    // Typing Buffer
    this.currentInput = "";
    this.overlayInput = "";
    this.activePrompts = [];
    
    // Analytics
    this.correctKeystrokes = 0;
    this.totalKeystrokes = 0;
    this.gameTimeElapsed = 0;

    // Reset drones positions at corners
    const corners = [
      { x: 17, y: 1 },
      { x: 17, y: 13 },
      { x: 1, y: 13 },
      { x: 9, y: 7 }
    ];
    let validCorners = corners.filter(c => {
      const dist1 = Math.abs(c.x - this.gridX) + Math.abs(c.y - this.gridY);
      const dist2 = Math.abs(c.x - this.targetGridX) + Math.abs(c.y - this.targetGridY);
      return dist1 > 3 && dist2 > 3;
    });
    if (validCorners.length === 0) {
      validCorners = [...corners].sort((a, b) => {
        const distA = Math.abs(a.x - this.gridX) + Math.abs(a.y - this.gridY);
        const distB = Math.abs(b.x - this.gridX) + Math.abs(b.y - this.gridY);
        return distB - distA;
      });
    }
    const activeCorners = validCorners;
    for (let i = 0; i < this.numDrones; i++) {
      const pos = activeCorners[i % activeCorners.length];
      this.drones.push({
        gridX: pos.x,
        gridY: pos.y,
        targetGridX: pos.x,
        targetGridY: pos.y,
        moveProgress: 0,
        direction: 'left',
        speed: this.droneSpeed,
        trail: []
      });
    }

    // Spawn initial data nodes
    this.spawnDataNode();
    this.spawnDataNode();

    // Trigger fresh steering prompts
    this.generatePrompts();

    // Reset overlay elements
    this.toggleOverlay('game-start-overlay', true);
    this.toggleOverlay('game-over-overlay', false);
    this.toggleOverlay('game-paused-overlay', false);

    // Setup overlay instructions
    const upLeft = this.app.sixSevenMode ? '6 7' : 'left / up';
    const downRight = this.app.sixSevenMode ? '4 1' : 'right / down';
    const boost = this.app.sixSevenMode ? '7 11' : 'boost';

    document.getElementById('start-overlay-title').innerText = "GRID RUNNER";
    document.getElementById('start-overlay-title').className = "flicker glow-text-green";
    document.getElementById('start-overlay-instructions').innerHTML = `
      <p class="instruction-line"><span class="highlight">TYPE THE CORRESPONDING WORDS</span> at intersections to steer:</p>
      <div class="control-legend">
        <div class="control-key"><span>${upLeft}</span> <span class="action-desc">→ Turn Up / Left</span></div>
        <div class="control-key"><span>${downRight}</span> <span class="action-desc">→ Turn Down / Right</span></div>
        <div class="control-key"><span>${boost}</span> <span class="action-desc">→ Speed Boost / Straight</span></div>
        <div class="control-key"><span style="color: var(--color-neon-yellow)">shoot</span> <span class="action-desc">→ Fire lasers in 4 directions</span></div>
      </div>
      <p class="warning-text">${this.app.sixSevenMode ? 'SIX SEVEN MODE ACTIVE: Directions restricted to digits "6 7", "4 1", "7 11".' : 'Survival window: 5 minutes. Dodge pursuing orange security drones!'}</p>
    `;

    this.resizeCanvas();
    this.updateHUD();
    this.updateTypingUI();
    this.updateOverlayTargetHint('start');

    // Run core animation frame loop
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

    // Game countdown countdown timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing') {
        this.timer--;
        this.gameTimeElapsed = 300 - this.timer;
        
        // Gradually increase speed over time (1% every 10 seconds)
        this.speed = this.baseSpeed * (1.0 + (this.gameTimeElapsed / 100));
        
        this.updateHUD();

        if (this.timer <= 0) {
          this.endGame(true);
        }
      }
    }, 1000);
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.toggleOverlay('game-paused-overlay', true);
      this.app.playSynthSound('click');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.toggleOverlay('game-paused-overlay', false);
      this.app.playSynthSound('click');
      this.lastFrameTime = performance.now();
    }
  }

  exitToMenu() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.gameState = 'start';
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.app.showView('dashboard');
  }

  endGame(isVictory = false) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.gameState = 'gameover';
    this.app.playSynthSound('gameOver');
    
    // Save Score log
    const duration = this.gameTimeElapsed;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    // Calculate final WPM
    const wpm = this.totalKeystrokes > 0 
      ? Math.round((this.correctKeystrokes / 5) / (duration / 60 || 0.1)) 
      : 0;

    this.app.saveHighScore(this.score, wpm, timeStr);

    document.getElementById('final-score-val').innerText = this.score;
    document.getElementById('final-time-val').innerText = timeStr;
    document.getElementById('final-wpm-val').innerText = `${wpm} words per minute`;

    const titleEl = document.getElementById('game-over-title');
    const reasonEl = document.getElementById('game-over-reason');

    if (isVictory) {
      titleEl.innerText = "GRID RECLAIMED";
      titleEl.className = "glow-text-green flicker";
      reasonEl.innerText = "5-minute mainframe connection window held successfully!";
    } else {
      titleEl.innerText = "CYCLE COMPROMISED";
      titleEl.className = "glow-text-magenta flicker-slow";
      reasonEl.innerText = "Evaded code security system failure.";
    }

    this.toggleOverlay('game-over-overlay', true);
    this.updateOverlayTargetHint('gameover');
  }

  /* ==========================================================================
     LOOP & DRAW ENGINE
     ========================================================================== */
  loop(now) {
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.gameState === 'playing') {
      this.update(dt);
    }
    this.render();
  }

  update(dt) {
    // Decr timers
    if (this.invincibilityTimer > 0) this.invincibilityTimer -= dt;
    if (this.boostTimer > 0) this.boostTimer -= dt;

    const currentSpeed = this.boostTimer > 0 ? this.speed * 1.8 : this.speed;

    // 1. Move Player
    if (this.gridX === this.targetGridX && this.gridY === this.targetGridY) {
      // Player is at intersection, process scheduled moves
      if (this.bufferedDirection) {
        if (this.isValidMove(this.gridX, this.gridY, this.bufferedDirection)) {
          this.direction = this.bufferedDirection;
          this.app.playSynthSound('click');
          if (this.autoMove) {
            this.stepsRemaining = 0;
          } else {
            this.stepsRemaining = 4;
          }
        } else {
          this.stepsRemaining = 0;
        }
        this.bufferedDirection = null;
      }

      // Execute steps or continuous movement
      if (this.stepsRemaining > 0) {
        let nextX = this.gridX;
        let nextY = this.gridY;
        if (this.direction === 'up') nextY--;
        else if (this.direction === 'down') nextY++;
        else if (this.direction === 'left') nextX--;
        else if (this.direction === 'right') nextX++;

        if (this.isValidMove(this.gridX, this.gridY, this.direction)) {
          this.targetGridX = nextX;
          this.targetGridY = nextY;
          this.moveProgress = 0;
          this.stepsRemaining--;
        } else {
          this.stepsRemaining = 0;
          this.targetGridX = this.gridX;
          this.targetGridY = this.gridY;
        }
      } else if (this.autoMove) {
        let nextX = this.gridX;
        let nextY = this.gridY;
        if (this.direction === 'up') nextY--;
        else if (this.direction === 'down') nextY++;
        else if (this.direction === 'left') nextX--;
        else if (this.direction === 'right') nextX++;

        if (this.isValidMove(this.gridX, this.gridY, this.direction)) {
          this.targetGridX = nextX;
          this.targetGridY = nextY;
          this.moveProgress = 0;
        } else {
          // Hitting wall, stop moving automatically
          this.autoMove = false;
          this.targetGridX = this.gridX;
          this.targetGridY = this.gridY;
        }
      } else {
        // Stopped
        this.targetGridX = this.gridX;
        this.targetGridY = this.gridY;
      }
    }

    if (this.gridX !== this.targetGridX || this.gridY !== this.targetGridY) {
      this.moveProgress += currentSpeed * dt;
      if (this.moveProgress >= 1.0) {
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        this.moveProgress = 0;
        
        // Add trail coordinate
        this.trail.push({ x: this.gridX, y: this.gridY });
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }

        // Check node collisions
        this.checkDataNodeCollisions();

        // Generate next steering options
        this.generatePrompts();
        this.updateTypingUI();
      }
    }

    // 2. Move Drones
    this.drones.forEach(drone => {
      if (drone.gridX === drone.targetGridX && drone.gridY === drone.targetGridY) {
        // Drone is at cell center, determine next target towards player
        const validDirs = ['up', 'down', 'left', 'right'].filter(dir => 
          this.isValidMove(drone.gridX, drone.gridY, dir)
        );

        if (validDirs.length > 0) {
          // Sort directions by Manhattan distance to player's current coordinate
          validDirs.sort((a, b) => {
            let ax = drone.gridX, ay = drone.gridY;
            let bx = drone.gridX, by = drone.gridY;
            
            if (a === 'up') ay--;
            else if (a === 'down') ay++;
            else if (a === 'left') ax--;
            else if (a === 'right') ax++;

            if (b === 'up') by--;
            else if (b === 'down') by++;
            else if (b === 'left') bx--;
            else if (b === 'right') bx++;

            const distA = Math.abs(ax - this.gridX) + Math.abs(ay - this.gridY);
            const distB = Math.abs(bx - this.gridX) + Math.abs(by - this.gridY);
            return distA - distB;
          });

          // Move in direction that minimizes distance
          const bestDir = validDirs[0];
          drone.direction = bestDir;
          if (bestDir === 'up') drone.targetGridY--;
          else if (bestDir === 'down') drone.targetGridY++;
          else if (bestDir === 'left') drone.targetGridX--;
          else if (bestDir === 'right') drone.targetGridX++;
        }
        drone.moveProgress = 0;
      }

      if (drone.gridX !== drone.targetGridX || drone.gridY !== drone.targetGridY) {
        drone.moveProgress += drone.speed * dt;
        if (drone.moveProgress >= 1.0) {
          drone.gridX = drone.targetGridX;
          drone.gridY = drone.targetGridY;
          drone.moveProgress = 0;

          drone.trail.push({ x: drone.gridX, y: drone.gridY });
          if (drone.trail.length > 15) drone.trail.shift();
        }
      }
    });

    // 3. Collision between Player & Drones
    if (this.invincibilityTimer <= 0) {
      // Compute pixel positions to test collision
      const tileW = this.canvas.width / this.cols;
      const tileH = this.canvas.height / this.rows;
      
      const px = (this.gridX + (this.targetGridX - this.gridX) * this.moveProgress) * tileW + tileW/2;
      const py = (this.gridY + (this.targetGridY - this.gridY) * this.moveProgress) * tileH + tileH/2;

      this.drones.forEach(drone => {
        const dx = (drone.gridX + (drone.targetGridX - drone.gridX) * drone.moveProgress) * tileW + tileW/2;
        const dy = (drone.gridY + (drone.targetGridY - drone.gridY) * drone.moveProgress) * tileH + tileH/2;

        const dist = Math.sqrt((px - dx)**2 + (py - dy)**2);
        if (dist < tileW * 0.75) {
          // Crash!
          this.shields--;
          this.invincibilityTimer = 2000; // 2 seconds invincibility
          this.triggerScreenShake();
          this.app.playSynthSound('crash');
          
          // Spawn massive debris explosion
          if (this.app.particlesEnabled) {
            for (let i = 0; i < 20; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 0.15 + Math.random() * 0.25;
              this.particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: this.app.themeColors.magenta,
                alpha: 1.0,
                decay: 0.003
              });
            }
          }

          // Reset all drones positions to center/corners
          this.resetDronesPositions();
          this.updateHUD();

          if (this.shields <= 0) {
            this.endGame(false);
          }
        }
      });
    }

    // 4. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update Bullets
    if (this.bullets) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const bullet = this.bullets[i];

        if (bullet.gridX === bullet.targetGridX && bullet.gridY === bullet.targetGridY) {
          // Find next cell
          let nextX = bullet.gridX;
          let nextY = bullet.gridY;
          if (bullet.direction === 'up') nextY--;
          else if (bullet.direction === 'down') nextY++;
          else if (bullet.direction === 'left') nextX--;
          else if (bullet.direction === 'right') nextX++;

          // Out of bounds or wall checks
          if (
            nextX < 0 ||
            nextX >= this.cols ||
            nextY < 0 ||
            nextY >= this.rows ||
            this.grid[nextY][nextX] === 1
          ) {
            // Hit a wall, destroy the bullet
            this.bullets.splice(i, 1);
            continue;
          } else {
            bullet.targetGridX = nextX;
            bullet.targetGridY = nextY;
            bullet.moveProgress = 0;
          }
        }

        if (bullet.gridX !== bullet.targetGridX || bullet.gridY !== bullet.targetGridY) {
          bullet.moveProgress += bullet.speed * dt;
          if (bullet.moveProgress >= 1.0) {
            bullet.gridX = bullet.targetGridX;
            bullet.gridY = bullet.targetGridY;
            bullet.moveProgress = 0;
          }
        }
      }
    }

    // 6. Bullet-to-Drone Collision Check
    const tileW = this.canvas.width / this.cols;
    const tileH = this.canvas.height / this.rows;

    if (this.bullets && this.drones) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const bullet = this.bullets[i];
        const bx = (bullet.gridX + (bullet.targetGridX - bullet.gridX) * bullet.moveProgress) * tileW + tileW/2;
        const by = (bullet.gridY + (bullet.targetGridY - bullet.gridY) * bullet.moveProgress) * tileH + tileH/2;

        let bulletDestroyed = false;

        for (let j = this.drones.length - 1; j >= 0; j--) {
          const drone = this.drones[j];
          const dx = (drone.gridX + (drone.targetGridX - drone.gridX) * drone.moveProgress) * tileW + tileW/2;
          const dy = (drone.gridY + (drone.targetGridY - drone.gridY) * drone.moveProgress) * tileH + tileH/2;

          const dist = Math.sqrt((bx - dx)**2 + (by - dy)**2);
          if (dist < tileW * 0.8) {
            // Spawn particle explosion at drone
            if (this.app.particlesEnabled) {
              for (let k = 0; k < 12; k++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.1 + Math.random() * 0.15;
                this.particles.push({
                  x: dx,
                  y: dy,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: 2 + Math.random() * 3,
                  color: '#ffaa00',
                  alpha: 1.0,
                  decay: 0.003
                });
              }
            }

            this.app.playSynthSound('crash');

            // Add to respawn queue
            if (this.respawnQueue) {
              this.respawnQueue.push({ timer: 3000 });
            }

            // Destroy drone & bullet
            this.drones.splice(j, 1);
            bulletDestroyed = true;
            break;
          }
        }

        if (bulletDestroyed) {
          this.bullets.splice(i, 1);
        }
      }
    }

    // 7. Update Drone Respawns
    if (this.respawnQueue) {
      for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
        const respawn = this.respawnQueue[i];
        respawn.timer -= dt;
        if (respawn.timer <= 0) {
          // Spawn drone at one of the corners
          const corners = [
            { x: 17, y: 1 },
            { x: 17, y: 13 },
            { x: 1, y: 13 },
            { x: 9, y: 7 }
          ];
          let validCorners = corners.filter(c => {
            const dist1 = Math.abs(c.x - this.gridX) + Math.abs(c.y - this.gridY);
            const dist2 = Math.abs(c.x - this.targetGridX) + Math.abs(c.y - this.targetGridY);
            return dist1 > 3 && dist2 > 3;
          });
          if (validCorners.length === 0) {
            validCorners = [...corners].sort((a, b) => {
              const distA = Math.abs(a.x - this.gridX) + Math.abs(a.y - this.gridY);
              const distB = Math.abs(b.x - this.gridX) + Math.abs(b.y - this.gridY);
              return distB - distA;
            });
          }
          const activeCorners = validCorners;
          const pos = activeCorners[Math.floor(Math.random() * activeCorners.length)];
          this.drones.push({
            gridX: pos.x,
            gridY: pos.y,
            targetGridX: pos.x,
            targetGridY: pos.y,
            moveProgress: 0,
            direction: 'left',
            speed: this.droneSpeed,
            trail: []
          });
          this.respawnQueue.splice(i, 1);
        }
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#070010';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const tileW = this.canvas.width / this.cols;
    const tileH = this.canvas.height / this.rows;

    // 1. Draw Grid Walls
    this.ctx.lineWidth = 1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1) {
          // Render glowing neon block borders
          this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.15)';
          this.ctx.strokeRect(c * tileW, r * tileH, tileW, tileH);
          
          // Filled center
          this.ctx.fillStyle = 'rgba(15, 2, 28, 0.8)';
          this.ctx.fillRect(c * tileW + 2, r * tileH + 2, tileW - 4, tileH - 4);
          
          // Outer borders highlight
          this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
          this.ctx.strokeRect(c * tileW + 1, r * tileH + 1, tileW - 2, tileH - 2);
        } else {
          // Dot inside path cells for retro feel
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          this.ctx.beginPath();
          this.ctx.arc(c * tileW + tileW/2, r * tileH + tileH/2, 1.5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // 2. Draw Data Nodes
    this.dataNodes.forEach(node => {
      this.ctx.save();
      const nx = node.gridX * tileW + tileW/2;
      const ny = node.gridY * tileH + tileH/2;
      
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.app.themeColors.green;
      
      // Pulse animation
      const scale = 1.0 + Math.sin(Date.now() / 150) * 0.15;
      this.ctx.translate(nx, ny);
      this.ctx.rotate(Date.now() / 1000);
      this.ctx.scale(scale, scale);

      // Neon green crystal shape
      this.ctx.fillStyle = 'rgba(0, 255, 102, 0.3)';
      this.ctx.strokeStyle = '#00ff66';
      this.ctx.lineWidth = 1.5;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, -tileH * 0.3);
      this.ctx.lineTo(tileW * 0.25, 0);
      this.ctx.lineTo(0, tileH * 0.3);
      this.ctx.lineTo(-tileW * 0.25, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    });

    // 3. Draw Drones and Trails
    this.drones.forEach(drone => {
      const dx = (drone.gridX + (drone.targetGridX - drone.gridX) * drone.moveProgress) * tileW + tileW/2;
      const dy = (drone.gridY + (drone.targetGridY - drone.gridY) * drone.moveProgress) * tileH + tileH/2;

      // Draw Drone Trail
      if (drone.trail.length > 1) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 120, 0, 0.35)';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        drone.trail.forEach((pos, idx) => {
          const tx = pos.x * tileW + tileW/2;
          const ty = pos.y * tileH + tileH/2;
          if (idx === 0) this.ctx.moveTo(tx, ty);
          else this.ctx.lineTo(tx, ty);
        });
        this.ctx.lineTo(dx, dy);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Draw Drone shape
      this.ctx.save();
      this.ctx.translate(dx, dy);
      
      // Rotate based on direction
      let angle = 0;
      if (drone.direction === 'up') angle = -Math.PI/2;
      else if (drone.direction === 'down') angle = Math.PI/2;
      else if (drone.direction === 'left') angle = Math.PI;
      this.ctx.rotate(angle);

      // Pulsing threat engine glow
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = this.app.themeColors.yellow;
      
      // Draw security interceptor chassis
      this.ctx.fillStyle = '#ff7700';
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 2;
      
      this.ctx.beginPath();
      this.ctx.moveTo(tileW * 0.3, 0);
      this.ctx.lineTo(-tileW * 0.2, -tileH * 0.22);
      this.ctx.lineTo(-tileW * 0.05, 0);
      this.ctx.lineTo(-tileW * 0.2, tileH * 0.22);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    });

    // 4. Draw Player Trail
    const px = (this.gridX + (this.targetGridX - this.gridX) * this.moveProgress) * tileW + tileW/2;
    const py = (this.gridY + (this.targetGridY - this.gridY) * this.moveProgress) * tileH + tileH/2;

    if (this.trail.length > 1) {
      this.ctx.save();
      this.ctx.strokeStyle = this.invincibilityTimer > 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 255, 102, 0.45)';
      this.ctx.lineWidth = 5;
      this.ctx.lineCap = 'round';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.invincibilityTimer > 0 ? '#00f0ff' : '#00ff66';
      
      this.ctx.beginPath();
      this.trail.forEach((pos, idx) => {
        const tx = pos.x * tileW + tileW/2;
        const ty = pos.y * tileH + tileH/2;
        if (idx === 0) this.ctx.moveTo(tx, ty);
        else this.ctx.lineTo(tx, ty);
      });
      this.ctx.lineTo(px, py);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 5. Draw Player Cycle
    this.ctx.save();
    this.ctx.translate(px, py);

    // Rotate player cycle triangle
    let pAngle = 0;
    if (this.direction === 'up') pAngle = -Math.PI/2;
    else if (this.direction === 'down') pAngle = Math.PI/2;
    else if (this.direction === 'left') pAngle = Math.PI;
    this.ctx.rotate(pAngle);

    // Flash when invincible
    if (this.invincibilityTimer <= 0 || Math.floor(Date.now() / 80) % 2 === 0) {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = this.invincibilityTimer > 0 ? '#00f0ff' : '#00ff66';

      this.ctx.fillStyle = '#00ff66';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      
      // Cycle Arrow
      this.ctx.beginPath();
      this.ctx.moveTo(tileW * 0.35, 0);
      this.ctx.lineTo(-tileW * 0.25, -tileH * 0.25);
      this.ctx.lineTo(-tileW * 0.1, 0);
      this.ctx.lineTo(-tileW * 0.25, tileH * 0.25);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }
    this.ctx.restore();

    // 6. Draw Particles
    this.ctx.save();
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    this.ctx.restore();

    // Draw Bullets
    if (this.bullets) {
      this.ctx.save();
      this.bullets.forEach(bullet => {
        const bx = (bullet.gridX + (bullet.targetGridX - bullet.gridX) * bullet.moveProgress) * tileW + tileW/2;
        const by = (bullet.gridY + (bullet.targetGridY - bullet.gridY) * bullet.moveProgress) * tileH + tileH/2;
        
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(bx, by, 4, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.restore();
    }

    // 7. Draw Floating Word Prompts on Corridors
    this.activePrompts.forEach(prompt => {
      const tx = prompt.gridX * tileW + tileW/2;
      const ty = prompt.gridY * tileH + tileH/2;
      
      this.ctx.save();
      this.ctx.font = `bold 13px ${this.app.themeColors.white ? 'var(--font-mono)' : 'monospace'}`;
      
      const word = prompt.word;
      const metrics = this.ctx.measureText(word);
      const textW = metrics.width;
      
      // Draw background panel box
      this.ctx.fillStyle = 'rgba(5, 1, 12, 0.85)';
      this.ctx.strokeStyle = prompt.isActive ? 'rgba(0, 255, 102, 0.9)' : 'rgba(0, 240, 255, 0.4)';
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowBlur = prompt.isActive ? 8 : 0;
      this.ctx.shadowColor = '#00ff66';
      
      const boxW = textW + 22;
      const boxH = 22;
      
      // Rounded panel rect
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(tx - boxW/2, ty - boxH/2 - 4, boxW, boxH, 4);
      } else {
        this.ctx.rect(tx - boxW/2, ty - boxH/2 - 4, boxW, boxH);
      }
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw Arrow pointing directory
      let arrow = "▲";
      if (prompt.direction === 'down') arrow = "▼";
      else if (prompt.direction === 'left') arrow = "◀";
      else if (prompt.direction === 'right') arrow = "▶";
      
      this.ctx.fillStyle = prompt.isActive ? '#00ff66' : 'rgba(0, 240, 255, 0.7)';
      this.ctx.fillText(arrow, tx - boxW/2 + 5, ty + 2);
      
      // Render text alignment
      const textX = tx - boxW/2 + 18;
      
      // Highlight matching buffer typed letters
      if (prompt.isActive && this.currentInput && word.startsWith(this.currentInput)) {
        const matchingPart = this.currentInput;
        const remainingPart = word.substring(this.currentInput.length);
        
        this.ctx.fillStyle = '#ffc400'; // typed gold highlight
        this.ctx.fillText(matchingPart, textX, ty + 2);
        
        const matchingWidth = this.ctx.measureText(matchingPart).width;
        this.ctx.fillStyle = '#8c7ba2'; // remaining grey letters
        this.ctx.fillText(remainingPart, textX + matchingWidth, ty + 2);
      } else {
        this.ctx.fillStyle = '#f5f0fa';
        this.ctx.fillText(word, textX, ty + 2);
      }
      this.ctx.restore();
    });
  }

  /* ==========================================================================
     HELPER METHODS & INPUT ENGINE
     ========================================================================== */
  isValidMove(gx, gy, dir) {
    let nx = gx;
    let ny = gy;
    if (dir === 'up') ny--;
    else if (dir === 'down') ny++;
    else if (dir === 'left') nx--;
    else if (dir === 'right') nx++;

    // Boundaries check
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) return false;
    
    // Wall cell check
    return this.grid[ny][nx] === 0;
  }

  resetDronesPositions() {
    const corners = [
      { x: 17, y: 1 },
      { x: 17, y: 13 },
      { x: 1, y: 13 },
      { x: 9, y: 7 }
    ];
    let validCorners = corners.filter(c => {
      const dist1 = Math.abs(c.x - this.gridX) + Math.abs(c.y - this.gridY);
      const dist2 = Math.abs(c.x - this.targetGridX) + Math.abs(c.y - this.targetGridY);
      return dist1 > 3 && dist2 > 3;
    });
    if (validCorners.length === 0) {
      validCorners = [...corners].sort((a, b) => {
        const distA = Math.abs(a.x - this.gridX) + Math.abs(a.y - this.gridY);
        const distB = Math.abs(b.x - this.gridX) + Math.abs(b.y - this.gridY);
        return distB - distA;
      });
    }
    const activeCorners = validCorners;
    this.drones.forEach((drone, idx) => {
      const pos = activeCorners[idx % activeCorners.length];
      drone.gridX = pos.x;
      drone.gridY = pos.y;
      drone.targetGridX = pos.x;
      drone.targetGridY = pos.y;
      drone.moveProgress = 0;
      drone.trail = [];
    });
  }

  spawnDataNode() {
    let attempts = 0;
    while (attempts < 100) {
      const rx = Math.floor(Math.random() * (this.cols - 2)) + 1;
      const ry = Math.floor(Math.random() * (this.rows - 2)) + 1;
      
      // Node must spawn on corridors and not directly on player cycle grid position
      if (this.grid[ry][rx] === 0 && (rx !== this.gridX || ry !== this.gridY)) {
        // Also check no node is already there
        const exists = this.dataNodes.some(n => n.gridX === rx && n.gridY === ry);
        if (!exists) {
          this.dataNodes.push({ gridX: rx, gridY: ry });
          return;
        }
      }
      attempts++;
    }
  }

  checkDataNodeCollisions() {
    for (let i = this.dataNodes.length - 1; i >= 0; i--) {
      const node = this.dataNodes[i];
      if (node.gridX === this.gridX && node.gridY === this.gridY) {
        this.dataNodes.splice(i, 1);
        this.score += 100;
        
        // Accumulate keystrokes reward
        this.correctKeystrokes += 5; 
        this.totalKeystrokes += 5;

        this.app.playSynthSound('commandComplete');

        // Spawn collect burst sparks
        const tileW = this.canvas.width / this.cols;
        const tileH = this.canvas.height / this.rows;
        const nx = node.gridX * tileW + tileW/2;
        const ny = node.gridY * tileH + tileH/2;
        
        if (this.app.particlesEnabled) {
          for (let k = 0; k < 12; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.15;
            this.particles.push({
              x: nx,
              y: ny,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 1.5 + Math.random() * 2,
              color: '#00ff66',
              alpha: 1.0,
              decay: 0.003
            });
          }
        }

        // Spawn a new data node
        this.spawnDataNode();
        this.updateHUD();
      }
    }
  }

  generatePrompts() {
    this.activePrompts = [];
    
    // Find valid exit directions from targetGridX, targetGridY (the next node we're reaching)
    const validDirs = ['up', 'down', 'left', 'right'].filter(dir => 
      this.isValidMove(this.targetGridX, this.targetGridY, dir)
    );

    // Prevent immediate reverse steering prompts (cycle cannot turn backwards directly unless stopped)
    const filteredDirs = validDirs.filter(dir => {
      if (this.gridX !== this.targetGridX || this.gridY !== this.targetGridY) {
        if (this.direction === 'up' && dir === 'down') return false;
        if (this.direction === 'down' && dir === 'up') return false;
        if (this.direction === 'left' && dir === 'right') return false;
        if (this.direction === 'right' && dir === 'left') return false;
      }
      return true;
    });

    if (filteredDirs.length === 0) return;

    if (this.app.sixSevenMode) {
      // Mapping rules for 6 7 mode: up/left gets '6 7', down/right gets '4 1', straight/boost gets '7 11'
      filteredDirs.forEach(dir => {
        let word = '7 11';
        if (dir !== this.direction) {
          if (dir === 'left' || dir === 'up') word = '6 7';
          else if (dir === 'right' || dir === 'down') word = '4 1';
        }
        
        // Find coordinates for this prompt floating text cell
        let px = this.targetGridX;
        let py = this.targetGridY;
        if (dir === 'up') py--;
        else if (dir === 'down') py++;
        else if (dir === 'left') px--;
        else if (dir === 'right') px++;

        this.activePrompts.push({
          direction: dir,
          word: word,
          gridX: px,
          gridY: py,
          isActive: false
        });
      });
    } else {
      // Standard mode - randomize cyberpunk words starting with distinct letters, straight gets 'boost'
      const chosenChars = new Set();
      filteredDirs.forEach(dir => {
        let word = '';
        if (dir === this.direction) {
          word = 'boost';
        } else {
          // Find a starting character not already used in this set of prompts
          const alphabet = Object.keys(this.wordsPool);
          let validChar = '';
          for (let i = 0; i < alphabet.length; i++) {
            const char = alphabet[i];
            if (char === 'b') continue; // reserve 'b' for 'boost'
            if (!chosenChars.has(char)) {
              validChar = char;
              chosenChars.add(char);
              break;
            }
          }

          const wordList = this.wordsPool[validChar || 'a'];
          word = wordList[Math.floor(Math.random() * wordList.length)];
        }

        let px = this.targetGridX;
        let py = this.targetGridY;
        if (dir === 'up') py--;
        else if (dir === 'down') py++;
        else if (dir === 'left') px--;
        else if (dir === 'right') px++;

        this.activePrompts.push({
          direction: dir,
          word: word,
          gridX: px,
          gridY: py,
          isActive: false
        });
      });
    }
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

    // Overlays inputs
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
      const allowedRegex = this.app.sixSevenMode ? /[a-zA-Z0-9 ]/ : /[a-zA-Z ]/;
      if (key.length === 1 && allowedRegex.test(key)) {
        this.processKeystroke(key.toLowerCase());
      }
    }
  }

  processKeystroke(char) {
    this.totalKeystrokes++;
    const testInput = this.currentInput + char;
    
    // Check if testInput is a prefix of "shoot"
    const isShootPrefix = "shoot".startsWith(testInput);
    
    // Check if testInput matches prefix of any active prompts
    const matchesPrefix = this.activePrompts.some(prompt => prompt.word.startsWith(testInput)) || isShootPrefix;
    
    if (matchesPrefix) {
      this.currentInput = testInput;
      this.correctKeystrokes++;
      this.app.playSynthSound('typeSuccess');

      // Update highlight activation status
      this.activePrompts.forEach(prompt => {
        prompt.isActive = prompt.word.startsWith(this.currentInput);
      });

      this.updateTypingUI();

      if (this.currentInput === "shoot") {
        this.currentInput = "";
        this.shootBullets();
        
        // De-highlight prompts
        this.activePrompts.forEach(p => p.isActive = false);
        this.updateTypingUI();
        return;
      }

      // Check if complete matches
      const completedPrompt = this.activePrompts.find(prompt => prompt.word === this.currentInput);
      if (completedPrompt) {
        // Execute steering turn
        this.bufferedDirection = completedPrompt.direction;
        this.currentInput = "";
        
        // If U-turn/straight boost
        if (completedPrompt.word === '7 11' || completedPrompt.word === 'boost' || completedPrompt.word === 'turbo') {
          this.boostTimer = 1000; // 1s boost speed
          this.autoMove = true;   // Go all the way forward!
        } else {
          this.autoMove = false;  // Only go 1 unit!
        }

        // De-highlight prompts
        this.activePrompts.forEach(p => p.isActive = false);
        this.updateTypingUI();
      }
    } else {
      // Typo lockout buffer reset
      this.currentInput = "";
      this.activePrompts.forEach(p => p.isActive = false);
      this.app.playSynthSound('fail');
      this.triggerBufferErrorFeedback();
    }
  }

  shootBullets() {
    const directions = ['up', 'down', 'left', 'right'];
    directions.forEach(dir => {
      this.bullets.push({
        gridX: this.gridX,
        gridY: this.gridY,
        targetGridX: this.gridX,
        targetGridY: this.gridY,
        moveProgress: 0,
        direction: dir,
        speed: 0.008
      });
    });
    this.app.playSynthSound('laser');
  }

  /* Overlay typing guides */
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
          if (completed === 'start') this.start();
          else if (completed === 'restart') this.reset();
          else if (completed === 'resume') this.togglePause();
          else if (completed === 'exit') this.exitToMenu();
        }
      } else {
        this.overlayInput = "";
        this.app.playSynthSound('fail');
        this.updateOverlayTargetHint(overlayType);
      }
    }
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

  triggerBufferErrorFeedback() {
    const wrapper = document.querySelector('.input-display-wrapper');
    const feedback = document.getElementById('typing-feedback');
    if (!wrapper || !feedback) return;

    wrapper.classList.add('shake');
    feedback.className = 'feedback-text error';
    feedback.innerText = 'STEERING ERROR // SYSTEM RESET';
    document.getElementById('typing-buffer').innerText = "";

    setTimeout(() => {
      wrapper.classList.remove('shake');
    }, 250);

    this.updateTypingUI();
  }

  /* HUD UI updates */
  updateHUD() {
    document.getElementById('hud-score').innerText = String(this.score).padStart(6, '0');
    
    const min = Math.floor(this.timer / 60);
    const sec = this.timer % 60;
    document.getElementById('hud-timer').innerText = `${min}:${String(sec).padStart(2, '0')}`;
    
    const container = document.getElementById('hud-shields');
    if (container) {
      container.innerHTML = "";
      for (let i = 0; i < 5; i++) {
        const cell = document.createElement('span');
        cell.className = `shield-cell ${i < this.shields ? 'active' : ''}`;
        if (i < this.shields && this.shields === 1) {
          cell.style.background = 'var(--color-neon-magenta)';
          cell.style.boxShadow = 'var(--glow-magenta)';
        } else if (i < this.shields) {
          cell.style.background = 'var(--color-neon-green)';
          cell.style.boxShadow = 'var(--glow-green)';
        }
        container.appendChild(cell);
      }
    }
  }

  updateTypingUI() {
    document.getElementById('typing-buffer').innerText = this.currentInput;
    document.getElementById('typing-feedback').className = 'feedback-text';
    document.getElementById('typing-feedback').innerText = this.currentInput ? 'LOCK ON INTERSECTION STEER...' : 'AWAITING MAIN INTERSECTION TURN...';
  }

  triggerScreenShake() {
    const cabinet = document.querySelector('.cabinet-screen');
    if (cabinet) {
      cabinet.classList.add('shake');
      setTimeout(() => {
        cabinet.classList.remove('shake');
      }, 300);
    }
  }

  toggleOverlay(id, show) {
    const el = document.getElementById(id);
    if (el) {
      if (show) el.classList.add('active');
      else el.classList.remove('active');
    }
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }
}
