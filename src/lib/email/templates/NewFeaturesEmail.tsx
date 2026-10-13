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
import { PostalAddressLine } from "./PostalAddressLine";

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
              We&apos;ve been working hard to make SpriteLab even better. Here&apos;s what&apos;s new:
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
            <PostalAddressLine style={footerText} />
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

const announcementBadge = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const badgeText = {
  display: "inline-block",
  backgroundColor: "#FF9500",
  color: "#0F1529",
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
  color: "#A7ADD4",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const featureBox = {
  backgroundColor: "#0F1529",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "16px",
  border: "1px solid rgba(255,255,255,0.06)",
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
  color: "#A7ADD4",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
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

const feedbackText = {
  color: "#8A92BF",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "rgba(255,255,255,0.06)",
  margin: "24px 0",
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

export default NewFeaturesEmail;
