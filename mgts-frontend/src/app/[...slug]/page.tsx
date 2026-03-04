import { notFound } from "next/navigation";
import PageRenderer from "@/components/page/PageRenderer";
import { resolvePageByPath } from "@/lib/strapi";

type PageProps = {
  params: { slug: string[] } | Promise<{ slug: string[] }>;
};

export default async function CmsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slugPath = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug.join("/")
    : resolvedParams.slug;

  if (!slugPath) return notFound();

  if (slugPath.startsWith("html_pages/")) {
    return notFound();
  }

  if (slugPath.startsWith("news")) {
    return notFound();
  }

  const page = await resolvePageByPath(slugPath);
  if (!page) return notFound();

  return <PageRenderer page={page} />;
}
