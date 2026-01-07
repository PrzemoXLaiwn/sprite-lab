import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface NewFeaturesEmailProps {
  userName?: string;
  features: Array<{
    title: string;
    description: string;
    emoji: string;
  }>;
  ctaText?: string;
  ctaUrl?: string;
}

export function NewFeaturesEmail({
  userName,
  features = [],
  ctaText = "Try It Now",
  ctaUrl = "https://sprite-lab.com/generate",
}: NewFeaturesEmailProps) {
  const previewText = `New in SpriteLab: ${features[0]?.title || "Exciting updates!"}`;

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
            <Section style={announcementBadge}>
              <Text style={badgeText}>🎉 NEW UPDATE</Text>
            </Section>

            <Heading style={heading}>
              {userName ? `${userName}, check out what's new!` : "Check out what's new!"}
            </Heading>

            <Text style={introText}>
              We've been working hard to make SpriteLab even better. Here's what's new:
            </Text>

            {/* Features List */}
            {features.map((feature, i) => (
              <Section key={i} style={featureBox}>
                <Text style={featureEmoji}>{feature.emoji}</Text>
                <Text style={featureTitle}>{feature.title}</Text>
                <Text style={featureDescription}>{feature.description}</Text>
              </Section>
            ))}

            <Hr style={hr} />

            {/* CTA */}
            <Section style={buttonContainer}>
              <Button style={button} href={ctaUrl}>
                {ctaText}
              </Button>
            </Section>

            <Text style={feedbackText}>
              Have feedback? Reply to this email - we read every message! 💬
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              SpriteLab - AI Game Asset Generator
            </Text>
            <Text style={footerLinks}>
              <Link href="https://sprite-lab.com/settings" style={link}>
                Email Preferences
              </Link>
              {" | "}
              <Link href="https://sprite-lab.com/changelog" style={link}>
                Full Changelog
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

const announcementBadge = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const badgeText = {
  display: "inline-block",
  backgroundColor: "#00ff88",
  color: "#030305",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "6px 16px",
  borderRadius: "20px",
  margin: "0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const heading = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const introText = {
  color: "#a0a0b0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const featureBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "16px",
  border: "1px solid #2a2a3d",
  textAlign: "center" as const,
};

const featureEmoji = {
  fontSize: "32px",
  margin: "0 0 12px",
};

const featureTitle = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 8px",
};

const featureDescription = {
  color: "#a0a0b0",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
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

const feedbackText = {
  color: "#606070",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#2a2a3d",
  margin: "24px 0",
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

export default NewFeaturesEmail;
