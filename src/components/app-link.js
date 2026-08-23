"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function canStartNavigation(event, href, target) {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (target && target !== "_self") {
    return false;
  }

  if (typeof href !== "string" || !href.startsWith("/")) {
    return false;
  }

  return true;
}

export function AppLink({ href, onClick, prefetch = false, target, ...props }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleClick(event) {
    onClick?.(event);

    if (!canStartNavigation(event, href, target)) {
      return;
    }

    const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    const targetUrl = new URL(href, window.location.origin);
    const nextUrl = `${targetUrl.pathname}${targetUrl.search}`;

    if (nextUrl === currentUrl) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent("flavflix:navigation-start", {
        detail: {
          href: nextUrl,
        },
      }),
    );
  }

  return <Link href={href} onClick={handleClick} prefetch={prefetch} target={target} {...props} />;
}
