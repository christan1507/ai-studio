/**
 * Procedural audio.
 *
 * Everything is synthesised at runtime — there are no audio assets to load,
 * which keeps the build tiny and lets each chapter's pad drift in its own key
 * indefinitely without looping audibly.
 *
 * Browsers will not start an AudioContext without a user gesture, so nothing
 * is created until {@link AudioEngine.unlock} is called from a real pointer
 * event. Every public method is safe to call before that and simply does
 * nothing, so callers never have to check.
 */

import * as Tone from 'tone';

import { chapterById } from '@/data/palettes';

/** Semitone offsets of the chapter scale, relative to its root. */
type Scale = readonly number[];

interface AmbientVoices {
  readonly pad: Tone.PolySynth<Tone.Synth>;
  readonly bell: Tone.PolySynth<Tone.Synth>;
  readonly noise: Tone.NoiseSynth;
  readonly reverb: Tone.Reverb;
  readonly padGain: Tone.Gain;
  readonly sfxGain: Tone.Gain;
  readonly filter: Tone.Filter;
}

export class AudioEngine {
  private voices: AmbientVoices | null = null;
  private loop: Tone.Loop | null = null;
  private unlocked = false;
  private scale: Scale = [0, 2, 4, 7, 9];
  private root = 'C3';
  private musicEnabled = true;
  private sfxEnabled = true;
  private volume = 0.7;
  /** Rotating index into the scale so successive pads move rather than repeat. */
  private step = 0;

  /**
   * Start the audio context. Must be called from a user gesture handler.
   * Safe to call repeatedly.
   */
  async unlock(): Promise<void> {
    if (this.unlocked) return;
    try {
      await Tone.start();
    } catch {
      // An autoplay-blocked context is not worth failing a game over; the
      // next gesture will try again.
      return;
    }
    this.unlocked = true;
    this.build();
    this.applyVolume();
    if (this.musicEnabled) this.startAmbient();
  }

  private build(): void {
    if (this.voices) return;

    const reverb = new Tone.Reverb({ decay: 9, preDelay: 0.04, wet: 0.62 }).toDestination();
    const filter = new Tone.Filter({ type: 'lowpass', frequency: 1900, rolloff: -12 }).connect(
      reverb,
    );
    const padGain = new Tone.Gain(0.3).connect(filter);
    const sfxGain = new Tone.Gain(0.5).connect(reverb);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 3.2, decay: 2, sustain: 0.6, release: 7 },
    }).connect(padGain);

    const bell = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 1.1, sustain: 0.02, release: 1.6 },
    }).connect(sfxGain);

    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.02, decay: 0.26, sustain: 0 },
    }).connect(sfxGain);

    this.voices = { pad, bell, noise, reverb, padGain, sfxGain, filter };
  }

  /** Switch the ambient key and timbre to a chapter's identity. */
  setChapter(chapterId: number): void {
    try {
      const chapter = chapterById(chapterId);
      this.scale = chapter.scale;
      this.root = chapter.root;
    } catch {
      // An unknown chapter (a daily puzzle, say) keeps the current key.
      return;
    }
    if (this.voices) {
      // Deeper chapters sit darker in the spectrum.
      this.voices.filter.frequency.rampTo(2300 - chapterId * 130, 2);
    }
  }

  private startAmbient(): void {
    if (!this.voices || this.loop) return;

    this.loop = new Tone.Loop((time) => {
      const voices = this.voices;
      if (!voices || !this.musicEnabled) return;
      // Walk the scale in thirds so the pad drifts through the mode rather
      // than cycling a fixed progression.
      this.step = (this.step + 2) % this.scale.length;
      const chord = [0, 2, 4].map((offset) =>
        Tone.Frequency(this.root)
          .transpose(this.scale[(this.step + offset) % this.scale.length])
          .transpose(offset === 4 ? 12 : 0)
          .toNote(),
      );
      voices.pad.triggerAttackRelease(chord, 9, time, 0.28);
    }, 11);

    this.loop.start(0);
    Tone.getTransport().start();
  }

  private stopAmbient(): void {
    this.loop?.stop();
    this.loop?.dispose();
    this.loop = null;
    this.voices?.pad.releaseAll();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!this.unlocked) return;
    if (enabled) this.startAmbient();
    else this.stopAmbient();
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  private applyVolume(): void {
    if (!this.unlocked) return;
    // Linear slider to decibels, with silence at zero rather than -Infinity
    // artefacts partway down the range.
    const db = this.volume <= 0.001 ? -Infinity : 20 * Math.log10(this.volume) - 4;
    Tone.getDestination().volume.rampTo(db, 0.2);
  }

  /** Soft air movement while the structure turns. */
  whoosh(strength = 1): void {
    if (!this.ready() || !this.sfxEnabled) return;
    const voices = this.voices;
    if (!voices) return;
    voices.noise.volume.value = -26 + Math.min(1, strength) * 8;
    voices.noise.triggerAttackRelease(0.22);
  }

  /** A path has connected. */
  connectChime(): void {
    if (!this.ready() || !this.sfxEnabled) return;
    const note = Tone.Frequency(this.root)
      .transpose(this.scale[2 % this.scale.length] + 24)
      .toNote();
    this.voices?.bell.triggerAttackRelease([note], 1.2, undefined, 0.55);
  }

  /** The player tapped somewhere they cannot currently reach. */
  refused(): void {
    if (!this.ready() || !this.sfxEnabled) return;
    const note = Tone.Frequency(this.root).transpose(-12).toNote();
    this.voices?.bell.triggerAttackRelease([note], 0.18, undefined, 0.18);
  }

  /** Rising arpeggio for a solved level. */
  levelComplete(): void {
    if (!this.ready() || !this.sfxEnabled) return;
    const bell = this.voices?.bell;
    if (!bell) return;
    const now = Tone.now();
    const degrees = [0, 2, 4, 6, 8];
    degrees.forEach((degree, index) => {
      const note = Tone.Frequency(this.root)
        .transpose(this.scale[degree % this.scale.length] + 12 + Math.floor(degree / this.scale.length) * 12)
        .toNote();
      bell.triggerAttackRelease([note], 1.4, now + index * 0.13, 0.5);
    });
  }

  /** A switch has been operated. */
  switchClick(): void {
    if (!this.ready() || !this.sfxEnabled) return;
    const note = Tone.Frequency(this.root).transpose(7).toNote();
    this.voices?.bell.triggerAttackRelease([note], 0.3, undefined, 0.35);
  }

  private ready(): boolean {
    return this.unlocked && this.voices !== null;
  }

  dispose(): void {
    this.stopAmbient();
    const voices = this.voices;
    if (!voices) return;
    voices.pad.dispose();
    voices.bell.dispose();
    voices.noise.dispose();
    voices.padGain.dispose();
    voices.sfxGain.dispose();
    voices.filter.dispose();
    voices.reverb.dispose();
    this.voices = null;
  }
}

/** Single shared engine — there is one game and one audio context. */
export const audio = new AudioEngine();
