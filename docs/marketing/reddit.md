# Reddit

> **PL – instrukcja:**
> - Zasady sprawdzone 8 paź 2026 (przez ThreadFox, który czyta stronę zasad subreddita). **Przed każdym postem otwórz `reddit.com/r/NAZWA/about/rules`** – zasady się zmieniają.
> - Konto: najlepiej starsze niż 2 tygodnie i z karmą >100. Przez tydzień przed pierwszym postem odpowiadaj pomocnie w komentarzach (bez linków).
> - Zawsze pisz wprost: „I'm the developer” (ujawnienie własności). Link do strony daj w **pierwszym komentarzu**, nie w treści (o ile niżej nie napisano inaczej).
> - Jeden subreddit dziennie, nie wklejaj tego samego tekstu w kilka miejsc tego samego dnia (filtr spamu Reddita).
> - Najlepszy czas: wtorek–czwartek, 14:00–16:00 czasu polskiego (rano w USA). Zostań 2–3 godziny i odpowiadaj na komentarze.
> - Krytyka AI będzie – odpowiadaj spokojnie, bez kłótni.
> - **Punkty techniczne „czego się nauczyłem” (r/SideProject, r/gamedev) to szkic – przed publikacją dopasuj je do tego, jak NAPRAWDĘ działa twój pipeline i usuń wszystko, co nie jest prawdą.**

## Rules summary

| Subreddit | Self-promo | AI content | Verdict |
|---|---|---|---|
| r/PixelArt | **Banned** (Rule 4: no self-promotion) | **Banned** (Rule 7: "Art created with AI, partially or fully is not allowed") | **DO NOT POST. Not even in comments.** |
| r/godot | Allowed with "promotion" flair, no spam | **Effectively banned for us**: "AI-generated content needs to verifiably stem from a model which was trained only on data submitted with the original creator's consent." SpriteLab cannot prove that. | **DO NOT POST.** |
| r/aigamedev | **Restricted**: Rule 3 "Commercial GAMES are OK, but direct or indirect promotion of commercial services or products is not allowed." | Pro-AI | **DO NOT promote SpriteLab.** You may post a workflow discussion without naming/linking the tool – risky, skip unless asked directly in comments. |
| r/gamedev | **Restricted**: Rule 3 "this subreddit isn't the place to showcase your project or artwork"; Rule 4 link-only posts = ban | Restricts AI posts | **Only a text-only, educational post with no link** (below). Highest risk – optional. |
| r/IndieDev | No written rule against it | No written AI rule | **Allowed** – value-first post with GIF. |
| r/Unity2D | Allowed ("Sharing work… welcome. Spam, unrelated promotion… may be removed") | No written AI rule | **Allowed** – practical "into Unity" angle. |
| r/SideProject | No written rule; promotion-friendly culture | – | **Allowed** – build/relaunch story. Best fit. |

Suggested order: r/SideProject (week 1) → r/IndieDev (week 2) → r/Unity2D (week 3) → r/gamedev educational post (week 4, optional).

---

## r/SideProject

**Title:** I relaunched my abandoned AI sprite generator after rebuilding it from scratch – the old one ignored prompts

**GIF:** anim-dragon-breath.gif (upload as the post image/video, or link it in the body)

**Body:**
```
A while ago I built SpriteLab, an AI tool that makes 2D sprites for games. Honestly, it wasn't good: the generator often ignored the prompt, so I stopped working on it and the site just sat there.

This year I rebuilt it from scratch. What changed:

- Prompts are actually followed now (that was the whole problem before)
- Pixel art is snapped to a real pixel grid with a limited palette instead of the blurry "AI pixel" look
- You can animate any sprite (idle, walk, run, attack, jump, fly, turnaround, custom). It suggests motions that fit the object – a dog gets "wag tail", a car gets "drift", a dragon gets "fire breath"
- Exports a sprite sheet, separate frames and a GIF; up to 18 frames in smooth mode
- Seamless tiles, animated water, icons, and a free pixel-perfect upscale

Things I learned on the rebuild:
1. "Pixel art" from image models is usually not on a grid. Fixing that in post-processing mattered more than the model choice.
2. Suggesting motions per object was more useful than a fixed list of animations – people don't know what to ask for a car or a slime.
3. Being honest about what it doesn't do (no API, no 3D, no 8-direction sets) saves a lot of angry emails.

It's free to try (3 tries without an account, 10 credits on signup, no card). I'm the solo dev, so any feedback is very welcome – especially what breaks or looks wrong. Link in the comments.
```

**First comment:** `Link: https://www.sprite-lab.com – if you used the old version, returning users get +15 credits until the end of 2026.`

---

## r/IndieDev

**Title:** I made a tool that suggests animations based on what the sprite is – here's a dragon, a dog and a car

**GIF:** combine or post anim-dragon-breath.gif (main), mention dog and car GIFs in comments.

**Body:**
```
Solo dev here. I've been rebuilding SpriteLab, an AI sprite generator, and the feature I'm most curious to get feedback on is motion suggestions.

Instead of only offering idle/walk/run/attack, it looks at the sprite and suggests motions that make sense for it:
- dog → wag tail, bark
- car → drive, drift
- dragon → fire breath

You pick 4, 6 or 9 key poses, or a smooth mode up to 18 frames with AI in-betweens, and it exports a sprite sheet + frames + GIF.

Question for you: for prototyping, would you rather have more suggested motions per sprite, or better consistency on the standard set (idle/walk/attack)? I'm deciding what to work on next.

(Disclosure: I'm the developer. It's free to try, link in comments if anyone wants it.)
```

**First comment:** `https://www.sprite-lab.com – 3 tries without an account. Other GIFs: https://www.sprite-lab.com/showcase/anim-dog-jump.gif and https://www.sprite-lab.com/showcase/anim-car-drive.gif`

---

## r/Unity2D

**Title:** Quick workflow: AI-generated sprite sheet → Unity Sprite Editor → Animator in a few minutes

**GIF:** anim-knight-idle.gif

**Body:**
```
I'm the developer of SpriteLab (an AI sprite generator), and a few people asked how the exports work in Unity, so here's the workflow I use for prototyping:

1. Generate the character (transparent PNG). For pixel art, keep the pixel-art style so it's on a real grid.
2. Animate it (e.g. idle with 6 key poses) and export the sprite sheet.
3. In Unity: import the sheet, Texture Type = Sprite (2D and UI), Sprite Mode = Multiple.
4. For pixel art: Filter Mode = Point (no filter), Compression = None, set Pixels Per Unit to your tile size.
5. Sprite Editor → Slice → Grid By Cell Count (match the frame count) → Apply.
6. Select all frames and drag them into the scene – Unity creates the Animation clip and Animator for you.

The export also includes separate frames and a GIF, so you can skip slicing if you prefer importing individual PNGs.

Happy to answer questions about the Unity side. Tool is free to try if you want to test the pipeline (link in comments).
```

**First comment:** `https://www.sprite-lab.com`

---

## r/gamedev (optional, educational only – NO link, NO tool name in title)

> **PL:** Ryzyko usunięcia/bana. Publikuj tylko jako tekst edukacyjny, bez linku i bez obrazków własnego produktu. Jeśli ktoś zapyta o narzędzie w komentarzu – możesz odpowiedzieć jednym zdaniem.

**Title:** What I learned about getting usable pixel art out of image models (grid snapping, palettes, frames)

**Body:**
```
I've spent the last months working on AI-assisted sprite generation, and most of the work turned out to be post-processing, not prompting. Sharing in case it helps anyone experimenting with this for prototypes:

1. Image models don't output real pixel art. They output an image that looks pixel-ish at a glance, but "pixels" are different sizes and edges are anti-aliased. You need to detect the intended grid size and resample to it, otherwise it looks wrong next to hand-made tiles.
2. Limit the palette after snapping, not before. Quantising first spreads noise across the grid.
3. Transparent backgrounds need their own cleanup pass – soft halos around sprites are the most common giveaway.
4. For animation, fewer key poses + generated in-betweens was more stable for me than generating every frame independently.
5. Seamless tiles need checking by tiling 3×3; a single tile almost always looks fine on its own.

Not trying to start an AI debate – I know a lot of you prefer hand-made art and I get why. This is just what worked for placeholder/prototype assets. Happy to go deeper on any of these.
```

---

## Skipped subreddits (do not post)
- **r/PixelArt** – bans AI art entirely (partially or fully) and bans self-promotion.
- **r/godot** – AI content must come from consent-only training data, which cannot be proven.
- **r/aigamedev** – bans promotion of commercial services/products (only commercial *games* allowed).
