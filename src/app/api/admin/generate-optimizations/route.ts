import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// POST - Generate AI analysis of hallucinations and prompt optimization suggestions
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Get hallucination patterns (these exist for sure)
    const hallucinationPatterns = await prisma.hallucinationPattern.findMany({
      where: { isActive: true },
      orderBy: { occurrenceCount: "desc" },
      take: 50,
    });

    // 2. Get current style definitions
    const { ART_STYLES } = await import("@/lib/generate/styles");
    const { ASSET_CATEGORIES } = await import("@/lib/generate/categories");

    if (hallucinationPatterns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hallucinations found to analyze",
        analysis: "Brak wykrytych halucynacji do analizy. System działa poprawnie!",
        recommendations: [],
      });
    }

    // 3. Prepare data for Claude analysis
    const patternsSummary = hallucinationPatterns.map(p => ({
      category: p.categoryId,
      subcategory: p.subcategoryId,
      style: p.styleId,
      type: p.hallucinationType,
      triggerKeywords: JSON.parse(p.triggerKeywords || "[]"),
      occurrences: p.occurrenceCount,
      currentFix: p.preventionPrompt,
    }));

    const stylesSummary = ART_STYLES.map(s => ({
      id: s.id,
      name: s.name,
      currentPrompt: s.promptSuffix,
      negativePrompt: s.negativePrompt || "brak",
    }));

    const categoriesSummary = ASSET_CATEGORIES.map(c => ({
      id: c.id,
      name: c.name,
      promptPrefix: c.promptPrefix,
    }));

    // 4. Call Claude to analyze and generate recommendations
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Jesteś ekspertem od optymalizacji promptów do generowania grafik AI (FLUX models przez Runware API).

## WYKRYTE HALUCYNACJE (problemy z generowaniem)
${JSON.stringify(patternsSummary, null, 2)}

## OBECNE DEFINICJE STYLÓW (plik: src/lib/generate/styles.ts)
${JSON.stringify(stylesSummary, null, 2)}

## OBECNE KATEGORIE (plik: src/lib/generate/categories.ts)
${JSON.stringify(categoriesSummary, null, 2)}

## TWOJE ZADANIE
Przeanalizuj halucynacje i wygeneruj KONKRETNE rekomendacje co trzeba zmienić w kodzie.

Dla każdego problematycznego stylu/kategorii podaj:
1. **Problem**: Co dokładnie nie działa
2. **Przyczyna**: Dlaczego to się dzieje
3. **Rozwiązanie**: Dokładnie co zmienić w promptSuffix lub promptPrefix
4. **Kod do skopiowania**: Gotowy fragment kodu TypeScript do wklejenia

## FORMAT ODPOWIEDZI
Odpowiedz w formacie markdown, który będzie łatwy do skopiowania do VSCode:

### Ogólna analiza
[Krótkie podsumowanie głównych problemów]

### Rekomendacja 1: [nazwa stylu/kategorii]
**Problem:** [opis]
**Przyczyna:** [wyjaśnienie]
**Plik:** src/lib/generate/styles.ts lub categories.ts
**Zmiana:**
\`\`\`typescript
// Znajdź i zamień:
promptSuffix: "stara wartość"

// Na:
promptSuffix: "nowa zoptymalizowana wartość"
\`\`\`

### Rekomendacja 2: ...
[kolejne rekomendacje]

### Globalne zalecenia
[Ogólne wskazówki dla wszystkich promptów]

Skup się na NAJWAŻNIEJSZYCH problemach. Bądź KONKRETNY i podawaj GOTOWY KOD do skopiowania.`,
        },
      ],
    });

    // 5. Extract response
    const responseText = claudeResponse.content[0].type === "text"
      ? claudeResponse.content[0].text
      : "";

    return NextResponse.json({
      success: true,
      analysis: responseText,
      stats: {
        analyzedPatterns: hallucinationPatterns.length,
        stylesCount: ART_STYLES.length,
        categoriesCount: ASSET_CATEGORIES.length,
      },
    });
  } catch (error) {
    console.error("Generate optimizations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate optimizations" },
      { status: 500 }
    );
  }
}
