// Unresolved items from the approved draft. Do not render the bracketed
// placeholders; the sentences below are the public wording.
//
// TODO: Confirm Google Consent Mode is "advanced" (cookieless pings before consent)
//       or "basic" (tags do not load before consent). The draft said the live site
//       uses advanced mode. This branch must not be deployed over production
//       consent code. The page describes denied storage until consent and does not
//       name the mode.
// TODO: Exact Supabase auth-cookie lifetime. Names are described by pattern
//       because the project ref is not published here.
// TODO: Consent-cookie name and CMP name ([CONSENT COOKIE NAME], [CMP NAME]).
//       No "Cookie settings" link is added in this change.
// TODO: Whether g_state is set on page load before login.
// TODO: Whether __stripe_mid and __stripe_sid are limited to checkout pages.
// TODO: Confirm these advertising cookies are actually set: _gcl_au, __gads, __gpi,
//       __eoi. The page says Google may set advertising cookies after consent and
//       names the ones observed without a verify mark (IDE, test_cookie, _ga).
// TODO: FCCDCF and FCNEC, only if Google's own consent message is in use.
// TODO: Google Ads ID AW-17802754923 was in the draft next to an unverified cookie.
//       It is not repeated on the page until that cookie is confirmed.
// Fonts: resolved. next/font self-hosts Atkinson Hyperlegible Next, Tektur and
// JetBrains Mono, so a page view does not request font files from Google.

export const COOKIES_MARKDOWN = `
# Cookie Policy

Last updated: 17 October 2026

This policy explains how **Przemek Lawin** trading as SpriteLab ("we") uses cookies and similar technologies (local storage, pixels, SDKs) on www.sprite-lab.com, in line with the Privacy and Electronic Communications Regulations 2003 (PECR), as amended by the Data (Use and Access) Act 2025, and the UK GDPR. See our [Privacy Policy](/privacy) for more on how we use personal data.

## 1. Your choices

When you first visit from the UK, EEA or Switzerland you can **accept all**, **reject all** or **choose by category**. Non-essential cookies are not set, and Google storage is denied, until you choose. You can change your mind by emailing **[support@sprite-lab.com](mailto:support@sprite-lab.com)**. You can also block or delete cookies in your browser settings; blocking strictly necessary cookies will stop login from working.

We use **Google Consent Mode v2**. Until you consent, Google Analytics, Google Ads and AdSense are told that storage is denied (\`ad_storage\`, \`ad_user_data\`, \`ad_personalization\` and \`analytics_storage\` = denied). In this state, Google may still receive limited cookieless signals (for example, that a page was viewed) without reading or writing cookies on your device.

## 2. Categories

| Category | Consent needed? | Purpose |
|---|---|---|
| Strictly necessary | No | Log-in, security, fraud prevention, payment, remembering your cookie choice |
| Statistics (first-party / privacy-friendly) | No consent, but you can **opt out** (PECR as amended by the DUAA 2025) | Aggregate statistics to improve our site — Vercel Web Analytics and Speed Insights, which do not use cookies |
| Analytics (Google Analytics) | **Yes** | Measuring how visitors use the site |
| Advertising and marketing | **Yes** | AdSense ads on guide and comparison pages for signed-out visitors; Google Ads conversion measurement |

## 3. Cookies and similar technologies we use

| Name | Provider | Category | Purpose | Duration |
|---|---|---|---|---|
| Supabase auth cookie (name starts with \`sb-\` and ends with \`-auth-token\`, and may be split into \`.0\` and \`.1\`) | SpriteLab (Supabase Auth) | Strictly necessary | Keeps you logged in | Session, or until you sign out |
| Supabase code-verifier cookie (name starts with \`sb-\` and ends with \`-auth-token-code-verifier\`) | SpriteLab (Supabase Auth) | Strictly necessary | Secure sign-in with Google (PKCE) | Short-lived, during sign-in |
| \`g_state\` | Google (Sign in with Google) | Strictly necessary | Remembers whether you closed the Google sign-in prompt | 180 days (observed) |
| \`__stripe_mid\`, \`__stripe_sid\` | Stripe | Strictly necessary (fraud prevention) | Fraud prevention during payment | 1 year / 30 minutes |
| Vercel Web Analytics, Speed Insights | Vercel | Statistics (no cookies) | Aggregate page views and performance | No cookie |
| \`_ga\` | Google Analytics | Analytics (consent) | Distinguishes visitors | 400 days (observed) |
| \`_ga_DSMJ4N3BSQ\` | Google Analytics | Analytics (consent) | Keeps session state for this GA4 property | 400 days (observed) |
| \`IDE\`, \`test_cookie\` (on doubleclick.net) | Google | Advertising (consent) | Personalised advertising; checks whether cookies are supported | \`test_cookie\` 15 minutes (observed); \`IDE\` 13 months |

Google may set further advertising cookies after you consent, for conversion measurement, ad delivery, frequency capping and fraud prevention. A record of your cookie choice, where the consent tool stores one, is strictly necessary.

Fonts on this site are self-hosted. Loading a page does not request font files from Google.

Third-party sites we link to (for example TikTok) set their own cookies only when you visit them.

## 4. Advertising

Guide and comparison pages show Google AdSense ads to visitors who are not signed in. Signed-in members never see ads. In the UK and EEA, Google shows personalised ads only if you have consented; otherwise Google may show non-personalised or limited ads, which still use cookies for frequency capping, fraud prevention and measurement where permitted. You can control personalised Google ads at [adssettings.google.com](https://adssettings.google.com). Learn more: [policies.google.com/technologies/partner-sites](https://policies.google.com/technologies/partner-sites).

## 5. Changes and contact

We will update this policy when we change the cookies we use. Questions: **[support@sprite-lab.com](mailto:support@sprite-lab.com)**.
`;
