import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { visiblePromoCode } from "@/lib/email/promo-codes";
import { PostalAddressLine } from "./PostalAddressLine";

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
  const code = visiblePromoCode(promoCode);
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
                {code && (
                  <Section style={promoCodeBox}>
                    <Text style={promoCodeLabel}>Use code:</Text>
                    <Text style={promoCodeValue}>{code}</Text>
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
              <Text style={valueItem}>✓ Commercial licence on Starter, Pro and Studio</Text>
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
              Don&apos;t want promotional emails?{" "}
              <Link href="https://sprite-lab.com/settings" style={link}>
                Update your preferences
              </Link>
            </Text>
            <Text style={footerText}>
              SpriteLab - AI Game Asset Generator
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
  color: "#A7ADD4",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const offerBox = {
  background: "linear-gradient(135deg, #ef444420 0%, #f59e0b20 100%)",
  borderRadius: "16px",
  padding: "28px",
  margin: "0 0 24px",
  textAlign: "center" as const,
  border: "2px solid #f59e0b50",
};

const discountBadge = {
  color: "#f59e0b",
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
  backgroundColor: "#0F1529",
  borderRadius: "8px",
  padding: "12px 20px",
  margin: "0 auto 12px",
  display: "inline-block" as const,
};

const promoCodeLabel = {
  color: "#A7ADD4",
  fontSize: "12px",
  margin: "0 0 4px",
};

const promoCodeValue = {
  color: "#FF9500",
  fontSize: "24px",
  fontWeight: "bold",
  fontFamily: "monospace",
  margin: "0",
  letterSpacing: "2px",
};

const expiryText = {
  color: "#ef4444",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0",
};

const whatsNewBox = {
  backgroundColor: "#0F1529",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 24px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const whatsNewTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const whatsNewItem = {
  color: "#A7ADD4",
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
  backgroundColor: "#0F1529",
  borderRadius: "8px",
  padding: "12px 16px",
  color: "#A7ADD4",
  fontSize: "14px",
  margin: "0 0 8px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const button = {
  background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  borderRadius: "8px",
  color: "#0F1529",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const smallText = {
  color: "#8A92BF",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const valueBox = {
  backgroundColor: "#FF6B2C10",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid #FF6B2C30",
};

const valueTitle = {
  color: "#FF9500",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const valueItem = {
  color: "#A7ADD4",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "20px",
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

const link = {
  color: "#FF9500",
  textDecoration: "underline",
};

export default SpecialOfferEmail;
