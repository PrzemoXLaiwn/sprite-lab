import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - SpriteLab",
  description: "SpriteLab Terms of Service - Rules and guidelines for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using SpriteLab (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              SpriteLab is an AI-powered platform that generates game assets including 2D sprites, icons, and 3D models. Users can generate assets using text prompts and various style options.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
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
            <h2 className="text-2xl font-semibold mb-4">4. License to Generated Assets</h2>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
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
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
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
            <h2 className="text-2xl font-semibold mb-4">6. Credits and Payments</h2>
            <h3 className="text-xl font-medium mb-2">6.1 Credit System</h3>
            <p className="text-muted-foreground mb-4">
              Asset generation requires credits. Credits are consumed based on the type of generation (2D vs 3D) and model complexity.
            </p>

            <h3 className="text-xl font-medium mb-2">6.2 Subscriptions</h3>
            <p className="text-muted-foreground mb-4">
              Paid subscriptions provide monthly credit allocations. Unused credits do not roll over to the next month unless specified in your plan.
            </p>

            <h3 className="text-xl font-medium mb-2">6.3 Refunds</h3>
            <p className="text-muted-foreground">
              We offer refunds within 7 days of purchase if you have not used more than 10% of your credits. Contact support@sprite-lab.com for refund requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue the Service at any time with reasonable notice. AI model availability depends on third-party providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The SpriteLab platform, including its design, code, and branding, is owned by us and protected by intellectual property laws. Your generated assets belong to you, but the underlying technology remains our property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPRITELAB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-muted-foreground mt-4">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless SpriteLab from any claims, damages, or expenses arising from your use of the Service, your generated content, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violation of these Terms. Upon termination, your right to use the Service ceases immediately. You may delete your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by the laws of the jurisdiction in which SpriteLab operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us at:{" "}
              <a href="mailto:support@sprite-lab.com" className="text-primary hover:underline">
                support@sprite-lab.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
