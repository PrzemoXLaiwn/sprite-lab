import { Column, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { Cta, Eyebrow, Hero, LifecycleFrame, P, Title, color, mono, type HeroImage } from "./LifecycleLayout";

export interface CreditIdea {
  title: string;
  detail: string;
  /** "1 credit", "from 6 credits". */
  cost: string;
}

export interface UnusedCreditsEmailProps {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  userName?: string;
  credits: number;
  sprite?: HeroImage;
  ideas: CreditIdea[];
  ctaUrl: string;
}

export function UnusedCreditsEmail(props: UnusedCreditsEmailProps) {
  const { credits, sprite, ideas } = props;
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>Your balance</Eyebrow>
      <Title>{props.userName ? `${props.userName}, you still have ${credits} credits.` : `You still have ${credits} credits.`}</Title>
      <P>Here are three things you could make with them, based on what you&apos;ve been working on.</P>
      {sprite && <Hero {...sprite} />}
      <Section style={{ margin: "0 0 4px" }}>
        {ideas.slice(0, 3).map((idea, i) => (
          <Row key={idea.title} style={ideaRow}>
            <Column style={{ width: "32px", verticalAlign: "top" }}>
              <Text style={num}>{i + 1}</Text>
            </Column>
            <Column style={{ verticalAlign: "top" }}>
              <Text style={ideaTitle}>{idea.title}</Text>
              <Text style={ideaDetail}>{idea.detail}</Text>
              <Text style={ideaCost}>{idea.cost}</Text>
            </Column>
          </Row>
        ))}
      </Section>
      <Cta href={props.ctaUrl}>Use my credits</Cta>
    </LifecycleFrame>
  );
}

const ideaRow = { backgroundColor: color.raised, border: `1px solid ${color.line}`, borderRadius: "12px", marginBottom: "8px" };
const num = { color: color.accent, fontFamily: mono, fontSize: "13px", fontWeight: "bold", margin: "14px 0 0 14px" };
const ideaTitle = { color: color.text, fontSize: "15px", fontWeight: "bold", lineHeight: "20px", margin: "12px 12px 2px 6px" };
const ideaDetail = { color: color.body, fontSize: "13.5px", lineHeight: "20px", margin: "0 12px 4px 6px" };
const ideaCost = { color: color.muted, fontFamily: mono, fontSize: "11px", margin: "0 12px 12px 6px" };

export default UnusedCreditsEmail;
