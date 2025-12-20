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

interface WelcomeEmailProps {
  userName?: string;
  credits: number;
}

export function WelcomeEmail({ userName, credits = 15 }: WelcomeEmailProps) {
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
              {userName ? `Hey ${userName}!` : "Hey there!"} You've just unlocked the power of AI-generated game assets.
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
                Start with Weapons or Items - they're the easiest to generate!
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
                Be specific! "golden sword with glowing runes" works better than just "sword".
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Pre-made Examples */}
            <Text style={paragraph}>
              <strong>Need inspiration?</strong> Try these prompts:
            </Text>

            <Text style={examplePrompt}>
              "ancient elven sword with emerald gems and silver engravings"
            </Text>
            <Text style={examplePrompt}>
              "magical healing potion with swirling pink liquid"
            </Text>
            <Text style={examplePrompt}>
              "cute slime creature with big eyes, green and bouncy"
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
  backgroundColor: "#030305",
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
  color: "#00ff88",
};

const content = {
  backgroundColor: "#0a0a0f",
  borderRadius: "16px",
  padding: "32px",
  border: "1px solid #2a2a3d",
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
  color: "#a0a0b0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const creditsBox = {
  backgroundColor: "#00ff88",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const creditsNumber = {
  color: "#030305",
  fontSize: "48px",
  fontWeight: "bold",
  margin: "0",
  lineHeight: "1",
};

const creditsLabel = {
  color: "#030305",
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
  backgroundColor: "#00ff88",
  borderRadius: "8px",
  color: "#030305",
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
  border: "2px solid #00d4ff",
  color: "#00d4ff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#2a2a3d",
  margin: "24px 0",
};

const tipBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  border: "1px solid #2a2a3d",
};

const tipTitle = {
  color: "#00d4ff",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 4px",
};

const tipText = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0",
  lineHeight: "20px",
};

const examplePrompt = {
  backgroundColor: "#0f0f15",
  borderRadius: "6px",
  padding: "12px",
  color: "#ffffff",
  fontSize: "14px",
  fontFamily: "monospace",
  margin: "0 0 8px",
  border: "1px solid #2a2a3d",
};

const footer = {
  textAlign: "center" as const,
  padding: "24px 0 0",
};

const footerText = {
  color: "#606070",
  fontSize: "12px",
  margin: "0 0 8px",
};

const footerLinks = {
  color: "#606070",
  fontSize: "12px",
  margin: "16px 0 0",
};

const link = {
  color: "#00d4ff",
  textDecoration: "underline",
};

export default WelcomeEmail;
