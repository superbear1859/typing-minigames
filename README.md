# NEON GRID // Cyberpunk Typing Arcade

An interactive, premium single-page retro-futuristic typing arcade game suite built with vanilla web technologies: HTML5, CSS3, and JavaScript.

![Typing Arcade Preview](https://img.shields.io/badge/Aesthetics-Synthwave%20%2F%20Cyberpunk-ff007f)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%2F%20CSS3%20%2F%20Vanilla%20JS-00f0ff)
![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API%20Synth-ffc400)

## 🎮 How to Play

1. Clone or download this repository.
2. Open [index.html](file:///Users/teddy/Documents/github/typing-mini-games/index.html) in any modern web browser (Chrome, Firefox, Safari, or Edge).
3. Select the **LANE_SWITCHER.EXE** program from the dashboard.
4. Type `start` to boot the highway grid.

## 🚀 Game Controls & Words to Type

The game uses a **highly responsive keystroke buffer parser**. To control the vehicle, simply type the letters of the action words. The keys you type will highlight in real-time. No spacebar or enter key is required!

### 🚙 Gameplay Commands
- **`left`** : Switch one lane to the left.
- **`right`** : Switch one lane to the right.
- **`spin`** : Trigger a **0.7-second spin** move. Spinning makes the car invulnerable and immediately destroys any data obstacles in your path.

### 🖥️ Overlay Controls
- **`start`** : Boot the grid from the main start screen.
- **`resume`** : Resume from the pause menu.
- **`restart`** : Reboot the system after a crash (Game Over).
- **`exit`** : Terminate the game and return to the main dashboard.
- **`[ESC]`** : Press the Escape key at any time to pause the game.

## ⚡ Technical Highlights

- **Web Audio Synth Engine**: Satisfying retro synth sound effects (keypress bleeps, laser command triggers, error alerts, explosion rumbles, and boot-up chords) generated dynamically in real-time using the **Web Audio API**. No external file downloads are required.
- **Pseudo-3D Canvas Engine**: A high-performance horizontal road renderer with scrolling grids, scaling obstacles, responsive car movement interpolation, and neon particle spark dynamics operating at 60fps.
- **Persistent Flight Logs**: A dashboard leaderboard that tracks and saves your high scores, gameplay runs, and peak typing velocity (Words Per Minute) in the browser's `localStorage`.
- **Cyberpunk UI**: Sleek glassmorphism panels, moving visual grid backgrounds, retro CRT scanline overlays, neon glows, and custom typography (using Google Fonts `Orbitron`, `Share Tech Mono`, and `Rajdhani`).

## 📁 Architecture Files

- **[index.html](file:///Users/teddy/Documents/github/typing-mini-games/index.html)**: Main HTML document containing dashboard views, game screens, HUD panels, and overlay containers.
- **[styles.css](file:///Users/teddy/Documents/github/typing-mini-games/styles.css)**: Neon theme stylesheet with custom variables, layout grids, animations (pulse, shake, damage flash, CRT flickers), and settings controls.
- **[app.js](file:///Users/teddy/Documents/github/typing-mini-games/app.js)**: Dashboard state manager, high score local persistence, and browser sound synthesizer.
- **[laneSwitcher.js](file:///Users/teddy/Documents/github/typing-mini-games/laneSwitcher.js)**: Interactive 5-lane highway game loop module, physics collision system, and letter-by-letter command validation stream.