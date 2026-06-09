/* ==========================================
   TYPE FIGHTER II: CORE GAME ENGINE
   ========================================== */

// --- Game Settings & Configurations ---
const CONFIG = {
  playerStartHP: 20,
  enemyStartHP: 20,
  superLimit: 10, // 10 correct keys to fill Super Meter
  difficulty: {
    easy: { timeLimit: 2600, label: "EASY" },
    medium: { timeLimit: 1700, label: "MEDIUM" },
    hard: { timeLimit: 1100, label: "HARD" }
  }
};

// --- Game State Object ---
const state = {
  current: 'start', // 'start', 'round_intro', 'fight', 'ko', 'game_over'
  difficulty: 'easy',
  timeLimit: CONFIG.difficulty.easy.timeLimit,
  score: 0,
  round: 1,
  playerWins: 0,
  enemyWins: 0,
  
  // Game metrics for stats
  correctKeys: 0,
  totalKeystrokes: 0,
  maxCombo: 0,
  currentCombo: 0,
  startTime: 0,
  fightDuration: 0,
  
  // Typing state
  targetLetter: 'A',
  letterTimer: 0, // goes from timeLimit down to 0
  lastTime: 0,
  
  // Audio state
  isMuted: false
};

// --- Elements References ---
const el = {
  viewport: document.getElementById('game-viewport'),
  canvas: document.getElementById('game-canvas'),
  playerHealthFill: document.getElementById('player-health-fill'),
  playerHealthYellow: document.getElementById('player-health-yellow'),
  enemyHealthFill: document.getElementById('enemy-health-fill'),
  enemyHealthYellow: document.getElementById('enemy-health-yellow'),
  timerDisplay: document.getElementById('timer-display'),
  currentRoundNum: document.getElementById('current-round-num'),
  playerWinsContainer: document.getElementById('player-wins'),
  enemyWinsContainer: document.getElementById('enemy-wins'),
  targetLetter: document.getElementById('target-letter'),
  timerProgress: document.getElementById('timer-progress'),
  superBarFill: document.getElementById('super-bar-fill'),
  superText: document.getElementById('super-text'),
  superPrompt: document.getElementById('super-prompt'),
  feedbackMsg: document.getElementById('feedback-message'),
  comboDisplay: document.getElementById('combo-display'),
  comboCount: document.getElementById('combo-count'),
  announcerBanner: document.getElementById('announcer-banner'),
  hitFlash: document.getElementById('hit-flash'),
  muteBtn: document.getElementById('mute-btn'),
  
  // Screens
  startScreen: document.getElementById('start-screen'),
  gameOverScreen: document.getElementById('game-over-screen'),
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverReason: document.getElementById('game-over-reason'),
  
  // Stats
  statAccuracy: document.getElementById('stat-accuracy'),
  statMaxCombo: document.getElementById('stat-max-combo'),
  statKpm: document.getElementById('stat-kpm'),
  
  // Difficulty buttons
  diffBtns: document.querySelectorAll('.difficulty-btn')
};

// --- Web Audio Synthesizer (Retro Arcade Sound Effects) ---
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    audioCtx = new AudioContext();
  }
}

function playSound(type) {
  if (state.isMuted) return;
  initAudio();
  if (!audioCtx || audioCtx.state === 'suspended') {
    // Resume context if suspended (browser security)
    audioCtx?.resume();
    if (!audioCtx || audioCtx.state === 'suspended') return;
  }

  const now = audioCtx.currentTime;

  switch (type) {
    case 'click': {
      // High-pitched coin/click sound
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }
    
    case 'punch': {
      // Retro punch hit: white noise burst + frequency drop
      const bufferSize = audioCtx.sampleRate * 0.12; // 0.12 seconds
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
      
      // Add a low triangle thump
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }
    
    case 'hurt': {
      // Deeper, crunchier impact sound
      const bufferSize = audioCtx.sampleRate * 0.15;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
      
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.15);
      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }

    case 'miss': {
      // Incorrect feedback: harsh downward pitch buzz
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }
    
    case 'super_charge': {
      // High rising sci-fi laser-like synth charge
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
    
    case 'super_release': {
      // Massive explosion with high frequency sweeps
      const osc = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(300, now);
      osc2.frequency.linearRampToValueAtTime(40, now + 0.5);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.5);
      osc2.stop(now + 0.5);
      
      // Noise component for explosive texture
      const bufferSize = audioCtx.sampleRate * 0.5;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(now);
      break;
    }
    
    case 'bell': {
      // Arcade Round start bell
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now); // A5
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
      break;
    }
    
    case 'win': {
      // Happy upbeat arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const time = now + index * 0.1;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
      });
      break;
    }
    
    case 'lose': {
      // Sad downward minor arpeggio
      const notes = [392.00, 311.13, 261.63, 196.00]; // G4, Eb4, C4, G3
      notes.forEach((freq, index) => {
        const time = now + index * 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.35);
      });
      break;
    }
  }
}

// --- Fighter Class Definition (Procedural Sprite System) ---
class Fighter {
  constructor(isPlayer, x, y) {
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = y; // Ground level baseline
    this.direction = isPlayer ? 1 : -1;
    this.hp = isPlayer ? CONFIG.playerStartHP : CONFIG.enemyStartHP;
    this.maxHp = isPlayer ? CONFIG.playerStartHP : CONFIG.enemyStartHP;
    this.specialBar = 0; // Only relevant for player
    
    this.state = 'idle'; // 'idle', 'punch', 'super', 'hurt', 'ko', 'win'
    this.stateTimer = 0;
    this.stateDuration = 0;
    
    // Size configuration
    this.gridScale = 4.5; // size of 1 procedural pixel block
    
    // Floating damage markers local to fighter
    this.damageMarker = null;
    this.damageMarkerTimer = 0;
    this.damageMarkerText = "";
  }

  changeState(newState, duration = 0) {
    this.state = newState;
    this.stateTimer = 0;
    this.stateDuration = duration;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.damageMarker = { yOffset: 0, opacity: 1 };
    this.damageMarkerText = `-${amount}`;
    this.damageMarkerTimer = 25;
    
    if (this.hp <= 0) {
      this.changeState('ko');
    } else {
      this.changeState('hurt', 15);
    }
  }

  update() {
    this.stateTimer++;
    
    if (this.stateDuration > 0 && this.stateTimer >= this.stateDuration) {
      if (this.state === 'ko') {
        // Stay in KO state
      } else {
        this.changeState('idle');
      }
    }
    
    // Update local damage indicator
    if (this.damageMarkerTimer > 0) {
      this.damageMarkerTimer--;
      this.damageMarker.yOffset -= 1.2;
      this.damageMarker.opacity = this.damageMarkerTimer / 25;
      if (this.damageMarkerTimer === 0) {
        this.damageMarker = null;
      }
    }
  }

  draw(ctx, tick) {
    const scale = this.gridScale;
    let bob = 0;
    let leanForward = 0;
    let slideX = 0;
    let angle = 0;
    
    // Save context to make flipping directions and transformations easy
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.direction, 1);
    
    // Determine dynamic transformations based on animations
    if (this.state === 'idle') {
      bob = Math.sin(tick * 0.12) * 2.5; // Idle breathing bob
    } 
    else if (this.state === 'punch') {
      // Lunge forward during punch
      const prog = this.stateTimer / this.stateDuration;
      slideX = Math.sin(prog * Math.PI) * 45;
      leanForward = Math.sin(prog * Math.PI) * 0.12;
    } 
    else if (this.state === 'super') {
      const prog = this.stateTimer / this.stateDuration;
      if (prog < 0.5) {
        // Charging phase: Lean back
        slideX = -Math.sin(prog * 2 * Math.PI * 0.5) * 20;
        leanForward = -Math.sin(prog * 2 * Math.PI * 0.5) * 0.08;
      } else {
        // Thrust phase: Lunge far forward
        slideX = Math.sin((prog - 0.5) * 2 * Math.PI * 0.5) * 60;
        leanForward = Math.sin((prog - 0.5) * 2 * Math.PI * 0.5) * 0.2;
      }
    } 
    else if (this.state === 'hurt') {
      // Fly back and tilt when hit
      const prog = this.stateTimer / this.stateDuration;
      slideX = -Math.sin(prog * Math.PI) * 25;
      angle = -Math.sin(prog * Math.PI) * 0.15;
    } 
    else if (this.state === 'ko') {
      // Rotated and fallen flat on the ground
      const prog = Math.min(1.0, this.stateTimer / 30);
      slideX = -prog * 45;
      angle = -prog * Math.PI * 0.45;
      bob = prog * 20; // drop down closer to floor
    }
    else if (this.state === 'win') {
      // Chest high, slight bob
      bob = Math.sin(tick * 0.08) * 1.5 - 2;
    }

    ctx.translate(slideX, bob);
    ctx.rotate(angle);

    // DRAW BASE SHADOW
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 28 * scale, 5 * scale, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Define palettes
    const palette = this.isPlayer 
      ? {
          gi: '#ffffff',
          giDark: '#dcdde1',
          skin: '#fedca3',
          skinShadow: '#e4b785',
          hair: '#2c1a11',
          headband: '#d63031',
          belt: '#2f3640',
          trim: '#00f0ff' // Blue aura
        }
      : {
          gi: '#1c152a',
          giDark: '#0b0813',
          skin: '#3e3752',
          skinShadow: '#221c33',
          hair: '#f1f2f6',
          headband: '#ff0055',
          belt: '#ff0055',
          trim: '#ff007f' // Pink/Red aura
        };

    // Helper function to draw pixel boxes relative to character base center (0, 0)
    // 0 is character center horizontal, -120 is top of head
    const drawBlock = (gx, gy, gw, gh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(gx * scale, gy * scale, gw * scale, gh * scale);
    };

    // Draw Aura sparks if in Super charge phase or full
    if (this.isPlayer && this.state === 'super' && this.stateTimer < 20) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = palette.trim;
    }

    // --- PROCEDURAL CHARACTER MODEL DRAWING ---

    // 1. BACK LEG
    if (this.state === 'ko') {
      drawBlock(-18, -4, 12, 4, palette.giDark);
      drawBlock(-24, -4, 6, 4, palette.skin); // foot
    } else if (this.state === 'punch') {
      // Straightened back leg
      drawBlock(-16, -14, 8, 12, palette.giDark);
      drawBlock(-20, -2, 6, 4, palette.skin);
    } else {
      // Stance leg
      drawBlock(-12, -16, 6, 14, palette.giDark);
      drawBlock(-14, -2, 6, 4, palette.skin);
    }

    // 2. FRONT LEG
    if (this.state === 'ko') {
      drawBlock(-14, -8, 14, 4, palette.gi);
      drawBlock(-20, -8, 6, 4, palette.skin);
    } else if (this.state === 'punch') {
      // Lunging front leg
      drawBlock(-4, -14, 10, 10, palette.gi);
      drawBlock(-2, -4, 6, 6, palette.skin);
    } else {
      drawBlock(2, -16, 6, 14, palette.gi);
      drawBlock(4, -2, 6, 4, palette.skin);
    }

    // 3. TORSO (GI JACKET)
    if (this.state === 'ko') {
      drawBlock(-10, -20, 16, 12, palette.gi);
      drawBlock(-12, -16, 2, 6, palette.belt); // belt knot
    } else {
      // Normal standing or lunging torso
      ctx.save();
      ctx.translate(0, -16);
      ctx.scale(1, 1 - leanForward);
      drawBlock(-7, -18, 13, 18, palette.gi);
      
      // Gi collars (V neck)
      drawBlock(-3, -18, 2, 8, palette.skinShadow);
      
      // Belt
      drawBlock(-8, -4, 15, 3, palette.belt);
      // Belt ends hanging down
      drawBlock(-4, -1, 2, 7, palette.belt);
      drawBlock(-2, -1, 2, 5, palette.belt);
      ctx.restore();
    }

    // 4. HEAD (Skin, Hair, Headband)
    ctx.save();
    let headY = -34;
    let headX = -4;
    if (this.state === 'ko') {
      headX = -18;
      headY = -22;
    } else if (this.state === 'punch') {
      headX = 2; // Head lunges slightly forward
    } else if (this.state === 'super' && this.stateTimer < 20) {
      headX = -6; // Leans back
    }
    ctx.translate(headX * scale, headY * scale);

    // Face / Head block
    drawBlock(0, 0, 7, 7, palette.skin);
    drawBlock(1, 5, 5, 2, palette.skinShadow); // Chin shadow

    // Eyes
    if (this.isPlayer) {
      drawBlock(4, 2, 2, 1, '#111'); // Player eyes
    } else {
      // Enemy: Glowing Red Eyes!
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff0033';
      drawBlock(3, 2, 3, 1, '#ff0033');
      ctx.shadowBlur = 0;
    }

    // Hair
    drawBlock(-1, -3, 9, 3, palette.hair); // Top hair
    drawBlock(-1, 0, 2, 5, palette.hair); // Sideburn back
    drawBlock(6, -1, 2, 3, palette.hair); // Bangs

    // Headband
    drawBlock(-1, 1, 9, 1.5, palette.headband);
    if (!this.isPlayer) {
      // Draw glowing shadow crown/headband
      ctx.shadowBlur = 4;
      ctx.shadowColor = palette.headband;
      drawBlock(-1, 1, 9, 1.5, palette.headband);
      ctx.shadowBlur = 0;
    }

    // Waving Headband Tails behind head
    if (this.state !== 'ko') {
      const wave = Math.sin(tick * 0.15) * 2.5;
      drawBlock(-3, 1 + (wave * 0.1), 2, 2, palette.headband);
      drawBlock(-5, 2.5 + (wave * 0.2), 2, 1.5, palette.headband);
    }
    ctx.restore();

    // 5. ARMS & FISTS
    if (this.state === 'ko') {
      // Flung down arm
      drawBlock(-6, -18, 4, 10, palette.giDark);
      drawBlock(-6, -8, 3, 3, palette.skin);
    } 
    else if (this.state === 'punch') {
      // Extended striking front arm
      drawBlock(0, -32, 16, 5, palette.gi);
      drawBlock(16, -32, 4, 4, palette.skin); // Fist

      // Back arm retracted to hip
      drawBlock(-10, -22, 5, 5, palette.giDark);
      drawBlock(-12, -21, 3, 3, palette.skinShadow);
    } 
    else if (this.state === 'super') {
      const prog = this.stateTimer / this.stateDuration;
      if (prog < 0.5) {
        // Charging phase: Hands cupped at hips
        drawBlock(-8, -22, 6, 6, palette.giDark);
        drawBlock(-4, -22, 6, 6, palette.gi);
        drawBlock(-2, -20, 4, 4, palette.skin); // cupped hands
        
        // Energy sparks around hands
        ctx.fillStyle = palette.trim;
        const sparkR = (10 + Math.sin(tick * 0.4) * 5) * scale;
        ctx.beginPath();
        ctx.arc(-2 * scale, -18 * scale, sparkR, 0, 2*Math.PI);
        ctx.strokeStyle = palette.trim;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Release phase: Arms thrust forward!
        drawBlock(0, -29, 15, 5, palette.gi);
        drawBlock(0, -24, 15, 5, palette.giDark);
        drawBlock(15, -28, 4, 6, palette.skin); // Thrust hands
        
        // Aura flare at hands
        ctx.fillStyle = palette.trim;
        ctx.fillRect(17 * scale, -32 * scale, 3 * scale, 12 * scale);
      }
    } 
    else if (this.state === 'hurt') {
      // Flung arms in defensive/hurt reaction
      drawBlock(-10, -32, 6, 6, palette.giDark);
      drawBlock(-12, -28, 4, 4, palette.skinShadow);
      drawBlock(-6, -26, 5, 8, palette.gi);
      drawBlock(-4, -18, 4, 4, palette.skin);
    }
    else if (this.state === 'win') {
      // Raised fist in victory
      drawBlock(-5, -28, 5, 5, palette.gi); // left guard
      
      // Right arm raised high
      drawBlock(2, -34, 4, 8, palette.gi);
      drawBlock(2, -40, 4, 6, palette.skin);
    }
    else {
      // Standard Idle guard arms
      // Front Guard arm
      drawBlock(1, -26, 6, 5, palette.gi);
      drawBlock(4, -29, 4, 4, palette.skin); // Front Fist

      // Back Guard arm
      drawBlock(-5, -28, 5, 5, palette.giDark);
      drawBlock(-5, -31, 4, 4, palette.skinShadow); // Back Fist
    }

    ctx.restore(); // Restore directional matrices
    ctx.shadowBlur = 0; // Clear shadow properties

    // DRAW FLOATING DAMAGE MARKER LOCAL TO FIGHTER
    if (this.damageMarker) {
      ctx.save();
      ctx.font = `bold 18px ${CONFIG.fontArcade || "'Press Start 2P'"}`;
      ctx.fillStyle = `rgba(255, 50, 50, ${this.damageMarker.opacity})`;
      ctx.strokeStyle = `rgba(0, 0, 0, ${this.damageMarker.opacity})`;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      
      const mx = this.x;
      const my = this.y - 120 + this.damageMarker.yOffset;
      ctx.strokeText(this.damageMarkerText, mx, my);
      ctx.fillText(this.damageMarkerText, mx, my);
      ctx.restore();
    }
  }
}

// --- Particles System ---
let particles = [];

function spawnSparks(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      type: 'spark',
      x: x,
      y: y,
      vx: (Math.random() * 8 - 4) * 1.5,
      vy: (Math.random() * 8 - 6) * 1.5,
      radius: Math.random() * 3 + 2,
      color: color,
      life: 1.0,
      decay: Math.random() * 0.05 + 0.04
    });
  }
}

// Fireball Projectile
class Fireball {
  constructor(x, y, vx, color, owner) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.radius = 16;
    this.color = color;
    this.owner = owner; // 'player' or 'enemy'
    this.life = 0;
  }

  update() {
    this.x += this.vx;
    this.life++;
    
    // Spawn trail particles
    if (Math.random() < 0.6) {
      particles.push({
        type: 'spark',
        x: this.x - this.vx * 0.5,
        y: this.y + (Math.random() * 12 - 6),
        vx: -this.vx * 0.2 + (Math.random() * 2 - 1),
        vy: Math.random() * 4 - 2,
        radius: Math.random() * 3 + 2,
        color: this.color,
        life: 0.8,
        decay: 0.06
      });
    }
  }

  draw(ctx, tick) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    
    // Core energy ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
    ctx.fill();
    
    // Outer flame details
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - this.vx*0.3, this.y, this.radius * 1.1, 0, 2*Math.PI);
    ctx.fill();
    
    // Glowing retro circular details
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.7 + Math.sin(tick * 0.4) * 2, 0, 2*Math.PI);
    ctx.stroke();
    
    ctx.restore();
  }
}

// Cherry Blossom Petals (Dojo Background Atmosphere)
class Petal {
  constructor() {
    this.reset();
    this.y = Math.random() * 250; // Random starting height
  }

  reset() {
    this.x = -20 - Math.random() * 100; // Start offscreen left
    this.y = -20;
    this.vx = Math.random() * 1.2 + 0.8;
    this.vy = Math.random() * 0.8 + 0.5;
    this.size = Math.random() * 3 + 2.5;
    this.swingSpeed = Math.random() * 0.03 + 0.01;
    this.swingRange = Math.random() * 15 + 10;
    this.swingOffset = Math.random() * Math.PI;
  }

  update(tick) {
    this.x += this.vx;
    this.y += this.vy;
    
    // Swaying movement
    const sway = Math.sin(tick * this.swingSpeed + this.swingOffset) * 0.3;
    this.x += sway;
    
    // Reset if offscreen right/bottom
    if (this.x > 980 || this.y > 440) {
      this.reset();
    }
  }

  draw(ctx) {
    ctx.fillStyle = 'rgba(255, 183, 197, 0.75)'; // Cherry blossom pink
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// Text Particle System
class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.vy = -1.5;
    this.life = 1.0;
    this.decay = 0.035;
  }

  update() {
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.font = "bold 13px 'Press Start 2P', monospace";
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.5;
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Initialize Fighters and backgrounds
let playerFighter = null;
let enemyFighter = null;
let activeFireballs = [];
let atmosphericPetals = [];
let floatingTexts = [];

function initGameWorld() {
  playerFighter = new Fighter(true, 240, 310);
  enemyFighter = new Fighter(false, 720, 310);
  activeFireballs = [];
  floatingTexts = [];
  
  // Initialize cherry blossom petals
  atmosphericPetals = [];
  for (let i = 0; i < 20; i++) {
    atmosphericPetals.push(new Petal());
  }
}

// --- Typing Target Generation ---
// Avoid using the same letter consecutively
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function getNewTargetLetter() {
  let nextLetter;
  do {
    nextLetter = letters[Math.floor(Math.random() * letters.length)];
  } while (nextLetter === state.targetLetter);
  
  state.targetLetter = nextLetter;
  state.letterTimer = state.timeLimit;
  el.targetLetter.textContent = state.targetLetter;
}

// Update health bar DOM displays
function updateHUD() {
  // Player Health Fill calculation
  const playerPercent = (playerFighter.hp / playerFighter.maxHp) * 100;
  el.playerHealthFill.style.width = `${playerPercent}%`;
  setTimeout(() => {
    el.playerHealthYellow.style.width = `${playerPercent}%`;
  }, 100);
  
  // Critical flashing color if low HP
  if (playerPercent <= 25) {
    el.playerHealthFill.classList.add('health-critical');
  } else {
    el.playerHealthFill.classList.remove('health-critical');
  }

  // Enemy Health Fill calculation
  const enemyPercent = (enemyFighter.hp / enemyFighter.maxHp) * 100;
  el.enemyHealthFill.style.width = `${enemyPercent}%`;
  setTimeout(() => {
    el.enemyHealthYellow.style.width = `${enemyPercent}%`;
  }, 100);
  
  if (enemyPercent <= 25) {
    el.enemyHealthFill.classList.add('health-critical');
  } else {
    el.enemyHealthFill.classList.remove('health-critical');
  }

  // Super Gauge update (10 units capacity)
  const superPercent = (playerFighter.specialBar / CONFIG.superLimit) * 100;
  el.superBarFill.style.width = `${superPercent}%`;
  el.superText.textContent = `${Math.floor(superPercent)}%`;
  
  if (playerFighter.specialBar >= CONFIG.superLimit) {
    el.superBarFill.classList.add('full');
    el.superPrompt.classList.remove('hidden');
    el.feedbackMsg.textContent = "SUPER CHARGED! PRESS [SPACEBAR]";
    el.feedbackMsg.style.color = "var(--neon-yellow)";
  } else {
    el.superBarFill.classList.remove('full');
    el.superPrompt.classList.add('hidden');
    el.feedbackMsg.style.color = "";
  }
  
  // Update Win dots
  el.playerWinsContainer.innerHTML = '';
  for (let i = 0; i < state.playerWins; i++) {
    el.playerWinsContainer.innerHTML += '<span class="win-dots won"></span>';
  }
  el.enemyWinsContainer.innerHTML = '';
  for (let i = 0; i < state.enemyWins; i++) {
    el.enemyWinsContainer.innerHTML += '<span class="win-dots won"></span>';
  }
}

// --- Screen Shake & Flash FX Trigger ---
function triggerScreenShake() {
  el.viewport.classList.add('shake');
  setTimeout(() => {
    el.viewport.classList.remove('shake');
  }, 250);
}

function triggerHitFlash(isRed = false) {
  const flashClass = isRed ? 'red-flash' : 'flash';
  el.hitFlash.classList.add(flashClass);
  setTimeout(() => {
    el.hitFlash.classList.remove(flashClass);
  }, 150);
}

// --- Round Progression Engine ---
function announce(text, duration, callback, isFightState = false) {
  el.announcerBanner.textContent = text;
  el.announcerBanner.classList.add('show-banner');
  if (isFightState) {
    el.announcerBanner.classList.add('fight-state');
  } else {
    el.announcerBanner.classList.remove('fight-state');
  }
  
  setTimeout(() => {
    el.announcerBanner.classList.remove('show-banner');
    el.announcerBanner.classList.remove('fight-state');
    if (callback) callback();
  }, duration);
}

function startRound() {
  state.current = 'round_intro';
  initGameWorld();
  updateHUD();
  
  el.currentRoundNum.textContent = state.round;
  el.timerDisplay.textContent = "99";
  el.comboDisplay.classList.add('hidden');
  
  playSound('bell');
  announce(`ROUND ${state.round}`, 1500, () => {
    playSound('bell');
    announce('FIGHT!', 800, () => {
      // Start actual typing fight state
      state.current = 'fight';
      state.startTime = performance.now();
      getNewTargetLetter();
    }, true);
  });
}

function checkRoundEnd() {
  if (playerFighter.hp <= 0 || enemyFighter.hp <= 0) {
    state.current = 'ko';
    
    // Slow down typing display
    el.targetLetter.textContent = "-";
    el.feedbackMsg.textContent = "K.O.";
    
    playSound('bell');
    announce('K.O.', 2200, () => {
      if (playerFighter.hp <= 0) {
        state.enemyWins++;
        enemyFighter.changeState('win');
        playSound('lose');
      } else {
        state.playerWins++;
        playerFighter.changeState('win');
        playSound('win');
      }
      
      updateHUD();
      
      setTimeout(() => {
        // Check match victory (best of 3, meaning 2 round wins)
        if (state.playerWins >= 2 || state.enemyWins >= 2) {
          endMatch();
        } else {
          // Progress to next round
          state.round++;
          startRound();
        }
      }, 2000);
    });
    return true;
  }
  return false;
}

function endMatch() {
  state.current = 'game_over';
  
  // Calculate final stats
  const accuracy = state.totalKeystrokes > 0 
    ? Math.round((state.correctKeys / state.totalKeystrokes) * 100) 
    : 0;
  
  const elapsedMinutes = (performance.now() - state.startTime) / 60000;
  const kpm = elapsedMinutes > 0 ? Math.round(state.correctKeys / elapsedMinutes) : 0;
  
  el.statAccuracy.textContent = `${accuracy}%`;
  el.statMaxCombo.textContent = state.maxCombo;
  el.statKpm.textContent = kpm;
  
  if (state.playerWins >= 2) {
    el.gameOverTitle.textContent = "VICTORY";
    el.gameOverTitle.style.background = "linear-gradient(to bottom, #fff 20%, #00ff66 60%, #006622 100%)";
    el.gameOverTitle.style.webkitBackgroundClip = "text";
    el.gameOverReason.textContent = "YOU DEFEATED SHADOW!";
  } else {
    el.gameOverTitle.textContent = "DEFEAT";
    el.gameOverTitle.style.background = "linear-gradient(to bottom, #fff 20%, #ff3333 60%, #880000 100%)";
    el.gameOverTitle.style.webkitBackgroundClip = "text";
    el.gameOverReason.textContent = "SHADOW KO'D YOU...";
  }
  
  el.gameOverScreen.classList.add('active');
}

// --- Typing / Keystroke Handlers ---
function handleKeystroke(e) {
  if (state.current === 'start') {
    // Press any key to select character / start
    playSound('click');
    state.current = 'round_intro';
    el.startScreen.classList.remove('active');
    state.round = 1;
    state.playerWins = 0;
    state.enemyWins = 0;
    state.correctKeys = 0;
    state.totalKeystrokes = 0;
    state.maxCombo = 0;
    state.currentCombo = 0;
    startRound();
    return;
  }
  
  if (state.current === 'game_over') {
    playSound('click');
    el.gameOverScreen.classList.remove('active');
    state.current = 'start';
    el.startScreen.classList.add('active');
    return;
  }
  
  if (state.current !== 'fight') return;
  
  const inputKey = e.key.toUpperCase();
  
  // Catch Spacebar for Special super action
  if (e.code === 'Space' || inputKey === ' ') {
    e.preventDefault();
    if (playerFighter.specialBar >= CONFIG.superLimit) {
      triggerSuperPunch();
    } else {
      el.feedbackMsg.textContent = "METER NOT READY!";
      el.feedbackMsg.style.color = "var(--neon-pink)";
      playSound('miss');
    }
    return;
  }
  
  // Normal typing inputs
  if (inputKey.length !== 1 || inputKey < 'A' || inputKey > 'Z') return;
  
  state.totalKeystrokes++;
  
  if (inputKey === state.targetLetter) {
    // CORRECT KEY STRIKE
    state.correctKeys++;
    state.currentCombo++;
    if (state.currentCombo > state.maxCombo) {
      state.maxCombo = state.currentCombo;
    }
    
    // Perform Player Attack, Enemy Hurt
    playerFighter.changeState('punch', 15);
    enemyFighter.takeDamage(1); // 1 point correct strike damage
    
    // Charge super bar
    playerFighter.specialBar = Math.min(CONFIG.superLimit, playerFighter.specialBar + 1);
    
    // Spawn audio & particle FX
    playSound('punch');
    triggerHitFlash(false);
    spawnSparks(enemyFighter.x - 20, enemyFighter.y - 80, '#00f0ff', 10);
    
    // Score increase
    state.score += 100 * state.currentCombo;
    
    // Combo display handling
    if (state.currentCombo >= 3) {
      el.comboCount.textContent = state.currentCombo;
      el.comboDisplay.classList.remove('hidden');
      floatingTexts.push(new FloatingText(playerFighter.x + 40, playerFighter.y - 120, `${state.currentCombo} HIT!`, 'var(--neon-pink)'));
    }
    
    floatingTexts.push(new FloatingText(enemyFighter.x, enemyFighter.y - 110, "HIT!", 'var(--neon-green)'));
    
    updateHUD();
    
    if (!checkRoundEnd()) {
      getNewTargetLetter();
    }
  } else {
    // INCORRECT KEY STRIKE: DECKED BY ENEMY
    triggerPenaltyDamage();
  }
}

// Player misses/gets incorrect keys -> takes 1 damage
function triggerPenaltyDamage() {
  state.currentCombo = 0;
  el.comboDisplay.classList.add('hidden');
  
  // Enemy punches, Player gets decked
  enemyFighter.changeState('punch', 15);
  playerFighter.takeDamage(1); // 1 point deck damage
  
  playSound('hurt');
  triggerScreenShake();
  triggerHitFlash(true);
  spawnSparks(playerFighter.x + 20, playerFighter.y - 80, '#ff0033', 12);
  
  floatingTexts.push(new FloatingText(playerFighter.x, playerFighter.y - 110, "DECKED!", '#ff3333'));
  el.feedbackMsg.textContent = "WRONG KEY!";
  el.feedbackMsg.style.color = "var(--neon-pink)";
  
  updateHUD();
  
  if (!checkRoundEnd()) {
    getNewTargetLetter();
  }
}

// Trigger power punch fireball blast
function triggerSuperPunch() {
  playerFighter.specialBar = 0; // Reset meter
  updateHUD();
  
  playerFighter.changeState('super', 40); // 40 frame long custom super animation
  playSound('super_charge');
  
  // Darken canvas screen overlay momentarily for impact feel
  floatingTexts.push(new FloatingText(playerFighter.x, playerFighter.y - 140, "HYPER POWER!", 'var(--neon-yellow)'));
  
  // Launch Fireball at frame 20 (release stage)
  setTimeout(() => {
    if (state.current !== 'fight') return;
    playSound('super_release');
    activeFireballs.push(new Fireball(playerFighter.x + 30, playerFighter.y - 90, 15, '#00f0ff', 'player'));
  }, 330); // aligns with ~20 frames at 60fps
}

// --- Main Engine Game Loop ---
let gameTick = 0;

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const elapsed = timestamp - state.lastTime;
  state.lastTime = timestamp;
  
  gameTick++;
  
  const ctx = el.canvas.getContext('2d');
  ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
  
  // 1. Draw Parallax Cherry Blossoms on Background
  atmosphericPetals.forEach(petal => {
    petal.update(gameTick);
    petal.draw(ctx);
  });
  
  // 2. Update and Draw Fighters
  if (playerFighter && enemyFighter) {
    playerFighter.update();
    enemyFighter.update();
    
    playerFighter.draw(ctx, gameTick);
    enemyFighter.draw(ctx, gameTick);
  }
  
  // 3. Fireballs Movement, Collision, and Rendering
  for (let i = activeFireballs.length - 1; i >= 0; i--) {
    const f = activeFireballs[i];
    f.update();
    f.draw(ctx, gameTick);
    
    // Check collision with enemy if player owned
    if (f.owner === 'player' && f.x >= enemyFighter.x - 30) {
      // Impact!
      enemyFighter.takeDamage(7.5); // 7.5 Super Damage
      spawnSparks(enemyFighter.x - 20, enemyFighter.y - 85, '#ffffff', 25);
      spawnSparks(enemyFighter.x - 20, enemyFighter.y - 85, '#00f0ff', 20);
      playSound('hurt');
      triggerScreenShake();
      triggerHitFlash(false);
      
      floatingTexts.push(new FloatingText(enemyFighter.x, enemyFighter.y - 120, "SUPER CRITICAL!", 'var(--neon-yellow)'));
      
      activeFireballs.splice(i, 1);
      updateHUD();
      checkRoundEnd();
      continue;
    }
    
    // Remove if offscreen
    if (f.x > 980 || f.x < -20) {
      activeFireballs.splice(i, 1);
    }
  }
  
  // 4. Update and Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.radius, p.radius);
    ctx.restore();
  }
  
  // 5. Update and Draw floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.update();
    ft.draw(ctx);
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }

  // 6. Handle Timer Countdown in Fight State
  if (state.current === 'fight') {
    // Letter countdown
    state.letterTimer -= elapsed;
    if (state.letterTimer <= 0) {
      // Timeout! Penalty damage
      triggerPenaltyDamage();
    } else {
      // Update SVG circular progress bar
      const progressPercent = Math.max(0, state.letterTimer / state.timeLimit);
      const strokeOffset = progressPercent * 283; // 283 is full dasharray length (2 * PI * r)
      el.timerProgress.style.strokeDashoffset = 283 - strokeOffset;
      
      // Dynamic timer color transitions
      if (progressPercent > 0.6) {
        el.timerProgress.style.stroke = "var(--neon-green)";
      } else if (progressPercent > 0.3) {
        el.timerProgress.style.stroke = "var(--neon-yellow)";
      } else {
        el.timerProgress.style.stroke = "var(--neon-pink)";
      }
    }
    
    // Round Overall 99s Timer countdown
    const matchSeconds = 99 - Math.floor((performance.now() - state.startTime) / 1000);
    if (matchSeconds <= 0) {
      // Time Up! Check who has higher HP
      el.timerDisplay.textContent = "00";
      state.current = 'ko';
      announce('TIME UP!', 2000, () => {
        if (playerFighter.hp === enemyFighter.hp) {
          // Draw round
          state.round++;
        } else if (playerFighter.hp > enemyFighter.hp) {
          state.playerWins++;
          playerFighter.changeState('win');
          playSound('win');
        } else {
          state.enemyWins++;
          enemyFighter.changeState('win');
          playSound('lose');
        }
        updateHUD();
        setTimeout(() => {
          if (state.playerWins >= 2 || state.enemyWins >= 2) {
            endMatch();
          } else {
            state.round++;
            startRound();
          }
        }, 2000);
      });
    } else {
      el.timerDisplay.textContent = String(matchSeconds).padStart(2, '0');
    }
  } else {
    // If not in fight state, timer is full ring
    el.timerProgress.style.strokeDashoffset = 0;
    el.timerProgress.style.stroke = "var(--neon-green)";
  }
  
  requestAnimationFrame(gameLoop);
}

// --- Menu Interaction & Setups ---
function setupUIListeners() {
  // Keypress listener for global game interactions
  window.addEventListener('keydown', handleKeystroke);
  
  // Difficulty selection clicks
  el.diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop from triggering game start
      playSound('click');
      
      el.diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const diff = btn.getAttribute('data-diff');
      state.difficulty = diff;
      state.timeLimit = CONFIG.difficulty[diff].timeLimit;
    });
  });

  // Sound Mute Toggle
  el.muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.isMuted = !state.isMuted;
    el.muteBtn.textContent = `SOUND: ${state.isMuted ? 'OFF' : 'ON'}`;
    el.muteBtn.style.color = state.isMuted ? '#666' : 'var(--neon-blue)';
    playSound('click');
  });
}

// Initialize on load
function init() {
  initGameWorld();
  setupUIListeners();
  updateHUD();
  
  // Start canvas game loops
  requestAnimationFrame(gameLoop);
}

window.onload = init;
