# Show HN

> **PL – instrukcja:** Wyślij na https://news.ycombinator.com/submit . Tytuł musi zaczynać się od „Show HN:”, URL = strona produktu, a tekst wklej jako pierwszy komentarz zaraz po publikacji (HN nie pokazuje tekstu, jeśli podasz URL). Produkt musi dać się wypróbować bez długiej rejestracji – mamy 3 próby bez konta, więc OK. Najlepiej wtorek–czwartek, 14:00–16:00 czasu polskiego. Nie proś nikogo o upvote (HN to wykrywa i karze). Odpowiadaj rzeczowo, przyznawaj się do ograniczeń. HN jest sceptyczny wobec AI – technika i szczerość działają, marketing nie. Sprawdź punkty techniczne – mają być prawdziwe.

**Title:**
```
Show HN: SpriteLab – AI sprite generator for indie games, rebuilt after the first one failed
```

**URL:** https://www.sprite-lab.com

**First comment:**
```
Hi HN, solo developer here.

SpriteLab generates 2D game assets from a text prompt: sprites as transparent PNGs, pixel art, seamless floor/wall tiles, animated water and icons. Any sprite can be animated and exported as a sprite sheet, separate frames and a GIF.

Some context: the first version of SpriteLab was bad. The generator frequently ignored the prompt, and I abandoned the site. This version is a rebuild from scratch, not a patch.

A few things that were more interesting than I expected:

- Pixel art. Image models produce images that look pixel-art-ish but aren't on a consistent grid and have far too many colours. SpriteLab outputs pixel art on a real pixel grid with a limited palette, which is what makes it usable next to hand-made assets. There's also a free pixel-perfect upscale.

- Animation. You can use standard motions (idle, walk, run, attack, jump, fly, turnaround) or a custom one, but the more useful part turned out to be suggesting motions from what the sprite is: a dog gets "wag tail" and "bark", a car "drive" and "drift", a dragon "fire breath". You choose 4/6/9 key poses, or a smooth mode up to 18 frames where AI generates the in-betweens.

- Organisation. Generated assets go into projects with automatic folder sorting and can be downloaded as a ZIP, which matters once you have 50+ assets for a jam.

Limits, so nobody is surprised: no API, no 3D, no 8-direction character sets, no autotile tilesets.

You can try it without an account (3 generations), signup gives 10 credits with no card, paid plans start at £5/month, and commercial use is allowed.

I'd appreciate blunt feedback, especially on animation consistency and the pixel art output.
```

**Prepared answers (FAQ):**
- *"Which model do you use?"* – answer honestly with what you actually use (see your internal notes); don't overclaim.
- *"Is it trained on stolen art?"* – be factual about which third-party models you use; don't claim anything you can't verify.
- *"Why not an API?"* – "Not yet. I want the web workflow to be solid first; tell me your use case."
- *"How is this different from spritelab.dev?"* – "Different, unrelated product with a similar name."
