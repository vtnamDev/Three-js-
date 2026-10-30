/**
 * Zero-dependency Web Audio API procedural underwater hydrophone ambience.
 * Remains silent until explicitly enabled by user gesture.
 */
export class OceanAmbienceEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private enabled = false;

  public toggle(): boolean {
    if (this.enabled) {
      this.setEnabled(false);
    } else {
      this.setEnabled(true);
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (!next) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
      }
      return;
    }

    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Generate 3-second seamless brownian ocean current buffer
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 3;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        // Crossfade loop ends smoothly
        const env =
          i < 2048
            ? i / 2048
            : i > length - 2048
              ? (length - i) / 2048
              : 1.0;
        data[i] = lastOut * 2.4 * env;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buffer;
      noiseSrc.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      filter.Q.value = 0.85;
      this.filter = filter;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.0001;
      this.masterGain = masterGain;

      noiseSrc.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);
      noiseSrc.start();
    }

    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.masterGain.gain.setTargetAtTime(0.11, this.ctx.currentTime, 0.35);
    }
  }

  public setDepthProgress(progress: number): void {
    if (!this.enabled || !this.ctx || !this.filter) return;
    // Warmer, brighter reef surf at surface (420 Hz) -> deep, quiet abyssal resonance (135 Hz)
    const targetCutoff = 420 - Math.min(1, Math.max(0, progress)) * 285;
    this.filter.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.3);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.filter = null;
    }
  }
}
