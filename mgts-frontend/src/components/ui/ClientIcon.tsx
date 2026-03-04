"use client";

type ClientIconProps = {
  name?: string | null;
  size?: number;
  className?: string;
};

export default function ClientIcon({ name, size = 20, className }: ClientIconProps) {
  const iconName = (name || "").trim();
  if (!iconName) return null;
  return (
    <span
      className={`material-symbols-outlined ${className || ""}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden="true"
    >
      {iconName}
    </span>
  );
}
