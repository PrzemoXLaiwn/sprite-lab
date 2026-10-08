# Marketing SpriteLab – zestaw do samodzielnej publikacji

Cel: więcej użytkowników i lepsza widoczność w odpowiedziach asystentów AI (ChatGPT, Perplexity, Gemini, Copilot) = **GEO**. Asystenci AI polecają narzędzia, o których czytają w wielu niezależnych miejscach (katalogi, Reddit, GitHub, HN, Product Hunt) **z tym samym opisem**. Dlatego wszędzie używamy identycznej nazwy, URL-a i opisu z `directories.md`.

Treści do wklejenia są po angielsku. Instrukcje – po polsku.

## Pliki

| Plik | Co zawiera |
|---|---|
| `directories.md` | Tabela ~18 katalogów (darmowe/płatne, ceny, linki) + gotowy tekst wpisu |
| `product-hunt.md` | Komplet na launch na Product Hunt + checklista dnia premiery |
| `reddit.md` | Zasady subredditów (gdzie NIE wolno) + gotowe posty |
| `show-hn.md` | Post „Show HN” na Hacker News |
| `indie-hackers.md` | Post o relaunchu na Indie Hackers |
| `itch-io-pack.md` | Plan darmowej paczki assetów „made with SpriteLab” na itch.io |
| `awesome-lists.md` | Gotowe linijki i opisy PR do 3 list „awesome” na GitHubie |
| `twitter-x.md` | 10 postów / wątek na X z GIF-ami |

## Żelazne zasady
1. **Nigdy nie wymyślaj funkcji.** Nie ma: API, MCP, 3D, zestawów 8-kierunkowych, autotile tilesetów. Jeśli ktoś pyta – „not yet”.
2. **Zawsze ujawniaj, że jesteś twórcą** („I'm the developer”).
3. **Zawsze ujawniaj AI**, szczególnie na itch.io.
4. **Nie publikuj na r/PixelArt, r/godot, r/aigamedev** – zakaz AI lub zakaz promocji usług (szczegóły w `reddit.md`).
5. Zawsze `https://www.sprite-lab.com` (z www). Jeśli ktoś myli z **spritelab.dev** – to inny, niezwiązany produkt.
6. Nie proś o upvote'y (PH, HN, Reddit to karzą). Proś o feedback.
7. Promocja dla powracających (+15 kredytów) trwa do 31.12.2026 – po tej dacie usuń tę wzmiankę z tekstów.

## Kolejność priorytetów
1. **Darmowe katalogi** (szybko, trwałe linki, GEO) – AlternativeTo, SaaSHub, FutureTools, Peerlist, Uneed.
2. **GitHub awesome lists** (wysokie zaufanie wyszukiwarek i modeli AI).
3. **r/SideProject + Indie Hackers** (historia relaunchu).
4. **Darmowa paczka na itch.io** (wartość dla społeczności = naturalne linki).
5. **Product Hunt** (jednorazowy duży strzał – po zebraniu pierwszego feedbacku).
6. **Show HN** (wysokie ryzyko/wysoka nagroda).
7. Reszta Reddita, X na bieżąco.
8. Płatne katalogi (TAAFT $49) – tylko jeśli darmowe dadzą ruch.

## Plan na 4 tygodnie

### Tydzień 1 – fundamenty (ok. 4–5 h)
- [ ] Przygotuj media raz: logo 512×512, 5–6 zrzutów ekranu, GIF-y z `/showcase/`.
- [ ] Zgłoś: **AlternativeTo, SaaSHub, FutureTools, Uneed (darmowa kolejka), Indie Hackers products, AI Tool Hunt (free), Microlaunch (free)** – tekst z `directories.md`.
- [ ] Załóż/uzupełnij profil Peerlist i zweryfikuj go (potrzebne do launchu w poniedziałek).
- [ ] Wyślij 3 PR-y z `awesome-lists.md`.
- [ ] Załóż konto na Product Hunt i zacznij być aktywny (komentarze).
- [ ] Reddit: tylko komentuj pomocnie w r/IndieDev, r/Unity2D, r/SideProject (bez linków) – budowa karmy.
- [ ] X: posty #1 i #7 (przypnij wątek).
- [ ] Na koniec tygodnia: post na **r/SideProject** (wt–czw).

### Tydzień 2 – historia relaunchu
- [ ] **Poniedziałek: Peerlist Launchpad.**
- [ ] Post na **Indie Hackers** (`indie-hackers.md`).
- [ ] Post na **r/IndieDev** (motion suggestions).
- [ ] Zacznij generować paczkę na itch.io (`itch-io-pack.md`).
- [ ] DevHunt (darmowa kolejka) i Fazier (free – tylko jeśli akceptujesz badge w stopce).
- [ ] X: posty #2, #3, #4.

### Tydzień 3 – wartość + Product Hunt
- [ ] Opublikuj **paczkę na itch.io** (z oznaczeniem AI). X post #10.
- [ ] Post na **r/Unity2D** (workflow do Unity).
- [ ] **Product Hunt launch** – najlepiej sobota/niedziela (mniejsza konkurencja). Checklista w `product-hunt.md`.
- [ ] X: posty #5, #8.

### Tydzień 4 – Hacker News + podsumowanie
- [ ] **Show HN** (wt–czw, 14:00–16:00 PL).
- [ ] Opcjonalnie: edukacyjny post na r/gamedev (bez linku – ryzykowny).
- [ ] X: posty #6, #9.
- [ ] Zmierz wyniki (niżej), napisz aktualizację na Indie Hackers „what worked”.
- [ ] Sprawdź, które PR-y/zgłoszenia przeszły; ponów odrzucone (np. FutureTools po tygodniu).

Po 4 tygodniach: 1 post w tygodniu (X/Reddit), co miesiąc mała aktualizacja paczki itch.io, co miesiąc test GEO.

## Jak mierzyć

### Google Search Console (https://search.google.com/search-console)
- Raz w tygodniu: **Skuteczność → Zapytania** – szukaj fraz typu „ai sprite generator”, „pixel art generator”, „sprite sheet generator”, „sprite lab”. Zapisuj wyświetlenia, kliknięcia, średnią pozycję.
- **Linki → Najczęściej linkujące witryny** – czy pojawiają się katalogi i GitHub.

### Bing Webmaster Tools (https://www.bing.com/webmasters)
- Dodaj stronę (można zaimportować z Search Console).
- Sprawdzaj raport **AI Performance** (cytowania strony w odpowiedziach Copilot/Bing AI) – to bezpośredni wskaźnik GEO. Bing zasila też część odpowiedzi ChatGPT z wyszukiwaniem.

### Test asystentów AI – raz w miesiącu (ten sam dzień, te same pytania)
Zadaj w **ChatGPT (z wyszukiwaniem), Perplexity, Gemini, Copilot** – w nowym czacie, bez logowania jeśli się da:
1. „What are the best AI tools to generate 2D game sprites?”
2. „AI tool to animate a pixel art sprite into a sprite sheet”
3. „Free AI pixel art generator for indie games”
4. „What is SpriteLab (sprite-lab.com)?”
5. „Alternatives to Ludo.ai for sprites”

Zapisuj w tabeli: data | asystent | pytanie | czy SpriteLab wymieniony (tak/nie) | pozycja | czy opis poprawny (czy nie myli ze spritelab.dev, czy nie wymyśla API/3D) | jakie źródło cytuje.

### Analityka strony
- Rejestracje i wejścia z: producthunt.com, news.ycombinator.com, reddit.com, indiehackers.com, itch.io, github.com, alternativeto.net, saashub.com. Dodawaj `?ref=nazwa` do linków tam, gdzie to wygląda naturalnie (katalogi, itch.io) – nie na Reddicie/HN.

### Tabela wyników (uzupełniaj co tydzień)

| Tydzień | Wejścia | Rejestracje | Płatni | Nowe linkujące domeny | GSC wyświetlenia | Wzmianki w AI (x/20) |
|---|---|---|---|---|---|---|
| 0 (start) | | | | | | |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
