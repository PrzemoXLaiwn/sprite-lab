import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — How We Handle Your Data",
  description:
    "How SpriteLab collects, uses and protects your personal data when you generate game sprites, animations and tiles, and how to exercise your GDPR rights.",
  alternates: { canonical: "https://www.sprite-lab.com/privacy" },
  openGraph: {
    title: "Privacy Policy — How We Handle Your Data | SpriteLab",
    description: "How SpriteLab collects, uses and protects your personal data when you generate game sprites, animations and tiles, and how to exercise your GDPR rights.",
    url: "https://www.sprite-lab.com/privacy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — How We Handle Your Data | SpriteLab",
    description: "How SpriteLab collects, uses and protects your personal data when you generate game sprites, animations and tiles, and how to exercise your GDPR rights.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:pt-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{"// legal"}</p>
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.015em] text-white sm:text-[48px]">Privacy Policy</h1>
        {/* Fixed date: only change it when the text below changes. */}
        <p className="mt-4 mb-12 font-mono text-[12px] text-[#7A8294]">Last updated: 13 October 2026</p>

        <div className="max-w-none space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">1. Introduction</h2>
            <p className="text-muted-foreground">
              SpriteLab (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services at sprite-lab.com.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">2. Information We Collect</h2>
            <h3 className="mb-2 text-[16px] font-semibold text-white">2.1 Personal Information</h3>
            <p className="text-muted-foreground mb-4">When you register for an account, we collect:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Email address</li>
              <li>Name (optional)</li>
              <li>Profile picture (optional)</li>
              <li>Payment information (processed securely by Stripe)</li>
            </ul>

            <h3 className="mb-2 mt-6 text-[16px] font-semibold text-white">2.2 Usage Information</h3>
            <p className="text-muted-foreground mb-4">We automatically collect:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device information (browser type, operating system)</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Generation history and prompts</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use collected information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process your transactions</li>
              <li>Send you important updates about your account</li>
              <li>Improve our services and develop new features</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">4. Data Storage and Security</h2>
            <p className="text-muted-foreground mb-4">
              Your data is stored securely using industry-standard practices:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Authentication:</strong> Handled by Supabase with secure token-based authentication</li>
              <li><strong>Database:</strong> PostgreSQL database hosted on Supabase with encryption at rest</li>
              <li><strong>Payments:</strong> Processed by Stripe - we never store your full credit card details</li>
              <li><strong>Generated Assets:</strong> Stored securely in cloud storage</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">5. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">We use the following third-party services:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Supabase:</strong> Authentication and database</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Runware:</strong> AI image generation (your prompt and, for edits and animations, your sprite are sent to generate the result)</li>
              <li><strong>Anthropic (Claude):</strong> prompt translation, animation planning and character rigging</li>
              <li><strong>Cloudflare:</strong> image storage (R2) and backup AI generation</li>
              <li><strong>Resend:</strong> transactional and account emails</li>
              <li><strong>Vercel:</strong> website hosting and anonymous analytics</li>
              <li><strong>Google AdSense:</strong> ads on guide articles and comparisons for signed-out visitors (see Cookies)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Each of these services has their own privacy policy governing their use of your data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">6. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies to maintain your session and preferences, and privacy-friendly analytics to understand how the service is used.
            </p>
            <p className="text-muted-foreground mt-4">
              Guide articles and comparison pages show ads from Google AdSense to visitors who are not signed in. Google and its partners use cookies to serve ads based on your visits to this and other websites. You can opt out of personalised advertising in <a href="https://adssettings.google.com" className="text-[#FFB27A] underline underline-offset-2" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>; see also <a href="https://policies.google.com/technologies/ads" className="text-[#FFB27A] underline underline-offset-2" target="_blank" rel="noopener noreferrer">how Google uses data from partner sites</a>. Visitors in the UK and EEA are asked for consent before personalised ads are shown. Signed-in members never see ads. You can control cookies in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">7. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-4">If you are in the European Union, you have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Object to processing of your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at support@sprite-lab.com.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">8. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &ldquo;Last updated&rdquo; date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 scroll-mt-24 font-display text-[22px] font-semibold leading-snug text-white">11. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:support@sprite-lab.com" className="text-[#FFB27A] underline-offset-4 hover:underline">
                support@sprite-lab.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
