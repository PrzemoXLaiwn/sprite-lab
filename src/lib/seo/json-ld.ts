/** JSON-LD for a script tag. Escapes `<` so a value cannot close the script element. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
