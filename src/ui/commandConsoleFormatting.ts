import type { FactionId } from "../core";

export type CommandConsoleTextPart = Readonly<{
  text: string;
  className?: string | undefined;
}>;

export function formatDvForConsole(value: number): string {
  return String(Math.max(0, Math.round(value))).padStart(2, "0");
}

export function formatTurnForConsole(turn: number): string {
  return String(Math.max(1, Math.round(turn) + 1)).padStart(2, "0");
}

export function getCommandFactionClass(factionId: FactionId): string {
  if (factionId === "player") {
    return "command-console__faction-player";
  }

  return factionId === "ai_2"
    ? "command-console__faction-ai-2"
    : "command-console__faction-opponent";
}

export function getCommandContestedClass(className?: string): string {
  const contestedClass = "command-console__event-contested";

  return className === undefined || className.length <= 0
    ? contestedClass
    : className.includes(contestedClass)
      ? className
      : `${className} ${contestedClass}`;
}

export function createCommandConsoleTextParts(
  text: string,
  className?: string
): readonly CommandConsoleTextPart[] {
  const contestedTokenPattern = /\bCONTESTED\b/g;
  const parts: CommandConsoleTextPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = contestedTokenPattern.exec(text);

  while (match !== null) {
    const index = match.index;

    if (index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, index),
        className
      });
    }

    parts.push({
      text: match[0],
      className: getCommandContestedClass(className)
    });
    lastIndex = index + match[0].length;
    match = contestedTokenPattern.exec(text);
  }

  if (parts.length <= 0) {
    return [{ text, className }];
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      className
    });
  }

  return parts;
}
