import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Cta, Eyebrow, Hero, LifecycleFrame, P, Title, type HeroImage } from "./LifecycleLayout";

export function SheetExampleEmail(props: {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  userName?: string;
  sheet: HeroImage;
  ctaUrl: string;
}) {
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>What a finished one looks like</Eyebrow>
      <Title>{props.userName ? `${props.userName}, a walk becomes a sprite sheet.` : "A walk becomes a sprite sheet."}</Title>
      <P>
        This is a real SpriteLab walk cycle: one sheet of frames, a GIF, and files a game engine can import.
        Your own character can be the next one.
      </P>
      <Hero {...props.sheet} />
      <Cta href={props.ctaUrl}>Open SpriteLab</Cta>
    </LifecycleFrame>
  );
}

export function StarterOfferEmail(props: {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  userName?: string;
  priceLine: string;
  ctaUrl: string;
}) {
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>Starter</Eyebrow>
      <Title>{props.userName ? `${props.userName}, Starter is £5 a month.` : "Starter is £5 a month."}</Title>
      <P>{props.priceLine}</P>
      <Section>
        <Text style={{ fontSize: "15px", lineHeight: "22px", color: "#C8CCE8" }}>
          Starter adds a commercial licence, Unity and Godot export, a 2× download, and sprites that stay off the public gallery.
        </Text>
      </Section>
      <Cta href={props.ctaUrl}>See Starter</Cta>
    </LifecycleFrame>
  );
}
