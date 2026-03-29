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

interface PromoEmailProps {
  userName?: string;
  promoCode?: string;
  discountPercent: number;
  creditsAmount: number;
  expiresIn: string;
  promoTitle: string;
  promoMessage: string;
}

export function PromoEmail({
  userName,
  promoCode,
  discountPercent,
  creditsAmount,
  expiresIn,
  promoTitle,
  promoMessage,
}: PromoEmailProps) {
  const previewText = `${promoTitle} - ${discountPercent}% OFF at SpriteLab!`;

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
            {/* Sale Banner */}
            <Section style={saleBanner}>
              <Text style={saleEmoji}>🎉</Text>
              <Heading style={saleTitle}>{promoTitle}</Heading>
              <Section style={discountBadge}>
                <Text style={discountText}>{discountPercent}% OFF</Text>
              </Section>
            </Section>

            <Text style={greeting}>
              {userName ? `Hey ${userName}!` : "Hey there!"}
            </Text>

            <Text style={paragraph}>{promoMessage}</Text>

            {/* Offer Details */}
            <Section style={offerBox}>
              <Text style={offerTitle}>Special Offer</Text>
              <Section style={offerDetails}>
                <Section style={offerRow}>
                  <Text style={offerLabel}>Credits Pack</Text>
                  <Text style={offerValue}>{creditsAmount} Credits</Text>
                </Section>
                <Section style={offerRow}>
                  <Text style={offerLabel}>Discount</Text>
                  <Text style={offerValueHighlight}>{discountPercent}% OFF</Text>
                </Section>
                {promoCode && (
                  <Section style={offerRow}>
                    <Text style={offerLabel}>Promo Code</Text>
                    <Text style={promoCodeText}>{promoCode}</Text>
                  </Section>
                )}
                <Section style={offerRow}>
                  <Text style={offerLabel}>Expires</Text>
                  <Text style={offerValueUrgent}>{expiresIn}</Text>
                </Section>
              </Section>
            </Section>

            {/* What You Get */}
            <Heading style={subheading}>What You'll Get</Heading>

            <Section style={benefitsList}>
              <Text style={benefitItem}>
                <span style={checkmark}>✓</span> {creditsAmount} AI generations
              </Text>
              <Text style={benefitItem}>
                <span style={checkmark}>✓</span> 2D sprites & 3D models
              </Text>
              <Text style={benefitItem}>
                <span style={checkmark}>✓</span> All art styles included
              </Text>
              <Text style={benefitItem}>
                <span style={checkmark}>✓</span> Commercial license
              </Text>
              <Text style={benefitItem}>
                <span style={checkmark}>✓</span> Instant download (PNG/GLB)
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://sprite-lab.com/settings#billing">
                Claim {discountPercent}% OFF Now
              </Button>
            </Section>

            <Text style={urgencyText}>
              Offer expires in {expiresIn}. Don't miss out!
            </Text>

            <Hr style={hr} />

            {/* Social Proof */}
            <Section style={socialProof}>
              <Text style={socialProofTitle}>Join 10,000+ Game Developers</Text>
              <Text style={socialProofStats}>
                🎮 50,000+ assets created | ⭐ 4.9/5 rating | 🚀 Used in 500+ games
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Not interested in promotions?{" "}
              <Link href="https://sprite-lab.com/settings" style={link}>
                Update preferences
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
  backgroundColor: "#0a0c10",
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
  color: "#FF6B2C",
};

const content = {
  backgroundColor: "#11151b",
  borderRadius: "16px",
  padding: "32px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const saleBanner = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const saleEmoji = {
  fontSize: "48px",
  margin: "0",
};

const saleTitle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "12px 0",
};

const discountBadge = {
  display: "inline-block",
  backgroundColor: "#ff4757",
  borderRadius: "8px",
  padding: "8px 24px",
};

const discountText = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const greeting = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const paragraph = {
  color: "#a0a0b0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const subheading = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "24px 0 12px",
};

const offerBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "12px",
  padding: "24px",
  border: "2px solid #FF6B2C",
  marginBottom: "24px",
};

const offerTitle = {
  color: "#FF6B2C",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "2px",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const offerDetails = {
  margin: "0",
};

const offerRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const offerLabel = {
  color: "#606070",
  fontSize: "14px",
  margin: "0",
};

const offerValue = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const offerValueHighlight = {
  color: "#FF6B2C",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0",
};

const offerValueUrgent = {
  color: "#ff4757",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const promoCodeText = {
  color: "#f59e0b",
  fontSize: "16px",
  fontWeight: "bold",
  fontFamily: "monospace",
  backgroundColor: "#f59e0b20",
  padding: "4px 12px",
  borderRadius: "4px",
  margin: "0",
};

const benefitsList = {
  margin: "16px 0 24px",
};

const benefitItem = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "20px",
};

const checkmark = {
  color: "#FF6B2C",
  marginRight: "8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
};

const button = {
  backgroundColor: "#FF6B2C",
  borderRadius: "8px",
  color: "#0a0c10",
  fontSize: "18px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 40px",
};

const urgencyText = {
  color: "#ff4757",
  fontSize: "14px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const hr = {
  borderColor: "rgba(255,255,255,0.06)",
  margin: "24px 0",
};

const socialProof = {
  textAlign: "center" as const,
};

const socialProofTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const socialProofStats = {
  color: "#606070",
  fontSize: "13px",
  margin: "0",
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
  color: "#FF6B2C",
  textDecoration: "underline",
};

export default PromoEmail;
