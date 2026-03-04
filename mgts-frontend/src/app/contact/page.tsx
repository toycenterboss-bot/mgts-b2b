import { notFound } from "next/navigation";
import PageRenderer from "@/components/page/PageRenderer";
import { resolvePageByPath } from "@/lib/strapi";

export default async function ContactPage() {
  const page =
    (await resolvePageByPath("contact")) ||
    (await resolvePageByPath("contact_details")) ||
    null;
  if (!page) return notFound();
  return <PageRenderer page={page} />;
}
