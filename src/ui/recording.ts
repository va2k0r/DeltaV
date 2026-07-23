export type DeltaVDebugRecordingAudioSource = Readonly<{
  label: string;
  stream: MediaStream;
  stop?: () => void;
}>;

export type DeltaVDebugRecordingStartResult = Readonly<{
  fileName: string;
  mimeType: string;
  extension: string;
  videoTrackCount: number;
  audioTrackCount: number;
  warnings: readonly string[];
}>;

export type DeltaVDebugRecordingStopResult = Readonly<{
  fileName: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  audioTrackCount: number;
  videoTrackCount: number;
}>;

type AudioContextConstructor = new () => AudioContext;

type MixedAudioStream = Readonly<{
  stream: MediaStream | null;
  stop: () => void;
  warnings: readonly string[];
}>;

type CanvasRecordingStream = Readonly<{
  stream: MediaStream;
  stop: () => void;
  warnings: readonly string[];
}>;

type ManualCanvasCaptureTrack = MediaStreamTrack & Readonly<{ requestFrame: () => void }>;

const preferredRecorderMimeTypes = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4"
] as const;

const recordingFrameRate = 30;
const recordingTimesliceMs = 1000;
const browserDownloadPathPrefix = "Browser download folder";
const renderedFrameEventName = "deltav:frame-rendered";

export class DeltaVDebugRecorder {
  private readonly getCanvas: () => HTMLCanvasElement | null;
  private readonly getAudioSources: () => readonly DeltaVDebugRecordingAudioSource[];
  private mediaRecorder: MediaRecorder | null = null;
  private activeStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private cleanupCallbacks: Array<() => void> = [];
  private startedAtMs = 0;
  private activeFileName = "";
  private activeMimeType = "";
  private activeAudioTrackCount = 0;
  private activeVideoTrackCount = 0;

  constructor(
    options: Readonly<{
      getCanvas: () => HTMLCanvasElement | null;
      getAudioSources: () => readonly DeltaVDebugRecordingAudioSource[];
    }>
  ) {
    this.getCanvas = options.getCanvas;
    this.getAudioSources = options.getAudioSources;
  }

  get isSupported(): boolean {
    return typeof MediaRecorder !== "undefined";
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  get elapsedMs(): number {
    return this.isRecording ? performance.now() - this.startedAtMs : 0;
  }

  async start(): Promise<DeltaVDebugRecordingStartResult> {
    if (this.isRecording) {
      throw new Error("Recording is already active.");
    }

    if (!this.isSupported) {
      throw new Error("MediaRecorder is not supported in this browser.");
    }

    const canvas = this.getCanvas();

    if (canvas === null) {
      throw new Error("No active game canvas is available to record.");
    }

    const canvasCapture = createCanvasRecordingStream(canvas);
    const videoStream = canvasCapture.stream;
    const videoTracks = videoStream.getVideoTracks();

    if (videoTracks.length === 0) {
      throw new Error("Canvas capture did not provide a video track.");
    }

    const cleanupCallbacks: Array<() => void> = [];
    cleanupCallbacks.push(canvasCapture.stop);
    const recordingWarnings: string[] = [...canvasCapture.warnings];

    const audioSources = this.getAudioSources();

    for (const source of audioSources) {
      if (source.stop !== undefined) {
        cleanupCallbacks.push(source.stop);
      }
    }

    const mixedAudio = await createMixedAudioStream(audioSources);
    cleanupCallbacks.push(mixedAudio.stop);

    const audioTracks = mixedAudio.stream?.getAudioTracks() ?? [];
    const stream = new MediaStream([...videoTracks, ...audioTracks]);
    const mimeType = getSupportedMediaRecorderMimeType();
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const fileName = `DeltaV_Record_${formatRecordingTimestamp(new Date())}.${extension}`;
    const recorder =
      mimeType === "" ? new MediaRecorder(stream) : new MediaRecorder(stream, { mimeType });

    this.chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

    try {
      recorder.start(recordingTimesliceMs);
    } catch (error) {
      stopMediaStream(stream);
      cleanupCallbacks.forEach((callback) => callback());
      throw error;
    }

    this.mediaRecorder = recorder;
    this.activeStream = stream;
    this.cleanupCallbacks = cleanupCallbacks;
    this.startedAtMs = performance.now();
    this.activeFileName = fileName;
    this.activeMimeType = recorder.mimeType || mimeType || "video/webm";
    this.activeAudioTrackCount = audioTracks.length;
    this.activeVideoTrackCount = videoTracks.length;

    return {
      fileName,
      mimeType: this.activeMimeType,
      extension,
      videoTrackCount: videoTracks.length,
      audioTrackCount: audioTracks.length,
      warnings: recordingWarnings
        .concat(mixedAudio.warnings)
        .filter((warning, index, warnings) => warnings.indexOf(warning) === index)
    };
  }

  async stop(): Promise<DeltaVDebugRecordingStopResult> {
    const recorder = this.mediaRecorder;

    if (recorder === null || recorder.state === "inactive") {
      throw new Error("No recording is active.");
    }

    const fileName = this.activeFileName;
    const mimeType = this.activeMimeType || recorder.mimeType || "video/webm";
    const audioTrackCount = this.activeAudioTrackCount;
    const videoTrackCount = this.activeVideoTrackCount;
    const blob = await this.stopRecorder(recorder, mimeType);
    const path = downloadRecordingBlob(blob, fileName);
    this.reset();

    return {
      fileName,
      path,
      mimeType,
      sizeBytes: blob.size,
      audioTrackCount,
      videoTrackCount
    };
  }

  private stopRecorder(recorder: MediaRecorder, mimeType: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const handleStop = () => {
        cleanup();
        resolve(new Blob(this.chunks, { type: mimeType }));
      };
      const handleError = (event: Event) => {
        cleanup();
        const error =
          event instanceof ErrorEvent && event.error instanceof Error
            ? event.error
            : new Error("MediaRecorder failed while saving.");
        reject(error);
      };
      const cleanup = () => {
        recorder.removeEventListener("stop", handleStop);
        recorder.removeEventListener("error", handleError);
      };

      recorder.addEventListener("stop", handleStop);
      recorder.addEventListener("error", handleError);

      try {
        recorder.requestData();
      } catch {
        // Some browsers do not allow requestData immediately before stop.
      }

      recorder.stop();
    });
  }

  private reset(): void {
    this.activeStream?.getTracks().forEach((track) => track.stop());
    this.cleanupCallbacks.forEach((callback) => callback());
    this.mediaRecorder = null;
    this.activeStream = null;
    this.cleanupCallbacks = [];
    this.chunks = [];
    this.startedAtMs = 0;
    this.activeFileName = "";
    this.activeMimeType = "";
    this.activeAudioTrackCount = 0;
    this.activeVideoTrackCount = 0;
  }
}

export function captureAudioElementStream(
  audio: HTMLMediaElement,
  label: string
): DeltaVDebugRecordingAudioSource | null {
  const stream = getAudioElementCaptureStream(audio);

  if (stream === null || stream.getAudioTracks().length === 0) {
    return null;
  }

  return {
    label,
    stream,
    stop: () => stopMediaStream(stream)
  };
}

export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

export function formatDebugRecordingElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createCanvasRecordingStream(sourceCanvas: HTMLCanvasElement): CanvasRecordingStream {
  if (typeof sourceCanvas.captureStream !== "function") {
    throw new Error("Canvas captureStream is not supported in this browser.");
  }

  const mirrorCanvas = document.createElement("canvas");
  const context = mirrorCanvas.getContext("2d", { alpha: false });

  if (context === null) {
    throw new Error("Cannot create a 2D recording mirror canvas.");
  }

  const warnings: string[] = [
    "Recording uses a 2D canvas mirror so WebGL frames keep advancing in MediaRecorder."
  ];
  const stream = mirrorCanvas.captureStream(0);
  const manualTracks = stream.getVideoTracks().filter(isManualCanvasCaptureTrack);
  let animationFrame = 0;
  let lastDrawnAt = 0;
  let drawWarningEmitted = false;
  let stopped = false;

  if (manualTracks.length === 0) {
    warnings.push(
      "Canvas mirror track cannot request frames manually; browser-managed capture is being used."
    );
  }

  const resizeMirror = (): void => {
    const width = Math.max(1, sourceCanvas.width || Math.floor(sourceCanvas.clientWidth) || 1);
    const height = Math.max(1, sourceCanvas.height || Math.floor(sourceCanvas.clientHeight) || 1);

    if (mirrorCanvas.width !== width || mirrorCanvas.height !== height) {
      mirrorCanvas.width = width;
      mirrorCanvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    }
  };

  const drawFrame = (now: number, force = false): void => {
    if (stopped || (!force && now - lastDrawnAt < 1000 / recordingFrameRate)) {
      return;
    }

    resizeMirror();

    try {
      context.fillStyle = "#010205";
      context.fillRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
      context.drawImage(sourceCanvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);

      for (const track of manualTracks) {
        if (track.readyState === "live") {
          track.requestFrame();
        }
      }
    } catch {
      if (!drawWarningEmitted) {
        warnings.push("Recording mirror could not draw a source frame.");
        drawWarningEmitted = true;
      }
    }

    lastDrawnAt = now;
  };

  const handleRenderedFrame = (): void => {
    drawFrame(performance.now(), true);
  };

  const tick = (now: number): void => {
    drawFrame(now);
    animationFrame = window.requestAnimationFrame(tick);
  };

  sourceCanvas.addEventListener(renderedFrameEventName, handleRenderedFrame);
  drawFrame(performance.now(), true);
  animationFrame = window.requestAnimationFrame(tick);

  return {
    stream,
    stop: () => {
      stopped = true;
      sourceCanvas.removeEventListener(renderedFrameEventName, handleRenderedFrame);
      window.cancelAnimationFrame(animationFrame);
      stopMediaStream(stream);
    },
    warnings
  };
}

function getAudioElementCaptureStream(audio: HTMLMediaElement): MediaStream | null {
  const capturableAudio = audio as HTMLMediaElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const capture = capturableAudio.captureStream ?? capturableAudio.mozCaptureStream;

  if (capture === undefined) {
    return null;
  }

  try {
    return capture.call(capturableAudio);
  } catch {
    return null;
  }
}

function isManualCanvasCaptureTrack(track: MediaStreamTrack): track is ManualCanvasCaptureTrack {
  return "requestFrame" in track && typeof track.requestFrame === "function";
}

async function createMixedAudioStream(
  sources: readonly DeltaVDebugRecordingAudioSource[]
): Promise<MixedAudioStream> {
  const audioStreams = sources
    .map((source) => source.stream)
    .filter((stream) => stream.getAudioTracks().length > 0);

  if (audioStreams.length === 0) {
    return {
      stream: null,
      stop: () => {},
      warnings: ["No active game audio stream was available; recording video only."]
    };
  }

  const AudioContextClass = getAudioContextConstructor();

  if (AudioContextClass === null) {
    const fallbackStream = new MediaStream(
      audioStreams.flatMap((stream) => stream.getAudioTracks())
    );
    return {
      stream: fallbackStream,
      stop: () => {},
      warnings: ["AudioContext is unavailable; recording raw browser audio tracks."]
    };
  }

  const context = new AudioContextClass();
  const destination = context.createMediaStreamDestination();
  const nodes: MediaStreamAudioSourceNode[] = [];
  const warnings: string[] = [];

  for (const source of sources) {
    if (source.stream.getAudioTracks().length === 0) {
      continue;
    }

    try {
      const node = context.createMediaStreamSource(source.stream);
      node.connect(destination);
      nodes.push(node);
    } catch (error) {
      warnings.push(
        `Audio source ${source.label} could not be mixed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (nodes.length === 0) {
    await context.close();
    return {
      stream: null,
      stop: () => {},
      warnings: [...warnings, "No audio source could be mixed; recording video only."]
    };
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      warnings.push(
        `Recording audio context could not resume: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return {
    stream: destination.stream,
    stop: () => {
      nodes.forEach((node) => node.disconnect());
      destination.disconnect();
      void context.close();
    },
    warnings
  };
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  const audioWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function getSupportedMediaRecorderMimeType(): string {
  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  return (
    preferredRecorderMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ""
  );
}

function downloadRecordingBlob(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return `${browserDownloadPathPrefix}/${fileName}`;
}

function formatRecordingTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
