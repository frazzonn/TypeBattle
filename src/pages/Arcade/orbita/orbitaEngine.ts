// Motor do Órbita: palavras vêm em espiral até o núcleo e o jogador digita
// para destruí-las. Desenha tudo num <canvas>; a tela React só cuida do HUD
// e das telas de início, pausa e fim.

export interface OrbitaHud {
  score: number;
  ppm: number;
  combo: number;
  multiplier: number;
  wave: number;
  shields: number;
  demo: boolean;
}

export interface OrbitaResult {
  score: number;
  ppm: number;
  accuracy: number;
  wave: number;
  bestCombo: number;
  killed: number;
  seconds: number;
}

interface OrbitaCallbacks {
  onHud: (hud: OrbitaHud) => void;
  onGameOver: (result: OrbitaResult) => void;
}

interface Word {
  text: string;
  special: boolean;
  typed: number;
  // Raio normalizado (1 = borda da tela) e ângulo.
  r: number;
  th: number;
  vr: number;
  w: number;
  age: number;
  err: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  life: number;
  ch: string | null;
  color: string;
}

interface Beam {
  x: number;
  y: number;
  life: number;
  strong: boolean;
}

interface State {
  demo: boolean;
  words: Word[];
  particles: Particle[];
  beams: Beam[];
  target: Word | null;
  score: number;
  combo: number;
  bestCombo: number;
  wave: number;
  killedInWave: number;
  killed: number;
  shields: number;
  correct: number;
  wrong: number;
  time: number;
  spawnIn: number;
  shake: number;
  corePulse: number;
  spin: number;
  demoIn: number;
}

const COLORS = {
  fg: "#ffffff",
  primary: "#7c4dff",
  lilac: "#a78bfa",
  cyan: "#00bcd4",
  danger: "#ff5c7a",
};

const MAX_SHIELDS = 3;
const SHIELD_WORDS = ["escudo", "reparo", "defesa", "blindagem"];
const FONT = '"JetBrains Mono", ui-monospace, monospace';

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Só palavras com letras simples (a–z), sem acento, para digitar sem tecla morta.
export function buildOrbitaWords(lists: readonly (readonly string[])[]): string[] {
  const unique = new Set<string>();
  for (const list of lists) {
    for (const raw of list) {
      const word = raw.toLowerCase();
      if (word.length >= 3 && word.length <= 12 && /^[a-z]+$/.test(word)) unique.add(word);
    }
  }
  return [...unique];
}

export class OrbitaGame {
  private ctx: CanvasRenderingContext2D;
  private state!: State;
  private running = false;
  private paused = false;
  private frameId = 0;
  private last = 0;
  private W = 0;
  private H = 0;
  private cx = 0;
  private cy = 0;
  private coreR = 30;
  private fontPx = 18;
  private stars: { a: number; d: number; s: number; t: number }[] = [];
  private lastHud = "";
  private reduceMotion: boolean;
  private words: string[];
  private canvas: HTMLCanvasElement;
  private callbacks: OrbitaCallbacks;

  constructor(canvas: HTMLCanvasElement, words: string[], callbacks: OrbitaCallbacks) {
    this.canvas = canvas;
    this.words = words;
    this.callbacks = callbacks;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível.");
    this.ctx = ctx;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
    this.reset(true);
    this.running = true;
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  // ---------- Controle ----------
  start() {
    this.reset(false);
    this.paused = false;
    this.last = performance.now();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.last = performance.now();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = Math.max(1, rect.width);
    this.H = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cx = this.W / 2;
    this.cy = this.H / 2 + 14;
    this.coreR = Math.max(22, Math.min(this.W, this.H) * 0.055);
    this.fontPx = Math.round(Math.max(14, Math.min(20, this.W / 52)));
    this.stars = Array.from({ length: Math.round((this.W * this.H) / 5200) }, () => ({
      a: Math.random() * Math.PI * 2,
      d: Math.sqrt(Math.random()) * Math.hypot(this.W, this.H) * 0.6,
      s: Math.random() * 1.3 + 0.3,
      t: Math.random() * Math.PI * 2,
    }));
  }

  // Letra digitada (já validada como a–z pela tela).
  typeChar(ch: string) {
    const g = this.state;
    if (g.demo || this.paused) return;

    if (!g.target) {
      const options = g.words.filter((w) => w.text[0] === ch).sort((a, b) => a.r - b.r);
      if (!options.length) {
        this.miss(null);
        return;
      }
      g.target = options[0];
    }

    const w = g.target;
    if (w.text[w.typed] === ch) {
      w.typed += 1;
      g.correct += 1;
      g.corePulse = 1;
      const p = this.letterPos(w, w.typed - 1);
      g.beams.push({ x: p.x, y: p.y, life: 1, strong: false });
      if (w.typed === w.text.length) this.destroyWord(w);
    } else {
      this.miss(w);
    }
  }

  // Backspace: solta a mira para escolher outra palavra.
  releaseTarget() {
    const g = this.state;
    if (g.demo || !g.target) return;
    g.target.typed = 0;
    g.target = null;
  }

  // ---------- Estado ----------
  private reset(demo: boolean) {
    this.state = {
      demo,
      words: [],
      particles: [],
      beams: [],
      target: null,
      score: 0,
      combo: 0,
      bestCombo: 0,
      wave: 1,
      killedInWave: 0,
      killed: 0,
      shields: MAX_SHIELDS,
      correct: 0,
      wrong: 0,
      time: 0,
      spawnIn: 0.4,
      shake: 0,
      corePulse: 0,
      spin: 0,
      demoIn: 0.6,
    };
    this.lastHud = "";
  }

  private multiplier() {
    return 1 + Math.min(4, Math.floor(this.state.combo / 5)) * 0.5;
  }

  private ppm() {
    const minutes = Math.max(this.state.time, 1) / 60;
    return Math.round(this.state.correct / 5 / minutes);
  }

  private toScreen(w: Word) {
    const rx = this.W / 2 - 30;
    const ry = this.H / 2 - 30;
    return { x: this.cx + Math.cos(w.th) * w.r * rx, y: this.cy + Math.sin(w.th) * w.r * ry };
  }

  // Cada palavra na tela começa com uma letra diferente: a mira não fica ambígua.
  private pickWord(): string | null {
    const g = this.state;
    const maxLen = 3 + g.wave * 1.6;
    const pool = this.words.filter((w) => w.length <= maxLen);
    if (!pool.length) return null;
    const taken = new Set(g.words.map((w) => w.text[0]));
    for (let i = 0; i < 25; i += 1) {
      const text = pool[Math.floor(Math.random() * pool.length)];
      if (!taken.has(text[0])) return text;
    }
    return null;
  }

  private spawn() {
    const g = this.state;
    let text: string | null = null;
    let special = false;

    if (!g.demo && g.shields < MAX_SHIELDS && Math.random() < 0.08) {
      const free = SHIELD_WORDS.filter((w) => !g.words.some((x) => x.text[0] === w[0]));
      if (free.length) {
        text = free[Math.floor(Math.random() * free.length)];
        special = true;
      }
    }

    text = text ?? this.pickWord();
    if (!text) return;

    const speedFactor = 1 + (g.wave - 1) * 0.13;
    const lenSlow = 1 - Math.min(text.length, 11) * 0.028;
    g.words.push({
      text,
      special,
      typed: 0,
      r: 1.04,
      th: rand(0, Math.PI * 2),
      vr: rand(0.05, 0.068) * speedFactor * lenSlow,
      w: (Math.random() < 0.5 ? -1 : 1) * rand(0.12, 0.32),
      age: 0,
      err: 0,
    });
  }

  private miss(w: Word | null) {
    const g = this.state;
    g.wrong += 1;
    g.combo = 0;
    if (w) w.err = 1;
    if (!this.reduceMotion) g.shake = Math.max(g.shake, 3);
  }

  private setFont() {
    this.ctx.font = `600 ${this.fontPx}px ${FONT}`;
  }

  private letterPos(w: Word, i: number) {
    const p = this.toScreen(w);
    this.setFont();
    const full = this.ctx.measureText(w.text).width;
    const before = this.ctx.measureText(w.text.slice(0, i)).width;
    const cw = this.ctx.measureText(w.text[i] ?? "a").width;
    return { x: p.x - full / 2 + before + cw / 2, y: p.y };
  }

  private destroyWord(w: Word) {
    const g = this.state;
    const p = this.toScreen(w);
    g.beams.push({ x: p.x, y: p.y, life: 1, strong: true });
    g.combo += 1;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    g.score += Math.round(w.text.length * 10 * this.multiplier());
    g.killed += 1;
    g.killedInWave += 1;
    if (w.special && g.shields < MAX_SHIELDS) g.shields += 1;
    this.burst(w, w.special ? COLORS.cyan : COLORS.lilac);
    g.words = g.words.filter((x) => x !== w);
    g.target = null;
    if (g.killedInWave >= 8 + g.wave * 2) {
      g.wave += 1;
      g.killedInWave = 0;
    }
  }

  private burst(w: Word, color: string) {
    const g = this.state;
    for (let i = 0; i < w.text.length; i += 1) {
      const p = this.letterPos(w, i);
      const a = Math.atan2(p.y - this.cy, p.x - this.cx) + rand(-0.9, 0.9);
      const sp = rand(60, 170);
      g.particles.push({
        x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: 0, vrot: rand(-6, 6), life: 1, ch: w.text[i], color,
      });
    }
    if (this.reduceMotion) return;
    const p = this.toScreen(w);
    for (let i = 0; i < 14; i += 1) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 220);
      g.particles.push({
        x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: 0, vrot: 0, life: rand(0.4, 0.9), ch: null, color,
      });
    }
  }

  private coreHit(w: Word) {
    const g = this.state;
    if (g.target === w) g.target = null;
    g.words = g.words.filter((x) => x !== w);
    this.burst(w, COLORS.danger);
    if (g.demo) return;

    g.shields -= 1;
    g.combo = 0;
    if (!this.reduceMotion) g.shake = 10;
    if (g.shields <= 0) this.finish();
  }

  private finish() {
    const g = this.state;
    const total = g.correct + g.wrong;
    this.paused = true;
    this.callbacks.onGameOver({
      score: g.score,
      ppm: this.ppm(),
      accuracy: total ? Math.round((g.correct / total) * 100) : 100,
      wave: g.wave,
      bestCombo: g.bestCombo,
      killed: g.killed,
      seconds: Math.round(g.time),
    });
  }

  // ---------- Loop ----------
  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.emitHud();
    this.frameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const g = this.state;
    g.time += dt;
    g.spin += dt;
    g.spawnIn -= dt;

    const maxWords = Math.min(10, 3 + g.wave);
    if (g.spawnIn <= 0 && g.words.length < maxWords) {
      this.spawn();
      g.spawnIn = Math.max(0.65, 2.2 - g.wave * 0.17) * rand(0.8, 1.2);
    }

    const hitDist = this.coreR + 16;
    for (const w of [...g.words]) {
      w.age += dt;
      w.r -= w.vr * dt;
      // Gira mais rápido perto do núcleo: a espiral fecha.
      w.th += w.w * dt * (1.4 - w.r * 0.6);
      w.err = Math.max(0, w.err - dt * 4);
      const p = this.toScreen(w);
      if (Math.hypot(p.x - this.cx, p.y - this.cy) <= hitDist) {
        this.coreHit(w);
        if (this.paused) return;
      }
    }

    if (g.demo) this.demoTyping(dt);

    for (const b of g.beams) b.life -= dt * (b.strong ? 2.4 : 5);
    g.beams = g.beams.filter((b) => b.life > 0);

    for (const p of g.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.rot += p.vrot * dt;
      p.life -= dt * 0.9;
    }
    g.particles = g.particles.filter((p) => p.life > 0);
    g.shake = Math.max(0, g.shake - dt * 30);
    g.corePulse = Math.max(0, g.corePulse - dt * 5);
  }

  // Antes de começar, o jogo se joga sozinho e devagar, para mostrar a ideia.
  private demoTyping(dt: number) {
    const g = this.state;
    g.demoIn -= dt;
    if (g.demoIn > 0) return;
    g.demoIn = rand(0.11, 0.2);

    if (!g.target) {
      const close = g.words.filter((w) => w.r < 0.72).sort((a, b) => a.r - b.r)[0];
      if (!close) return;
      g.target = close;
    }

    const w = g.target;
    if (!g.words.includes(w)) {
      g.target = null;
      return;
    }
    w.typed += 1;
    g.corePulse = 1;
    const p = this.letterPos(w, w.typed - 1);
    g.beams.push({ x: p.x, y: p.y, life: 1, strong: false });
    if (w.typed >= w.text.length) this.destroyWord(w);
  }

  private emitHud() {
    const g = this.state;
    const hud: OrbitaHud = {
      score: g.score,
      ppm: this.ppm(),
      combo: g.combo,
      multiplier: this.multiplier(),
      wave: g.wave,
      shields: g.shields,
      demo: g.demo,
    };
    const signature = Object.values(hud).join("|");
    if (signature === this.lastHud) return;
    this.lastHud = signature;
    this.callbacks.onHud(hud);
  }

  // ---------- Desenho ----------
  private draw() {
    const { ctx, W, H, cx, cy } = this;
    const g = this.state;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (g.shake > 0) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));

    // Estrelas girando bem devagar em volta do núcleo.
    for (const s of this.stars) {
      const a = s.a + g.spin * 0.01;
      const x = cx + Math.cos(a) * s.d;
      const y = cy + Math.sin(a) * s.d * 0.8;
      const twinkle = 0.35 + 0.35 * Math.sin(g.spin * 1.3 + s.t);
      ctx.fillStyle = `rgba(200,195,255,${twinkle})`;
      ctx.fillRect(x, y, s.s, s.s);
    }

    // Órbitas.
    ctx.strokeStyle = "rgba(124,77,255,0.10)";
    ctx.lineWidth = 1;
    for (const k of [0.3, 0.55, 0.8]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (W / 2 - 30) * k, (H / 2 - 30) * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Raios do núcleo até a letra acertada.
    for (const b of g.beams) {
      ctx.strokeStyle = b.strong
        ? `rgba(167,139,250,${b.life})`
        : `rgba(124,77,255,${b.life * 0.9})`;
      ctx.lineWidth = b.strong ? 3.5 : 2;
      ctx.shadowColor = COLORS.primary;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    this.drawCore();

    this.setFont();
    ctx.textBaseline = "middle";
    for (const w of g.words) this.drawWord(w);

    for (const p of g.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      if (p.ch) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.textAlign = "center";
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      } else {
        ctx.fillRect(p.x, p.y, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawCore() {
    const { ctx, cx, cy } = this;
    const g = this.state;
    const r = this.coreR * (1 + g.corePulse * 0.08);

    const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 2.4);
    glow.addColorStop(0, "rgba(167,139,250,0.55)");
    glow.addColorStop(0.4, "rgba(124,77,255,0.18)");
    glow.addColorStop(1, "rgba(124,77,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    body.addColorStop(0, "#d6c8ff");
    body.addColorStop(0.45, COLORS.primary);
    body.addColorStop(1, "#3a1f9e");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Escudos: três arcos em volta do núcleo.
    const gap = 0.22;
    const arc = (Math.PI * 2) / MAX_SHIELDS;
    for (let i = 0; i < MAX_SHIELDS; i += 1) {
      const on = g.demo || i < g.shields;
      const a0 = -Math.PI / 2 + i * arc + gap / 2 + g.spin * 0.25;
      ctx.strokeStyle = on ? COLORS.cyan : "rgba(255,92,122,0.25)";
      ctx.lineWidth = 3;
      ctx.shadowColor = on ? COLORS.cyan : "transparent";
      ctx.shadowBlur = on ? 10 : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 9, a0, a0 + arc - gap);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  private drawWord(w: Word) {
    const { ctx } = this;
    const g = this.state;
    const p = this.toScreen(w);
    const fade = Math.min(1, w.age / 0.5);
    const full = ctx.measureText(w.text).width;
    const x0 = p.x - full / 2 + (w.err ? Math.sin(w.err * 40) * 3 : 0);
    const locked = g.target === w;
    const danger = w.r < 0.3;

    ctx.globalAlpha = fade;
    if (locked || w.special) {
      const padX = 9;
      const h = this.fontPx + 12;
      ctx.fillStyle = w.special ? "rgba(0,188,212,0.12)" : "rgba(124,77,255,0.16)";
      ctx.strokeStyle = w.err ? COLORS.danger : w.special ? COLORS.cyan : COLORS.primary;
      ctx.lineWidth = locked ? 1.6 : 1;
      ctx.beginPath();
      ctx.roundRect(x0 - padX, p.y - h / 2, full + padX * 2, h, 7);
      ctx.fill();
      ctx.stroke();
    }

    ctx.textAlign = "left";
    const typedPart = w.text.slice(0, w.typed);
    const typedWidth = ctx.measureText(typedPart).width;
    ctx.fillStyle = COLORS.lilac;
    ctx.fillText(typedPart, x0, p.y);
    ctx.fillStyle = w.err
      ? COLORS.danger
      : w.special
        ? COLORS.cyan
        : danger
          ? "#ffd1da"
          : COLORS.fg;
    ctx.fillText(w.text.slice(w.typed), x0 + typedWidth, p.y);

    // Ponto vermelho piscando quando a palavra está perto do núcleo.
    if (danger && !g.demo) {
      ctx.fillStyle = COLORS.danger;
      ctx.beginPath();
      ctx.arc(x0 - 14, p.y, 2.5 + Math.sin(g.spin * 10) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
