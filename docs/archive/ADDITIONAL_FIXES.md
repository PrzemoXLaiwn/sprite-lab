# Dodatkowe Naprawy - Round 2

## Nowe Problemy Wykryte:

### 1. Remove BG - Usuwa Za Dużo ❌
**Problem:** Usuwa płotek, trawę - powinno usuwać tylko białe tło
**Przyczyna:** Model REMBG usuwa wszystko co wygląda jak tło
**Rozwiązanie:** Dodać preprocessing - wykryj czy tło jest jednolite (białe/przezroczyste)

### 2. Variations - CUDA Out of Memory ❌
**Problem:** "CUDA out of memory. Tried to allocate 16.00 GiB"
**Przyczyna:** SDXL img2img wymaga dużo pamięci GPU dla dużych obrazów
**Rozwiązanie:** 
- Zmniejsz rozmiar obrazu przed przetwarzaniem
- Użyj mniejszego modelu dla dużych obrazów
- Dodaj walidację rozmiaru

### 3. Upscale - Obraz Za Duży ❌
**Problem:** "Input image 2048x2048 > max 2096704 pixels"
**Przyczyna:** Real-ESRGAN ma limit rozmiaru wejściowego
**Rozwiązanie:**
- Dodaj walidację rozmiaru przed upscale
- Automatycznie zmniejsz obraz jeśli za duży
- Poinformuj użytkownika o limicie

## Plan Naprawy:

1. **Variations** - Dodaj resize obrazu do max 1024x1024
2. **Upscale** - Dodaj walidację i resize do max 1448x1448
3. **Remove BG** - Dodaj detekcję jednolitego tła
