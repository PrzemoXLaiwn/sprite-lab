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

interface ReEngagementEmailProps {
  userName?: string;
  credits: number;
  daysSinceLastVisit: number;
  lastAssetType?: string;
}

export function ReEngagementEmail({
  userName,
  credits,
  daysSinceLastVisit,
  lastAssetType,
}: ReEngagementEmailProps) {
  const previewText = `We miss you! Your ${credits} credits are waiting at SpriteLab`;

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
            <Text style={missYouEmoji}>👋</Text>

            <Heading style={heading}>
              {userName ? `Hey ${userName}, we miss you!` : "Hey, we miss you!"}
            </Heading>

            <Text style={paragraph}>
              {daysSinceLastVisit > 0 && daysSinceLastVisit < 1000
                ? `It's been ${daysSinceLastVisit} days since your last visit. `
                : "It's been a while since your last visit. "}
              Your creative journey doesn't have to stop!
            </Text>

            {credits > 0 && (
              <Section style={creditsAlert}>
                <Text style={creditsAlertTitle}>
                  You still have {credits} credits!
                </Text>
                <Text style={creditsAlertText}>
                  That's {credits} unique game assets waiting to be created.
                </Text>
              </Section>
            )}

            {/* What's New Section */}
            <Section style={whatsNewBox}>
              <Text style={whatsNewTitle}>What's New</Text>
              <Text style={whatsNewItem}>
                ✨ <strong>Improved AI</strong> - Better quality assets
              </Text>
              <Text style={whatsNewItem}>
                🎨 <strong>New Styles</strong> - More art style options
              </Text>
              <Text style={whatsNewItem}>
                🚀 <strong>Faster Generation</strong> - Results in ~10 seconds
              </Text>
              <Text style={whatsNewItem}>
                📦 <strong>3D Models</strong> - Now with better textures
              </Text>
            </Section>

            {/* Inspiration */}
            <Heading style={subheading}>Need Inspiration?</Heading>

            <Text style={paragraph}>
              {lastAssetType
                ? `Last time you were creating ${lastAssetType}. Here are some ideas to continue:`
                : "Here are some popular prompts from our community:"}
            </Text>

            <Section style={inspirationGrid}>
              <Section style={inspirationItem}>
                <Text style={inspirationEmoji}>⚔️</Text>
                <Text style={inspirationText}>
                  "legendary dragon slayer sword with fire enchantment"
                </Text>
              </Section>
              <Section style={inspirationItem}>
                <Text style={inspirationEmoji}>🧪</Text>
                <Text style={inspirationText}>
                  "bubbling poison potion with skull cork"
                </Text>
              </Section>
              <Section style={inspirationItem}>
                <Text style={inspirationEmoji}>👹</Text>
                <Text style={inspirationText}>
                  "forest goblin warrior with bone armor"
                </Text>
              </Section>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://sprite-lab.com/generate">
                Continue Creating
              </Button>
            </Section>

            <Text style={smallText}>
              One click and you're back in the game.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Don't want these emails?{" "}
              <Link href="https://sprite-lab.com/settings" style={link}>
                Update your preferences
              </Link>
            </Text>
            <Text style={footerText}>
              SpriteLab - AI Game Asset Generator
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

const missYouEmoji = {
  fontSize: "48px",
  textAlign: "center" as const,
  margin: "0 0 16px",
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
  margin: "24px 0 12px",
};

const paragraph = {
  color: "#a0a0b0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const smallText = {
  color: "#606070",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0",
};

const creditsAlert = {
  backgroundColor: "#ffd93d",
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const creditsAlertTitle = {
  color: "#030305",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 4px",
};

const creditsAlertText = {
  color: "#030305",
  fontSize: "14px",
  margin: "0",
  opacity: 0.8,
};

const whatsNewBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "12px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #2a2a3d",
};

const whatsNewTitle = {
  color: "#c084fc",
  fontSize: "14px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 12px",
};

const whatsNewItem = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "20px",
};

const inspirationGrid = {
  margin: "16px 0",
};

const inspirationItem = {
  backgroundColor: "#0f0f15",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "8px",
  border: "1px solid #2a2a3d",
};

const inspirationEmoji = {
  fontSize: "24px",
  margin: "0 0 8px",
};

const inspirationText = {
  color: "#ffffff",
  fontSize: "14px",
  fontFamily: "monospace",
  margin: "0",
  lineHeight: "20px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0 16px",
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

const footer = {
  textAlign: "center" as const,
  padding: "24px 0 0",
};

const footerText = {
  color: "#606070",
  fontSize: "12px",
  margin: "0 0 8px",
};

const link = {
  color: "#00d4ff",
  textDecoration: "underline",
};

export default ReEngagementEmail;
