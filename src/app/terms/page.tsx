import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Credits & Asset Use",
  description:
    "The terms for using SpriteLab, the AI game asset generator: accounts, credits and payments, acceptable use and your license to the assets you generate.",
  alternates: { canonical: "https://www.sprite-lab.com/terms" },
  openGraph: {
    title: "Terms of Service — Credits & Asset Use | SpriteLab",
    description: "The terms for using SpriteLab, the AI game asset generator: accounts, credits and payments, acceptable use and your license to the assets you generate.",
    url: "https://www.sprite-lab.com/terms",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — Credits & Asset Use | SpriteLab",
    description: "The terms for using SpriteLab, the AI game asset generator: accounts, credits and payments, acceptable use and your license to the assets you generate.",
  },
};

export default function TermsPage() {
  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:pt-20">
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.015em] text-white sm:text-[48px]">Terms of Service</h1>
        {/* Fixed date: only change it when the text below changes. */}
        <p className="mt-4 mb-12 font-mono text-[12px] text-[#8A92BF]">Last updated: 12 October 2026</p>

        <div className="max-w-none space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using SpriteLab (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">2. Description of Service</h2>
            <p className="text-muted-foreground">
              SpriteLab is an AI-powered platform that generates 2D game assets including sprites, sprite animations, tiles and icons. Users can generate assets using text prompts and various style options.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">3. Account Registration</h2>
            <p className="text-muted-foreground mb-4">To use our Service, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Create an account with a valid email address</li>
              <li>Be at least 13 years of age</li>
              <li>Provide accurate and complete information</li>
              <li>Keep your account credentials secure</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">4. License to Generated Assets</h2>
            <div className="mb-4 rounded-2xl border border-[#FFA300]/25 bg-[#FFA300]/[0.06] p-4">
              <p className="text-foreground font-medium">
                You own all assets you generate using SpriteLab. You receive a perpetual, worldwide, royalty-free license to use generated assets for any purpose, including commercial use.
              </p>
            </div>
            <p className="text-muted-foreground mb-4">Specifically, you may:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use generated assets in commercial games and products</li>
              <li>Modify, edit, and transform generated assets</li>
              <li>Distribute generated assets as part of your projects</li>
              <li>Sell products containing generated assets</li>
            </ul>
            <p className="text-muted-foreground mt-4">You may NOT:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Resell generated assets as standalone asset packs</li>
              <li>Claim AI-generated assets as hand-made artwork</li>
              <li>Use assets to create content that violates laws or rights of others</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">5. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Generate illegal, harmful, or offensive content</li>
              <li>Create content that infringes on intellectual property rights</li>
              <li>Generate content depicting real people without consent</li>
              <li>Attempt to bypass usage limits or security measures</li>
              <li>Reverse engineer or extract the underlying AI models</li>
              <li>Resell or redistribute access to the Service</li>
              <li>Use automated systems to abuse the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">6. Credits and Payments</h2>
            <h3 className="mb-2 text-[16px] font-semibold text-white">6.1 Credit System</h3>
            <p className="text-muted-foreground mb-4">
              Asset generation requires credits. Credits are consumed based on the type of generation (for example standard or HD quality, and the number of animation frames).
            </p>

            <h3 className="mb-2 text-[16px] font-semibold text-white">6.2 Subscriptions</h3>
            <p className="text-muted-foreground mb-4">
              Paid subscriptions provide monthly credit allocations. Unused credits do not roll over to the next month unless specified in your plan.
            </p>

            <h3 className="mb-2 text-[16px] font-semibold text-white">6.3 Refunds</h3>
            <p className="text-muted-foreground">
              We offer refunds within 7 days of purchase if you have not used more than 10% of your credits. Contact spritelab.contact@gmail.com for refund requests.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">7. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue the Service at any time with reasonable notice. AI model availability depends on third-party providers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The SpriteLab platform, including its design, code, and branding, is owned by us and protected by intellectual property laws. Your generated assets belong to you, but the underlying technology remains our property.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPRITELAB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-muted-foreground mt-4">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless SpriteLab from any claims, damages, or expenses arising from your use of the Service, your generated content, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">11. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violation of these Terms. Upon termination, your right to use the Service ceases immediately. You may delete your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by the laws of the jurisdiction in which SpriteLab operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">14. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at:{" "}
              <a href="mailto:spritelab.contact@gmail.com" className="text-[#FFC857] underline-offset-4 hover:underline">
                spritelab.contact@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
