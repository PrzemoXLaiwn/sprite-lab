import { Column, Img, Link, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { Cta, Eyebrow, LifecycleFrame, P, Title, color, mono } from "./LifecycleLayout";

export interface InspirationItem {
  id: string;
  imageUrl: string;
  /** Short prompt shown under the image. */
  caption: string;
  pixel?: boolean;
}

export interface InspirationEmailProps {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  items: InspirationItem[];
  title: string;
  /** "From the community", or "Examples" for the curated showcase fallback. */
  eyebrow: string;
  intro: string;
  tryPrompt: string;
  tryUrl: string;
  communityUrl: string;
}

export function InspirationEmail(props: InspirationEmailProps) {
  // 6 → two rows of 3, 3–5 → one row of 3
  const items = props.items.slice(0, props.items.length >= 6 ? 6 : 3);
  const rows = [items.slice(0, 3), items.slice(3, 6)].filter((r) => r.length > 0);
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>{props.eyebrow}</Eyebrow>
      <Title>{props.title}</Title>
      <P>{props.intro}</P>
      <Section style={{ margin: "0 0 10px" }}>
        {rows.map((row, r) => (
          <Row key={r}>
            {row.map((it) => (
              <Column key={it.id} style={{ width: "33.33%", padding: "0 3px 6px", verticalAlign: "top" }}>
                <Section style={tile}>
                  <Img
                    src={it.imageUrl}
                    alt={it.caption}
                    width="150"
                    style={{ display: "block", width: "100%", maxWidth: "150px", height: "auto", margin: "0 auto", ...(it.pixel ? { imageRendering: "pixelated" as const } : {}) }}
                  />
                  <Text style={caption}>{it.caption}</Text>
                </Section>
              </Column>
            ))}
          </Row>
        ))}
      </Section>
      <Section style={promptBox}>
        <Text style={promptLabel}>Try this prompt</Text>
        <Text style={promptText}>&ldquo;{props.tryPrompt}&rdquo;</Text>
      </Section>
      <Cta href={props.tryUrl}>Try this prompt</Cta>
      <Text style={more}>
        <Link href={props.communityUrl} style={{ color: color.body, textDecoration: "underline" }}>See more on Community</Link>
      </Text>
    </LifecycleFrame>
  );
}

const tile = { backgroundColor: color.raised, border: `1px solid ${color.line}`, borderRadius: "10px", padding: "8px 6px 6px" };
const caption = { color: color.muted, fontFamily: mono, fontSize: "10px", lineHeight: "14px", margin: "6px 0 0", textAlign: "center" as const, overflow: "hidden" };
const promptBox = { backgroundColor: color.raised, border: `1px dashed rgba(255,163,0,0.45)`, borderRadius: "12px", padding: "12px 14px", margin: "6px 0 0", textAlign: "center" as const };
const promptLabel = { color: color.accent, fontFamily: mono, fontSize: "11px", letterSpacing: "1.2px", textTransform: "uppercase" as const, margin: "0 0 4px" };
const promptText = { color: color.text, fontSize: "15px", lineHeight: "22px", margin: "0" };
const more = { textAlign: "center" as const, fontSize: "13px", margin: "6px 0 0" };

export default InspirationEmail;
