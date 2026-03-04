import { getTemplateBlockHtml } from "@/lib/templateBlocks";

type TemplateBlockProps = {
  section: {
    block?: string | null;
    template?: string | null;
    stripFooter?: boolean;
  };
};

export default function TemplateBlock({ section }: TemplateBlockProps) {
  const blockName = String(section?.block || "").trim();
  const template = String(section?.template || "").trim();
  if (!blockName || !template) return null;

  const html = getTemplateBlockHtml(template, blockName, {
    stripFooter: section?.stripFooter,
  });

  if (!html) return null;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
