import Image from "next/image";
import { getIconByName } from "@/lib/strapi";
import { resolveMediaUrl } from "@/lib/media";

type IconProps = {
  name?: string | null;
  size?: number;
  className?: string;
  allowFallback?: boolean;
  fallbackName?: string;
};

const isCustomIconName = (value: string) => {
  const n = String(value || "").toLowerCase();
  if (!n) return false;
  return (
    n.includes("svgviewer_") ||
    n.startsWith("inline_svg_") ||
    n.startsWith("nav_") ||
    n.startsWith("norm_") ||
    n.startsWith("mgts_") ||
    n.startsWith("media_")
  );
};

export default async function Icon({
  name,
  size = 24,
  className,
  allowFallback = true,
  fallbackName,
}: IconProps) {
  const iconName = (name || "").trim();
  if (!iconName) return null;

  const icon = await getIconByName(iconName);
  const url = resolveMediaUrl(icon?.preview || null);

  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!allowFallback) return null;

  const resolvedFallback = fallbackName || (isCustomIconName(iconName) ? "image" : iconName);
  if (!resolvedFallback) return null;

  return (
    <span
      className={`material-symbols-outlined ${className || ""}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden="true"
    >
      {resolvedFallback}
    </span>
  );
}
