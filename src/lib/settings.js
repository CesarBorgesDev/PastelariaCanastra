const KEY = "pastelaria-settings";

export const LIMITS = {
  printerPortDefault: 9100,
  printFontSizeDefault: 14,
  printFontSizeMin: 10,
  printFontSizeMax: 28,
  cardsPerRowDefault: 5,
  cardsPerRowMin: 2,
  cardsPerRowMax: 8,
  descriptionFontSizeDefault: 16,
  descriptionFontSizeMin: 12,
  descriptionFontSizeMax: 28,
};

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function loadSettings() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    stored = {};
  }
  return {
    backendUrl: typeof stored.backendUrl === "string" ? stored.backendUrl : "",
    printerIp: typeof stored.printerIp === "string" ? stored.printerIp : "",
    printerPort: clamp(stored.printerPort, 1, 65535, LIMITS.printerPortDefault),
    printFontSize: clamp(stored.printFontSize, LIMITS.printFontSizeMin, LIMITS.printFontSizeMax, LIMITS.printFontSizeDefault),
    cardsPerRow: clamp(stored.cardsPerRow, LIMITS.cardsPerRowMin, LIMITS.cardsPerRowMax, LIMITS.cardsPerRowDefault),
    descriptionFontSize: clamp(
      stored.descriptionFontSize,
      LIMITS.descriptionFontSizeMin,
      LIMITS.descriptionFontSizeMax,
      LIMITS.descriptionFontSizeDefault,
    ),
  };
}

export function saveSettings(settings) {
  const next = {
    backendUrl: String(settings.backendUrl || "").trim(),
    printerIp: String(settings.printerIp || "").trim(),
    printerPort: clamp(settings.printerPort, 1, 65535, LIMITS.printerPortDefault),
    printFontSize: clamp(settings.printFontSize, LIMITS.printFontSizeMin, LIMITS.printFontSizeMax, LIMITS.printFontSizeDefault),
    cardsPerRow: clamp(settings.cardsPerRow, LIMITS.cardsPerRowMin, LIMITS.cardsPerRowMax, LIMITS.cardsPerRowDefault),
    descriptionFontSize: clamp(
      settings.descriptionFontSize,
      LIMITS.descriptionFontSizeMin,
      LIMITS.descriptionFontSizeMax,
      LIMITS.descriptionFontSizeDefault,
    ),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
