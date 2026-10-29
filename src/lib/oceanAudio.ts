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
        lastOut = (lastOut + 0.02 * white) ¶»§q«^