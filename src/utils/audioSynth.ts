// Web Audio API Synthesizer for Neural Network Events
// Completely safe, lazy-loaded, and silent by default unless explicitly activated.

class NeuralAudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (!muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getMute() {
    return this.isMuted;
  }

  // A light synthetic beep indicating a forward signal propagating through a layer
  playLayerActivation(layerIndex: number, totalLayers: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Dynamic frequency scaling up by layer index
    const baseFreq = 260; // middle C-ish
    const targetFreq = baseFreq + (layerIndex / totalLayers) * 340;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
    
    // Add brief slide effect
    osc.frequency.exponentialRampToValueAtTime(targetFreq * 1.2, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // A lower-frequency reverse sweep indicating backpropagation
  playBackpropagation(layerIndex: number, totalLayers: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Frequency drops as backward error signals flow back to the inputs
    const baseFreq = 580;
    const targetFreq = baseFreq - ((totalLayers - 1 - layerIndex) / totalLayers) * 320;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.24);
  }

  // A short dynamic click indicating parameter updating or training tick
  playTrainingEpoch(successRate: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Higher accuracy results in a sweeter high-pitch tick, lower accuracy is a dull click
    const pitch = 440 + successRate * 600;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // An elegant electronic chord when training starts or finishes successfully
  playSystemReady() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [329.63, 392.00, 523.25, 659.25]; // C major chord
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.015, now + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.4);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.45);
    });
  }

  // High-tech static sound for chaos perturbation injection
  playPerturbationChaos() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.26);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.27);
  }
}

export const audioSynth = new NeuralAudioSynth();
