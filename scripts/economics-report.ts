// Unit-economics report: every feature × offer, without and with VAT, central
// and worst-case cost. Exit code 1 while any violation exists (known or new).
//   npm run economics            → table of violations + summary
//   npm run economics -- --all   → every row
import { marginTable, violations, violationKey, MIN_MARGIN, FX_GBP_PER_USD, FEE_PCT, FEE_FIXED_GBP, netPerCreditGbp, offers } from "../src/config/economics";
import { KNOWN_MARGIN_VIOLATIONS } from "../src/config/economics-known";

const all = process.argv.includes("--all");
const rows = marginTable();
const viol = new Set(violations(rows).map(violationKey));
const known = new Set(KNOWN_MARGIN_VIOLATIONS);
const p = (x: number) => `${(x * 100).toFixed(2)}p`;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

console.log(`Assumptions: FX ${FX_GBP_PER_USD} GBP/USD · Stripe ${(FEE_PCT * 100).toFixed(2)}% + £${FEE_FIXED_GBP.toFixed(2)} (1 observed charge) · VAT scenario 20% inside the price · bar: central ≥${MIN_MARGIN.central * 100}% (no VAT), ≥${MIN_MARGIN.centralVat * 100}% (VAT)`);
console.log("Net revenue per credit:", offers().map((o) => `${o.key} ${p(netPerCreditGbp(o, false))} / VAT ${p(netPerCreditGbp(o, true))}`).join(" · "));
console.log("");
console.log(["status".padEnd(14), "feature@offer".padEnd(28), "cr", "revenue", "cost(c)", "margin(c)", "pct(c)", "pct(worst)", "data"].join(" | "));
for (const r of rows.filter((x) => x.scenario === "central")) {
  const key = violationKey(r);
  const worst = rows.find((x) => x.scenario === "worst" && violationKey(x) === key)!;
  const status = viol.has(key) ? (known.has(key) ? "KNOWN_FAILURE" : "NEW_FAILURE") : known.has(key) ? "FIXED" : "OK";
  if (!all && status === "OK") continue;
  console.log([status.padEnd(14), key.padEnd(28), String(r.credits).padStart(2), p(r.revenueGbp).padStart(7), p(r.costGbp).padStart(7), p(r.marginGbp).padStart(9), pct(r.marginPct).padStart(6), pct(worst.marginPct).padStart(10), `${r.status} n=${r.n}`].join(" | "));
}
const fresh = [...viol].filter((k) => !known.has(k));
const fixed = [...known].filter((k) => !viol.has(k));
console.log(`\n${viol.size} violations (${viol.size - fresh.length} KNOWN_FAILURE, ${fresh.length} NEW_FAILURE) · ${fixed.length} fixed since the list was written`);
process.exit(viol.size > 0 ? 1 : 0);
