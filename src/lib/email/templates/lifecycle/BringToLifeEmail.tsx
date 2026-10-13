import { Column, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { Cta, Eyebrow, Hero, LifecycleFrame, P, Title, color, mono, type HeroImage } from "./LifecycleLayout";

export interface BringToLifeEmailProps {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  userName?: string;
  /** Short name of their sprite ("armored knight"). */
  spriteName: string;
  sprite: HeroImage;
  /** Real motion presets for the sprite's category. */
  motions: string[];
  credits: number;
  animationCredits: number;
  animateUrl: string;
}

export function BringToLifeEmail(props: BringToLifeEmailProps) {
  const { userName, spriteName, sprite, motions, credits, animationCredits, animateUrl } = props;
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>Next step</Eyebrow>
      <Title>{userName ? `${userName}, your ${spriteName} can move.` : `Your ${spriteName} can move.`}</Title>
      <P>
        You made this sprite on SpriteLab. Open it in Animate, pick a motion and you get a sprite sheet,
        a GIF and an engine pack for Godot, Unity or GameMaker.
      </P>
      <Hero {...sprite} />
      {motions.length > 0 && (
        <Section style={{ margin: "0 0 4px", textAlign: "center" as const }}>
          <Row>
            {motions.slice(0, 4).map((m) => (
              <Column key={m} style={{ width: `${Math.floor(100 / Math.min(motions.length, 4))}%`, padding: "0 3px" }}>
                <Text style={chip}>{m}</Text>
              </Column>
            ))}
          </Row>
        </Section>
      )}
      <P style={{ fontSize: "13px", color: color.muted, textAlign: "center", margin: "10px 0 0" }}>
        {credits >= animationCredits
          ? `A 4-frame animation costs ${animationCredits} credits. You have ${credits}.`
          : `A 4-frame animation costs ${animationCredits} credits.`}
      </P>
      <Cta href={animateUrl}>Animate my sprite</Cta>
    </LifecycleFrame>
  );
}

const chip = {
  backgroundColor: color.raised,
  border: `1px solid ${color.line}`,
  borderRadius: "999px",
  color: color.text,
  fontFamily: mono,
  fontSize: "12px",
  lineHeight: "16px",
  padding: "7px 4px",
  margin: "0",
  textAlign: "center" as const,
};

export default BringToLifeEmail;
