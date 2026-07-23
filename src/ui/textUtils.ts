export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function formatDebugRecord(record: Readonly<Record<string, number | string>>): string {
  const entries = Object.entries(record);

  if (entries.length === 0) {
    return "-";
  }

  return entries
    .slice(-5)
    .map(([key, value]) => `${key}:${value}`)
    .join(", ");
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (text.length === 0) {
    return;
  }

  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const fallback = document.createElement("textarea");
  fallback.value = text;
  fallback.style.position = "fixed";
  fallback.style.left = "-9999px";
  document.body.append(fallback);
  fallback.select();
  document.execCommand("copy");
  fallback.remove();
}
