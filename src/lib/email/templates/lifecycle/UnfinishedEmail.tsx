import * as React from "react";
import { Cta, Eyebrow, Hero, LifecycleFrame, P, Title, type HeroImage } from "./LifecycleLayout";

export interface UnfinishedEmailProps {
  preview: string;
  reason: string;
  unsubscribeUrl: string;
  userName?: string;
  headline: string;
  item: HeroImage;
  /** One sentence: what they could do next with it (real features only). */
  nextStep: string;
  ctaLabel: string;
  ctaUrl: string;
}

export function UnfinishedEmail(props: UnfinishedEmailProps) {
  return (
    <LifecycleFrame preview={props.preview} reason={props.reason} unsubscribeUrl={props.unsubscribeUrl}>
      <Eyebrow>Where you left off</Eyebrow>
      <Title>{props.headline}</Title>
      <P>
        {props.userName ? `${props.userName}, it's` : "It's"} saved in your history, exactly as you left it.
        One click opens it again.
      </P>
      <Hero {...props.item} />
      <P>{props.nextStep}</P>
      <Cta href={props.ctaUrl}>{props.ctaLabel}</Cta>
    </LifecycleFrame>
  );
}

export default UnfinishedEmail;
