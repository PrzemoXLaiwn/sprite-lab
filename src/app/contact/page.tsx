import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";
import { SUPPORT_EMAIL } from "@/config/contact";

const SITE = "https://www.sprite-lab.com";
const URL = `${SITE}/contact`;
const DESCRIPTION =
  "Contact SpriteLab: email support about bugs, billing and refunds, account and privacy requests, feature ideas or press.";

export const metadata: Metadata = {
  title: { absolute: "Contact SpriteLab — Support, Billing and Feedback | SpriteLab" },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: "Contact SpriteLab", description: DESCRIPTION, url: URL, type: "website" },
};

function mailto(subject: string, body: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Each topic opens the visitor's mail app with a subject and a short template. */
const TOPICS: { title: string; when: string; include: string[]; subject: string; template: string }[] = [
  {
    title: "Something is broken",
    when: "A generation failed, an export does not import, a page shows an error.",
    include: [
      "What you did, step by step, and what you expected",
      "The device and browser (for example Windows 11, Chrome)",
      "For export problems: the engine and its version",
      "A screenshot if the page showed an error",
    ],
    subject: "Bug report",
    template: "What I did:\n\nWhat I expected:\n\nWhat happened instead:\n\nDevice and browser:\n",
  },
  {
    title: "Billing and refunds",
    when: "A charge you do not recognise, a plan change, or a refund request.",
    include: [
      "The email address of your SpriteLab account",
      "The date and amount of the payment",
      "What you would like us to do",
    ],
    subject: "Billing question",
    template: "Account email:\n\nPayment date and amount:\n\nQuestion:\n",
  },
  {
    title: "Account and privacy",
    when: "Access to, correction or export of your data, or anything else under GDPR.",
    include: ["The email address of your SpriteLab account", "Which right you want to exercise"],
    subject: "Privacy request",
    template: "Account email:\n\nRequest:\n",
  },
  {
    title: "Ideas and feedback",
    when: "A feature you need for your game, an engine you want supported, or something that annoyed you.",
    include: ["What you are making and in which engine", "What you tried and where it fell short"],
    subject: "Feedback",
    template: "My game / engine:\n\nWhat I'd like:\n",
  },
];

export default function ContactPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact SpriteLab",
      description: DESCRIPTION,
      url: URL,
      mainEntity: {
        "@type": "Organization",
        name: "SpriteLab",
        url: SITE,
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: SUPPORT_EMAIL, availableLanguage: ["English"] },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SpriteLab", item: SITE },
        { "@type": "ListItem", position: 2, name: "Contact", item: URL },
      ],
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#131A31] text-[#FFF1E8]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteNav />

      <section className="relative pb-24 pt-28 sm:pt-36">
        <div className="relative mx-auto max-w-3xl px-5">
          <h1 className="mt-4 font-display text-[38px] font-semibold leading-[1.06] text-white sm:text-[52px]">
            Contact SpriteLab
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#A7ADD4]">
            The fastest way to reach us is email. Everything — support, billing, privacy and feedback — goes to one
            inbox:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-5 inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-xl border border-[#FFA300]/25 bg-[#FFA300]/[0.06] px-4 py-2.5 font-mono text-[15px] text-[#FFC857] transition hover:bg-[#FFA300]/[0.12]"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{SUPPORT_EMAIL}</span>
          </a>
          <p className="mt-4 text-[15px] leading-relaxed text-[#9AA1CC]">
            Write in English if you can; other languages are fine too. Pick a topic below to open your mail app with
            a subject and a short template already filled in.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <li key={t.title} className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#212B4E] p-5">
                <h2 className="text-[17px] font-semibold text-white">{t.title}</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#A7ADD4]">{t.when}</p>
                <p className="mt-4 text-[12.5px] text-[#9AA1CC] font-semibold">please include</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-[#C8CCE8] marker:text-[#FFA300]">
                  {t.include.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <a
                  href={mailto(t.subject, t.template)}
                  className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-[#FFF1E8] transition hover:bg-white/[0.08]"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email about this
                </a>
              </li>
            ))}
          </ul>

          <section className="mt-14">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-white">Before you write</h2>
            <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[15.5px] leading-relaxed text-[#C8CCE8] marker:text-[#FFA300]">
              <li>
                Failed generations refund their credits automatically — check your balance before asking for a manual
                refund.
              </li>
              <li>
                Payment refunds are available within 7 days of purchase if you have used no more than 10% of the
                credits; the full rules are in the{" "}
                <Link href="/terms" className="text-[#FFC857] underline underline-offset-2">terms</Link>.
              </li>
              <li>
                You can delete your account yourself under Settings → Delete account. How we handle your data is
                described in the <Link href="/privacy" className="text-[#FFC857] underline underline-offset-2">privacy policy</Link>.
              </li>
              <li>
                Questions about importing sprites into Godot, Unity or GameMaker are often answered in the{" "}
                <Link href="/guides" className="text-[#FFC857] underline underline-offset-2">guides</Link>, and how the app
                works is explained on <Link href="/how-it-works" className="text-[#FFC857] underline underline-offset-2">how it works</Link>.
              </li>
            </ul>
          </section>

          <p className="mt-12 text-[14.5px] leading-relaxed text-[#9AA1CC]">
            Want to know who is behind SpriteLab and how the assets are made? See the{" "}
            <Link href="/about" className="text-[#FFC857] underline underline-offset-2">about page</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
