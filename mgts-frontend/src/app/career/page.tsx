import { notFound } from "next/navigation";
import PageRenderer from "@/components/page/PageRenderer";
import { resolvePageByPath } from "@/lib/strapi";

export default async function CareerPage() {
  const page =
    (await resolvePageByPath("career")) ||
    (await resolvePageByPath("career_list")) ||
    null;
  if (!page) return notFound();
  return <PageRenderer page={page} />;
}
