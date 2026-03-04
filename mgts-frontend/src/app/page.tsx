import PageRenderer from "@/components/page/PageRenderer";
import { getPageBySlug } from "@/lib/strapi";

export default async function Home() {
  const page = await getPageBySlug("home");
  return <PageRenderer page={page} />;
}
