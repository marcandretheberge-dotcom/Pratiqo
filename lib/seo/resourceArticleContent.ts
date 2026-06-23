import { readFileSync } from "node:fs";
import { join } from "node:path";

const CONTENT_DIR = join(process.cwd(), "content", "ressources");

export function loadResourceArticleMarkdown(markdownFile: string): string {
  return readFileSync(join(CONTENT_DIR, markdownFile), "utf8");
}
