// Relaunch campaign helper (run with: npx tsx scripts/relaunch-email.ts <command>)
//   preview [out.html]  render the email for the top recipient → HTML file (sends nothing)
//   count               how many accounts are still waiting for the email
//   test you@example.com  send ONE test email to that address (uses that account if it exists)
import { writeFileSync } from "fs";
import { resolve } from "path";
import { render } from "@react-email/render";
import { createElement } from "react";
import { prisma } from "../src/lib/prisma";
import { RelaunchEmail } from "../src/lib/email/templates/RelaunchEmail";
import { relaunchRecipients, relaunchEmailProps, countRelaunchRemaining } from "../src/lib/email/relaunch-campaign";
import { sendRelaunchEmail } from "../src/lib/email/send";

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "count") {
    console.log("Accounts waiting for the relaunch email:", await countRelaunchRemaining());
  } else if (cmd === "preview") {
    const [top] = await relaunchRecipients(1);
    if (!top) return console.log("No recipients left.");
    let html = await render(createElement(RelaunchEmail, relaunchEmailProps(top)));
    // Images aren't deployed yet — point them at the local files for the preview
    for (const dir of ["showcase", "email"]) {
      html = html.replaceAll(`https://www.sprite-lab.com/${dir}/`, `file:///${resolve("public", dir).replace(/\\/g, "/")}/`);
    }
    const out = arg ?? "relaunch-preview.html";
    writeFileSync(out, html);
    console.log(`Preview for ${top.email.replace(/^(.).*@/, "$1***@")} → ${out}`);
  } else if (cmd === "test" && arg?.includes("@")) {
    const user = await prisma.user.findUnique({ where: { email: arg }, select: { id: true, name: true } });
    const res = await sendRelaunchEmail(arg, user?.id ?? "test", relaunchEmailProps({
      id: user?.id ?? "test", email: arg, name: user?.name ?? null, lastPrompt: "fire dragon breathing flames",
    }), { campaignId: "relaunch-test" });
    console.log(res);
  } else {
    console.log("Usage: preview [out.html] | count | test you@example.com");
  }
  await prisma.$disconnect();
})();
