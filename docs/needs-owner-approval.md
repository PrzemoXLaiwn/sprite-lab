# NEEDS OWNER APPROVAL

No prices, credit grants, credit costs, payment methods, or balances are changed by this note. Nothing here should be deployed as a behaviour change until you pick a number.

## Free credits: the site says 10, the repo grants 20

Checked 31 Oct 2026:

- Live `https://www.sprite-lab.com/` says **10 free credits** (homepage FAQ, the free-plan offer, and "10 free credits when you sign up").
- `origin/main` at `8c88766` and the open UX pull request set `SIGNUP_CREDITS = 20` in `src/config/signup.ts`. Public copy on that code reads the constant, so a local render of `/register` says "Start with 20 free credits" and `/pricing` says "20 credits to start".
- Old changelog lines still mention a 10-credit free tier. Those describe an earlier release. They are not the current constant.
- The October audit already saw the database start balances as mostly 10, 20 on 18–19 Oct, and a mix of 10 and 20 on 30–31 Oct. Production is not the same tree as this `main`.

A separate read of new accounts: **36% have fewer than 7 credits**. The cheapest animation is 7 credits (4 frames, not smooth). A 4-direction walk is 12, 8 directions is 10. Someone under 7 credits cannot run the cheapest animation at all.

### Impact if you do nothing

- Visitors on the live site are promised 10. Anyone who signs up on the current production grant and spends a sprite or two is in the group that cannot try a walk cycle, which is what the paying accounts actually use.
- Shipping `main` as it stands would change the promise and the grant from 10 to 20 with no separate decision. That is about one extra 4-frame animation, or a 4-direction walk after a couple of sprites. It does not add a commercial licence.

### Impact of the choices (do not apply these here)

| Choice | What the visitor sees | What a new account can try | Cost to us |
|---|---|---|---|
| Leave production at 10 and do not deploy the repo's 20 | Matches today's site | One standard sprite is 1 credit. After that, 9 left: one 4-frame animation (7) fits, a walk (12) does not. 36% are already under 7, so they cannot animate. | No change |
| Deploy the repo's 20 | Site and grant both say 20 | Room for a 4-frame animation and still a walk (12) if they have not spent the rest | About 10 extra credits per new account, at the cheap sprite rate. Still personal use only |
| Change the repo back to 10 | Matches today's site | Makes the animation gap the permanent grant | Lower free-credit cost, fewer people ever see the feature payers buy |

Recommendation: decide the grant first, then make the site and `SIGNUP_CREDITS` the same number. Do not change it in a conversion pull request.

## Pro costs more per credit than Starter

Unchanged Stripe prices:

- Starter £5 / 250 credits = **2.0p** per credit
- Pro £12 / 500 credits = **2.4p** per credit
- Studio £25 / 1,200 credits = **2.08p** per credit

The pricing page already prints these rates. Pro is the worse deal per credit, and it no longer carries "Most popular" (that badge is on the £2.99 pack in the UX pull request). The £12 price was not changed.

To make Pro no worse than Starter **without changing the £12 Stripe price**, Pro needs at least **600 credits** a month (12 / 600 = 2.0p). 650 credits would be about 1.85p. Studio needs at least **1,250 credits** to match Starter's 2.0p at £25.

Impact of raising Pro from 500 to 600: every new and renewing Pro invoice would grant 100 more credits. Provider cost goes up only when those credits are spent. Do not change `PLAN_MONTHLY_CREDITS` until you accept that.

## Not turned on

- `automatic_payment_methods` for subscriptions. Packs already use it. Subscriptions stay card-only, because a wallet that confirms a SetupIntent and then fails `subscriptions.create` would hit the existing confirm path. That path was not changed.
- A free first animation. That would change a credit cost and the generate route.

## Landing and footer (not edited)

Another agent owns the homepage and the footer. Two requests from the audit, left undone:

- The hero should show a walk cycle (the witch walk GIF and sheet are already in `public/showcase/`) and say, in the hero, why this is not a general image generator: transparent PNG, the same character across frames, 4 and 8 directions, engine pack.
- The footer line `69 Haybridge Avenue, Telford, TF1 5JT` is a home address. The legal pages still need an address. The footer should not repeat the full street address.
