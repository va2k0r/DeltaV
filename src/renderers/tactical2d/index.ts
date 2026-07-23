import type { BodySnapshot, NodeSnapshot, SolarSystemSnapshot, Vec2 } from "../../core";
import { worldToScreen, type CameraState, type ViewportSize } from "../../ui/input/camera";

export type TacticalRenderModel = Readonly<{
  turn: number;
  bodies: readonly BodySnapshot[];
  nodes: readonly NodeSnapshot[];
  orbitRails: readonly BodySnapshot[];
}>;

export type TacticalRenderOptions = Readonly<{
  viewport: ViewportSize;
}>;

export function createTacticalRenderModel(snapshot: SolarSystemSnapshot): TacticalRenderModel {
  return {
    turn: snapshot.turn,
    bodies: snapshot.bodies,
    nodes: snapshot.nodes,
    orbitRails: snapshot.bodies.filter((body) => body.parentId !== null && body.orbitRadius > 0)
  };
}

export function renderTacticalMap2d(
  canvas: HTMLCanvasElement,
  snapshot: SolarSystemSnapshot,
  camera: CameraState,
  options: TacticalRenderOptions
): void {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  const model = createTacticalRenderModel(snapshot);
  const bodiesById = new Map(model.bodies.map((body) => [body.id, body]));

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, options.viewport);
  drawOrbitRails(context, model, bodiesById, camera, options.viewport);
  drawNodes(context, model.nodes, camera, options.viewport);
  drawBodies(context, model.bodies, camera, options.viewport);
  drawLabels(context, model, camera, options.viewport);
}

function drawBackground(context: CanvasRenderingContext2D, viewport: ViewportSize): void {
  context.fillStyle = "#020408";
  context.fillRect(0, 0, viewport.width, viewport.height);

  context.save();
  context.fillStyle = "rgba(214, 227, 255, 0.34)";

  for (let index = 0; index < 48; index += 1) {
    const x = ((index * 317) % Math.max(1, viewport.width)) + 0.5;
    const y = ((index * 191) % Math.max(1, viewport.height)) + 0.5;
    const radius = index % 11 === 0 ? 1.1 : 0.55;
    context.globalAlpha = index % 7 === 0 ? 0.52 : 0.26;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawOrbitRails(
  context: CanvasRenderingContext2D,
  model: TacticalRenderModel,
  bodiesById: ReadonlyMap<string, BodySnapshot>,
  camera: CameraState,
  viewport: ViewportSize
): void {
  context.save();
  context.lineWidth = 1;
  context.strokeStyle = "rgba(132, 154, 178, 0.24)";

  for (const body of model.orbitRails) {
    const parentId = body.parentId;

    if (parentId === null) {
      continue;
    }

    const parent = bodiesById.get(parentId);

    if (parent === undefined) {
      continue;
    }

    const parentScreen = worldToScreen(parent.position, camera, viewport);
    const radius = body.orbitRadius * camera.zoom;

    context.beginPath();
    context.arc(parentScreen.x, parentScreen.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawNodes(
  context: CanvasRenderingContext2D,
  nodes: readonly NodeSnapshot[],
  camera: CameraState,
  viewport: ViewportSize
): void {
  context.save();

  for (const node of nodes) {
    const screen = worldToScreen(node.position, camera, viewport);
    const radius = Math.max(6, node.nodeOrbitRadius * camera.zoom);
    drawNodeRing(context, node, screen, radius);
  }

  context.restore();
}

function drawNodeRing(
  context: CanvasRenderingContext2D,
  node: NodeSnapshot,
  screen: Vec2,
  radius: number
): void {
  context.save();
  context.lineWidth = node.type === "protected" ? 1 : 1.4;

  if (node.type === "protected") {
    context.setLineDash([4, 5]);
    context.strokeStyle = "rgba(198, 205, 216, 0.62)";
    context.beginPath();
    context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    return;
  }

  if (node.type === "tritium") {
    context.strokeStyle = "rgba(126, 216, 255, 0.72)";
    context.beginPath();
    context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "rgba(126, 216, 255, 0.36)";
    context.beginPath();
    context.arc(screen.x, screen.y, radius + 3, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    return;
  }

  if (node.type === "shipyard") {
    context.strokeStyle = "rgba(241, 211, 145, 0.78)";

    for (let segment = 0; segment < 8; segment += 1) {
      const start = segment * (Math.PI / 4) + 0.08;
      const end = start + Math.PI / 6;
      context.beginPath();
      context.arc(screen.x, screen.y, radius, start, end);
      context.stroke();
    }

    context.restore();
    return;
  }

  context.strokeStyle = "rgba(154, 169, 184, 0.52)";
  context.beginPath();
  context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawBodies(
  context: CanvasRenderingContext2D,
  bodies: readonly BodySnapshot[],
  camera: CameraState,
  viewport: ViewportSize
): void {
  for (const body of bodies) {
    const screen = worldToScreen(body.position, camera, viewport);
    const radius = Math.max(body.kind === "moon" ? 2.5 : 4, body.visualRadius * camera.zoom);

    if (body.visualClass === "star") {
      drawSun(context, screen, radius);
      continue;
    }

    drawHardLitBody(context, body, screen, radius);
  }
}

function drawSun(context: CanvasRenderingContext2D, screen: Vec2, radius: number): void {
  context.save();
  const glow = context.createRadialGradient(
    screen.x,
    screen.y,
    0,
    screen.x,
    screen.y,
    radius * 2.8
  );
  glow.addColorStop(0, "rgba(255, 238, 184, 0.9)");
  glow.addColorStop(0.34, "rgba(246, 182, 83, 0.46)");
  glow.addColorStop(1, "rgba(246, 182, 83, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(screen.x, screen.y, radius * 2.8, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f6d58d";
  context.beginPath();
  context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHardLitBody(
  context: CanvasRenderingContext2D,
  body: BodySnapshot,
  screen: Vec2,
  radius: number
): void {
  context.save();
  const bodyColor = getBodyColor(body);
  const nightColor = getNightColor(body);
  const gradient = context.createRadialGradient(
    screen.x - radius * 0.42,
    screen.y - radius * 0.36,
    radius * 0.1,
    screen.x,
    screen.y,
    radius
  );
  gradient.addColorStop(0, bodyColor);
  gradient.addColorStop(0.48, bodyColor);
  gradient.addColorStop(1, nightColor);

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle =
    body.visualClass === "protected" || body.visualClass === "protectedMoon"
      ? "rgba(228, 235, 245, 0.82)"
      : "rgba(218, 230, 246, 0.36)";
  context.lineWidth = 1;
  context.stroke();

  if (body.visualClass === "gasGiant" || body.visualClass === "iceGiant") {
    drawGasGiantBands(context, screen, radius);
  }

  context.restore();
}

function drawGasGiantBands(context: CanvasRenderingContext2D, screen: Vec2, radius: number): void {
  context.save();
  context.beginPath();
  context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  context.clip();
  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = Math.max(1, radius * 0.12);

  for (let offset = -0.45; offset <= 0.45; offset += 0.3) {
    context.beginPath();
    context.moveTo(screen.x - radius, screen.y + radius * offset);
    context.lineTo(screen.x + radius, screen.y + radius * offset * 0.74);
    context.stroke();
  }

  context.restore();
}

function drawLabels(
  context: CanvasRenderingContext2D,
  model: TacticalRenderModel,
  camera: CameraState,
  viewport: ViewportSize
): void {
  const nodesByBodyId = new Map(model.nodes.map((node) => [node.bodyId, node]));
  const placedLabels: LabelBox[] = [];

  context.save();
  context.textBaseline = "top";

  for (const body of model.bodies) {
    const screen = worldToScreen(body.position, camera, viewport);
    const node = nodesByBodyId.get(body.id);
    const radius = Math.max(body.visualRadius * camera.zoom, 4);
    const title = body.name;
    const subtitle = node === undefined ? "" : getNodeLabel(node);
    const colors = {
      title: body.visualClass === "star" ? "#f6d58d" : "#dce6f3",
      subtitle: node === undefined ? "#9fb0c2" : getNodeLabelColor(node)
    };
    const label = placeLabel(context, viewport, placedLabels, screen, radius, title, subtitle);
    placedLabels.push(label);

    context.strokeStyle = "rgba(135, 157, 180, 0.28)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(screen.x, screen.y);
    context.lineTo(label.x, label.y + 9);
    context.stroke();

    context.fillStyle = "rgba(5, 10, 16, 0.78)";
    context.fillRect(label.x - 4, label.y - 3, label.width + 8, label.height + 6);

    context.font = "11px ui-sans-serif, system-ui, sans-serif";
    context.fillStyle = colors.title;
    context.fillText(title, label.x, label.y);

    if (subtitle !== "") {
      context.font = "9px ui-sans-serif, system-ui, sans-serif";
      context.fillStyle = colors.subtitle;
      context.fillText(subtitle, label.x, label.y + 13);
    }
  }

  context.restore();
}

type LabelBox = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

function placeLabel(
  context: CanvasRenderingContext2D,
  viewport: ViewportSize,
  placedLabels: readonly LabelBox[],
  anchor: Vec2,
  radius: number,
  title: string,
  subtitle: string
): LabelBox {
  context.font = "11px ui-sans-serif, system-ui, sans-serif";
  const titleWidth = context.measureText(title).width;
  context.font = "9px ui-sans-serif, system-ui, sans-serif";
  const subtitleWidth = subtitle === "" ? 0 : context.measureText(subtitle).width;
  const width = Math.ceil(Math.max(titleWidth, subtitleWidth));
  const height = subtitle === "" ? 12 : 23;
  let x = anchor.x + radius + 8;
  let y = anchor.y - height / 2;

  if (x + width > viewport.width - 8) {
    x = anchor.x - radius - width - 8;
  }

  x = Math.max(6, Math.min(x, viewport.width - width - 6));
  y = Math.max(6, Math.min(y, viewport.height - height - 6));

  const candidate = (): LabelBox => ({ x, y, width, height });
  let attempts = 0;

  while (placedLabels.some((label) => labelsOverlap(candidate(), label)) && attempts < 18) {
    y = Math.min(viewport.height - height - 6, y + height + 5);
    attempts += 1;
  }

  return candidate();
}

function labelsOverlap(first: LabelBox, second: LabelBox): boolean {
  const padding = 4;

  return (
    first.x < second.x + second.width + padding &&
    first.x + first.width + padding > second.x &&
    first.y < second.y + second.height + padding &&
    first.y + first.height + padding > second.y
  );
}

function getBodyColor(body: BodySnapshot): string {
  if (body.visualClass === "protected") {
    return "#4d8dbd";
  }

  if (body.visualClass === "protectedMoon") {
    return "#d2d7df";
  }

  if (body.visualClass === "gasGiant") {
    return "#c6ab80";
  }

  if (body.visualClass === "iceGiant") {
    return "#87b8c8";
  }

  if (body.visualClass === "dwarfBinary") {
    return "#b5ad9f";
  }

  return "#9d8f83";
}

function getNightColor(body: BodySnapshot): string {
  if (body.visualClass === "protected") {
    return "#102131";
  }

  if (body.visualClass === "protectedMoon") {
    return "#3d444e";
  }

  if (body.visualClass === "iceGiant") {
    return "#1c3340";
  }

  if (body.visualClass === "gasGiant") {
    return "#3a2d24";
  }

  return "#17191d";
}

function getNodeLabel(node: NodeSnapshot): string {
  if (node.type === "protected") {
    return "PROTECTED";
  }

  if (node.type === "tritium") {
    return "TRITIUM";
  }

  if (node.type === "shipyard") {
    return "SHIPYARD";
  }

  return "BARREN";
}

function getNodeLabelColor(node: NodeSnapshot): string {
  if (node.type === "protected") {
    return "#c6cdd8";
  }

  if (node.type === "tritium") {
    return "#8bdfff";
  }

  if (node.type === "shipyard") {
    return "#f1d391";
  }

  return "#9aa9b8";
}
