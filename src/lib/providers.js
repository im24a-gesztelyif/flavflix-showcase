export const PROVIDER_OPTIONS = [
  {
    id: "showcase",
    label: "Public showcase",
    description: "Playback is disabled in the public learning repository.",
    supportsProgress: false,
    supportsAutoplay: false,
  },
];

export function buildProviderUrl() {
  return null;
}
export function resolveProviderId() {
  return "showcase";
}

export function getProviderMetadata() {
  return PROVIDER_OPTIONS[0];
}

export function getProviderOrder() {
  return ["showcase"];
}
