const SAMPLE_URLS = {
  lightHit: ["assets/audio/sfx/light1.ogg", "assets/audio/sfx/light2.ogg"],
  kickHit: ["assets/audio/sfx/light2.ogg"],
  heavyHit: ["assets/audio/sfx/heavy1.ogg"],
  blockHit: ["assets/audio/sfx/block1.ogg"],
  launcher: ["assets/audio/sfx/launcher1.ogg"],
  knockdown: ["assets/audio/sfx/knockdown1.ogg"],
  sidestep: ["assets/audio/sfx/sidestep1.ogg"],
  roundStart: ["assets/audio/sfx/roundStart1.ogg"],
  ko: ["assets/audio/sfx/ko1.ogg", "assets/audio/sfx/ko_sting.ogg"],
  uiClick: ["assets/audio/sfx/uiClick1.ogg"],
  musicBase: ["assets/audio/music/stage1_base.ogg"],
  musicIntense: ["assets/audio/music/stage1_intense.ogg"]
};

const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.8;
    this.muted = false;
    this.enabled = false;
    this.musicPulse = 0;
    this.soundBudget = 0;
    this.duckTimer = 0;
    this.duckAmount = 0;

    this.buffers = new Map();
    this.preloadPromise = null;
    this.hasSampleMusic = false;
    this.musicBaseNode = null;
    this.musicIntenseNode = null;
    this.musicBaseLayerGain = null;
    this.musicIntenseLayerGain = null;
    this.intenseMix = 0;
  }

  unlock() {
    if (this.enabled) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.applyMix();
    this.enabled = true;
    this.preloadSamples();
  }

  async preloadSamples() {
    if (!this.ctx) return;
    if (this.preloadPromise) return this.preloadPromise;

    const decode = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        return await this.ctx.decodeAudioData(arr.slice(0));
      } catch {
        return null;
      }
    };

    this.preloadPromise = (async () => {
      const keys = Object.keys(SAMPLE_URLS);
      await Promise.all(
        keys.map(async (key) => {
          const urls = SAMPLE_URLS[key];
          const decoded = [];
          for (const url of urls) {
            // eslint-disable-next-line no-await-in-loop
            const buffer = await decode(url);
            if (buffer) decoded.push(buffer);
          }
          if (decoded.length > 0) this.buffers.set(key, decoded);
        })
      );
      this.hasSampleMusic = this.buffers.has("musicBase") && this.buffers.has("musicIntense");
    })();

    return this.preloadPromise;
  }

  setMusic(v) {
    this.musicVolume = Number(v);
    this.applyMix();
  }

  setSfx(v) {
    this.sfxVolume = Number(v);
    this.applyMix();
  }

  setMuted(v) {
    this.muted = !!v;
    this.applyMix();
  }

  applyMix() {
    if (!this.musicGain || !this.sfxGain) return;
    const duck = this.duckTimer > 0 ? this.duckAmount : 0;
    const m = this.muted ? 0 : this.musicVolume * (1 - duck);
    const s = this.muted ? 0 : this.sfxVolume;
    this.musicGain.gain.value = m;
    this.sfxGain.gain.value = s;
  }

  tone(freq, ms, type, gain, slide = 0, dest = "sfx") {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), now + ms / 1000);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    osc.connect(g);
    g.connect(dest === "music" ? this.musicGain : this.sfxGain);
    osc.start(now);
    osc.stop(now + ms / 1000 + 0.02);
  }

  playSample(name, gainMul = 1) {
    if (!this.enabled || !this.ctx) return false;
    const list = this.buffers.get(name);
    if (!list || list.length === 0) return false;

    const src = this.ctx.createBufferSource();
    src.buffer = list.length === 1 ? list[0] : pick(list);
    const g = this.ctx.createGain();
    g.gain.value = gainMul;
    src.connect(g);
    g.connect(this.sfxGain);
    src.start();
    return true;
  }

  ensureMusicLayers() {
    if (!this.enabled || !this.ctx || !this.hasSampleMusic) return false;
    if (this.musicBaseNode && this.musicIntenseNode) return true;

    const base = this.buffers.get("musicBase")?.[0];
    const intense = this.buffers.get("musicIntense")?.[0];
    if (!base || !intense) return false;

    this.musicBaseLayerGain = this.ctx.createGain();
    this.musicIntenseLayerGain = this.ctx.createGain();
    this.musicBaseLayerGain.gain.value = 0.8;
    this.musicIntenseLayerGain.gain.value = 0;
    this.musicBaseLayerGain.connect(this.musicGain);
    this.musicIntenseLayerGain.connect(this.musicGain);

    this.musicBaseNode = this.ctx.createBufferSource();
    this.musicBaseNode.buffer = base;
    this.musicBaseNode.loop = true;
    this.musicBaseNode.connect(this.musicBaseLayerGain);

    this.musicIntenseNode = this.ctx.createBufferSource();
    this.musicIntenseNode.buffer = intense;
    this.musicIntenseNode.loop = true;
    this.musicIntenseNode.connect(this.musicIntenseLayerGain);

    this.musicBaseNode.start();
    this.musicIntenseNode.start();
    return true;
  }

  play(name) {
    if (!this.enabled) return;
    if (this.soundBudget > 8) return;
    this.soundBudget += 1;

    const sampleGain = name === "uiClick" ? 0.75 : 1;
    if (this.playSample(name, sampleGain)) return;

    const p = 1 + (Math.random() - 0.5) * 0.08;
    const s = this.sfxVolume;

    if (name === "lightHit") {
      this.tone(380 * p, 60, "square", 0.22 * s, -80);
      this.tone(760 * p, 35, "triangle", 0.1 * s, -120);
    } else if (name === "kickHit") {
      this.tone(250 * p, 90, "square", 0.24 * s, -60);
      this.tone(130 * p, 110, "triangle", 0.12 * s, -20);
    } else if (name === "heavyHit") {
      this.tone(130 * p, 135, "sawtooth", 0.28 * s, -90);
      this.tone(72 * p, 120, "triangle", 0.18 * s, -12);
    } else if (name === "blockHit") {
      this.tone(560 * p, 70, "triangle", 0.15 * s, 30);
      this.tone(980 * p, 36, "square", 0.06 * s, -60);
    } else if (name === "launcher") {
      this.tone(190 * p, 130, "sawtooth", 0.3 * s, 130);
    } else if (name === "knockdown") {
      this.tone(100 * p, 180, "sawtooth", 0.31 * s, -25);
    } else if (name === "sidestep") {
      this.tone(320 * p, 50, "triangle", 0.17 * s, -40);
    } else if (name === "roundStart") {
      this.tone(620, 90, "triangle", 0.18 * s, -40);
    } else if (name === "ko") {
      this.tone(90, 220, "sawtooth", 0.35 * s, -30);
    } else {
      this.tone(620 * p, 40, "triangle", 0.12 * s, 0);
    }
  }

  onEvent(e) {
    if (!this.enabled) return;
    if (e.type === "HIT") {
      const heavy = ["heavy", "launcher", "sweep", "throw"].includes(e.data?.move);
      this.play(heavy ? "heavyHit" : e.data?.attackType === "kick" ? "kickHit" : "lightHit");
    } else if (e.type === "BLOCK") {
      this.play("blockHit");
    } else if (e.type === "LAUNCH") {
      this.play("launcher");
    } else if (e.type === "KNOCKDOWN") {
      this.play("knockdown");
    } else if (e.type === "LANE_SHIFT" && e.data.flick) {
      this.play("sidestep");
    } else if (e.type === "KO") {
      this.play("ko");
    } else if (e.type === "ROUND_START") {
      this.play("roundStart");
    }
  }

  tick(dt, intense) {
    if (!this.enabled || !this.ctx) return;
    this.soundBudget = Math.max(0, this.soundBudget - dt * 30);
    this.musicPulse += dt;

    if (this.duckTimer > 0) {
      this.duckTimer -= dt;
      if (this.duckTimer <= 0) {
        this.duckTimer = 0;
        this.duckAmount = 0;
        this.applyMix();
      }
    }

    const musicLayersReady = this.ensureMusicLayers();
    if (musicLayersReady) {
      const target = intense ? 1 : 0;
      this.intenseMix += (target - this.intenseMix) * 0.06;
      this.musicBaseLayerGain.gain.value = 0.8 * (1 - this.intenseMix);
      this.musicIntenseLayerGain.gain.value = 0.8 * this.intenseMix;
      return;
    }

    // Fallback procedural music when sample loops are unavailable.
    const beat = intense ? 60 / 156 : 60 / 142;
    if (this.musicPulse > beat) {
      this.musicPulse = 0;
      const base = intense ? 136 : 120;
      this.tone(base, 120, "triangle", 0.06 * this.musicVolume, 0, "music");
      if (Math.random() > 0.36) this.tone(base * 2, 70, "square", 0.03 * this.musicVolume, -20, "music");
    }
  }

  duckMusic(duration = 0.6, amount = 0.5) {
    if (!this.enabled) return;
    this.duckTimer = Math.max(this.duckTimer, duration);
    this.duckAmount = Math.max(this.duckAmount, amount);
    this.applyMix();
  }
}
