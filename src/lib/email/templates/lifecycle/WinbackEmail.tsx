import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Cta, Eyebrow, Hero, LifecycleFrame, P, Title, color, type HeroImage } from "./LifecycleLayout";

export interface WinbackEmailProps {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  headline: string;
  /** Their last sprite, or a showcase animation when they never made one. */
  hero: HeroImage;
  credits: number;
  /** Short, real product changes. */
  news: { title: string; text: string }[];
  ctaUrl: string;
}

export function WinbackEmail(props: WinbackEmailProps) {
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>Since your last visit</Eyebrow>
      <Title>{props.headline}</Title>
      <P>
        No rush and no offer: just a short note on what SpriteLab can do now, in case you want another go.
      </P>
      <Hero {...props.hero} />
      <Section style={{ margin: "0 0 8px" }}>
        {props.news.slice(0, 3).map((n) => (
          <Section key={n.title} style={newsItem}>
            <Text style={newsTitle}>{n.title}</Text>
            <Text style={newsText}>{n.text}</Text>
          </Section>
        ))}
      </Section>
      {props.credits > 0 && (
        <P style={{ margin: "14px 0 0" }}>
          You still have <strong style={{ color: color.text }}>{props.credits} credits</strong> on your account.
        </P>
      )}
      <Cta href={props.ctaUrl}>Open SpriteLab</Cta>
    </LifecycleFrame>
  );
}

const newsItem = { borderLeft: `2px solid ${color.accent}`, padding: "0 0 0 12px", margin: "0 0 12px" };
const newsTitle = { color: color.text, fontSize: "15px", fontWeight: "bold", lineHeight: "20px", margin: "0 0 2px" };
const newsText = { color: color.body, fontSize: "13.5px", lineHeight: "20px", margin: "0" };

export default WinbackEmail;
