import fs from "node:fs";
import path from "node:path";

type TemplateBlockOptions = {
  stripFooter?: boolean;
};

const TEMPLATE_ROOT = path.resolve(process.cwd(), "..", "design", "html_pages");

const templateFilesByTemplate: Record<string, string> = {
  TPL_Home: "tpl_home.html",
  TPL_Segment_Landing: "tpl_segment_landing.html",
  TPL_Service: "tpl_service.html",
  TPL_Scenario: "tpl_scenario.html",
  TPL_News_List: "tpl_news_list.html",
  TPL_News_Detail: "tpl_news_detail.html",
  TPL_Contact_Hub: "tpl_contact_hub.html",
  TPL_CMS_Page: "tpl_cms_page.html",
  TPL_Doc_Page: "tpl_doc_page.html",
  TPL_Form_Page: "tpl_form_page.html",
  TPL_Search_Results: "tpl_search_results.html",
  TPL_AI_Chat: "tpl_ai_chat.html",
  TPL_DeepNav: "tpl_deepnav.html",
  TPL_Career_List: "page_career.html",
  TPL_Career_Detail: "page_career.html",
};

const fileCache = new Map<string, string>();

const loadTemplateFile = (fileName: string) => {
  if (fileCache.has(fileName)) return fileCache.get(fileName) || "";
  const fullPath = path.join(TEMPLATE_ROOT, fileName);
  if (!fs.existsSync(fullPath)) return "";
  const html = fs.readFileSync(fullPath, "utf-8");
  fileCache.set(fileName, html);
  return html;
};

const extractBlock = (html: string, blockName: string) => {
  if (!html) return "";
  const startPattern = new RegExp(`<section[^>]*data-stitch-block=\\"${blockName}\\"[^>]*>`, "i");
  const startMatch = html.match(startPattern);
  if (!startMatch || startMatch.index == null) return "";
  const startIdx = startMatch.index;
  const openTag = startMatch[0];
  let idx = startIdx + openTag.length;
  let depth = 1;
  while (idx < html.length) {
    const nextOpen = html.indexOf("<section", idx);
    const nextClose = html.indexOf("</section>", idx);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      idx = nextOpen + 8;
      continue;
    }
    depth -= 1;
    idx = nextClose + "</section>".length;
    if (depth === 0) {
      return html.slice(startIdx, idx);
    }
  }
  return "";
};

const stripScripts = (html: string) =>
  html.replace(new RegExp("<script[\\s\\S]*?<\\/script>", "gi"), "");

const stripFooter = (html: string) =>
  html.replace(new RegExp("<footer[\\s\\S]*?<\\/footer>", "gi"), "");

const resolveTemplateFile = (templateOrFile: string) => {
  const value = String(templateOrFile || "").trim();
  if (!value) return "";
  if (value.endsWith(".html")) return value;
  return templateFilesByTemplate[value] || "";
};

export const getTemplateBlockHtml = (
  templateOrFile: string,
  blockName: string,
  options: TemplateBlockOptions = {}
) => {
  const fileName = resolveTemplateFile(templateOrFile);
  if (!fileName) return "";
  const html = loadTemplateFile(fileName);
  const block = extractBlock(html, blockName);
  if (!block) return "";
  let out = stripScripts(block);
  if (options.stripFooter) out = stripFooter(out);
  return out;
};
