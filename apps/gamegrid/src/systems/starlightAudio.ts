import Phaser from 'phaser';

const AUDIO_KEY = 'gamegrid.starlight.audio-muted';

export class StarlightAudio {
  private muted = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.muted = window.localStorage.getItem(AUDIO_KEY) === '1';
    this.scene.sound.mute = this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    window.localStorage.setItem(AUDIO_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  ping(freq = 330, ms = 60): void {
    if (this.muted) return;
    const manager = this.scene.sound as Phaser.Sound.WebAudioSoundManager | Phaser.Sound.NoAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager;
    const context = ('context' in manager ? (manager.context as AudioContext | undefined) : undefined) ?? null;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = freq;
    gain.gain.value = 0.03;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + ms / 1000);
  }
}
