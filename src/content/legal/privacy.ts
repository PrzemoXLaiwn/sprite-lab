// Unresolved items from the approved draft. Do not render the bracketed
// placeholders; the sentences below are the public wording.
//
// TODO: ICO registration number — draft asked for [ICO REGISTRATION NUMBER]. Omitted.
// TODO: EU GDPR Article 27 representative — draft had [EU REPRESENTATIVE NAME AND ADDRESS]
//       behind "IF YOU TARGET EU USERS". Omitted until the owner decides.
// TODO: Confirm whether account suspension is always reviewed by a person. The page
//       does not claim a human review.
// TODO: Confirm AI providers' contracts forbid training on API data. The page only
//       says we do not train our own models on prompts or outputs.
// TODO: Supabase database region, and the UK transfer tool for Vercel, Supabase,
//       Stripe, Resend, Runware, Anthropic and Cloudflare. The page points at
//       section 5 instead of naming an unverified safeguard.
// TODO: Runware legal entity and country.
// TODO: Replicate / hyper3d rodin. 3D generation is retired and has no UI caller,
//       so the row is omitted. The /api/generate-3d routes still exist in the repo.
// TODO: Whether support mail is handled in Gmail. The contact line still notes the
//       current spritelab.contact@gmail.com address from the draft.
// TODO: Backup retention period (draft suggested 90 days).
// TODO: Support, refund and complaint correspondence retention (draft suggested 2 years).
// TODO: Security and server log retention (draft suggested 30–90 days).
// TODO: Google Analytics data-retention setting (draft suggested 2 or 14 months).
// TODO: Cookie-consent record retention (draft suggested 12 months).
// TODO: Lawful basis for non-personalised ads, and whether analytics cookies match
//       the live consent setup. Production consent code is not fully represented
//       by this branch.
// TODO: Marketing lawful basis. Sign-up has no marketing checkbox. The page does
//       not claim consent is collected there, and does not rely on the PECR
//       soft opt-in until that is confirmed.
// TODO: Complaint form URL. Contact is support@sprite-lab.com only.
// TODO: Age Appropriate Design Code review for users aged 13–17. Not turned into
//       a public claim.
// TODO: "Cookie settings" footer control. Out of scope for this change. Withdrawal
//       is by emailing support@sprite-lab.com.

export const PRIVACY_MARKDOWN = `
# Privacy Policy

Last updated: 17 October 2026

This policy explains how SpriteLab collects and uses personal data when you visit www.sprite-lab.com or use the SpriteLab app, and what rights you have. It is written to meet the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018 and the Privacy and Electronic Communications Regulations 2003 (PECR), as amended by the Data (Use and Access) Act 2025.

## 1. Who we are (the controller)

SpriteLab is run by **Przemek Lawin** trading as "SpriteLab", of **69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom** ("SpriteLab", "we", "us").

We are the **controller** of the personal data described in this policy.

- Privacy contact: **[support@sprite-lab.com](mailto:support@sprite-lab.com)** (currently spritelab.contact@gmail.com)
- Postal address: 69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom

We have not appointed a Data Protection Officer because we are not required to.

## 2. What personal data we collect

| Category | Examples | Source |
|---|---|---|
| Account data | Email address, name (optional), profile picture (optional), login method, Google account identifier if you sign in with Google | You / Google |
| Payment and billing data | Plan, purchase history, invoices, billing country, last 4 digits and card brand (full card details are held by Stripe, not by us) | You / Stripe |
| Content you submit | Prompts, uploaded or edited images, settings, projects | You |
| Generated content | Sprites, animations, tiles and other outputs, and their generation history | Created by the Service |
| Usage and device data | IP address, browser and device type, operating system, pages visited, features used, credit usage, error logs | Automatically |
| Cookie and similar data | See our [Cookie Policy](/cookies) | Automatically |
| Communications | Support emails, refund requests, complaints, feedback | You |
| Public profile and community content | Items you choose to publish in the community gallery or on a public profile (/u/...) | You |

Please do not include personal data about other people (for example, real people's names or photos) in prompts or uploads. Our Terms prohibit generating content depicting real people without their consent.

## 3. Why we use your data and our lawful bases

| Purpose | Data used | Lawful basis (UK GDPR Art. 6) |
|---|---|---|
| Create and run your account, provide generation, editing, animation, storage and export | Account, content, generated content, usage | **Contract** – necessary to provide the Service you asked for |
| Take payments, manage subscriptions and credit packs, process refunds | Account, payment and billing | **Contract**; **Legal obligation** for tax and accounting records |
| Send service and account emails (receipts, password/login links, renewal and price-change notices, security alerts) | Account | **Contract**; **Legal obligation** where notices are required by consumer law |
| Translate non-English prompts and plan animations using AI | Prompts, sprite images | **Contract** |
| Prevent fraud, abuse, credit-limit circumvention and security incidents; enforce our Terms and moderate content | Account, usage, content | **Legitimate interests** – keeping the Service secure and lawful |
| Website and product analytics (Vercel Web Analytics, Vercel Speed Insights, Google Analytics 4) | Usage and device data, cookie identifiers | **Consent** where cookies or similar technologies require it under PECR; otherwise **legitimate interests** in understanding how the Service is used |
| Ads on guide and comparison pages for signed-out visitors (Google AdSense) | Cookie identifiers, IP address, device data | **Consent** for personalised ads in the UK and EEA |
| Measuring sign-ups and purchases from our Google Ads campaigns (Google Ads conversion tracking) | Cookie identifiers, sign-up event, device data | **Consent** (UK/EEA) |
| Marketing and re-engagement emails (product news, offers, weekly digest, reminders, abandoned-checkout emails) | Email, account activity | A lawful basis that applies to that email. Every marketing email contains an unsubscribe link. You can also turn marketing off in Settings. |
| Respond to questions, complaints and data-rights requests | Communications, account | **Legal obligation** (data-rights and complaints); **Legitimate interests** (support) |
| Comply with law and defend legal claims | Any relevant data | **Legal obligation**; **Legitimate interests** |

Where we rely on legitimate interests, we have balanced our interests against yours. You can ask us for details and you can object (see section 8).

Where we rely on consent, you can withdraw it at any time by emailing [support@sprite-lab.com](mailto:support@sprite-lab.com). Withdrawal does not affect processing before withdrawal.

**Automated decision-making:** We do not make decisions that have legal or similarly significant effects on you based solely on automated processing. Our systems automatically filter prompts and outputs and may block a generation or flag an account for review. AI models are used to create content you request, not to profile you.

**Model training:** We do not use your prompts or generated content to train our own AI models.

## 4. Who we share data with

We use the following service providers ("processors"), who act on our instructions under written contracts (data processing terms). Where a provider is outside the UK, the transfer safeguards in section 5 apply. We will tell you the specific safeguard for a provider if you ask.

| Provider | What they do | Data | Location |
|---|---|---|---|
| Vercel Inc. | Website hosting, serverless functions (region: Washington, D.C., USA – iad1), cookieless web analytics and performance monitoring (Speed Insights) | Usage, device, IP, all data passing through the app | USA |
| Supabase Inc. | Authentication and database | Account, content metadata, generation history | United States (the company). The database region is confirmed on request. |
| Stripe Payments UK Ltd / Stripe, Inc. | Payments, subscriptions, customer billing portal, fraud prevention | Payment and billing data, IP, device | UK and USA. For some purposes (for example fraud prevention and legal compliance) Stripe acts as an independent controller under its own privacy policy |
| Resend (Plus Five Five, Inc.) | Sending account and transactional email | Email address, email content | USA |
| Google LLC / Google Ireland Ltd | "Sign in with Google", Google Analytics 4, Google Ads conversion tracking, Google AdSense (ads for signed-out visitors on guide pages). Fonts are self-hosted by this site and are not loaded from Google. | Google account identifier and email (sign-in); cookie identifiers, IP, device and usage data (analytics and ads) | USA. Google is certified to the UK Extension of the EU-US Data Privacy Framework. For AdSense, Google acts as an independent controller |
| Runware | AI image generation | Prompts and, for edits and animations, your sprite images | Outside the UK. Details of the provider and the transfer safeguard are available on request. |
| Anthropic PBC | Prompt translation, animation planning and character rigging (Claude) | Prompts, sprite images, generation parameters | USA |
| Cloudflare, Inc. | Storage of generated images (R2) and fallback AI generation (Workers AI) | Generated images, prompts (fallback generation) | USA / global |

We may also share data with professional advisers (accountants, lawyers), HMRC or other authorities where required by law, and a buyer or successor if the SpriteLab business is sold (you will be told).

We do not sell your personal data.

## 5. International transfers

Several providers are based in, or access data from, the United States and other countries outside the UK. When personal data is transferred outside the UK we make sure one of these safeguards applies:

- the recipient is in a country covered by UK adequacy regulations — for the USA, the recipient is certified to the **UK Extension to the EU-US Data Privacy Framework** (the "UK-US Data Bridge"); or
- we use the ICO's **International Data Transfer Agreement (IDTA)** or the **UK Addendum to the EU Standard Contractual Clauses**, with a transfer risk assessment.

You can ask us for a copy of the relevant safeguards at [support@sprite-lab.com](mailto:support@sprite-lab.com).

## 6. How long we keep data

| Data | Retention |
|---|---|
| Account data, content and generated content | While your account is active. When your account is deleted we delete it within **30 days**, and then from backups. |
| Payment, invoice and transaction records | **6 years** after the end of the tax year they relate to (HMRC record-keeping) |
| Support, refund and complaint correspondence | For as long as we need to handle the matter and any follow-up |
| Security and server logs | For a limited period |
| Analytics data | Google Analytics: for the retention period set on our analytics property. Vercel Analytics: aggregated |
| Cookie consent records | For long enough to show what you chose |
| Community gallery items you publish | Until you remove them or delete your account |

## 7. Children

SpriteLab is not intended for children under 13 and we do not knowingly collect their data. Paid plans may only be bought by people aged **18 or over** (or with the involvement of a parent or guardian). If you believe a child under 13 has given us data, contact us and we will delete it.

## 8. Your rights

Under UK data protection law you have the right to:

- **access** your personal data (a copy and information about how we use it);
- **rectification** of inaccurate or incomplete data;
- **erasure** ("right to be forgotten") in certain circumstances;
- **restriction** of processing in certain circumstances;
- **data portability** — receive data you gave us in a machine-readable format, or have it sent to another provider, where processing is based on consent or contract;
- **object** to processing based on legitimate interests, and to direct marketing at any time;
- **withdraw consent** at any time where we rely on consent;
- not be subject to decisions based **solely on automated processing** that have legal or similarly significant effects (we do not make such decisions).

To exercise a right, email **[support@sprite-lab.com](mailto:support@sprite-lab.com)** with the subject "Data request". You can ask us to delete your account under Settings → Delete account. We will respond within **one month** (extendable by two months for complex requests). We may need to verify your identity. Exercising your rights is free unless a request is manifestly unfounded or excessive.

## 9. Complaints

If you are unhappy with how we use your data, please contact us first at **[support@sprite-lab.com](mailto:support@sprite-lab.com)**. We will acknowledge your complaint within **30 days**, investigate it without undue delay and tell you the outcome.

You also have the right to complain to the UK supervisory authority, the **Information Commissioner's Office (ICO)**: [www.ico.org.uk/make-a-complaint](https://www.ico.org.uk/make-a-complaint), telephone 0303 123 1113, Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF. If you live in the EEA you can also complain to your local data protection authority.

## 10. Security

We use encryption in transit (HTTPS), encryption at rest for our database, access controls and the security measures of our providers. Generated images stored in Cloudflare R2 are served from a URL. They are not listed in a public gallery unless you publish them, but anyone who has the link can open the file. No system is completely secure; if a breach is likely to result in a high risk to you, we will tell you without undue delay.

## 11. Cookies

We use cookies and similar technologies as described in our [Cookie Policy](/cookies). You can ask us to change a choice you have made by emailing [support@sprite-lab.com](mailto:support@sprite-lab.com).

## 12. Changes

We will post any changes on this page and update the date above. If changes are significant, we will notify account holders by email before they take effect.

## 13. Contact

Przemek Lawin (SpriteLab), 69 Haybridge Avenue, Telford, TF1 5JT, United Kingdom — [support@sprite-lab.com](mailto:support@sprite-lab.com)
`;
