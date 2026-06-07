# NEON GRID // Cyberpunk Typing Arcade

An interactive, premium single-page retro-futuristic typing arcade game suite built with vanilla web technologies: HTML5, CSS3, and JavaScript.

![Typing Arcade Preview](https://img.shields.io/badge/Aesthetics-Synthwave%20%2F%20Cyberpunk-ff007f)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2F%20CSS3%20%2F%20Vanilla%20JS-00f0ff)
![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API%20Synth-ffc400)

## 🎮 How to Play

1. Clone or download this repository.
2. Open [index.html](file:///Users/teddy/Documents/github/typing-minigames/index.html) in any modern web browser (Chrome, Firefox, Safari, or Edge).
3. Select your desired program from the dashboard and click **BOOT GAME**.
4. Type `start` to boot the system core.

---

## 🕹️ Game Suite Programs

The arcade features four distinct typing minigames:

### 1. LANE_SWITCHER.EXE (Highway Navigation)
* **Description**: Navigate a 5-lane high-speed highway. Dodge orange grid security blocks.
* **Typing Commands**:
  - `left` : Switch one lane to the left.
  - `right` : Switch one lane to the right.
  - `spin` : Trigger a 0.5s spin move to gain invulnerability and destroy blocks in your path.
* **Goal**: Survive the 5-minute window and maximize score points.

### 2. WORD_DEFENDER.BIN (Space Shooter)
* **Description**: Retro Space Invaders style defense game. Network words drift from outer space; target and shoot them down using lasers before they breach your thermal shields.
* **Typing Commands**: Type the actual letters of descending words to lock onto them and shoot.
* **Goal**: Defend your space core sector from breach.

### 3. CYBER_DRIFT.SYS (Velocity Racer)
* **Description**: High-speed, top-down racing test of pure typing speed. Drift through gates on a winding neon highway and charge up your streak for TURBO BOOST mode.
* **Typing Commands**: Type the actual word displayed on drift gates to drift the car into the open lane.
* **Goal**: Complete race segments, avoid side rails, and maximize WPM.

### 4. CYBER_CORE.EXE (Orbital Core Defense)
* **Description**: Concentric shield turret defense. Network threats converge on your central core from 360 degrees. Aim and discharge high-power energy beams to incinerate them.
* **Typing Commands**: Type the word of approaching threat nodes to lock core aim and fire lasers.
* **Goal**: Prevent network threat nodes from penetrating rotating orbital shield segments.

---

## ⚡ Technical Highlights

- **Keystroke Buffer Parser**: Highly responsive typing detection. Typo lockouts are implemented to penalize mistakes and encourage precision. No spacebar or enter key is required!
- **Web Audio Synth Engine**: Satisfying retro synth sound effects (keypress bleeps, laser command triggers, error alerts, explosion rumbles, and boot-up chords) generated dynamically in real-time using the **Web Audio API**. No external file downloads are required.
- **Concentric & Pseudo-3D Canvas Engines**: Custom-tailored rendering engines for winding highways, vertical starfields, and 360-degree radar coordinates.
- **Persistent Flight Logs**: A dashboard leaderboard that tracks and saves your high scores, gameplay runs, and peak typing velocity (Words Per Minute) in the browser's `localStorage`.
- **Cyberpunk UI**: Sleek glassmorphism panels, moving visual grid backgrounds, retro CRT scanline overlays, neon glows, and custom typography (using Google Fonts `Orbitron`, `Share Tech Mono`, and `Rajdhani`).

---

## 📁 Architecture Files

- **[index.html](file:///Users/teddy/Documents/github/typing-minigames/index.html)**: Main HTML document containing dashboard views, game screens, HUD panels, and overlay containers.
- **[styles.css](file:///Users/teddy/Documents/github/typing-minigames/styles.css)**: Neon theme stylesheet with custom variables, layout grids, animations (pulse, shake, damage flash, CRT flickers), and settings controls.
- **[app.js](file:///Users/teddy/Documents/github/typing-minigames/app.js)**: Dashboard state manager, high score local persistence, and browser sound synthesizer.
- **[laneSwitcher.js](file:///Users/teddy/Documents/github/typing-minigames/laneSwitcher.js)**: Interactive 5-lane highway game loop module, physics collision system, and letter-by-letter command validation stream.
- **[wordDefender.js](file:///Users/teddy/Documents/github/typing-minigames/wordDefender.js)**: Falling space word shooter engine with missile targeting math and particle physics.
- **[cyberDrift.js](file:///Users/teddy/Documents/github/typing-minigames/cyberDrift.js)**: Procedural winding road racer with gates spawning logic, streak dynamics, and speed scaling.
- **[cyberCore.js](file:///Users/teddy/Documents/github/typing-minigames/cyberCore.js)**: Radar core defense engine with 360-degree turret tracking, segmented rotating orbits, and laser firing beams.