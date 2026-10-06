export function getFullscreenElement(hostDocument = document) {
  return hostDocument.fullscreenElement || hostDocument.webkitFullscreenElement || hostDocument.msFullscreenElement;
}

export async function togglePlayerFullscreen(root, hostDocument = document) {
  if (!root) return;
  if (getFullscreenElement(hostDocument)) {
    const exit = hostDocument.exitFullscreen || hostDocument.webkitExitFullscreen || hostDocument.msExitFullscreen;
    if (!exit) throw new Error("Fullscreen is not supported in this browser.");
    await exit.call(hostDocument);
  } else {
    const enter = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
    if (!enter) throw new Error("Fullscreen is not supported in this browser.");
    await enter.call(root);
  }
}

export function bindPlayerFullscreenControls({ onToggle, hostWindow = window }) {
  function handleKeydown(event) {
    const target = event.target;
    if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable ||
        event.key?.toLowerCase() !== "f") return;
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  }

  hostWindow.addEventListener("keydown", handleKeydown, true);
  return () => {
    hostWindow.removeEventListener("keydown", handleKeydown, true);
  };
}
