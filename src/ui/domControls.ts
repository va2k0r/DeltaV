import type { SolarSystemData } from "../data";

export function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

export function createDebugModeButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "debug-button";
  button.textContent = label;
  return button;
}

export function populateFocusSelect(select: HTMLSelectElement, content: SolarSystemData): void {
  select.innerHTML = "";
  select.append(createOption("", "Focus"));

  for (const body of content.bodies) {
    select.append(createOption(`body:${body.id}`, body.name));
  }

  for (const node of content.nodes) {
    const body = content.bodies.find((candidate) => candidate.id === node.bodyId);

    if (body === undefined) {
      continue;
    }

    select.append(createOption(`node:${node.id}`, `${body.name} ${node.type}`));
  }
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
  if (canvas.classList.contains("is-hidden")) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
}
