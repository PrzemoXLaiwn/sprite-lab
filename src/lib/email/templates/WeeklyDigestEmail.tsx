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

interface WeeklyDigestEmailProps {
  userName?: string;
  credits: number;
  weeklyStats: {
    assetsCreated: number;
    topCategory?: string;
    topStyle?: string;
  };
  communityStats: {
    totalAssetsThisWeek: number;
    popularPrompt?: string;
  };
  newFeatures?: string[];
  topCreators?: Array<{ name: string; count: number }>;
}

export function WeeklyDigestEmail({
  userName,
  credits = 0,
  weeklyStats = { assetsCreated: 0 },
  communityStats = { totalAssetsThisWeek: 0 },
  newFeatures = [],
  topCreators = [],
}: WeeklyDigestEmailProps) {
  const previewText = `Your weekly SpriteLab digest - ${weeklyStats.assetsCreated} assets created!`;

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
            <Text style={weekLabel}>Weekly Digest</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={heading}>
              {userName ? `Hey ${userName}, here's your week!` : "Your Weekly Roundup"}
            </Heading>

            {/* Your Stats */}
            <Section style={statsGrid}>
              <Text style={sectionTitle}>📊 Your Week in Numbers</Text>
              <Section style={statRow}>
                <Section style={statBox}>
                  <Text style={statNumber}>{weeklyStats.assetsCreated}</Text>
                  <Text style={statLabel}>Assets Created</Text>
                </Section>
                <Section style={statBox}>
                  <Text style={statNumber}>{credits}</Text>
                  <Text style={statLabel}>Credits Left</Text>
                </Section>
              </Section>
              {weeklyStats.topCategory && (
                <Text style={statDetail}>
                  Your favorite category: <strong>{weeklyStats.topCategory}</strong>
                </Text>
              )}
              {weeklyStats.topStyle && (
                <Text style={statDetail}>
                  Most used style: <strong>{weeklyStats.topStyle}</strong>
                </Text>
              )}
            </Section>

            <Hr style={hr} />

            {/* Community Stats */}
            <Section style={communitySection}>
              <Text style={sectionTitle}>🌍 Community This Week</Text>
              <Text style={communityText}>
                <strong>{communityStats.totalAssetsThisWeek.toLocaleString()}</strong> assets created by SpriteLab creators
              </Text>
              {communityStats.popularPrompt && (
                <Section style={popularPromptBox}>
                  <Text style={popularLabel}>Most Popular Prompt:</Text>
                  <Text style={popularPrompt}>"{communityStats.popularPrompt}"</Text>
                </Section>
              )}
            </Section>

            {/* Top Creators */}
            {topCreators.length > 0 && (
              <>
                <Hr style={hr} />
                <Section>
                  <Text style={sectionTitle}>🏆 Top Creators This Week</Text>
                  {topCreators.slice(0, 3).map((creator, i) => (
                    <Text key={i} style={creatorRow}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {creator.name} - {creator.count} assets
                    </Text>
                  ))}
                </Section>
              </>
            )}

            {/* New Features */}
            {newFeatures.length > 0 && (
              <>
                <Hr style={hr} />
                <Section style={featuresSection}>
                  <Text style={sectionTitle}>✨ What's New</Text>
                  {newFeatures.map((feature, i) => (
                    <Text key={i} style={featureItem}>• {feature}</Text>
                  ))}
                </Section>
              </>
            )}

            <Hr style={hr} />

            {/* CTA */}
            <Section style={buttonContainer}>
              <Button style={button} href="https://sprite-lab.com/generate">
                Start Creating
              </Button>
            </Section>

            <Text style={motivationalText}>
              {weeklyStats.assetsCreated > 10
                ? "Amazing work this week! Keep up the creativity! 🚀"
                : weeklyStats.assetsCreated > 0
                ? "Great progress! What will you create next?"
                : "Ready to make something awesome? Your credits are waiting!"}
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

const weekLabel = {
  color: "#00d4ff",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "2px",
  margin: "8px 0 0",
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

const sectionTitle = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const statsGrid = {
  textAlign: "center" as const,
};

const statRow = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  marginBottom: "16px",
};

const statBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "12px",
  padding: "20px 32px",
  border: "1px solid #2a2a3d",
  display: "inline-block",
  margin: "0 8px",
};

const statNumber = {
  color: "#00ff88",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0",
  lineHeight: "1",
};

const statLabel = {
  color: "#a0a0b0",
  fontSize: "12px",
  margin: "8px 0 0",
  textTransform: "uppercase" as const,
};

const statDetail = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "8px 0 0",
};

const communitySection = {
  textAlign: "center" as const,
};

const communityText = {
  color: "#a0a0b0",
  fontSize: "16px",
  margin: "0 0 16px",
};

const popularPromptBox = {
  backgroundColor: "#0f0f15",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid #2a2a3d",
  marginTop: "12px",
};

const popularLabel = {
  color: "#606070",
  fontSize: "12px",
  margin: "0 0 4px",
};

const popularPrompt = {
  color: "#ffffff",
  fontSize: "14px",
  fontFamily: "monospace",
  margin: "0",
};

const creatorRow = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "8px 0",
};

const featuresSection = {
  textAlign: "left" as const,
};

const featureItem = {
  color: "#a0a0b0",
  fontSize: "14px",
  margin: "8px 0",
  lineHeight: "20px",
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

const motivationalText = {
  color: "#a0a0b0",
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

export default WeeklyDigestEmail;
