import { notFound } from "next/navigation";
import PageRenderer from "@/components/page/PageRenderer";
import { resolvePageByPath } from "@/lib/strapi";

export default async function AiChatPage() {
  const page = await resolvePageByPath("ai-chat");
  if (!page) return notFound();
  return <PageRenderer page={page} />;
}
