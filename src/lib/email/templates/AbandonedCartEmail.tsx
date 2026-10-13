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
import { PostalAddressLine } from "./PostalAddressLine";

interface AbandonedCartEmailProps {
  userName?: string;
  planName: string;
  planPrice: string;
  planCredits: string;
  checkoutUrl?: string;
}

export function AbandonedCartEmail({
  userName,
  planName,
  planPrice,
  planCredits,
  checkoutUrl = "https://sprite-lab.com/pricing",
}: AbandonedCartEmailProps) {
  const previewText = `Complete your ${planName} purchase - your credits are waiting!`;

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
            <Text style={cartEmoji}>🛒</Text>

            <Heading style={heading}>
              {userName ? `Hey ${userName}, you left something behind!` : "You left something behind!"}
            </Heading>

            <Text style={paragraph}>
              We noticed you didn&apos;t complete your purchase. No worries - your selection is still waiting for you!
            </Text>

            {/* Plan Summary */}
            <Section style={planBox}>
              <Text style={planLabel}>Your Selection</Text>
              <Text style={planName_}>{planName}</Text>
              <Text style={planDetails}>
                <span style={planCreditsStyle}>{planCredits}</span>
                <span style={planPriceStyle}>{planPrice}</span>
              </Text>
            </Section>

            {/* Benefits reminder */}
            <Section style={benefitsBox}>
              <Text style={benefitsTitle}>What you&apos;ll get:</Text>
              <Text style={benefitItem}>✓ Instant access to credits</Text>
              <Text style={benefitItem}>✓ All art styles unlocked</Text>
              <Text style={benefitItem}>✓ Commercial usage rights</Text>
              <Text style={benefitItem}>✓ PNG with transparent backgrounds</Text>
              <Text style={benefitItem}>✓ Priority generation queue</Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={checkoutUrl}>
                Complete Your Purchase
              </Button>
            </Section>

            <Text style={smallText}>
              Your checkout is just one click away!
            </Text>

            {/* Urgency note */}
            <Section style={noteBox}>
              <Text style={noteText}>
                💡 <strong>Pro tip:</strong> Credits never expire, so you can use them whenever inspiration strikes!
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Having trouble? Reply to this email and we&apos;ll help you out.
            </Text>
            <Text style={footerText}>
              Don&apos;t want these emails?{" "}
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

const cartEmoji = {
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

const planBox = {
  background: "linear-gradient(135deg, #8b5cf620 0%, #FF6B2C20 100%)",
  borderRadius: "12px",
  padding: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
  border: "1px solid #8b5cf640",
};

const planLabel = {
  color: "#8b5cf6",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px",
};

const planName_ = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px",
};

const planDetails = {
  margin: "0",
};

const planCreditsStyle = {
  color: "#FF9500",
  fontSize: "16px",
  fontWeight: "bold",
  marginRight: "12px",
};

const planPriceStyle = {
  color: "#A7ADD4",
  fontSize: "16px",
};

const benefitsBox = {
  backgroundColor: "#0F1529",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 24px",
  border: "1px solid rgba(255,255,255,0.06)",
};

const benefitsTitle = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const benefitItem = {
  color: "#A7ADD4",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "20px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const button = {
  background: "linear-gradient(135deg, #8b5cf6 0%, #FF9500 100%)",
  borderRadius: "8px",
  color: "#ffffff",
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

const noteBox = {
  backgroundColor: "#f59e0b15",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid #f59e0b30",
};

const noteText = {
  color: "#f59e0b",
  fontSize: "14px",
  margin: "0",
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

export default AbandonedCartEmail;
