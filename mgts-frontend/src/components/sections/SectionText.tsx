import { resolveMediaUrl } from "@/lib/media";
import SocialLinks from "@/components/ui/SocialLinks";

type SectionTextProps = {
  section: any;
};

export default function SectionText({ section }: SectionTextProps) {
  const hideShell = section?.isVisible === false;
  const isContactExtra = section?.title === "Дополнительно";
  const isDetailsDoc = section?.title === "Подробнее";
  const extractSingleLink = (html: string) => {
    if (!html) return null;
    const linkPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const matches = html.match(linkPattern) || [];
    if (matches.length !== 1) return null;
    const linkMatch = matches[0].match(/href=["']([^"']+)["']/i);
    const textMatch = matches[0].replace(/<[^>]+>/g, "").trim();
    if (!linkMatch || !linkMatch[1]) return null;
    return { href: linkMatch[1], text: textMatch };
  };
  const docLink = isDetailsDoc ? extractSingleLink(section?.content || "") : null;
  const normalizeMarkdown = (input: string) =>
    String(input || "").replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  const buildNumberedListHtml = (raw: string) => {
    const lines = String(raw || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const html: string[] = [];
    let items: string[] = [];
    const flush = () => {
      if (!items.length) return;
      html.push(`<ol class="cms-numbered-list">${items.map((item) => `<li>${item}</li>`).join("")}</ol>`);
      items = [];
    };
    for (const line of lines) {
      const match = line.match(/^\d+[.)]\s+(.*)$/);
      if (match) {
        items.push(normalizeMarkdown(match[1] || ""));
      } else {
        flush();
        html.push(`<p>${normalizeMarkdown(line)}</p>`);
      }
    }
    flush();
    return html.join("\n");
  };
  const formatContentHtml = (raw: string) => {
    const input = String(raw || "");
    if (!input.trim()) return "";
    const looksLikeHtml = /<[^>]+>/.test(input);
    if (!looksLikeHtml && /^\s*\d+[.)]\s+/m.test(input)) {
      return buildNumberedListHtml(input);
    }
    return normalizeMarkdown(input);
  };
  const contentHtml = formatContentHtml(section?.content || "");
  const hasInlineLinks = /<a\\s/i.test(contentHtml);
  const getDocMeta = (href: string) => {
    const clean = href.split("?")[0];
    const ext = (clean.split(".").pop() || "").toLowerCase();
    if (ext.includes("pdf")) return { icon: "picture_as_pdf", color: "text-red-500", bg: "bg-red-500/10", label: "PDF" };
    if (ext.includes("doc")) return { icon: "description", color: "text-accent-text", bg: "bg-blue-500/10", label: "DOCX" };
    if (ext.includes("xls") || ext.includes("csv"))
      return { icon: "table_chart", color: "text-amber-500", bg: "bg-amber-500/10", label: "XLSX" };
    if (ext.includes("zip") || ext.includes("rar"))
      return { icon: "inventory_2", color: "text-accent-text", bg: "bg-primary/10", label: "ARCHIVE" };
    return { icon: "insert_drive_file", color: "text-fg-subtle", bg: "bg-fg-subtle/10", label: ext.toUpperCase() || "DOC" };
  };
  const docMeta = docLink ? getDocMeta(docLink.href) : null;
  const bgUrl = resolveMediaUrl(section.backgroundImage || null);
  const style: Record<string, string> = {};
  if (!hideShell) {
    if (bgUrl) {
      style.backgroundImage = `url('${bgUrl}')`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
      style.backgroundRepeat = "no-repeat";
    }
    if (section.backgroundColor) {
      style.backgroundColor = section.backgroundColor;
    }
  }

  return (
    <section
      className={`section-text${
        hideShell ? " border-0 bg-transparent p-0 rounded-none" : " rounded-2xl border border-fg/10 bg-fg/5 p-6"
      }${isContactExtra ? " contact-details" : ""}`}
      style={style}
      data-section-title={section?.title || undefined}
    >
      {section.title && (
        <h2 className="section-text__title text-fg dark:text-fg text-3xl font-bold tracking-tight mb-4">
          {section.title}
        </h2>
      )}
      {section.subtitle && (
        <p className="section-text__subtitle text-fg-subtle dark:text-fg-muted text-base leading-relaxed mb-4">
          {section.subtitle}
        </p>
      )}
      {docLink && docMeta && (
        <div className="flex items-center justify-between p-4 bg-surface-2 border border-fg/10 rounded-xl">
          <div className="flex items-center gap-4">
            <div className={`size-10 flex items-center justify-center rounded-lg ${docMeta.bg} ${docMeta.color}`}>
              <span className="material-symbols-outlined">{docMeta.icon}</span>
            </div>
            <div>
              <h5 className="text-sm font-bold leading-none mb-1 text-fg">{docLink.text || "Документ"}</h5>
              <p className="text-xs text-fg-muted">{docMeta.label}</p>
            </div>
          </div>
          <a
            className="size-9 flex items-center justify-center border border-fg/10 text-fg-muted rounded-lg hover:bg-primary hover:text-on-primary hover:border-primary transition-all"
            href={docLink.href}
            target="_blank"
            rel="noreferrer"
            download
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </a>
        </div>
      )}
      {!docLink && section.content && (
        <div
          className="section-text__content cms-text-content prose prose-lg max-w-none text-fg dark:text-fg prose-p:leading-relaxed prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
      {section.socialLinks && !hasInlineLinks && <SocialLinks group={section.socialLinks} />}
    </section>
  );
}
