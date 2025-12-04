// The dist/ folder can be deployed directly to GitHub Pages as static output.
import { Pane } from 'tweakpane';

const CONFIG = {
  PARTICLE_COUNT: 130,
  MAX_SPEED: 90,
  TRAIL_ALPHA: 0.08,
  ORBIT_PULL: 14,
  ORBIT_SPREAD: 260,
  RANDOM_DRIFT: 6,
  INTERACTION_RADIUS: 200,
  INTERACTION_PULL: 36,
  INTERACTION_SWIRL: 22
};

const pane = new Pane();
pane.addBinding(CONFIG, 'PARTICLE_COUNT', { min: 10, max: 500 }).on('change', () => {
  createParticles();
});
pane.addBinding(CONFIG, 'MAX_SPEED', { min: 10, max: 200 });
pane.addBinding(CONFIG, 'TRAIL_ALPHA', { min: 0.01, max: 0.2 });
pane.addBinding(CONFIG, 'ORBIT_PULL', { min: 1, max: 40 });
pane.addBinding(CONFIG, 'ORBIT_SPREAD', { min: 50, max: 500 });
pane.addBinding(CONFIG, 'RANDOM_DRIFT', { min: 0, max: 15 });
pane.addBinding(CONFIG, 'INTERACTION_RADIUS', { min: 20, max: 400 });
pane.addBinding(CONFIG, 'INTERACTION_PULL', { min: 0, max: 100 });
pane.addBinding(CONFIG, 'INTERACTION_SWIRL', { min: 0, max: 100 });


const TWO_PI = Math.PI * 2;
const canvas = document.getElementById('galaxy');
const ctx = canvas.getContext('2d');

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio || 1
};

const galaxyCenter = { x: state.width / 2, y: state.height / 2 };
const interaction = { active: false, x: 0, y: 0 };
let particles = [];
let lastTime = performance.now();

class Particle {
  constructor(center) {
    const spread = Math.min(CONFIG.ORBIT_SPREAD, Math.min(state.width, state.height) * 0.6);
    this.orbitOffsetX = (Math.random() - 0.5) * spread;
    this.orbitOffsetY = (Math.random() - 0.5) * spread;
    this.x = center.x + this.orbitOffsetX + (Math.random() - 0.5) * 30;
    this.y = center.y + this.orbitOffsetY + (Math.random() - 0.5) * 30;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.radius = 1.2 + Math.random() * 1.6;
    const hue = 210 + Math.random() * 80;
    const light = 60 + Math.random() * 20;
    this.color = `hsla(${hue}, 75%, ${light}%, 0.9)`;
  }

  update(dt) {
    const targetX = galaxyCenter.x + this.orbitOffsetX;
    const targetY = galaxyCenter.y + this.orbitOffsetY;

    let ax = 0;
    let ay = 0;

    // Gentle pull toward the personal orbit center.
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = (CONFIG.ORBIT_PULL / dist);
    ax += dx * pull;
    ay += dy * pull;

    // Small perpendicular nudge to keep the drift feeling orbital.
    const swirl = pull * 8;
    ax += -dy * swirl * 0.002;
    ay += dx * swirl * 0.002;

    // Interaction force toward the active pointer with an added swirl.
    if (interaction.active) {
      const mx = interaction.x - this.x;
      const my = interaction.y - this.y;
      const mDist = Math.hypot(mx, my) || 1;
      const influence = Math.max(0, 1 - mDist / CONFIG.INTERACTION_RADIUS);
      if (influence > 0) {
        const pullStrength = CONFIG.INTERACTION_PULL * influence;
        ax += (mx / mDist) * pullStrength;
        ay += (my / mDist) * pullStrength;

        const swirlStrength = CONFIG.INTERACTION_SWIRL * influence;
        ax += (-my / mDist) * swirlStrength;
        ay += (mx / mDist) * swirlStrength;
      }
    }

    // Random micro noise keeps the motion lively.
    ax += (Math.random() - 0.5) * CONFIG.RANDOM_DRIFT;
    ay += (Math.random() - 0.5) * CONFIG.RANDOM_DRIFT;

    this.vx += ax * dt;
    this.vy += ay * dt;

    // Limit speed to keep the trails smooth.
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > CONFIG.MAX_SPEED) {
      const scale = CONFIG.MAX_SPEED / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Soft wrap: if a particle drifts far away, pull it back toward center.
    const pad = 80;
    if (this.x < -pad || this.x > state.width + pad || this.y < -pad || this.y > state.height + pad) {
      this.x = galaxyCenter.x + (Math.random() - 0.5) * pad;
      this.y = galaxyCenter.y + (Math.random() - 0.5) * pad;
      this.vx *= 0.2;
      this.vy *= 0.2;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TWO_PI);
    ctx.fill();
  }
}

function resizeCanvas() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.dpr = window.devicePixelRatio || 1;

  canvas.width = state.width * state.dpr;
  canvas.height = state.height * state.dpr;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(state.dpr, state.dpr);

  galaxyCenter.x = state.width / 2;
  galaxyCenter.y = state.height / 2;
}

function createParticles() {
  particles = [];
  for (let i = 0; i < CONFIG.PARTICLE_COUNT; i += 1) {
    particles.push(new Particle(galaxyCenter));
  }
}

function handlePointerDown(event) {
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  interaction.active = true;
  interaction.x = event.clientX;
  interaction.y = event.clientY;
}

function handlePointerMove(event) {
  if (!interaction.active) return;
  event.preventDefault();
  interaction.x = event.clientX;
  interaction.y = event.clientY;
}

function handlePointerUp(event) {
  event.preventDefault();
  interaction.active = false;
}

function drawBackground(time) {
  const t = time * 0.00005;
  const wobbleX = Math.sin(t * 2) * state.width * 0.1;
  const wobbleY = Math.cos(t * 3) * state.height * 0.08;
  const gradient = ctx.createRadialGradient(
    galaxyCenter.x + wobbleX,
    galaxyCenter.y + wobbleY,
    Math.max(20, Math.min(state.width, state.height) * 0.1),
    galaxyCenter.x,
    galaxyCenter.y,
    Math.max(state.width, state.height) * 0.9
  );

  gradient.addColorStop(0, 'rgba(40, 58, 105, 0.25)');
  gradient.addColorStop(0.35, 'rgba(24, 35, 76, 0.18)');
  gradient.addColorStop(0.7, 'rgba(10, 12, 30, 0.16)');
  gradient.addColorStop(1, 'rgba(4, 6, 14, 0.18)');

  ctx.globalAlpha = CONFIG.TRAIL_ALPHA;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.globalAlpha = 1;
}

function drawInteractionHalo() {
  if (!interaction.active) return;
  const r = CONFIG.INTERACTION_RADIUS * 0.7;
  const glow = ctx.createRadialGradient(interaction.x, interaction.y, 0, interaction.x, interaction.y, r);
  glow.addColorStop(0, 'rgba(120, 190, 255, 0.5)');
  glow.addColorStop(0.4, 'rgba(90, 150, 255, 0.18)');
  glow.addColorStop(1, 'rgba(50, 90, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(interaction.x, interaction.y, r, 0, TWO_PI);
  ctx.fill();
}

function update(dt) {
  for (let i = 0; i < particles.length; i += 1) {
    particles[i].update(dt);
  }
}

function draw(time) {
  drawBackground(time);
  drawInteractionHalo();
  for (let i = 0; i < particles.length; i += 1) {
    particles[i].draw();
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  draw(now);
  requestAnimationFrame(loop);
}

function init() {
  resizeCanvas();
  createParticles();
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
  canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
  canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
  canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });

  // Prevent long-press context menus from interrupting touch interactions.
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  requestAnimationFrame(loop);
}

init();
