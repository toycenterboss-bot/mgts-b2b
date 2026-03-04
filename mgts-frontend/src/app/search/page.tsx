import { notFound } from "next/navigation";
import PageRenderer from "@/components/page/PageRenderer";
import { resolvePageByPath } from "@/lib/strapi";

export default async function SearchPage() {
  const page =
    (await resolvePageByPath("search")) ||
    (await resolvePageByPath("search_results")) ||
    null;
  if (!page) return notFound();
  return <PageRenderer page={page} />;
}
