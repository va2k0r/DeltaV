export type DeltaVMusicVisualPulse = Readonly<{
  phase: number;
  intensity: number;
  pulseIndex: number;
  secondsPerPulse: number;
}>;

const defaultMusicTrackPath = `${import.meta.env.BASE_URL}assets/music/border242_retrosonic_original.mp3`;
const visualPulseBpm = 110;
const visualPulseSeconds = 60 / visualPulseBpm;
const visualPulseAttackSeconds = visualPulseSeconds * 0.085;
const visualPulseDecaySeconds = visualPulseSeconds * 0.56;
const visualPulseOffsetSeconds = 0.012;
const defaultMusicVolume = 0.82;

export class DeltaVMusicEngine {
  private readonly audio: HTMLAudioElement;
  private autoplayPending = false;

  constructor(trackPath = defaultMusicTrackPath) {
    this.audio = document.createElement("audio");
    this.audio.src = trackPath;
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = defaultMusicVolume;
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

    this.audio.loop = true;
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

    this.audio.loop = true;
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
    this.audio.removeAttribute("src");
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
