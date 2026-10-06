const assetVersions = JSON.parse(process.env.NEXT_PUBLIC_STATIC_ASSET_VERSIONS || "{}");

export function staticAssetUrl(pathname, versions = assetVersions) {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return pathname;
  const url = new URL(pathname, "https://flavflix.invalid");
  const version = versions[url.pathname];
  if (!version) return pathname;
  url.searchParams.set("v", version);
  return `${url.pathname}${url.search}${url.hash}`;
}
