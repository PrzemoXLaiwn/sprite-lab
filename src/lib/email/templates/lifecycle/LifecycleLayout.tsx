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
import { PostalAddressLine } from "../PostalAddressLine";

// Shared frame for the lifecycle emails: dark SpriteLab surfaces, one orange
// CTA, footer with the reason + one-click unsubscribe. Inline styles only
// (email clients drop <style>), single 560px column that shrinks to 360px.

export const SITE = "https://www.sprite-lab.com";

export const color = {
  page: "#131A31",
  card: "#19223F",
  raised: "#212B4E",
  accent: "#FFA300",
  text: "#FFF1E8",
  body: "#C8CCE8",
  muted: "#9AA1CC",
  line: "rgba(255,255,255,0.07)",
};

const sans = 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const display = '"Space Grotesk",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
export const mono = '"JetBrains Mono",Menlo,Consolas,"Courier New",monospace';

export interface FrameProps {
  preview: string;
  /** Why they get this email — shown above the unsubscribe link. */
  reason: string;
  unsubscribeUrl: string;
  children: React.ReactNode;
}

export function LifecycleFrame({ preview, reason, unsubscribeUrl, children }: FrameProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "4px 4px 18px" }}>
            <Row>
              <Column style={{ width: "36px" }}>
                <Img src={`${SITE}/email/logo.png`} alt="" width="28" height="28" style={{ borderRadius: "7px", display: "block" }} />
              </Column>
              <Column>
                <Text style={wordmark}>
                  Sprite<span style={{ color: color.accent }}>Lab</span>
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={card}>{children}</Section>

          <Section style={footer}>
            <Text style={footerText}>{reason}</Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
              {"  ·  "}
              <Link href={`${SITE}/settings`} style={footerLink}>Email settings</Link>
            </Text>
            <PostalAddressLine style={footerText} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Heading as="h1" style={h1}>{children}</Heading>;
}

export function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <Text style={{ ...p, ...style }}>{children}</Text>;
}

export function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center" as const, margin: "26px 0 6px" }}>
      <Button href={href} style={button}>{children}</Button>
    </Section>
  );
}

export interface HeroImage {
  imageUrl: string;
  alt: string;
  /** Pixel art: keep hard edges when the client scales it. */
  pixel?: boolean;
  caption?: string;
  /** Sprite sheets are wide; sprites stay small and centred. */
  wide?: boolean;
}

/** The user's own sprite on a dark stage. */
export function Hero({ imageUrl, alt, pixel, caption, wide }: HeroImage) {
  const w = wide ? 440 : 220;
  return (
    <Section style={stage}>
      <Img
        src={imageUrl}
        alt={alt}
        width={String(w)}
        style={{ display: "block", width: "100%", maxWidth: `${w}px`, height: "auto", margin: "0 auto", ...(pixel ? { imageRendering: "pixelated" as const } : {}) }}
      />
      {caption && <Text style={captionStyle}>{caption}</Text>}
    </Section>
  );
}

// -----------------------------------------------------------------------------

const main = { backgroundColor: color.page, fontFamily: sans, margin: "0", padding: "0" };
const container = { margin: "0 auto", padding: "24px 12px 36px", width: "100%", maxWidth: "560px" };
const wordmark = { color: color.text, fontFamily: display, fontSize: "18px", fontWeight: "bold", margin: "0", lineHeight: "28px" };
const card = { backgroundColor: color.card, borderRadius: "16px", padding: "28px 22px", border: `1px solid ${color.line}` };
const eyebrow = { color: color.accent, fontFamily: mono, fontSize: "11px", letterSpacing: "1.4px", textTransform: "uppercase" as const, margin: "0 0 8px" };
const h1 = { color: color.text, fontFamily: display, fontSize: "26px", lineHeight: "32px", fontWeight: "bold", margin: "0 0 12px" };
const p = { color: color.body, fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" };
const button = {
  backgroundColor: color.accent,
  borderRadius: "10px",
  color: "#131A31",
  fontFamily: sans,
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
  padding: "14px 30px",
};
const stage = {
  backgroundColor: color.raised,
  borderRadius: "14px",
  padding: "20px 12px 12px",
  margin: "4px 0 20px",
  border: `1px solid ${color.line}`,
  textAlign: "center" as const,
};
const captionStyle = { color: color.muted, fontFamily: mono, fontSize: "11px", lineHeight: "16px", margin: "10px 0 0" };
const footer = { textAlign: "center" as const, padding: "18px 8px 0" };
const footerText = { color: color.muted, fontSize: "12px", lineHeight: "18px", margin: "0 0 6px" };
const footerLink = { color: color.body, textDecoration: "underline" };

export const styles = { p, captionStyle };
