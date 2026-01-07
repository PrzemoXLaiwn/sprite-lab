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

interface DailyReminderEmailProps {
  userName?: string;
  credits: number;
  loginStreak?: number;
  streakBonus?: number;
  trendingCategory?: string;
  totalAssetsCreated?: number;
  tipOfTheDay?: {
    title: string;
    content: string;
  };
}

const TIPS = [
  {
    title: "Use specific descriptions",
    content: "\"golden sword with glowing runes\" works better than \"sword\"",
  },
  {
    title: "Try different styles",
    content: "Pixel Art 16-bit is great for retro games, Hand Painted for modern indies",
  },
  {
    title: "Use the seed feature",
    content: "Copy the seed number to recreate similar assets with different prompts",
  },
  {
    title: "Combine categories",
    content: "Create matching weapons, items, and characters for cohesive game assets",
  },
  {
    title: "Background removal",
    content: "All generated assets come with transparent backgrounds - ready to use!",
  },
];

export function DailyReminderEmail({
  userName,
  credits = 0,
  loginStreak = 0,
  streakBonus = 0,
  trendingCategory = "Characters",
  totalAssetsCreated = 0,
  tipOfTheDay,
}: DailyReminderEmailProps) {
  const tip = tipOfTheDay || TIPS[Math.floor(Math.random() * TIPS.length)];
  const previewText = loginStreak > 0
    ? `Day ${loginStreak} streak! ${streakBonus > 0 ? `+${streakBonus} bonus credits` : "Keep it going!"}`
    : `Your daily SpriteLab update - ${credits} credits ready`;

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
              {userName ? `Good morning, ${userName}!` : "Good morning!"}
            </Heading>

            {/* Login Streak Section */}
            {loginStreak > 0 && (
              <Section style={streakBox}>
                <Text style={streakEmoji}>🔥</Text>
                <Text style={streakNumber}>{loginStreak} Day Streak!</Text>
                {streakBonus > 0 && (
                  <Text style={streakBonusText}>+{streakBonus} bonus credits claimed</Text>
                )}
              </Section>
            )}

            {/* Credits Status */}
            <Section style={creditsSection}>
              <Text style={creditsLabel}>Your Credits</Text>
              <Text style={creditsNumber}>{credits}</Text>
              {credits === 0 && (
                <Text style={noCreditsHint}>
                  Get more credits to continue creating
                </Text>
              )}
            </Section>

            {/* Daily CTA */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://sprite-lab.com/generate">
                {credits > 0 ? "Create Something Amazing" : "Get More Credits"}
              </Button>
            </Section>

            <Hr style={hr} />

            {/* Trending */}
            <Section style={trendingSection}>
              <Text style={sectionTitle}>🔥 Trending Today</Text>
              <Text style={trendingText}>
                <strong>{trendingCategory}</strong> is the most popular category right now!
              </Text>
              <Button style={buttonSecondary} href={`https://sprite-lab.com/generate?category=${trendingCategory.toLowerCase()}`}>
                Try {trendingCategory}
              </Button>
            </Section>

            <Hr style={hr} />

            {/* Tip of the Day */}
            <Section style={tipSection}>
              <Text style={sectionTitle}>💡 Tip of the Day</Text>
              <Section style={tipBox}>
                <Text style={tipTitle}>{tip.title}</Text>
                <Text style={tipContent}>{tip.content}</Text>
              </Section>
            </Section>

            {/* Stats */}
            {totalAssetsCreated > 0 && (
              <>
                <Hr style={hr} />
                <Section style={statsSection}>
                  <Text style={statsText}>
                    You've created <strong>{totalAssetsCreated}</strong> assets so far!
                  </Text>
                  <Button style={linkButton} href="https://sprite-lab.com/gallery">
                    View Your Gallery →
                  </Button>
                </Section>
              </>
            )}
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
              <Link href="https://sprite-lab.com/privacy" style={link}>
                Unsubscribe
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
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const streakBox = {
  background: "linear-gradient(135deg, #ff6b35 0%, #f7c531 100%)",
  borderRadius: "12px",
  padding: "20px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const streakEmoji = {
  fontSize: "32px",
  margin: "0 0 8px",
};

const streakNumber = {
  color: "#030305",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const streakBonusText = {
  color: "#030305",
  fontSize: "14px",
  margin: "8px 0 0",
  fontWeight: "600",
};

const creditsSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const creditsLabel = {
  color: "#a0a0b0",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px",
};

const creditsNumber = {
  color: "#00ff88",
  fontSize: "48px",
  fontWeight: "bold",
  margin: "0",
  lineHeight: "1",
};

const noCreditsHint = {
  color: "#ff6b6b",
  fontSize: "12px",
  margin: "8px 0 0",
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
  padding: "10px 20px",
  marginTop: "12px",
};

const linkButton = {
  color: "#00d4ff",
  fontSize: "14px",
  textDecoration: "none",
  fontWeight: "600",
};

const hr = {
  borderColor: "#2a2a3d",
  margin: "24px 0",
};

const sectionTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const trendingSection = {
  textAlign: "center" as const,
};

const trendingText = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0",
};

const tipSection = {
  textAlign: "left" as const,
};

const tipBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid #2a2a3d",
};

const tipTitle = {
  color: "#00d4ff",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 4px",
};

const tipContent = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0",
  lineHeight: "20px",
};

const statsSection = {
  textAlign: "center" as const,
};

const statsText = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "0 0 8px",
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

export default DailyReminderEmail;
