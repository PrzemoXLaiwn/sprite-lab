// Unresolved items from the approved draft. Do not render the bracketed
// placeholders; the sentences below are the public wording.
//
// TODO: The draft's reduced 14-day refund (pro rata, and the right ending once
//       every credit is used) is valid only if checkout collects an unticked
//       request to start immediately plus an acknowledgement, and the order
//       email repeats that on a durable medium. This change does not touch
//       checkout or Stripe. The page states the statutory right and the pro-rata
//       rules that apply where that request has been given. It does not claim
//       the checkbox is on the checkout page today.
// TODO: Optional more generous rule (full refund within 14 days if no more than
//       10% of credits were used). Not adopted.
// TODO: Reply time for unrecognised charges. The draft suggested 5 working days.
//       The page says we will look into it.
// The model cancellation form keeps [plan], [date], [email] and [name] as blanks
// for the customer to fill in. They are not missing owner data.
// DMCCA subscription rules are described as not yet in force (expected January 2027),
// which is the status in the draft. Re-check before January 2027.

export const REFUNDS_MARKDOWN = `
# Refund and Cancellation Policy

Last updated: 30 October 2026

This policy is part of our [Terms of Service](/terms). It is provided by **Przemek Lawin** trading as SpriteLab, 69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom, [support@sprite-lab.com](mailto:support@sprite-lab.com).

The subscription-contract rules in the Digital Markets, Competition and Consumers Act 2024 are not yet in force. The Government has said they are expected to start in January 2027. We will update this policy when they do. Until then, the cancellation rights below are the ones that apply.

## 1. Cancelling your subscription at any time

- You can cancel a Starter (£5/month), Pro (£12/month) or Studio (£25/month) subscription **at any time**.
- **How:** open Settings → Plan & billing and choose **Cancel subscription**. You can do this online, on a phone or a computer. You do not have to call us or wait for a reply. You can also email **[support@sprite-lab.com](mailto:support@sprite-lab.com)** with the subject "Cancel" from your account email, or use any other clear statement that you want to cancel. You do not have to explain why. The online form asks you to pick a category (Other is enough); the note is optional.
- The billing page shows the date your plan ends. If you cancel by email, we reply to confirm that date. After cancelling, you keep your plan and remaining monthly credits **until the end of the current billing period**. You will not be charged again. You can resume from the same page until that date. Unused subscription credits are not refunded after the 14-day cancellation period (see section 2) unless the law requires it.
- Cancelling online stops the next renewal. It does not by itself refund the current period.

## 2. Your 14-day right to cancel (cooling-off period)

If you are a consumer, you can cancel a **new subscription** or a **credit pack** purchase within **14 days** of the day you bought it, without giving any reason.

**What you get back.** Where you have expressly asked us to start immediately, and you have acknowledged how that affects this right:

- If you have **not used any credits** from that purchase, we refund **the full amount**.
- If you have **used some credits**, we refund the purchase price **minus the value of the credits used** (calculated pro rata: price ÷ credits included × credits used). Example: Pro is £12 for 500 credits; if you used 100 credits, we refund £12 − (£12 × 100/500) = £9.60.
- If you have **used all credits** from that purchase and you acknowledged that you would lose this right, your right to cancel has ended, because the service has been fully performed at your express request.

If that express request and acknowledgement were not collected, we will deal with the cancellation in line with consumer law, which can mean a fuller refund.

**Renewals.** The 14-day cooling-off period applies to your first purchase. When the DMCCA subscription rules start (expected January 2027), a new 14-day cooling-off period is also expected to apply after certain renewals and after a free trial or introductory offer converts to a paid plan. We will update this policy then.

**How to cancel within 14 days.** Email **[support@sprite-lab.com](mailto:support@sprite-lab.com)** with the subject "Cancellation – 14 days", from your account email, stating that you want to cancel. You can use the model form below, but you do not have to. You only need to send your message before the 14 days end.

**Refunds** are made to your original payment method within **14 days** of the day you told us you are cancelling. We do not charge a fee for refunds.

### Model cancellation form

> To Przemek Lawin trading as SpriteLab, 69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom, support@sprite-lab.com:
> I hereby give notice that I cancel my contract for the supply of the following service/digital content: [plan or credit pack],
> Ordered on: [date], Account email: [email],
> Name: [name], Date: [date].

## 3. Automatic renewal and reminders

- Subscriptions renew **automatically each month** at the price shown when you subscribed, on the same day of the month, until you cancel.
- We will email you at least **30 days** before any price increase, and you can cancel before it applies.
- From when the DMCCA rules start, we will send renewal reminder notices at the times the law requires (for monthly plans, expected to be about every 6 months), including the price, renewal date and how to cancel.

## 4. Credit packs

One-time credit packs (Ember, Blaze, Inferno, Supernova) are not subscriptions and do not renew. Credits from packs do not expire while your account is open. The 14-day right to cancel in section 2 applies. A credit pack does not by itself grant a commercial licence; see the [Terms of Service](/terms).

## 5. Failed generations and faulty service

- If a generation fails, the credits are returned to your balance automatically.
- If the Service or content is faulty, not as described, or not provided with reasonable care and skill, you have rights under the **Consumer Rights Act 2015** — including a repeat performance or replacement and, if that is not possible or not done within a reasonable time, a price reduction or refund. These rights are **in addition to** this policy. Contact [support@sprite-lab.com](mailto:support@sprite-lab.com).

## 6. Unrecognised charges

If you see a charge you do not recognise, email [support@sprite-lab.com](mailto:support@sprite-lab.com) with the date and amount before contacting your bank, and we will look into it.

## 7. Contact

Przemek Lawin trading as SpriteLab, 69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom — [support@sprite-lab.com](mailto:support@sprite-lab.com)
`;
