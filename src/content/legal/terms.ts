// Unresolved items from the approved draft. Do not render the bracketed
// placeholders; the sentences below are the public wording.
//
// TODO: Telephone number for customers. Omitted (optional, and none was supplied).
// TODO: VAT number. Omitted. The owner is not known to be VAT-registered, so the
//       page does not state a VAT number and does not state that VAT is or is not charged.
// TODO: Reply-time promise. The draft suggested 5 working days. The page says we will reply.
// TODO: Checkout does not yet collect the express "start immediately" request and
//       acknowledgement, and the order email does not yet repeat it. This change
//       does not touch checkout. Section 6 does not claim that checkbox is shown.
// TODO: Settings → Plan & billing has no "Manage subscription" button. The Stripe
//       portal route exists (/api/stripe/create-portal) but nothing in the UI calls it.
//       Cancellation on the page is by email.
// TODO: Whether stopping the Service includes a refund of unused credit-pack credits.
//       The page refunds subscription fees for a period after the Service ends only.
// TODO: Business liability cap (£100 or fees paid) should be checked with an adviser.
//       The draft wording is published without that note.
// TODO: AI providers' contracts and training. The page says we do not train our own models.
// TODO: Community-gallery licence for marketing. The page licences display on SpriteLab only.
// TODO: ADR. The draft offered either "we do not use an ADR provider" or a named
//       [ADR PROVIDER]. Neither is confirmed, so section 16 only says to contact us first.
// TODO: Price-lock is the promise already on the pricing page. This change does not
//       audit Stripe price IDs to prove an existing subscription cannot be repriced.
// TODO: Lifetime benefit text is taken from the product config (matching plan credits
//       and features, including the commercial licence) because the draft's
//       [DESCRIBE BENEFITS] placeholder could be filled from the code. Sales are off
//       unless LIFETIME_SALES_ENABLED=true. Confirm the public sentence.

import { LICENCE_CHANGE_DATE } from "@/config/licence";
import { SIGNUP_CREDITS } from "@/config/signup";

export const TERMS_MARKDOWN = `
# Terms of Service

Last updated: ${LICENCE_CHANGE_DATE}

## 1. Who we are and how to contact us

SpriteLab (www.sprite-lab.com) is provided by **Przemek Lawin**, a sole trader trading as "SpriteLab", of 69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom ("SpriteLab", "we", "us").

- Geographic address: **69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom**
- Email: **[support@sprite-lab.com](mailto:support@sprite-lab.com)**

If you have a problem or complaint, email us and we will reply.

## 2. These terms

These terms, together with our [Privacy Policy](/privacy), [Cookie Policy](/cookies) and [Refund and Cancellation Policy](/refunds), make up the contract between you and us for the use of SpriteLab (the "Service"). Please read them before you create an account or buy a plan. We will email you a copy of these terms (or a link to them) together with your order confirmation.

If you are a **consumer** (using SpriteLab mainly for purposes outside your trade, business, craft or profession), nothing in these terms affects your legal rights under the Consumer Rights Act 2015, the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 or other consumer law.

## 3. The Service

SpriteLab is an online tool that uses artificial intelligence to generate and edit 2D game assets such as sprites, animations, direction sheets, tiles and icons, from text prompts and images you provide. Features, styles and AI models may change over time as we improve the Service or as third-party providers change their offering. We will not make changes that significantly reduce the features you have paid for during a billing period without telling you and, if the change is to your disadvantage, giving you the right to cancel and receive a refund for the unused part of that period.

## 4. Your account

- You must be at least **13** to create an account and at least **18** to buy a paid plan or credit pack (or have your parent or guardian buy it for you).
- Give accurate information and keep your login details secure. Tell us promptly at [support@sprite-lab.com](mailto:support@sprite-lab.com) if you think someone else has used your account.
- One person per account unless your plan says otherwise. Do not share or resell access.
- You can ask us to delete your account at any time under Settings → Delete account (this emails [support@sprite-lab.com](mailto:support@sprite-lab.com)). Deleting your account does not by itself cancel a paid subscription — cancel your subscription first (see section 7).

## 5. Plans, prices and credits

5.1 **Credits.** Most actions use credits. The credit cost of each action is shown before you confirm it and on our [Pricing](/pricing) page. If a generation fails, the credits are returned to your balance automatically.

5.2 **Free credits.** New accounts receive ${SIGNUP_CREDITS} free credits. Free credits have no cash value.

5.3 **Subscriptions.** We currently offer these monthly subscriptions. Prices are in pounds sterling.

| Plan | Price | Credits each month |
|---|---|---|
| Starter | £5 / month | 250 |
| Pro | £12 / month | 500 |
| Studio | £25 / month | 1,200 |

Subscription credits are added at the start of each billing period and **expire at the end of that period**; they do not roll over.

5.4 **Credit packs.** One-time packs (Ember, Blaze, Inferno and Supernova) are paid once, are not a subscription, and their credits **do not expire** while your account is open. A credit pack does not by itself change your plan or your licence (see section 9).

5.5 **Lifetime plans.** If you bought a lifetime deal, it gives you the monthly credit allowance and the other features of the matching paid plan — Starter (250 credits), Pro (500 credits) or Studio (1,200 credits) — including the commercial licence in section 9, for as long as we operate the Service. Lifetime deals are not always on sale.

5.6 **Price changes.** We will give you at least **30 days'** notice by email before any price increase for your subscription takes effect. You may cancel before the new price applies. Your price stays the same while your subscription is active and the plan is still offered.

5.7 **Payments** are processed by Stripe. By subscribing you authorise us (through Stripe) to charge your payment method at the start of each billing period until you cancel.

5.8 **Credits have no cash value**, cannot be transferred or exchanged for money, and are not refundable except as set out in our [Refund and Cancellation Policy](/refunds) or as required by law.

## 6. Your right to cancel (cooling-off period)

If you are a consumer, you have a legal right to cancel within **14 days** of buying a subscription or credit pack. The amount you get back can depend on whether you have already used credits from that purchase, and on whether you expressly asked for the Service to start immediately and acknowledged the effect on that right. The full rules are in our [Refund and Cancellation Policy](/refunds).

## 7. Renewal and cancelling your subscription

- Subscriptions **renew automatically every month** on the same date until you cancel.
- You can cancel **at any time** by emailing [support@sprite-lab.com](mailto:support@sprite-lab.com) from your account email address, or by any other clear statement that you want to cancel. We will confirm the cancellation by email.
- When you cancel, you keep your plan and remaining subscription credits until the end of the current billing period, and you will not be charged again.
- We will send you a reminder before renewal where the law requires one.

## 8. Acceptable use

You must not use the Service to:

- create, upload or share anything that is illegal, including child sexual abuse material, terrorist content, or content that incites violence or hatred;
- create sexual content involving minors, or non-consensual intimate images of anyone;
- depict a real, identifiable person without their consent, or impersonate anyone;
- infringe anyone's copyright, trade marks, design rights, privacy or other rights — for example, deliberately reproducing protected characters, logos or a living artist's distinctive work in a way that infringes their rights;
- harass, defame or deceive others, or create spam, malware or phishing material;
- try to bypass credit limits, rate limits, content filters or security measures; use bots or scripts to access the Service except through features we provide;
- reverse engineer the Service or attempt to extract its models, prompts or code;
- resell, sublicense or share access to the Service.

We may refuse or block prompts and outputs that we reasonably believe breach this section. If you publish content in the community gallery, other users can see it and you must have the right to share it. You can report content to us at [support@sprite-lab.com](mailto:support@sprite-lab.com) or with the "Report" button.

## 9. Your content and AI-generated output

9.1 **Your inputs.** You keep all rights you have in the prompts and images you upload ("Inputs"). You give us a non-exclusive, worldwide, royalty-free licence to use your Inputs only to run the Service for you (including sending them to the AI providers listed in our Privacy Policy), to keep the Service safe and to comply with law. We do not use your Inputs or Outputs to train our own AI models.

9.2 **Outputs.** As between you and us, **we assign to you any rights we have** in the assets generated for you ("Outputs"). That assignment does not remove the contractual limits in this section 9. Those limits apply even where you hold rights in an Output. Whether an Output is protected by copyright is covered in clause 9.3.

The licence for an Output depends on the plan that was active when it was generated, not on whether the credit came from a free allowance, a subscription or a credit pack. Changing plan later does not change the licence of Outputs already generated. Cancelling a paid plan does not take away a commercial licence you already have for Outputs generated while that plan was active.

**Paid plans (Starter, Pro and Studio).** If an Output is generated while the account is on Starter, Pro or Studio, including a lifetime purchase of that plan, you may use it for any lawful purpose, including in commercial games and products, without attribution.

**Free plan.** If an Output is generated while the account is on the Free plan, or without an account, it is licensed for **personal, non-commercial use only**. You may not sell it, monetise it, or use it in a product, game, service or promotion for a business. Buying a credit pack does not by itself grant a commercial licence.

**Outputs created before ${LICENCE_CHANGE_DATE}.** Assets generated on the Free plan before ${LICENCE_CHANGE_DATE} keep the licence that applied when they were created. Under the terms then in force, commercial use was allowed, without attribution, together with the restriction in clause 9.6. The same previous licence applies to other Outputs created before that date.

If you publish Outputs in the community gallery, you give us a licence to display them on SpriteLab until you remove them.

9.3 **No guarantee of copyright.** The legal status of AI-generated works is uncertain. In the UK, section 9(3) of the Copyright, Designs and Patents Act 1988 treats the author of a computer-generated work as the person by whom the arrangements necessary for its creation are undertaken, but whether a particular Output is original enough to be protected, and who that person is, has not been settled by the courts, and the law is under government review. Other countries may treat AI-generated works differently (for example, the US generally does not protect works without sufficient human authorship). **We do not promise that any Output is protected by copyright or that you can stop others from using similar material.**

9.4 **Similar outputs.** AI models can produce similar outputs for different users. Outputs are not exclusive to you, and other users may receive similar assets.

9.5 **Your responsibility.** You are responsible for how you use Outputs, including checking that they do not infringe anyone else's rights before you rely on them commercially — especially if your prompt referred to an existing character, brand, game or artist. Do not present Outputs as hand-made if that would mislead people (for example, a store or game jam that requires disclosure of AI use).

9.6 **Asset packs.** You may not sell or give away Outputs on their own as stock assets, asset packs or a sprite library. **This is a contractual restriction. It applies despite the assignment in clause 9.2**, whether or not you have a commercial licence, and it applies to Outputs created before ${LICENCE_CHANGE_DATE}. You may still sell games and other products that include Outputs you are allowed to use commercially.

## 10. Our intellectual property

The SpriteLab website, app, software, design and brand belong to us or our licensors. You may not copy or use them except to use the Service as these terms allow.

## 11. Availability and quality

We aim to keep SpriteLab available but we do not promise uninterrupted service; planned maintenance and outages of third-party providers may occur. AI output varies and may not always match your prompt. If a generation fails, your credits are returned. If you are a consumer, the Service must be supplied with reasonable care and skill and digital content must be of satisfactory quality, fit for purpose and as described (Consumer Rights Act 2015). If it is not, you may be entitled to a repeat performance, a repair or replacement, or a price reduction or refund.

## 12. Suspension and termination

12.1 We may suspend or close your account if you seriously or repeatedly break these terms (for example, section 8), if the law requires it, or to protect the Service or other users. Where reasonable, we will warn you first and give you a chance to fix the problem.

12.2 We may stop offering the Service by giving you at least **30 days'** notice. If we do, we will refund any subscription fees you have paid for a period after the Service ends.

12.3 If we close your account without good reason, we will refund you for any period you have paid for but not received.

## 13. Our liability to you

13.1 We are responsible for loss or damage you suffer that is a foreseeable result of our breaking these terms or failing to use reasonable care and skill. Loss or damage is foreseeable if it is obvious it would happen or if both of us knew it might happen when the contract was made.

13.2 **We do not exclude or limit our liability** where it would be unlawful to do so, including liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for breach of your legal rights as a consumer (for example, under sections 9–17, 34–37 and 49–52 of the Consumer Rights Act 2015). We are also responsible for damage to your device or other digital content caused by defective digital content we supplied, where we failed to use reasonable care and skill (s.46 CRA 2015).

13.3 We supply the Service for domestic and private use and for use by independent game creators. If you use the Service for business, we are not liable for loss of profit, loss of business, business interruption or loss of business opportunity, and our total liability to you for all claims in any 12-month period is limited to the greater of **£100** and the amount you paid us in that period.

13.4 Keep your own copies of Outputs you want to keep. We will take reasonable care of stored assets but recommend that you download important files.

## 14. Your responsibility for misuse

If you use the Service for business, you will compensate us for reasonable costs and losses we suffer as a direct result of claims by third parties caused by your breach of section 8 or 9.5. If you are a consumer, this clause does not apply to you, but you remain responsible under the general law.

## 15. Changes to these terms

We may update these terms to reflect changes in law, in our Service or in how we run our business. We will give you at least **30 days'** notice of significant changes by email. If you do not agree, you can cancel before the changes take effect and, for a subscription, receive a refund for any period after the change you have paid for but not received.

## 16. Complaints and disputes

Please contact us first at [support@sprite-lab.com](mailto:support@sprite-lab.com). Most problems can be sorted out quickly. If we cannot resolve a complaint, you can still use the courts as set out in section 18.

## 17. Other important terms

- We may transfer this contract to someone else (for example, if we sell the business); we will tell you, and this will not reduce your rights. You need our consent to transfer your rights to someone else.
- No one else has rights under this contract (Contracts (Rights of Third Parties) Act 1999 does not apply).
- If a court finds part of these terms unlawful, the rest will remain in force.
- If we do not insist on our rights straight away, we can still enforce them later.

## 18. Governing law and courts

These terms are governed by the **law of England and Wales**. You can bring legal proceedings in the **courts of England and Wales**. If you live in Scotland or Northern Ireland, you can also bring proceedings in your local courts, and if you live in another country, you keep the protection of any mandatory consumer laws of that country and may be able to bring proceedings there.
`;
