// All dimensions and offsets are in CSS pixels. Right/bottom move fullscreen inward.
// Mobile: below 768px. Desktop: 768px and above (Tailwind's md breakpoint).
// These settings apply in both normal playback and FlavFlix fullscreen.
// Header buttons: "from" selects the screen edge; "offset" is the distance from it.
// Back besideWatchOptions: true ignores Back's position and groups it with Watch Options.
// upperShadow enables the fading top gradient while the header controls are visible.
export const BUTTON_CONFIG = {
  cinesrc: {
    fullscreen: {
      mobile: { width: 48, height: 48, right: 0, bottom: 0 },
      desktop: { width: 70, height: 64, right: 0, bottom: 0 },
    },
    back: {
      besideWatchOptions: false,
      mobile: { from: "left", offset: 12 },
      desktop: { from: "left", offset: 32 },
    },
    watchOptions: {
      mobile: { from: "right", offset: 12 },
      desktop: { from: "right", offset: 125 },
    },
    upperShadow: false,
  },
  vidfast: {
    fullscreen: {
      mobile: { width: 48, height: 48, right: 0, bottom: 0 },
      desktop: { width: 64, height: 64, right: 40, bottom: 30 },
    },
    back: {
      besideWatchOptions: false,
      mobile: { from: "left", offset: 12 },
      desktop: { from: "left", offset: 100 },
    },
    watchOptions: {
      mobile: { from: "right", offset: 12 },
      desktop: { from: "right", offset: 100 },
    },
    upperShadow: false,
  },
  vidlove: {
    fullscreen: {
      mobile: { width: 48, height: 48, right: 0, bottom: 0 },
      desktop: { width: 53, height: 64, right: 0, bottom: 0 },
    },
    back: {
      besideWatchOptions: false,
      mobile: { from: "left", offset: 12 },
      desktop: { from: "left", offset: 32 },
    },
    watchOptions: {
      mobile: { from: "right", offset: 12 },
      desktop: { from: "right", offset: 70 },
    },
    upperShadow: false,
  },
  vixsrc: {
    fullscreen: {
      mobile: { width: 48, height: 48, right: 0, bottom: 0 },
      desktop: { width: 72, height: 60, right: 0, bottom: 0 },
    },
    back: {
      besideWatchOptions: false,
      mobile: { from: "left", offset: 12 },
      desktop: { from: "left", offset: 32 },
    },
    watchOptions: {
      mobile: { from: "right", offset: 12 },
      desktop: { from: "right", offset: 32 },
    },
    upperShadow: false,
  },
  vidsrc: {
    fullscreen: {
      mobile: { width: 48, height: 48, right: 0, bottom: 0 },
      desktop: { width: 50, height: 53, right: 0, bottom: 0 },
    },
    back: {
      besideWatchOptions: true,
      mobile: { from: "left", offset: 12 },
      desktop: { from: "left", offset: 32 },
    },
    watchOptions: {
      mobile: { from: "right", offset: 12 },
      desktop: { from: "right", offset: 32 },
    },
    upperShadow: false,
  },
};

export function getButtonConfig(providerId) {
  return BUTTON_CONFIG[providerId] ?? BUTTON_CONFIG.cinesrc;
}

export function getFullscreenButtonStyle(providerId) {
  const config = getButtonConfig(providerId).fullscreen;
  const style = {};
  for (const viewport of ["mobile", "desktop"]) {
    for (const property of ["width", "height", "right", "bottom"]) {
      const value = config[viewport][property];
      style[`--fullscreen-${viewport}-${property}`] = typeof value === "number" ? `${value}px` : value;
    }
  }
  return style;
}

export function getHeaderButtonStyle(providerId, button) {
  const provider = getButtonConfig(providerId);
  const config = button === "back" && !provider.back.besideWatchOptions ? provider.back : provider.watchOptions;
  const style = {};
  for (const viewport of ["mobile", "desktop"]) {
    const { from, offset } = config[viewport];
    const distance = typeof offset === "number" ? `${offset}px` : offset;
    style[`--header-${viewport}-left`] = from === "left" ? distance : "auto";
    style[`--header-${viewport}-right`] = from === "right" ? distance : "auto";
    // Keep Watch Options on its configured edge and Back beside it, toward the center.
    style[`--header-${viewport}-direction`] = from === "left" ? "row-reverse" : "row";
  }
  return style;
}
