import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { SIGNUP_CREDITS } from "@/config/signup";

interface WelcomeEmailProps {
  userName?: string;
  credits: number;
}

export function WelcomeEmail({ userName, credits = SIGNUP_CREDITS }: WelcomeEmailProps) {
  const previewText = `Welcome to SpriteLab! Your ${credits} free credits are ready`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>
              Sprite<span style={logoAccent}>Lab</span>
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={heading}>
              Welcome to SpriteLab!
            </Heading>

            <Text style={paragraph}>
              {userName ? `Hey ${userName}!` : "Hey there!"} Your account is ready.
            </Text>

            <Section style={creditsBox}>
              <Text style={creditsNumber}>{credits}</Text>
              <Text style={creditsLabel}>Free Credits Ready</Text>
            </Section>

            <Text style={paragraph}>
              Each credit = one unique game asset. Create swords, potions, characters,
              environments, and more in seconds!
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://sprite-lab.com/generate">
                Create Your First Asset
              </Button>
            </Section>

            <Hr style={hr} />

            {/* Quick Tips */}
            <Heading style={subheading}>Quick Start Tips</Heading>

            <Section style={tipBox}>
              <Text style={tipTitle}>1. Choose a Category</Text>
              <Text style={tipText}>
                Start with Weapons or Items &ndash; they&apos;re the easiest to generate.
              </Text>
            </Section>

            <Section style={tipBox}>
              <Text style={tipTitle}>2. Pick Your Style</Text>
              <Text style={tipText}>
                Pixel Art 16-bit is perfect for retro games. Hand Painted for modern indies.
              </Text>
            </Section>

            <Section style={tipBox}>
              <Text style={tipTitle}>3. Describe Your Asset</Text>
              <Text style={tipText}>
                Be specific: &quot;golden sword with glowing runes&quot; works better than just &quot;sword&quot;.
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Pre-made Examples */}
            <Text style={paragraph}>
              <strong>Need inspiration?</strong> Try these prompts:
            </Text>

            <Text style={examplePrompt}>
              &quot;ancient elven sword with emerald gems and silver engravings&quot;
            </Text>
            <Text style={examplePrompt}>
              &quot;magical healing potion with swirling pink liquid&quot;
            </Text>
            <Text style={examplePrompt}>
              &quot;cute slime creature with big eyes, green and bouncy&quot;
            </Text>

            <Section style={buttonContainer}>
              <Button style={buttonSecondary} href="https://sprite-lab.com/community">
                See Community Creations
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Reply to this email or check our{" "}
              <Link href="https://sprite-lab.com/help" style={link}>
                Help Center
              </Link>
            </Text>
            <Text style={footerText}>
              SpriteLab - AI Game Asset Generator
            </Text>
            <Text style={footerLinks}>
              <Link href="https://sprite-lab.com/settings" style={link}>
                Email Preferences
              </Link>
              {" | "}
              <Link href="https://sprite-lab.com/privacy" style={link}>
                Privacy Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#0F1529",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const header = {
  padding: "20px 0",
  textAlign: "center" as const,
};

const logo = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
};

const logoAccent = {
  color: "#FF9500",
};

const content = {
  backgroundColor: "#161E39",
  borderRadius: "16px",
  padding: "32px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const heading = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const subheading = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "24px 0 16px",
};

const paragraph = {
  color: "#A7ADD4",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const creditsBox = {
  backgroundColor: "#FF9500",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const creditsNumber = {
  color: "#0F1529",
  fontSize: "48px",
  fontWeight: "bold",
  margin: "0",
  lineHeight: "1",
};

const creditsLabel = {
  color: "#0F1529",
  fontSize: "14px",
  fontWeight: "600",
  margin: "8px 0 0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#FF9500",
  borderRadius: "8px",
  color: "#0F1529",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const buttonSecondary = {
  backgroundColor: "transparent",
  borderRadius: "8px",
  border: "2px solid #FF9500",
  color: "#FF9500",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "rgba(255,255,255,0.06)",
  margin: "24px 0",
};

const tipBox = {
  backgroundColor: "#0F1529",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const tipTitle = {
  color: "#FF9500",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 4px",
};

const tipText = {
  color: "#A7ADD4",
  fontSize: "14px",
  margin: "0",
  lineHeight: "20px",
};

const examplePrompt = {
  backgroundColor: "#0F1529",
  borderRadius: "6px",
  padding: "12px",
  color: "#ffffff",
  fontSize: "14px",
  fontFamily: "monospace",
  margin: "0 0 8px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const footer = {
  textAlign: "center" as const,
  padding: "24px 0 0",
};

const footerText = {
  color: "#8A92BF",
  fontSize: "12px",
  margin: "0 0 8px",
};

const footerLinks = {
  color: "#8A92BF",
  fontSize: "12px",
  margin: "16px 0 0",
};

const link = {
  color: "#FF9500",
  textDecoration: "underline",
};

export default WelcomeEmail;
