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

interface SpecialOfferEmailProps {
  userName?: string;
  offerTitle?: string;
  offerDescription?: string;
  discountPercent?: number;
  expiresIn?: string;
  promoCode?: string;
}

export function SpecialOfferEmail({
  userName,
  offerTitle = "We miss your creativity!",
  offerDescription = "It's been a while since you created something amazing. Come back and bring your game ideas to life!",
  discountPercent,
  expiresIn = "7 days",
  promoCode,
}: SpecialOfferEmailProps) {
  const previewText = discountPercent
    ? `Special ${discountPercent}% off - We miss you at SpriteLab!`
    : "Special offer waiting for you at SpriteLab!";

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
            <Text style={offerEmoji}>🎁</Text>

            <Heading style={heading}>
              {userName ? `${userName}, ${offerTitle}` : offerTitle}
            </Heading>

            <Text style={paragraph}>
              {offerDescription}
            </Text>

            {/* Special Offer Box */}
            {discountPercent && (
              <Section style={offerBox}>
                <Text style={discountBadge}>{discountPercent}% OFF</Text>
                <Text style={offerSubtext}>On your next credit pack</Text>
                {promoCode && (
                  <Section style={promoCodeBox}>
                    <Text style={promoCodeLabel}>Use code:</Text>
                    <Text style={promoCodeValue}>{promoCode}</Text>
                  </Section>
                )}
                <Text style={expiryText}>Expires in {expiresIn}</Text>
              </Section>
            )}

            {/* What's New Section */}
            <Section style={whatsNewBox}>
              <Text style={whatsNewTitle}>🚀 SpriteLab keeps getting better!</Text>
              <Text style={whatsNewItem}>
                <strong>New AI Models</strong> - Even better quality sprites
              </Text>
              <Text style={whatsNewItem}>
                <strong>More Art Styles</strong> - Pixel art, anime, realistic & more
              </Text>
              <Text style={whatsNewItem}>
                <strong>Faster Generation</strong> - Get results in seconds
              </Text>
              <Text style={whatsNewItem}>
                <strong>3D Model Export</strong> - GLB, OBJ, PLY formats
              </Text>
            </Section>

            {/* Popular Creations */}
            <Section style={popularSection}>
              <Text style={popularTitle}>🔥 What creators are making:</Text>
              <Section style={popularGrid}>
                <Text style={popularItem}>⚔️ Epic fantasy weapons</Text>
                <Text style={popularItem}>🧙 RPG character sprites</Text>
                <Text style={popularItem}>🧪 Magical potions & items</Text>
                <Text style={popularItem}>👾 Retro pixel art enemies</Text>
              </Section>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://sprite-lab.com/pricing">
                {discountPercent ? "Claim Your Discount" : "Get More Credits"}
              </Button>
            </Section>

            <Text style={smallText}>
              Start creating amazing game assets today!
            </Text>

            {/* Value proposition */}
            <Section style={valueBox}>
              <Text style={valueTitle}>Why creators love SpriteLab:</Text>
              <Text style={valueItem}>✓ One person indie project - your feedback shapes the product</Text>
              <Text style={valueItem}>✓ Commercial license on all assets</Text>
              <Text style={valueItem}>✓ Transparent PNG backgrounds</Text>
              <Text style={valueItem}>✓ Credits never expire</Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Just reply to this email!
            </Text>
            <Text style={footerText}>
              Don't want promotional emails?{" "}
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

const offerEmoji = {
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

const paragraph = {
  color: "#a0a0b0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const offerBox = {
  background: "linear-gradient(135deg, #ff6b6b20 0%, #ffd93d20 100%)",
  borderRadius: "16px",
  padding: "28px",
  margin: "0 0 24px",
  textAlign: "center" as const,
  border: "2px solid #ffd93d50",
};

const discountBadge = {
  color: "#ffd93d",
  fontSize: "42px",
  fontWeight: "bold",
  margin: "0 0 4px",
};

const offerSubtext = {
  color: "#ffffff",
  fontSize: "16px",
  margin: "0 0 16px",
};

const promoCodeBox = {
  backgroundColor: "#030305",
  borderRadius: "8px",
  padding: "12px 20px",
  margin: "0 auto 12px",
  display: "inline-block" as const,
};

const promoCodeLabel = {
  color: "#a0a0b0",
  fontSize: "12px",
  margin: "0 0 4px",
};

const promoCodeValue = {
  color: "#00ff88",
  fontSize: "24px",
  fontWeight: "bold",
  fontFamily: "monospace",
  margin: "0",
  letterSpacing: "2px",
};

const expiryText = {
  color: "#ff6b6b",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0",
};

const whatsNewBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 24px",
  border: "1px solid #2a2a3d",
};

const whatsNewTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const whatsNewItem = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 10px",
  lineHeight: "20px",
};

const popularSection = {
  margin: "0 0 24px",
};

const popularTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const popularGrid = {
  display: "grid" as const,
  gap: "8px",
};

const popularItem = {
  backgroundColor: "#0f0f15",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 8px",
  border: "1px solid #2a2a3d",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const button = {
  background: "linear-gradient(135deg, #ffd93d 0%, #ff6b6b 100%)",
  borderRadius: "8px",
  color: "#030305",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const smallText = {
  color: "#606070",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const valueBox = {
  backgroundColor: "#00ff8810",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid #00ff8830",
};

const valueTitle = {
  color: "#00ff88",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const valueItem = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "20px",
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

export default SpecialOfferEmail;
