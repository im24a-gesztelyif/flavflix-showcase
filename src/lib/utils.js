import clsx from "clsx";

export function cn(...values) {
  return clsx(values);
}

export function serializeParams(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export function formatRuntime(runtime) {
  if (!runtime || Number.isNaN(Number(runtime))) {
    return null;
  }

  const totalMinutes = Number(runtime);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatSeconds(totalSeconds) {
  if (!totalSeconds || Number.isNaN(Number(totalSeconds))) {
    return "0:00";
  }

  const value = Math.floor(Number(totalSeconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatYear(value) {
  if (!value) {
    return "TBA";
  }

  return String(value).slice(0, 4);
}

export function formatFullDate(value) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatVote(value) {
  if (value === undefined || value === null) {
    return "NR";
  }

  return Number(value).toFixed(1);
}

export function getRatingRingColor(value) {
  const score = Number(value || 0);

  if (score >= 7.5) {
    return "#3ddc97";
  }

  if (score >= 6) {
    return "#f6c870";
  }

  if (score >= 4) {
    return "#fb688f";
  }

  return "#ff7a7a";
}

export function formatPercent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const decimals = size >= 10 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

export function buildImageUrl(path, size = "w780", configuration) {
  if (!path) {
    return "/placeholder-backdrop.svg";
  }

  const base =
    configuration?.images?.secure_base_url ||
    configuration?.images?.base_url ||
    "https://image.tmdb.org/t/p/";

  return `${base}${size}${path}`;
}

export function buildPosterUrl(path, configuration) {
  if (!path) {
    return "/placeholder-poster.svg";
  }

  return buildImageUrl(path, "w500", configuration);
}

export function relativeDateLabel(value) {
  if (!value) {
    return "No recent activity";
  }

  const target = new Date(value).getTime();
  const now = Date.now();
  const diff = target - now;
  const minutes = Math.round(diff / 60000);

  if (Math.abs(minutes) < 1) {
    return "Just now";
  }

  if (Math.abs(minutes) < 60) {
    return minutes > 0 ? `In ${minutes}m` : `${Math.abs(minutes)}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return hours > 0 ? `In ${hours}h` : `${Math.abs(hours)}h ago`;
  }

  const days = Math.round(hours / 24);
  return days > 0 ? `In ${days}d` : `${Math.abs(days)}d ago`;
}
