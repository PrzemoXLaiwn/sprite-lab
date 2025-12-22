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
              We noticed you didn't complete your purchase. No worries - your selection is still waiting for you!
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
              <Text style={benefitsTitle}>What you'll get:</Text>
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
              Having trouble? Reply to this email and we'll help you out.
            </Text>
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
  color: "#a0a0b0",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const planBox = {
  background: "linear-gradient(135deg, #c084fc20 0%, #00d4ff20 100%)",
  borderRadius: "12px",
  padding: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
  border: "1px solid #c084fc40",
};

const planLabel = {
  color: "#c084fc",
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
  color: "#00ff88",
  fontSize: "16px",
  fontWeight: "bold",
  marginRight: "12px",
};

const planPriceStyle = {
  color: "#a0a0b0",
  fontSize: "16px",
};

const benefitsBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 24px",
  border: "1px solid #2a2a3d",
};

const benefitsTitle = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const benefitItem = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "20px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const button = {
  background: "linear-gradient(135deg, #c084fc 0%, #00d4ff 100%)",
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
  color: "#606070",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const noteBox = {
  backgroundColor: "#ffd93d15",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid #ffd93d30",
};

const noteText = {
  color: "#ffd93d",
  fontSize: "14px",
  margin: "0",
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

export default AbandonedCartEmail;
