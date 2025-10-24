import fs from "fs/promises";
import path from "path";
import ejs from "ejs";
import mjml2html from "mjml";

export const getHtmlFromMjmlTemplate = async (template, data) => {
  const mjmlData = await fs.readFile(
    path.join(import.meta.dirname, "..", "emails", `${template}.mjml`),
    "utf-8"
  );

  const htmlTemplate = ejs.render(mjmlData, data);

  const html = mjml2html(htmlTemplate).html;

  return html;
};
