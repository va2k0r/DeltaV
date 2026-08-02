export type DeltaVMusicVisualPulse = Readonly<{
  phase: number;
  intensity: number;
  pulseIndex: number;
  secondsPerPulse: number;
}>;

const defaultMusicTrackPaths = [
  "1-abandoned-outpost.mp3",
  "2-entering-the-void.mp3",
  "3-approaching-the-singularity.mp3",
  "4-lost-signal.mp3",
  "5-beyond-the-star-gate.mp3",
  "6-signal-from-beyond.mp3",
  "7-awakening-the-relic.mp3",
  "8-lost-star-system.mp3",
  "9-ruins-of-tomorrow.mp3",
  "10-edge-of-the-galaxy.mp3",
  "11-awakening-station.mp3",
  "12-before-the-warp.mp3",
  "13-echoes-from-the-station.mp3",
  "14-beneath-alien-skies.mp3",
  "15-collapse-of-the-core.mp3",
  "16-fractured-space-time.mp3",
  "17-the-long-jump.mp3",
  "18-through-the-wormhole.mp3",
  "19-breach-the-horizon.mp3",
  "20-scanning-the-unknown.mp3",
  "21-breach-of-the-voidline.mp3",
  "22-abandoned-mining-zone.mp3",
  "23-crossing-dead-space.mp3",
  "24-power-down-sequence.mp3",
  "25-signals-across.mp3",
  "26-lights-of-the-megacity.mp3",
  "27-after-the-starfall.mp3",
  "28-orbital-scan.mp3",
  "29-cryo-chamber.mp3",
  "30-stellar-rift.mp3"
].map((fileName) => `${import.meta.env.BASE_URL}assets/music/${fileName}`);
const visualPulseBpm = 110;
const visualPulseSeconds = 60 / visualPulseBpm;
const visualPulseAttackSeconds = visualPulseSeconds * 0.085;
const visualPulseDecaySeconds = visualPulseSeconds * 0.56;
const visualPulseOffsetSeconds = 0.012;
const defaultMusicVolume = 0.82;

export class DeltaVMusicEngine {
  private readonly audio: HTMLAudioElement;
  private readonly trackPaths: readonly string[];
  private autoplayPending = false;
  private trackIndex = -1;

  constructor(trackPaths: readonly string[] | string = defaultMusicTrackPaths) {
    this.audio = document.createElement("audio");
    this.trackPaths = typeof trackPaths === "string" ? [trackPaths] : trackPaths;
    this.audio.loop = false;
    this.audio.preload = "auto";
    this.audio.volume = defaultMusicVolume;
    this.audio.addEventListener("ended", this.handleTrackEnded);
    this.selectRandomTrack();
  }

  get isSupported(): boolean {
    return this.audio.canPlayType("audio/mpeg") !== "";
  }

  get isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended;
  }

  get isAutoplayPending(): boolean {
    return this.autoplayPending;
  }

  async start(): Promise<boolean> {
    if (!this.isSupported) {
      this.autoplayPending = false;
      return false;
    }

    if (this.isPlaying) {
      this.autoplayPending = false;
      return true;
    }

    this.audio.loop = false;
    this.audio.preload = "auto";

    try {
      await this.audio.play();
      this.autoplayPending = false;
      return true;
    } catch (error) {
      this.autoplayPending = true;
      console.info("DeltaV music is waiting for a user gesture before playback can start.", error);
      return false;
    }
  }

  async restartFromBeginning(): Promise<boolean> {
    if (!this.isSupported) {
      this.autoplayPending = false;
      return false;
    }

    this.audio.loop = false;
    this.audio.preload = "auto";

    try {
      this.audio.currentTime = 0;
    } catch (error) {
      console.info("DeltaV music could not seek to the beginning before restart.", error);
    }

    try {
      await this.audio.play();
      this.autoplayPending = false;
      return true;
    } catch (error) {
      this.autoplayPending = true;
      console.info("DeltaV music restart is waiting for a user gesture.", error);
      return false;
    }
  }

  stop(): void {
    this.autoplayPending = false;
    this.audio.pause();
  }

  getVisualPulse(): DeltaVMusicVisualPulse | null {
    if (!this.isPlaying) {
      return null;
    }

    const elapsed = this.audio.currentTime - visualPulseOffsetSeconds;
    const phase = positiveModulo(elapsed, visualPulseSeconds) / visualPulseSeconds;
    return {
      phase,
      intensity: getVisualPulseIntensity(phase),
      pulseIndex: Math.floor(elapsed / visualPulseSeconds),
      secondsPerPulse: visualPulseSeconds
    };
  }

  captureStream(): MediaStream | null {
    const audio = this.audio as HTMLAudioElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const capture = audio.captureStream ?? audio.mozCaptureStream;

    if (capture === undefined) {
      return null;
    }

    try {
      return capture.call(audio);
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.stop();
    this.audio.removeEventListener("ended", this.handleTrackEnded);
    this.audio.removeAttribute("src");
    this.audio.load();
  }

  private readonly handleTrackEnded = (): void => {
    this.selectRandomTrack();
    void this.start();
  };

  private selectRandomTrack(): void {
    if (this.trackPaths.length === 0) {
      return;
    }

    if (this.trackPaths.length === 1) {
      this.trackIndex = 0;
    } else if (this.trackIndex < 0) {
      this.trackIndex = Math.floor(Math.random() * this.trackPaths.length);
    } else {
      const nextOffset = 1 + Math.floor(Math.random() * (this.trackPaths.length - 1));
      this.trackIndex = (this.trackIndex + nextOffset) % this.trackPaths.length;
    }

    this.audio.src = this.trackPaths[this.trackIndex] ?? "";
    this.audio.load();
  }
}

function getVisualPulseIntensity(phase: number): number {
  const cycleTime = phase * visualPulseSeconds;

  if (cycleTime < visualPulseAttackSeconds) {
    return easeOutCubic(cycleTime / visualPulseAttackSeconds);
  }

  if (cycleTime < visualPulseDecaySeconds) {
    const decayProgress =
      (cycleTime - visualPulseAttackSeconds) /
      Math.max(0.001, visualPulseDecaySeconds - visualPulseAttackSeconds);
    return 1 - easeInCubic(decayProgress) * 0.82;
  }

  return 0;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function easeOutCubic(value: number): number {
  const clamped = clamp01(value);
  return 1 - (1 - clamped) ** 3;
}

function easeInCubic(value: number): number {
  const clamped = clamp01(value);
  return clamped ** 3;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
