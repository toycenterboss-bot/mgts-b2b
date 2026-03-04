import Image from "next/image";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type SocialLinksProps = {
  group?: any;
};

export default function SocialLinks({ group }: SocialLinksProps) {
  if (!group) return null;
  const items = Array.isArray(group.items) ? group.items : [];

  return (
    <div className="social-links">
      {group.title && <div className="social-links__title">{group.title}</div>}
      {items.length > 0 && (
        <ul className="social-links__list">
          {items.map((item: any, idx: number) => {
            const iconUrl = resolveMediaUrl(item.icon || null);
            const label = item.label || item.platform || "Ссылка";
            return (
              <li key={`${label}-${idx}`} className="social-links__item">
                <a href={item.href || "#"} className="social-links__link">
                  {iconUrl && (
                    <span className="social-links__icon">
                      <Image
                        src={iconUrl}
                        alt={resolveMediaAlt(item.icon || null, label)}
                        width={24}
                        height={24}
                      />
                    </span>
                  )}
                  <span className="social-links__label">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
