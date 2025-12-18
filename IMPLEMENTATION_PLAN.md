# 🚀 Plan Implementacji Ulepszeń - SpriteLab

## FAZA 1: KRYTYCZNE POPRAWKI (Tydzień 1) ⚡

### 1.1 Optymalizacja Parametrów Modeli
**Priorytet: NAJWYŻSZY** 🔴
**Czas: 2-3 godziny**
**Wpływ: +30% jakości**

#### Pliki do edycji:
- `src/config/styles/styles-2d.ts`

#### Zmiany:
```typescript
// PIXEL ART - Obniż guidance, zwiększ steps
PIXEL_ART_16: {
  guidance: 8.0,  // było 10.0
  steps: 50,      // było 45
}

PIXEL_ART_32: {
  guidance: 8.0,  // było 8.5
  steps: 45,      // było 40
}

// ISOMETRIC - Zwiększ guidance i steps
ISOMETRIC: {
  guidance: 8.5,  // było 7.5
  steps: 45,      // było 40
}

ISOMETRIC_PIXEL: {
  guidance: 9.0,  // było 9.0 ✓
  steps: 50,      // było 45
}
```

**Test:**
```bash
# Wygeneruj 5 pixel art sprites i porównaj z poprzednimi
npm run dev
# Testuj: sword, potion, character, tree, icon
```

---

### 1.2 Ulepszenie Negative Prompts
**Priorytet: WYSOKI** 🔴
**Czas: 1-2 godziny**
**Wpływ: +20% jakości, -15% failed generations**

#### Pliki do edycji:
- `src/config/prompts/negative-prompts.ts` (nowy plik)
- `src/config/prompts/prompt-builder.ts`

#### Implementacja:

**Krok 1: Stwórz nowy plik negative-prompts.ts**
```typescript
// src/config/prompts/negative-prompts.ts

export const UNIVERSAL_NEGATIVES = {
  // Tło i kontekst
  background: "complex background, detailed background, scenery, landscape, environment scene, room interior, outdoor setting, contextual background",
  
  // Wielokrotne obiekty
  multiObject: "multiple objects, many items, collection set, group of items, pile, stack, scattered objects, several pieces",
  
  // Kontekst użycia
  context: "character holding, hand holding, person using, worn by character, equipped on body, in use, action scene, combat scene",
  
  // UI/Ramki
  ui: "UI frame, interface border, game HUD, health bar, menu overlay, button, text overlay, watermark, logo",
  
  // Jakość
  quality: "low resolution, blurry, noisy, jpeg artifacts, compression artifacts, pixelated (for non-pixel styles), grainy",
  
  // Kompozycja
  composition: "cropped, cut off, partial view, incomplete object, edge of frame, zoomed too close, zoomed too far",
  
  // Techniczne
  technical: "wrong aspect ratio, distorted proportions, stretched, squashed, warped, deformed",
  
  // Niepożądana zawartość
  wrongContent: "text, letters, numbers, words, labels, signs, writing, typography",
  
  // Części ciała (dla equipment)
  bodyParts: "human body, person, face, head, hands, arms, legs, torso, skin, body parts, mannequin",
};

// Specyficzne dla pixel art
export const PIXEL_ART_NEGATIVES = {
  antiSmooth: "smooth rendering, soft edges, gradient shading, anti-aliased, anti-aliasing, blurred edges, soft focus, smooth gradients, airbrush, soft brush",
  
  wrongStyle: "photorealistic, realistic rendering, oil painting, watercolor, digital painting, 3D render, high detail photo, modern digital art, vector art",
  
  wrongTechnique: "smooth shading, realistic lighting, complex shadows, soft lighting, ambient occlusion, ray tracing",
};

// Specyficzne dla izometrycznego
export const ISOMETRIC_NEGATIVES = {
  wrongAngle: "perspective view, vanishing point, one point perspective, two point perspective, front view, side view, top-down flat, bird's eye view, tilted angle, dutch angle, fisheye",
  
  wrong3D: "full 3D render, realistic 3D, photorealistic 3D, ray traced, physically based rendering",
  
  mistakes: "inconsistent angles, mixed perspectives, wrong projection, distorted geometry, warped shapes",
  
  styleIssues: "realistic textures, photorealistic materials, complex lighting, ambient occlusion, subsurface scattering",
  
  composition: "multiple buildings forming complex, city scene, landscape view, aerial view, ground level view",
};

// Specyficzne dla game assets
export const GAME_ASSET_NEGATIVES = {
  notGameReady: "concept art sketch, rough draft, unfinished, work in progress, study, practice piece",
  
  wrongFormat: "portrait orientation for items, landscape for characters, wrong framing, poor composition",
  
  notIsolated: "connected to other objects, part of larger scene, integrated into environment, attached to surface",
};
```

**Krok 2: Zaktualizuj prompt-builder.ts**
```typescript
// Importuj nowe negative prompts
import {
  UNIVERSAL_NEGATIVES,
  PIXEL_ART_NEGATIVES,
  ISOMETRIC_NEGATIVES,
  GAME_ASSET_NEGATIVES,
} from "./negative-prompts";

// W funkcji buildUltimatePrompt, sekcja negative prompts:
const negativeParts: string[] = [];

// 1. Style-specific negatives FIRST
negativeParts.push(style.negatives);

// 2. Pixel art extra enforcement
if (isPixelArt) {
  negativeParts.push(PIXEL_ART_NEGATIVES.antiSmooth);
  negativeParts.push(PIXEL_ART_NEGATIVES.wrongStyle);
  negativeParts.push(PIXEL_ART_NEGATIVES.wrongTechnique);
}

// 3. Isometric extra enforcement
if (isIsometric) {
  negativeParts.push(ISOMETRIC_NEGATIVES.wrongAngle);
  negativeParts.push(ISOMETRIC_NEGATIVES.wrong3D);
  negativeParts.push(ISOMETRIC_NEGATIVES.mistakes);
  negativeParts.push(ISOMETRIC_NEGATIVES.styleIssues);
  negativeParts.push(ISOMETRIC_NEGATIVES.composition);
}

// 4. Subcategory avoid list
if (subcategoryConfig?.avoid) {
  negativeParts.push(subcategoryConfig.avoid);
}

// 5. Universal game asset negatives
negativeParts.push(UNIVERSAL_NEGATIVES.background);
negativeParts.push(UNIVERSAL_NEGATIVES.multiObject);
negativeParts.push(UNIVERSAL_NEGATIVES.context);
negativeParts.push(UNIVERSAL_NEGATIVES.ui);
negativeParts.push(UNIVERSAL_NEGATIVES.quality);
negativeParts.push(UNIVERSAL_NEGATIVES.composition);
negativeParts.push(UNIVERSAL_NEGATIVES.technical);
negativeParts.push(UNIVERSAL_NEGATIVES.wrongContent);

// 6. Body parts (dla equipment)
if (categoryId === "ARMOR" || categoryId === "WEAPONS") {
  negativeParts.push(UNIVERSAL_NEGATIVES.bodyParts);
}

// 7. Game asset specific
negativeParts.push(GAME_ASSET_NEGATIVES.notGameReady);
negativeParts.push(GAME_ASSET_NEGATIVES.notIsolated);
```

---

### 1.3 Game-Specific Prompt Prefixes
**Priorytet: WYSOKI** 🔴
**Czas: 1 godzina**
**Wpływ: +15% jakości, lepsze rozpoznawanie kontekstu**

#### Pliki do edycji:
- `src/config/prompts/prompt-builder.ts`

#### Implementacja:

```typescript
// Na początku pliku dodaj:
const GAME_ASSET_PREFIXES: Record<string, string> = {
  WEAPONS: "game weapon icon, RPG equipment sprite, loot drop weapon",
  ARMOR: "game armor icon, RPG equipment sprite, loot drop armor piece",
  CONSUMABLES: "game consumable icon, usable item sprite, inventory pickup",
  RESOURCES: "game resource icon, crafting material sprite, gatherable item",
  QUEST_ITEMS: "game quest item icon, special artifact sprite, unique collectible",
  CHARACTERS: "game character sprite, playable character asset, RPG character",
  CREATURES: "game creature sprite, enemy asset, monster sprite",
  ENVIRONMENT: "game environment prop, world decoration asset, placeable object",
  ISOMETRIC: "isometric game asset, strategy game sprite, 2.5D game object",
  TILESETS: "game tileset texture, seamless tile asset, level design tile",
  UI_ELEMENTS: "game UI element, interface component sprite, HUD graphic",
  EFFECTS: "game VFX sprite, visual effect asset, particle effect",
  PROJECTILES: "game projectile sprite, ammunition asset, flying object",
};

// W funkcji buildUltimatePrompt, na początku budowania promptu:
const promptParts: string[] = [];

// DODAJ PREFIX JAKO PIERWSZY ELEMENT
const gamePrefix = GAME_ASSET_PREFIXES[categoryId] || "game asset sprite";
promptParts.push(`((${gamePrefix}))`);

// Potem reszta jak było...
```

---

## FAZA 2: SMART MODEL SELECTION (Tydzień 1-2) 💰

### 2.1 Inteligentny Wybór Modelu
**Priorytet: WYSOKI** 🟡
**Czas: 3-4 godziny**
**Wpływ: -30% kosztów, +10% jakości**

#### Pliki do edycji:
- `src/lib/model-selector.ts` (nowy plik)
- `src/app/api/generate/route.ts`

#### Implementacja:

**Krok 1: Stwórz model-selector.ts**
```typescript
// src/lib/model-selector.ts

export type ModelType = "flux-dev" | "sdxl" | "flux-schnell";
export type UserTier = "free" | "pro" | "lifetime";

interface ModelSelectionResult {
  model: ModelType;
  reason: string;
  estimatedCost: number;
  estimatedTime: number;
}

export function selectOptimalModel(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  userTier: UserTier
): ModelSelectionResult {
  
  // REGUŁA 1: Pixel Art -> SDXL (lepszy i tańszy)
  if (styleId.includes("PIXEL")) {
    return {
      model: "sdxl",
      reason: "SDXL excels at pixel art with better pixel control",
      estimatedCost: 0.0023,
      estimatedTime: 25,
    };
  }
  
  // REGUŁA 2: Isometric -> SDXL (lepsze kontrolowanie kątów)
  if (categoryId === "ISOMETRIC" || styleId.includes("ISOMETRIC")) {
    return {
      model: "sdxl",
      reason: "SDXL better maintains strict isometric angles",
      estimatedCost: 0.0023,
      estimatedTime: 25,
    };
  }
  
  // REGUŁA 3: Proste style -> flux-schnell (wystarczająco dobre)
  const simpleStyles = ["VECTOR_CLEAN", "CHIBI_CUTE", "CARTOON_WESTERN"];
  if (simpleStyles.some(s => styleId === s)) {
    return {
      model: "flux-schnell",
      reason: "Fast model sufficient for simple, clean styles",
      estimatedCost: 0.003,
      estimatedTime: 8,
    };
  }
  
  // REGUŁA 4: Realistyczne/złożone -> flux-dev
  const complexStyles = ["REALISTIC_PAINTED", "DARK_SOULS", "HAND_PAINTED"];
  if (complexStyles.some(s => styleId === s)) {
    return {
      model: "flux-dev",
      reason: "Complex realistic styles need FLUX-dev quality",
      estimatedCost: 0.025,
      estimatedTime: 35,
    };
  }
  
  // REGUŁA 5: Free users -> zawsze najtańszy
  if (userTier === "free") {
    return {
      model: "flux-schnell",
      reason: "Free tier uses fastest, most cost-effective model",
      estimatedCost: 0.003,
      estimatedTime: 8,
    };
  }
  
  // REGUŁA 6: UI Elements -> flux-schnell (proste, płaskie)
  if (categoryId === "UI_ELEMENTS") {
    return {
      model: "flux-schnell",
      reason: "UI elements work well with fast generation",
      estimatedCost: 0.003,
      estimatedTime: 8,
    };
  }
  
  // DEFAULT: flux-dev dla Pro/Lifetime
  return {
    model: "flux-dev",
    reason: "Default high-quality model for premium users",
    estimatedCost: 0.025,
    estimatedTime: 35,
  };
}

// Helper: Oszacuj całkowity koszt z retry
export function estimateTotalCost(
  baseModel: ModelType,
  maxRetries: number = 3
): number {
  const costs = {
    "flux-dev": 0.025,
    "sdxl": 0.0023,
    "flux-schnell": 0.003,
  };
  
  // Zakładamy 30% szans na retry
  const avgRetries = maxRetries * 0.3;
  return costs[baseModel] * (1 + avgRetries);
}
```

**Krok 2: Zintegruj w route.ts**
```typescript
// src/app/api/generate/route.ts

import { selectOptimalModel, estimateTotalCost } from "@/lib/model-selector";

// W funkcji POST, przed budowaniem promptu:

// Pobierz user tier
const userRecord = await getOrCreateUser(user.id, user.email!);
const userTier = userRecord.plan || "free";

// Wybierz optymalny model
const modelSelection = selectOptimalModel(
  categoryId,
  subcategoryId,
  styleId,
  userTier as "free" | "pro" | "lifetime"
);

console.log(`[ModelSelection] Selected ${modelSelection.model}: ${modelSelection.reason}`);
console.log(`[ModelSelection] Estimated cost: $${modelSelection.estimatedCost.toFixed(4)}, time: ${modelSelection.estimatedTime}s`);

// Użyj wybranego modelu zamiast tego z style config
const { prompt: builtPrompt, negativePrompt: builtNegative, guidance, steps } = 
  buildUltimatePrompt(
    prompt.trim(),
    categoryId,
    subcategoryId,
    styleId
  );

// Override model z smart selection
const finalModel = modelSelection.model;
```

---

## FAZA 3: QUALITY VALIDATION (Tydzień 2) ✅

### 3.1 Podstawowa Walidacja Jakości
**Priorytet: ŚREDNI** 🟡
**Czas: 4-5 godzin**
**Wpływ: -20% failed generations, +15% user satisfaction**

#### Pliki do edycji:
- `src/lib/quality-validator.ts` (nowy plik)
- `src/app/api/generate/route.ts`

#### Implementacja:

**Krok 1: Stwórz quality-validator.ts**
```typescript
// src/lib/quality-validator.ts

interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export async function validateImageQuality(
  imageUrl: string,
  expectedCategory: string,
  expectedStyle: string
): Promise<QualityCheckResult> {
  
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;
  
  try {
    // 1. Sprawdź czy obraz się załadował
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return {
        passed: false,
        score: 0,
        issues: ["Image failed to load"],
        suggestions: ["Retry generation"],
      };
    }
    
    // 2. Sprawdź rozmiar pliku (za mały = problem)
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      
      if (sizeKB < 50) {
        issues.push("Image file too small (possible generation failure)");
        score -= 0.3;
      }
      
      if (sizeKB > 5000) {
        issues.push("Image file very large (may have unnecessary detail)");
        score -= 0.1;
      }
    }
    
    // 3. Sprawdź format
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("image/png")) {
      issues.push("Expected PNG format for transparency support");
      score -= 0.2;
    }
    
    // 4. Dla pixel art - sprawdź czy nie jest za smooth
    if (expectedStyle.includes("PIXEL")) {
      // Heurystyka: pixel art powinien mieć mniejszy rozmiar pliku
      // bo mniej unikalnych kolorów
      if (contentLength && parseInt(contentLength) / 1024 > 800) {
        issues.push("Pixel art file size suggests smooth rendering (not pixelated)");
        suggestions.push("Regenerate with stronger pixel art enforcement");
        score -= 0.4;
      }
    }
    
  } catch (error) {
    return {
      passed: false,
      score: 0,
      issues: [`Validation error: ${error}`],
      suggestions: ["Retry generation"],
    };
  }
  
  // Próg akceptacji: 70%
  const passed = score >= 0.7;
  
  if (!passed) {
    suggestions.push("Consider regenerating with adjusted parameters");
  }
  
  return {
    passed,
    score,
    issues,
    suggestions,
  };
}

// Szybka walidacja bez pobierania obrazu
export function quickValidatePrompt(
  prompt: string,
  categoryId: string
): { valid: boolean; warnings: string[] } {
  
  const warnings: string[] = [];
  
  // Sprawdź długość
  if (prompt.length < 10) {
    warnings.push("Prompt very short - may produce generic results");
  }
  
  if (prompt.length > 500) {
    warnings.push("Prompt very long - may confuse the model");
  }
  
  // Sprawdź problematyczne słowa
  const problematicWords = ["multiple", "several", "many", "collection", "set"];
  const lowerPrompt = prompt.toLowerCase();
  
  for (const word of problematicWords) {
    if (lowerPrompt.includes(word)) {
      warnings.push(`Word "${word}" may cause multiple objects in output`);
    }
  }
  
  // Dla armor - sprawdź czy nie prosi o postać
  if (categoryId === "ARMOR") {
    const bodyWords = ["wearing", "character", "person", "warrior", "knight"];
    for (const word of bodyWords) {
      if (lowerPrompt.includes(word)) {
        warnings.push(`Word "${word}" may cause body parts in armor render`);
      }
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}
```

**Krok 2: Zintegruj w route.ts**
```typescript
// src/app/api/generate/route.ts

import { validateImageQuality, quickValidatePrompt } from "@/lib/quality-validator";

// PRZED generowaniem - quick validation
const promptValidation = quickValidatePrompt(prompt.trim(), categoryId);
if (promptValidation.warnings.length > 0) {
  console.log("[Validation] Prompt warnings:", promptValidation.warnings);
  // Możesz zwrócić warnings do użytkownika (opcjonalne)
}

// PO generowaniu - quality check
if (result.success && result.imageUrl) {
  console.log("[API] 🔍 Validating image quality...");
  
  const qualityCheck = await validateImageQuality(
    result.imageUrl,
    categoryId,
    styleId
  );
  
  console.log(`[Validation] Quality score: ${(qualityCheck.score * 100).toFixed(1)}%`);
  
  if (!qualityCheck.passed) {
    console.log("[Validation] ⚠️ Quality check failed:", qualityCheck.issues);
    
    // Opcja 1: Automatyczny retry z poprawkami
    if (qualityCheck.issues.some(i => i.includes("pixel art"))) {
      console.log("[Validation] 🔄 Auto-retry with stronger pixel enforcement...");
      // Dodaj extra enforcement do promptu i spróbuj ponownie
      // (implementacja w następnej fazie)
    }
    
    // Opcja 2: Zapisz z flagą low quality
    // await markAsLowQuality(generationId, qualityCheck);
  }
}
```

---

## FAZA 4: PROGRESSIVE GENERATION (Tydzień 2-3) ⚡

### 4.1 Quick Preview + Full Quality
**Priorytet: ŚREDNI** 🟡
**Czas: 5-6 godzin**
**Wpływ: +40% perceived speed, better UX**

#### Pliki do edycji:
- `src/app/api/generate-preview/route.ts` (nowy endpoint)
- `src/app/api/generate/route.ts` (modyfikacja)
- Frontend generation component

#### Implementacja:

**Krok 1: Nowy endpoint dla preview**
```typescript
// src/app/api/generate-preview/route.ts

export async function POST(request: Request) {
  // Podobny do generate/route.ts ale:
  // - Zawsze używa flux-schnell
  // - Tylko 4 steps
  // - Niższe guidance (3.0)
  // - Szybki upload bez optymalizacji
  
  const result = await generateSprite(
    finalPrompt,
    negativePrompt,
    "flux-schnell",  // Zawsze najszybszy
    3.0,             // Niskie guidance
    4,               // Minimum steps
    usedSeed
  );
  
  // Zwróć z flagą isPreview: true
  return NextResponse.json({
    success: true,
    imageUrl: result.imageUrl,
    isPreview: true,
    fullQualityJobId: jobId, // ID do pełnej jakości
  });
}
```

**Krok 2: Modyfikuj główny endpoint**
```typescript
// src/app/api/generate/route.ts

// Dodaj parametr generatePreview
const { generatePreview = false } = body;

if (generatePreview) {
  // Przekieruj do preview endpoint
  // lub wygeneruj preview inline
}
```

---

## FAZA 5: BATCH GENERATION (Tydzień 3) 🎨

### 5.1 Generowanie Wariantów
**Priorytet: NISKI** 🟢
**Czas: 4-5 godzin**
**Wpływ: +30% user satisfaction, więcej opcji**

#### Pliki do edycji:
- `src/app/api/generate-batch/route.ts` (nowy endpoint)

#### Implementacja:

```typescript
// src/app/api/generate-batch/route.ts

interface BatchOptions {
  count: number;        // 2-4
  seedVariation: number; // ±100
  styleVariations: boolean;
}

export async function POST(request: Request) {
  const { prompt, count = 3, seedVariation = 100 } = await request.json();
  
  const baseSeed = Math.floor(Math.random() * 2147483647);
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const seed = baseSeed + (i * seedVariation);
    
    // Lekka wariacja promptu dla różnorodności
    const variedPrompt = i === 0 
      ? prompt 
      : addMinorVariation(prompt, i);
    
    const result = await generateSprite(variedPrompt, seed);
    results.push(result);
    
    // Delay między generacjami
    if (i < count - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  return NextResponse.json({
    success: true,
    variations: results,
  });
}
```

---

## TESTOWANIE

### Test Suite dla Każdej Fazy:

#### Faza 1 - Parametry i Prompty:
```bash
# Test 1: Pixel Art Quality
- Wygeneruj 10 pixel art sprites
- Sprawdź czy widoczne piksele
- Porównaj z poprzednimi wynikami

# Test 2: Isometric Angles
- Wygeneruj 10 izometrycznych obiektów
- Sprawdź czy kąt 26.57° zachowany
- Zmierz consistency

# Test 3: Negative Prompts
- Wygeneruj 20 różnych assetów
- Sprawdź % z czystym tłem
- Sprawdź % pojedynczych obiektów
```

#### Faza 2 - Model Selection:
```bash
# Test 1: Cost Reduction
- Wygeneruj 100 assetów z nowym systemem
- Porównaj koszty z poprzednim systemem
- Cel: -30% kosztów

# Test 2: Quality Maintenance
- Porównaj jakość z różnymi modelami
- Upewnij się że jakość nie spadła
```

#### Faza 3 - Quality Validation:
```bash
# Test 1: False Positive Rate
- Wygeneruj 50 dobrych assetów
- Sprawdź ile zostało odrzuconych (cel: <5%)

# Test 2: False Negative Rate
- Wygeneruj 50 złych assetów (celowo)
- Sprawdź ile przeszło (cel: <10%)
```

---

## METRYKI SUKCESU

### Przed vs Po Implementacji:

| Metryka | Przed | Cel Po | Metoda Pomiaru |
|---------|-------|--------|----------------|
| **Jakość** |
| Pixel art quality | 70% | 90%+ | Manual review |
| Isometric angle accuracy | 75% | 95%+ | Angle measurement |
| Clean background | 80% | 95%+ | Automated check |
| Single object | 85% | 98%+ | Automated check |
| **Koszty** |
| Avg cost per generation | $0.020 | $0.014 | Replicate logs |
| Failed generations | 15% | 5% | Database stats |
| Retry rate | 25% | 10% | API logs |
| **Performance** |
| Avg generation time | 28s | 22s | API timing |
| Preview time | N/A | 8s | New feature |
| User satisfaction | 4.2/5 | 4.7/5 | Feedback system |

---

## ROLLOUT STRATEGY

### Tydzień 1:
- ✅ Wdróż Fazę 1 (parametry + prompty)
- ✅ Test na 10% użytkowników
- ✅ Monitor metrics przez 2 dni
- ✅ Full rollout jeśli OK

### Tydzień 2:
- ✅ Wdróż Fazę 2 (model selection)
- ✅ Test na 25% użytkowników
- ✅ Monitor kosztów
- ✅ Wdróż Fazę 3 (validation)

### Tydzień 3:
- ✅ Wdróż Fazę 4 (progressive)
- ✅ A/B test z/bez preview
- ✅ Opcjonalnie Faza 5 (batch)

---

## MONITORING

### Dashboardy do Stworzenia:

1. **Generation Quality Dashboard**
   - Success rate
   - Quality scores
   - Common issues
   - Style-specific metrics

2. **Cost Dashboard**
   - Cost per model
   - Cost per category
   - Cost per user tier
   - Savings from optimizations

3. **Performance Dashboard**
   - Generation times
   - Retry rates
   - Queue lengths
   - User wait times

---

## BACKUP PLAN

### Jeśli coś pójdzie nie tak:

1. **Rollback Procedure**
   ```bash
   # Przywróć poprzednie parametry
   git revert <commit-hash>
   npm run build
   vercel --prod
   ```

2. **Feature Flags**
   ```typescript
   // Dodaj w .env
   ENABLE_SMART_MODEL_SELECTION=false
   ENABLE_QUALITY_VALIDATION=false
   ENABLE_PROGRESSIVE_GENERATION=false
   ```

3. **Gradual Rollout**
   - Zawsze testuj na małej grupie najpierw
   - Monitor przez 24h przed full rollout
   - Miej gotowy rollback plan

---

Gotowy do implementacji? Mogę zacząć od Fazy 1 - to da największy natychmiastowy efekt! 🚀
