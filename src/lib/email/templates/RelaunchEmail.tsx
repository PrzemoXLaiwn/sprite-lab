import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

const SITE = "https://www.sprite-lab.com";

export interface RelaunchEmailProps {
  userName?: string;
  bonus: number;
  /** Their most recent prompt — offered as "try it again". */
  lastPrompt?: string;
  ctaUrl: string;
  retryUrl?: string;
  unsubscribeUrl: string;
}

const FEATURES = [
  {
    img: "feat-sprite",
    title: "Sprites that do what you ask",
    text: "A new model that follows your prompt, on a clean transparent background with a real pixel grid — ready for Unity, Godot or GameMaker.",
  },
  {
    img: "feat-anim",
    title: "Animate any sprite",
    text: "Idle, walk, attack, cast — or describe your own move. Dragons breathe fire, dresses sway, and Smooth mode adds AI in-between frames. Sprite sheet + GIF.",
  },
  {
    img: "feat-pack",
    title: "Projects that build your asset pack",
    text: "Generate for your game, keep what you like, and sprites sort themselves into folders. Download the whole pack as a .zip.",
  },
  {
    img: "feat-upscale",
    title: "Seamless tiles & free upscale",
    text: "Floor and wall tiles that repeat without seams, and pixel-perfect upscaling to 4096px on every plan.",
  },
];

export function RelaunchEmail({ userName, bonus, lastPrompt, ctaUrl, retryUrl, unsubscribeUrl }: RelaunchEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`SpriteLab is rebuilt from scratch — and ${bonus} free credits are waiting for you.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={{ padding: "8px 0 20px" }}>
            <Row>
              <Column style={{ width: "40px" }}>
                <Img src={`${SITE}/email/logo.png`} alt="" width="32" height="32" style={{ borderRadius: "8px", display: "block" }} />
              </Column>
              <Column>
                <Text style={wordmark}>
                  Sprite<span style={{ color: "#FF8A3D" }}>Lab</span>
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={card}>
            <Text style={eyebrow}>WE&apos;RE BACK · REBUILT FROM SCRATCH</Text>
            <Heading style={h1}>{userName ? `${userName}, SpriteLab is back.` : "SpriteLab is back."}</Heading>
            <Text style={p}>
              Let&apos;s be honest — the old generator often ignored your prompt. That wasn&apos;t good enough,
              so I rebuilt SpriteLab from the ground up. Here&apos;s what it can do now:
            </Text>

            {/* Hero animation */}
            <Section style={stage}>
              <Img
                src={`${SITE}/showcase/anim-dragon-breath.gif`}
                alt="Pixel-art dragon breathing fire — made with SpriteLab"
                width="440"
                style={heroImg}
              />
              <Text style={caption}>&ldquo;fire dragon&rdquo; → Animate → Attack</Text>
            </Section>

            {/* Features */}
            {FEATURES.map((f) => (
              <Row key={f.img} style={{ marginBottom: "14px" }}>
                <Column style={{ width: "56px", verticalAlign: "top" }}>
                  <Img src={`${SITE}/email/${f.img}.png`} alt="" width="44" height="44" style={featureIcon} />
                </Column>
                <Column style={{ verticalAlign: "top" }}>
                  <Text style={featureTitle}>{f.title}</Text>
                  <Text style={featureText}>{f.text}</Text>
                </Column>
              </Row>
            ))}

            <Row style={{ margin: "8px 0 4px" }}>
              <Column style={{ width: "50%", paddingRight: "6px" }}>
                <Section style={tile}>
                  <Img src={`${SITE}/showcase/anim-witch-walk.gif`} alt="Animated witch walking" width="200" style={tileImg} />
                  <Text style={tileLabel}>Walk · long dress</Text>
                </Section>
              </Column>
              <Column style={{ width: "50%", paddingLeft: "6px" }}>
                <Section style={tile}>
                  <Img src={`${SITE}/showcase/anim-knight-idle.gif`} alt="Animated knight idle" width="200" style={tileImg} />
                  <Text style={tileLabel}>Idle · smooth, 8 frames</Text>
                </Section>
              </Column>
            </Row>

            {/* Bonus */}
            <Section style={bonusBox}>
              <Text style={bonusAmount}>+{bonus}</Text>
              <Text style={bonusTitle}>free credits, on the house</Text>
              <Text style={bonusText}>Added automatically when you sign in — no code needed. Valid until December 31.</Text>
            </Section>

            <Section style={{ textAlign: "center" as const, margin: "24px 0 4px" }}>
              <Button href={ctaUrl} style={button}>Claim my {bonus} credits →</Button>
            </Section>

            {lastPrompt && retryUrl && (
              <Section style={retryBox}>
                <Text style={retryLabel}>YOUR LAST PROMPT</Text>
                <Text style={retryPrompt}>&ldquo;{lastPrompt}&rdquo;</Text>
                <Link href={retryUrl} style={link}>See how it looks with the new generator →</Link>
              </Section>
            )}

            <Text style={signoff}>
              Thanks for giving it another shot. Just reply to this email if anything breaks or you&apos;d like a feature — I read every message.
            </Text>
            <Text style={signature}>— Przemek, maker of SpriteLab</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re getting this because you have a SpriteLab account.{" "}
              <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
              {" · "}
              <Link href={`${SITE}/settings`} style={footerLink}>Email settings</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0B0D12",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  margin: "0",
};
const container = { margin: "0 auto", padding: "24px 12px 40px", maxWidth: "560px" };
const wordmark = { color: "#ffffff", fontSize: "20px", fontWeight: "bold", margin: "0", lineHeight: "32px" };
const card = { backgroundColor: "#11141B", borderRadius: "16px", padding: "32px 28px", border: "1px solid rgba(255,255,255,0.08)" };
const eyebrow = { color: "#FFB27A", fontSize: "11px", letterSpacing: "1.5px", fontFamily: "Menlo,Consolas,monospace", margin: "0 0 8px" };
const h1 = { color: "#ffffff", fontSize: "28px", lineHeight: "34px", fontWeight: "bold", margin: "0 0 14px" };
const p = { color: "#B4BAC6", fontSize: "15px", lineHeight: "24px", margin: "0 0 20px" };
const stage = { backgroundColor: "#0B0D12", borderRadius: "14px", padding: "20px 12px 10px", margin: "0 0 24px", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" as const };
const heroImg = { display: "block", width: "100%", maxWidth: "440px", height: "auto", margin: "0 auto" };
const caption = { color: "#7A8294", fontSize: "11px", fontFamily: "Menlo,Consolas,monospace", margin: "10px 0 0" };
const featureIcon = { display: "block", backgroundColor: "#0B0D12", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", padding: "4px" };
const featureTitle = { color: "#ffffff", fontSize: "15px", fontWeight: "bold", margin: "2px 0 2px" };
const featureText = { color: "#A6ADBB", fontSize: "13.5px", lineHeight: "20px", margin: "0" };
const tile = { backgroundColor: "#0B0D12", borderRadius: "12px", padding: "12px 8px 8px", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" as const };
const tileImg = { display: "block", width: "100%", maxWidth: "200px", height: "auto", margin: "0 auto" };
const tileLabel = { color: "#7A8294", fontSize: "11px", fontFamily: "Menlo,Consolas,monospace", margin: "6px 0 0" };
const bonusBox = { backgroundColor: "#FF8A3D", borderRadius: "14px", padding: "20px", margin: "24px 0 0", textAlign: "center" as const };
const bonusAmount = { color: "#0B0D12", fontSize: "40px", lineHeight: "44px", fontWeight: "bold", margin: "0" };
const bonusTitle = { color: "#0B0D12", fontSize: "17px", fontWeight: "bold", margin: "0 0 6px" };
const bonusText = { color: "#3A2414", fontSize: "13px", margin: "0" };
const button = {
  backgroundColor: "#ffffff", borderRadius: "10px", color: "#0B0D12", fontSize: "16px", fontWeight: "bold",
  textDecoration: "none", display: "inline-block", padding: "15px 34px",
};
const retryBox = { borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "24px", paddingTop: "18px", textAlign: "center" as const };
const retryLabel = { color: "#7A8294", fontSize: "11px", letterSpacing: "1.5px", fontFamily: "Menlo,Consolas,monospace", margin: "0 0 4px" };
const retryPrompt = { color: "#ECEEF3", fontSize: "15px", fontStyle: "italic", margin: "0 0 8px" };
const link = { color: "#FF8A3D", fontSize: "14px", textDecoration: "underline" };
const signoff = { color: "#A6ADBB", fontSize: "14px", lineHeight: "22px", margin: "28px 0 4px" };
const signature = { color: "#ECEEF3", fontSize: "14px", fontWeight: "bold", margin: "0" };
const footer = { textAlign: "center" as const, padding: "20px 0 0" };
const footerText = { color: "#7A8294", fontSize: "12px", lineHeight: "18px", margin: "0" };
const footerLink = { color: "#A6ADBB", textDecoration: "underline" };

export default RelaunchEmail;
