export type DeltaVSfxKey =
  | "system.audioUnlock"
  | "system.save"
  | "system.error"
  | "ui.hoverNode"
  | "ui.hoverCommand"
  | "ui.select"
  | "ui.deselect"
  | "ui.confirm"
  | "ui.cancel"
  | "ui.invalid"
  | "ui.warning"
  | "ui.criticalWarning"
  | "ui.panelOpen"
  | "ui.panelClose"
  | "ui.pause"
  | "ui.resume"
  | "ui.menuOpen"
  | "ui.menuClose"
  | "ui.toggle"
  | "ui.slider"
  | "ui.toast"
  | "ui.toastImportant"
  | "queue.add"
  | "queue.remove"
  | "queue.edit"
  | "turn.execute"
  | "turn.advance"
  | "turn.ready"
  | "simulation.recalculate"
  | "planning.burnStart"
  | "planning.burnTargetHover"
  | "planning.burnInvalidTarget"
  | "planning.burnValid"
  | "planning.burnCommit"
  | "planning.burnTension"
  | "event.burnExecute"
  | "event.arrival"
  | "event.rendezvous"
  | "event.nearMiss"
  | "event.impact"
  | "event.shipLost"
  | "event.shipLaunch"
  | "ship.select"
  | "ship.command"
  | "shipyard.select"
  | "shipyard.work"
  | "shipyard.complete"
  | "resource.gain"
  | "resource.spend"
  | "resource.insufficient"
  | "resource.vertexGain"
  | "resource.vertexSpend"
  | "resource.cortexGain"
  | "resource.cortexSpend"
  | "objective.complete"
  | "objective.failed"
  | "game.failure"
  | "game.victory"
  | "camera.scaleMarker"
  | "camera.focusChanged"
  | "camera.cinematicEnter"
  | "camera.cinematicExit"
  | "camera.horizonAssist";

export type DeltaVSfxContinuousKey = Extract<DeltaVSfxKey, "planning.burnTension">;

export type DeltaVSfxOptions = Readonly<{
  intensity?: number;
  amount?: number;
  variant?: number;
}>;

export type DeltaVSfxCaptureStream = Readonly<{
  stream: MediaStream;
  stop: () => void;
}>;

export type DeltaVSfxSettings = Readonly<{
  enabled: boolean;
  muted: boolean;
  masterVolume: number;
  uiVolume: number;
  eventVolume: number;
  zenMode: boolean;
}>;

type DeltaVSfxBus = "ui" | "event";
type DeltaVSfxZenBehavior = "allow" | "quiet" | "mute";

type DeltaVSfxDefinition = Readonly<{
  bus: DeltaVSfxBus;
  cooldownMs: number;
  zen: DeltaVSfxZenBehavior;
}>;

type AudioContextConstructor = new () => AudioContext;

type ContinuousBurnLayer = Readonly<{
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}>;

const deltaVSfxSettingsStorageKey = "deltav.sfx.settings.v1";
const maxSimultaneousOneShots = 18;
const minimumEnvelopeGain = 0.0001;
const noiseBufferSeconds = 1;

export const defaultDeltaVSfxSettings: DeltaVSfxSettings = {
  enabled: false,
  muted: false,
  masterVolume: 0.42,
  uiVolume: 0.58,
  eventVolume: 0.7,
  zenMode: false
};

export const deltaVSfxDefinitions: Record<DeltaVSfxKey, DeltaVSfxDefinition> = {
  "system.audioUnlock": { bus: "ui", cooldownMs: 5000, zen: "allow" },
  "system.save": { bus: "ui", cooldownMs: 900, zen: "mute" },
  "system.error": { bus: "event", cooldownMs: 900, zen: "allow" },
  "ui.hoverNode": { bus: "ui", cooldownMs: 110, zen: "mute" },
  "ui.hoverCommand": { bus: "ui", cooldownMs: 130, zen: "mute" },
  "ui.select": { bus: "ui", cooldownMs: 55, zen: "quiet" },
  "ui.deselect": { bus: "ui", cooldownMs: 75, zen: "quiet" },
  "ui.confirm": { bus: "ui", cooldownMs: 90, zen: "quiet" },
  "ui.cancel": { bus: "ui", cooldownMs: 100, zen: "quiet" },
  "ui.invalid": { bus: "ui", cooldownMs: 420, zen: "quiet" },
  "ui.warning": { bus: "event", cooldownMs: 1400, zen: "allow" },
  "ui.criticalWarning": { bus: "event", cooldownMs: 2200, zen: "allow" },
  "ui.panelOpen": { bus: "ui", cooldownMs: 160, zen: "quiet" },
  "ui.panelClose": { bus: "ui", cooldownMs: 160, zen: "quiet" },
  "ui.pause": { bus: "ui", cooldownMs: 240, zen: "quiet" },
  "ui.resume": { bus: "ui", cooldownMs: 240, zen: "quiet" },
  "ui.menuOpen": { bus: "ui", cooldownMs: 200, zen: "quiet" },
  "ui.menuClose": { bus: "ui", cooldownMs: 200, zen: "quiet" },
  "ui.toggle": { bus: "ui", cooldownMs: 80, zen: "quiet" },
  "ui.slider": { bus: "ui", cooldownMs: 260, zen: "mute" },
  "ui.toast": { bus: "ui", cooldownMs: 850, zen: "mute" },
  "ui.toastImportant": { bus: "event", cooldownMs: 900, zen: "allow" },
  "queue.add": { bus: "ui", cooldownMs: 120, zen: "quiet" },
  "queue.remove": { bus: "ui", cooldownMs: 140, zen: "quiet" },
  "queue.edit": { bus: "ui", cooldownMs: 120, zen: "mute" },
  "turn.execute": { bus: "event", cooldownMs: 520, zen: "allow" },
  "turn.advance": { bus: "event", cooldownMs: 220, zen: "quiet" },
  "turn.ready": { bus: "event", cooldownMs: 260, zen: "allow" },
  "simulation.recalculate": { bus: "ui", cooldownMs: 900, zen: "mute" },
  "planning.burnStart": { bus: "ui", cooldownMs: 220, zen: "quiet" },
  "planning.burnTargetHover": { bus: "ui", cooldownMs: 150, zen: "mute" },
  "planning.burnInvalidTarget": { bus: "ui", cooldownMs: 320, zen: "quiet" },
  "planning.burnValid": { bus: "ui", cooldownMs: 250, zen: "quiet" },
  "planning.burnCommit": { bus: "event", cooldownMs: 130, zen: "allow" },
  "planning.burnTension": { bus: "ui", cooldownMs: 0, zen: "quiet" },
  "event.burnExecute": { bus: "event", cooldownMs: 180, zen: "allow" },
  "event.arrival": { bus: "event", cooldownMs: 200, zen: "allow" },
  "event.rendezvous": { bus: "event", cooldownMs: 240, zen: "allow" },
  "event.nearMiss": { bus: "event", cooldownMs: 320, zen: "allow" },
  "event.impact": { bus: "event", cooldownMs: 260, zen: "allow" },
  "event.shipLost": { bus: "event", cooldownMs: 420, zen: "allow" },
  "event.shipLaunch": { bus: "event", cooldownMs: 280, zen: "allow" },
  "ship.select": { bus: "ui", cooldownMs: 80, zen: "quiet" },
  "ship.command": { bus: "ui", cooldownMs: 110, zen: "quiet" },
  "shipyard.select": { bus: "ui", cooldownMs: 100, zen: "quiet" },
  "shipyard.work": { bus: "event", cooldownMs: 300, zen: "quiet" },
  "shipyard.complete": { bus: "event", cooldownMs: 400, zen: "allow" },
  "resource.gain": { bus: "event", cooldownMs: 220, zen: "quiet" },
  "resource.spend": { bus: "event", cooldownMs: 180, zen: "quiet" },
  "resource.insufficient": { bus: "ui", cooldownMs: 420, zen: "quiet" },
  "resource.vertexGain": { bus: "event", cooldownMs: 260, zen: "quiet" },
  "resource.vertexSpend": { bus: "event", cooldownMs: 260, zen: "quiet" },
  "resource.cortexGain": { bus: "event", cooldownMs: 260, zen: "quiet" },
  "resource.cortexSpend": { bus: "event", cooldownMs: 260, zen: "quiet" },
  "objective.complete": { bus: "event", cooldownMs: 1200, zen: "allow" },
  "objective.failed": { bus: "event", cooldownMs: 1200, zen: "allow" },
  "game.failure": { bus: "event", cooldownMs: 2200, zen: "allow" },
  "game.victory": { bus: "event", cooldownMs: 2200, zen: "allow" },
  "camera.scaleMarker": { bus: "ui", cooldownMs: 1200, zen: "mute" },
  "camera.focusChanged": { bus: "ui", cooldownMs: 260, zen: "mute" },
  "camera.cinematicEnter": { bus: "ui", cooldownMs: 420, zen: "quiet" },
  "camera.cinematicExit": { bus: "ui", cooldownMs: 420, zen: "quiet" },
  "camera.horizonAssist": { bus: "ui", cooldownMs: 2000, zen: "mute" }
};

export class DeltaVSfxEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private eventGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activeOneShots = 0;
  private hasPlayedUnlock = false;
  private readonly lastPlayedAtByKey = new Map<DeltaVSfxKey, number>();
  private continuousBurnLayer: ContinuousBurnLayer | null = null;
  private settings: DeltaVSfxSettings;

  constructor(settings: DeltaVSfxSettings = loadDeltaVSfxSettings()) {
    this.settings = settings;
  }

  get isSupported(): boolean {
    return this.getAudioContextConstructor() !== null;
  }

  get isUnlocked(): boolean {
    return this.audioContext?.state === "running";
  }

  get currentSettings(): DeltaVSfxSettings {
    return this.settings;
  }

  get debugState(): string {
    const contextState = this.audioContext?.state ?? "uninitialized";
    return `SFX ${this.settings.enabled ? "ON" : "OFF"} ${this.settings.muted ? "MUTED" : "LIVE"} ${
      this.settings.zenMode ? "ZEN" : "FULL"
    } ${contextState}`;
  }

  async unlock(): Promise<boolean> {
    if (!this.settings.enabled || this.settings.muted || !this.isSupported) {
      return false;
    }

    const context = this.ensureAudioContext();

    if (context === null) {
      return false;
    }

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    const unlocked = context.state === "running";

    if (unlocked && !this.hasPlayedUnlock) {
      this.hasPlayedUnlock = true;
      this.playNow("system.audioUnlock", {});
    }

    return unlocked;
  }

  play(key: DeltaVSfxKey, options: DeltaVSfxOptions = {}): boolean {
    if (key === "planning.burnTension") {
      this.updateContinuous(key, options);
      return true;
    }

    return this.playNow(key, options);
  }

  updateContinuous(key: DeltaVSfxContinuousKey, options: DeltaVSfxOptions = {}): void {
    if (key !== "planning.burnTension" || !this.canPlay("planning.burnTension")) {
      this.stopContinuous(key);
      return;
    }

    const context = this.audioContext;

    if (context === null || context.state !== "running") {
      return;
    }

    const layer = this.ensureBurnTensionLayer(context);

    if (layer === null) {
      return;
    }

    const intensity = clamp01(options.intensity ?? 0.35);
    const zenMultiplier = this.getZenGainMultiplier("planning.burnTension");
    const now = context.currentTime;
    layer.oscillator.frequency.setTargetAtTime(86 + intensity * 58, now, 0.08);
    layer.filter.frequency.setTargetAtTime(520 + intensity * 740, now, 0.12);
    layer.gain.gain.setTargetAtTime(0.008 * zenMultiplier * (0.35 + intensity * 0.65), now, 0.18);
  }

  stopContinuous(key: DeltaVSfxContinuousKey): void {
    if (key !== "planning.burnTension" || this.continuousBurnLayer === null) {
      return;
    }

    const context = this.audioContext;
    const layer = this.continuousBurnLayer;
    this.continuousBurnLayer = null;

    if (context === null) {
      layer.oscillator.stop();
      layer.oscillator.disconnect();
      layer.filter.disconnect();
      layer.gain.disconnect();
      return;
    }

    const now = context.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setTargetAtTime(0, now, 0.08);
    layer.oscillator.stop(now + 0.28);
    window.setTimeout(() => {
      layer.oscillator.disconnect();
      layer.filter.disconnect();
      layer.gain.disconnect();
    }, 360);
  }

  toggleMuted(): DeltaVSfxSettings {
    return this.updateSettings({ muted: !this.settings.muted });
  }

  toggleZenMode(): DeltaVSfxSettings {
    return this.updateSettings({ zenMode: !this.settings.zenMode });
  }

  updateSettings(overrides: Partial<DeltaVSfxSettings>): DeltaVSfxSettings {
    this.settings = normalizeDeltaVSfxSettings({ ...this.settings, ...overrides });
    saveDeltaVSfxSettings(this.settings);
    this.syncBusVolumes();

    if (!this.settings.enabled || this.settings.muted || this.settings.zenMode) {
      this.stopContinuous("planning.burnTension");
    }

    return this.settings;
  }

  dispose(): void {
    this.stopContinuous("planning.burnTension");
    this.masterGain?.disconnect();
    this.uiGain?.disconnect();
    this.eventGain?.disconnect();
    this.limiter?.disconnect();
    void this.audioContext?.close();
    this.audioContext = null;
  }

  createCaptureStream(): DeltaVSfxCaptureStream | null {
    const context = this.audioContext ?? this.ensureAudioContext();

    if (context === null || this.limiter === null) {
      return null;
    }

    const destination = context.createMediaStreamDestination();
    this.limiter.connect(destination);
    let isStopped = false;

    return {
      stream: destination.stream,
      stop: () => {
        if (isStopped) {
          return;
        }

        isStopped = true;

        try {
          this.limiter?.disconnect(destination);
        } catch {
          // The limiter may already be gone during app teardown.
        }

        destination.disconnect();
      }
    };
  }

  private playNow(key: DeltaVSfxKey, options: DeltaVSfxOptions): boolean {
    if (!this.canPlay(key) || !this.isCooldownReady(key)) {
      return false;
    }

    const context = this.audioContext ?? this.ensureAudioContext();

    if (context === null || context.state !== "running") {
      if (context?.state === "suspended") {
        void context
          .resume()
          .then(() => {
            if (
              context.state !== "running" ||
              !this.canPlay(key) ||
              !this.isCooldownReady(key) ||
              this.activeOneShots >= maxSimultaneousOneShots
            ) {
              return;
            }

            this.lastPlayedAtByKey.set(key, performance.now());
            this.renderSfxKey(context, key, options);
          })
          .catch(() => {
            // Browser autoplay policy can reject resume attempts outside trusted gestures.
          });
      }
      return false;
    }

    if (this.activeOneShots >= maxSimultaneousOneShots) {
      return false;
    }

    this.lastPlayedAtByKey.set(key, performance.now());
    this.renderSfxKey(context, key, options);
    return true;
  }

  private canPlay(key: DeltaVSfxKey): boolean {
    if (!this.settings.enabled || this.settings.muted || !this.isSupported) {
      return false;
    }

    const definition = deltaVSfxDefinitions[key];
    return !(this.settings.zenMode && definition.zen === "mute");
  }

  private isCooldownReady(key: DeltaVSfxKey): boolean {
    const definition = deltaVSfxDefinitions[key];
    const lastPlayedAt = this.lastPlayedAtByKey.get(key);

    return lastPlayedAt === undefined || performance.now() - lastPlayedAt >= definition.cooldownMs;
  }

  private renderSfxKey(context: AudioContext, key: DeltaVSfxKey, options: DeltaVSfxOptions): void {
    const intensity = clamp01(options.intensity ?? 0.5);
    const variant = options.variant ?? Math.random();

    switch (key) {
      case "system.audioUnlock":
        this.playTelemetryPair(context, "ui", 660, 880, 0.012, 0.16);
        return;
      case "ui.hoverNode":
        this.playTone(context, "ui", 980 + variant * 260, 0.026, 0.0048, "triangle");
        return;
      case "ui.hoverCommand":
        this.playTone(context, "ui", 760 + variant * 180, 0.038, 0.0065, "triangle");
        return;
      case "ui.select":
        this.playTone(context, "ui", 720 + variant * 160, 0.09, 0.014, "sine");
        return;
      case "ship.select":
        this.playTone(context, "ui", 1020 + variant * 180, 0.085, 0.012, "sine");
        return;
      case "shipyard.select":
        this.playTone(context, "ui", 520 + variant * 90, 0.11, 0.012, "triangle");
        return;
      case "ui.deselect":
      case "ui.panelClose":
      case "ui.menuClose":
        this.playGlide(context, "ui", 420, 260, 0.11, 0.009, "sine");
        return;
      case "ui.cancel":
      case "queue.remove":
        this.playGlide(context, "ui", 360, 240, 0.13, 0.012, "triangle");
        return;
      case "ui.confirm":
      case "queue.add":
      case "ship.command":
        this.playRelay(context, "ui", intensity);
        this.playTelemetryPair(context, "ui", 620, 760, 0.01, 0.11);
        return;
      case "queue.edit":
      case "ui.toggle":
      case "ui.slider":
      case "system.save":
        this.playTone(context, "ui", 690 + variant * 140, 0.05, 0.007, "triangle");
        return;
      case "ui.panelOpen":
      case "ui.menuOpen":
        this.playTelemetryPair(context, "ui", 420, 610, 0.009, 0.12);
        return;
      case "ui.pause":
        this.playTone(context, "ui", 280, 0.07, 0.008, "triangle");
        return;
      case "ui.resume":
        this.playTone(context, "ui", 470, 0.07, 0.008, "triangle");
        return;
      case "ui.invalid":
      case "planning.burnInvalidTarget":
      case "resource.insufficient":
        this.playInvalid(context);
        return;
      case "ui.warning":
        this.playWarning(context, 0.7);
        return;
      case "ui.criticalWarning":
      case "system.error":
        this.playWarning(context, 1);
        this.playNoiseBurst(context, "event", 0.12, 0.012, 900, "bandpass");
        return;
      case "ui.toast":
        this.playTone(context, "ui", 640, 0.065, 0.007, "sine");
        return;
      case "ui.toastImportant":
        this.playTelemetryPair(context, "event", 520, 700, 0.012, 0.14);
        return;
      case "turn.execute":
        this.playExecute(context);
        return;
      case "turn.advance":
        this.playTone(context, "event", 210, 0.08, 0.012, "triangle");
        this.playTone(context, "event", 520, 0.045, 0.006, "sine", 0.035);
        return;
      case "turn.ready":
        this.playTelemetryPair(context, "event", 500, 660, 0.014, 0.18);
        return;
      case "simulation.recalculate":
        this.playDataShimmer(context, "ui", 0.006);
        return;
      case "planning.burnStart":
      case "camera.cinematicEnter":
        this.playGlide(context, "ui", 180, 310, 0.18, 0.01, "triangle");
        return;
      case "planning.burnTargetHover":
      case "planning.burnValid":
      case "camera.focusChanged":
        this.playTone(context, "ui", 820 + intensity * 180, 0.075, 0.011, "sine");
        return;
      case "planning.burnCommit":
        this.playLowPulse(context, "event", 72 + intensity * 26, 0.16, 0.018 + intensity * 0.01);
        this.playTone(context, "event", 540 + intensity * 180, 0.16, 0.011, "sine", 0.045);
        return;
      case "event.burnExecute":
        this.playLowPulse(context, "event", 62, 0.18, 0.018);
        this.playNoiseBurst(context, "event", 0.11, 0.01, 380, "lowpass");
        return;
      case "event.arrival":
      case "event.rendezvous":
        this.playTelemetryChord(context, "event", [440, 554, 660], 0.018, 0.28);
        return;
      case "event.nearMiss":
        this.playGlide(context, "event", 520, 230, 0.18, 0.014, "triangle");
        this.playNoiseBurst(context, "event", 0.12, 0.008, 760, "bandpass");
        return;
      case "event.impact":
        this.playImpact(context, 0.8 + intensity * 0.2);
        return;
      case "event.shipLost":
        this.playImpact(context, 1);
        this.playGlide(context, "event", 300, 120, 0.42, 0.013, "sine", 0.05);
        return;
      case "event.shipLaunch":
        this.playTelemetryPair(context, "event", 470, 720, 0.015, 0.22);
        this.playRelay(context, "event", 0.35);
        return;
      case "shipyard.work":
        this.playRelay(context, "event", 0.25);
        return;
      case "shipyard.complete":
      case "objective.complete":
        this.playTelemetryChord(context, "event", [392, 494, 622], 0.018, 0.46);
        return;
      case "resource.gain":
      case "resource.vertexGain":
      case "resource.cortexGain":
        this.playGlide(
          context,
          "event",
          520,
          key === "resource.cortexGain" ? 920 : 720,
          0.12,
          0.01
        );
        return;
      case "resource.spend":
      case "resource.vertexSpend":
      case "resource.cortexSpend":
        this.playGlide(
          context,
          "event",
          key === "resource.cortexSpend" ? 820 : 640,
          380,
          0.1,
          0.009
        );
        return;
      case "objective.failed":
      case "game.failure":
        this.playGlide(context, "event", 360, 120, key === "game.failure" ? 1.2 : 0.44, 0.02);
        this.playNoiseBurst(
          context,
          "event",
          key === "game.failure" ? 0.5 : 0.18,
          0.012,
          420,
          "lowpass"
        );
        return;
      case "game.victory":
        this.playTelemetryChord(context, "event", [330, 495, 660, 880], 0.018, 1.2);
        return;
      case "camera.scaleMarker":
      case "camera.cinematicExit":
        this.playTone(context, "ui", 320, 0.1, 0.007, "sine");
        return;
      case "camera.horizonAssist":
      case "planning.burnTension":
        return;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext !== null) {
      return this.audioContext;
    }

    const AudioContextClass = this.getAudioContextConstructor();

    if (AudioContextClass === null) {
      return null;
    }

    const context = new AudioContextClass();
    this.masterGain = context.createGain();
    this.uiGain = context.createGain();
    this.eventGain = context.createGain();
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -18;
    this.limiter.knee.value = 18;
    this.limiter.ratio.value = 7;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.16;
    this.uiGain.connect(this.masterGain);
    this.eventGain.connect(this.masterGain);
    this.masterGain.connect(this.limiter);
    this.limiter.connect(context.destination);
    this.audioContext = context;
    this.syncBusVolumes();
    return context;
  }

  private getAudioContextConstructor(): AudioContextConstructor | null {
    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

    return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
  }

  private syncBusVolumes(): void {
    const master = this.settings.enabled && !this.settings.muted ? this.settings.masterVolume : 0;
    this.masterGain?.gain.setTargetAtTime(master, this.audioContext?.currentTime ?? 0, 0.03);
    this.uiGain?.gain.setTargetAtTime(
      this.settings.uiVolume,
      this.audioContext?.currentTime ?? 0,
      0.03
    );
    this.eventGain?.gain.setTargetAtTime(
      this.settings.eventVolume,
      this.audioContext?.currentTime ?? 0,
      0.03
    );
  }

  private getBusNode(bus: DeltaVSfxBus): GainNode | null {
    return bus === "ui" ? this.uiGain : this.eventGain;
  }

  private getZenGainMultiplier(key: DeltaVSfxKey): number {
    if (!this.settings.zenMode) {
      return 1;
    }

    return deltaVSfxDefinitions[key].zen === "quiet" ? 0.42 : 1;
  }

  private playTone(
    context: AudioContext,
    bus: DeltaVSfxBus,
    frequency: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
    delay = 0
  ): void {
    const busNode = this.getBusNode(bus);

    if (busNode === null) {
      return;
    }

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(minimumEnvelopeGain, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(minimumEnvelopeGain, gain), start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(minimumEnvelopeGain, start + duration);
    oscillator.connect(envelope);
    envelope.connect(busNode);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    this.trackOneShot(oscillator, envelope, duration + delay + 0.08);
  }

  private playGlide(
    context: AudioContext,
    bus: DeltaVSfxBus,
    fromFrequency: number,
    toFrequency: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
    delay = 0
  ): void {
    const busNode = this.getBusNode(bus);

    if (busNode === null) {
      return;
    }

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(fromFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, toFrequency), start + duration);
    envelope.gain.setValueAtTime(minimumEnvelopeGain, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(minimumEnvelopeGain, gain), start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(minimumEnvelopeGain, start + duration);
    oscillator.connect(envelope);
    envelope.connect(busNode);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    this.trackOneShot(oscillator, envelope, duration + delay + 0.08);
  }

  private playNoiseBurst(
    context: AudioContext,
    bus: DeltaVSfxBus,
    duration: number,
    gain: number,
    frequency: number,
    filterType: BiquadFilterType
  ): void {
    const busNode = this.getBusNode(bus);

    if (busNode === null) {
      return;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = this.getNoiseBuffer(context);
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === "bandpass" ? 6 : 0.7;
    envelope.gain.setValueAtTime(minimumEnvelopeGain, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(minimumEnvelopeGain, gain),
      context.currentTime + 0.008
    );
    envelope.gain.exponentialRampToValueAtTime(minimumEnvelopeGain, context.currentTime + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(busNode);
    source.start();
    source.stop(context.currentTime + duration + 0.02);
    this.trackOneShot(source, envelope, duration + 0.08, filter);
  }

  private playTelemetryPair(
    context: AudioContext,
    bus: DeltaVSfxBus,
    firstFrequency: number,
    secondFrequency: number,
    gain: number,
    duration: number
  ): void {
    this.playTone(context, bus, firstFrequency, duration * 0.46, gain, "sine");
    this.playTone(
      context,
      bus,
      secondFrequency,
      duration * 0.54,
      gain * 0.86,
      "sine",
      duration * 0.32
    );
  }

  private playTelemetryChord(
    context: AudioContext,
    bus: DeltaVSfxBus,
    frequencies: readonly number[],
    gain: number,
    duration: number
  ): void {
    frequencies.forEach((frequency, index) => {
      this.playTone(
        context,
        bus,
        frequency,
        duration,
        gain / Math.max(1, frequencies.length),
        "sine",
        index * 0.035
      );
    });
  }

  private playRelay(context: AudioContext, bus: DeltaVSfxBus, intensity: number): void {
    this.playTone(context, bus, 260 + intensity * 80, 0.028, 0.0065, "triangle");
    this.playNoiseBurst(context, bus, 0.036, 0.0048, 1600, "bandpass");
  }

  private playInvalid(context: AudioContext): void {
    const zenMultiplier = this.getZenGainMultiplier("ui.invalid");
    this.playLowPulse(context, "ui", 185, 0.12, 0.012 * zenMultiplier);
    this.playNoiseBurst(context, "ui", 0.09, 0.006 * zenMultiplier, 560, "bandpass");
  }

  private playWarning(context: AudioContext, intensity: number): void {
    this.playLowPulse(context, "event", 95, 0.18, 0.013 + intensity * 0.006);
    this.playTone(
      context,
      "event",
      760 + intensity * 180,
      0.11,
      0.008 + intensity * 0.004,
      "sine",
      0.04
    );
    this.playTone(context, "event", 690 + intensity * 90, 0.12, 0.006, "triangle", 0.18);
  }

  private playExecute(context: AudioContext): void {
    this.playLowPulse(context, "event", 64, 0.22, 0.026);
    this.playRelay(context, "event", 0.7);
    this.playTone(context, "event", 310, 0.34, 0.009, "triangle", 0.08);
    this.playTone(context, "event", 620, 0.18, 0.007, "sine", 0.18);
  }

  private playImpact(context: AudioContext, intensity: number): void {
    this.playLowPulse(context, "event", 52, 0.24, 0.024 * intensity);
    this.playNoiseBurst(context, "event", 0.16, 0.014 * intensity, 460, "lowpass");
    this.playNoiseBurst(context, "event", 0.08, 0.006 * intensity, 1800, "bandpass");
  }

  private playLowPulse(
    context: AudioContext,
    bus: DeltaVSfxBus,
    frequency: number,
    duration: number,
    gain: number
  ): void {
    this.playTone(context, bus, frequency, duration, gain, "sine");
  }

  private playDataShimmer(context: AudioContext, bus: DeltaVSfxBus, gain: number): void {
    this.playTone(context, bus, 740, 0.035, gain, "sine");
    this.playTone(context, bus, 910, 0.04, gain * 0.7, "sine", 0.03);
    this.playTone(context, bus, 610, 0.04, gain * 0.65, "triangle", 0.065);
  }

  private ensureBurnTensionLayer(context: AudioContext): ContinuousBurnLayer | null {
    if (this.continuousBurnLayer !== null) {
      return this.continuousBurnLayer;
    }

    const busNode = this.getBusNode("ui");

    if (busNode === null) {
      return null;
    }

    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 92;
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.55;
    gain.gain.value = 0;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(busNode);
    oscillator.start();
    this.continuousBurnLayer = { oscillator, filter, gain };
    return this.continuousBurnLayer;
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer !== null) {
      return this.noiseBuffer;
    }

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * noiseBufferSeconds));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  private trackOneShot(
    source: AudioScheduledSourceNode,
    envelope: AudioNode,
    lifetimeSeconds: number,
    extraNode?: AudioNode
  ): void {
    this.activeOneShots += 1;
    let released = false;
    const release = () => {
      if (released) {
        return;
      }

      released = true;
      source.disconnect();
      envelope.disconnect();
      extraNode?.disconnect();
      this.activeOneShots = Math.max(0, this.activeOneShots - 1);
    };

    source.addEventListener("ended", release);
    window.setTimeout(release, Math.ceil(lifetimeSeconds * 1000) + 500);
  }
}

export function loadDeltaVSfxSettings(): DeltaVSfxSettings {
  try {
    const rawSettings = window.localStorage.getItem(deltaVSfxSettingsStorageKey);

    if (rawSettings === null) {
      return defaultDeltaVSfxSettings;
    }

    return normalizeDeltaVSfxSettings(JSON.parse(rawSettings));
  } catch {
    return defaultDeltaVSfxSettings;
  }
}

export function saveDeltaVSfxSettings(settings: DeltaVSfxSettings): void {
  window.localStorage.setItem(deltaVSfxSettingsStorageKey, JSON.stringify(settings));
}

function normalizeDeltaVSfxSettings(value: unknown): DeltaVSfxSettings {
  const record = isRecord(value) ? value : {};

  return {
    enabled:
      typeof record["enabled"] === "boolean" ? record["enabled"] : defaultDeltaVSfxSettings.enabled,
    muted: typeof record["muted"] === "boolean" ? record["muted"] : defaultDeltaVSfxSettings.muted,
    masterVolume: normalizeVolume(record["masterVolume"], defaultDeltaVSfxSettings.masterVolume),
    uiVolume: normalizeVolume(record["uiVolume"], defaultDeltaVSfxSettings.uiVolume),
    eventVolume: normalizeVolume(record["eventVolume"], defaultDeltaVSfxSettings.eventVolume),
    zenMode:
      typeof record["zenMode"] === "boolean" ? record["zenMode"] : defaultDeltaVSfxSettings.zenMode
  };
}

function normalizeVolume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
