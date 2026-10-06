import Image from "next/image";
import { cn } from "@/lib/utils";
import { staticAssetUrl } from "@/lib/static-assets";

export function BrandLogo({ className, priority = false, alt = "FlavFlix" }) {
  return (
    <Image
      src={staticAssetUrl("/flavflix_primary_logo.png")}
      alt={alt}
      width={1180}
      height={550}
      priority={priority}
      className={cn("h-auto w-[180px]", className)}
    />
  );
}
