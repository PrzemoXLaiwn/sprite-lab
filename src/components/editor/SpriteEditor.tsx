"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Paintbrush,
  Eraser,
  Square,
  Undo2,
  Redo2,
  Trash2,
  Loader2,
  Wand2,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  X,
  Palette,
  ChevronDown,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";

// ===========================================
// TYPES
// ===========================================

interface SpriteEditorProps {
  imageUrl: string;
  generationId?: string;
  originalData?: {
    categoryId?: string;
    subcategoryId?: string;
    styleId?: string;
  };
  onClose?: () => void;
  onSave?: (newImageUrl: string) => void;
}

type Tool = "brush" | "eraser" | "rectangle";

interface HistoryEntry {
  maskData: ImageData;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function SpriteEditor({
  imageUrl,
  generationId,
  originalData,
  onClose,
  onSave,
}: SpriteEditorProps) {
  // Canvas refs
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Rectangle tool state
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });

  // Quick actions dropdown
  const [showQuickActions, setShowQuickActions] = useState(false);

  const quickActions = [
    { label: "Remove this area", prompt: "remove, empty, transparent background" },
    { label: "Change color", prompt: "change the color to" },
    { label: "Add details", prompt: "add more details and texture" },
    { label: "Make glowing", prompt: "make this area glow with magical light" },
    { label: "Add fire effect", prompt: "add fire and flames" },
    { label: "Add ice effect", prompt: "add ice and frost" },
    { label: "Make metallic", prompt: "make this metallic and shiny" },
    { label: "Add gems", prompt: "add embedded gems and jewels" },
  ];

  // ===========================================
  // LOAD IMAGE (via proxy to avoid CORS issues)
  // ===========================================

  useEffect(() => {
    const loadImage = async () => {
      const imageCanvas = imageCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!imageCanvas || !maskCanvas) {
        console.log("[SpriteEditor] Canvas refs not ready, waiting...");
        return;
      }

      const imageCtx = imageCanvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");
      if (!imageCtx || !maskCtx) {
        console.log("[SpriteEditor] Canvas contexts not available");
        return;
      }

      console.log("[SpriteEditor] Loading image from:", imageUrl?.substring(0, 100));

      try {
        // For external URLs, use our proxy API to avoid CORS issues
        let imageSrc = imageUrl;

        if (!imageUrl.startsWith("data:") && !imageUrl.startsWith("blob:")) {
          console.log("[SpriteEditor] Using image proxy for external URL...");
          try {
            const proxyResponse = await fetch(`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`);
            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              if (proxyData.success && proxyData.dataUrl) {
                imageSrc = proxyData.dataUrl;
                console.log("[SpriteEditor] Proxy loaded image successfully");
              }
            } else {
              console.warn("[SpriteEditor] Proxy failed, trying direct load...");
            }
          } catch (proxyErr) {
            console.warn("[SpriteEditor] Proxy error, trying direct load:", proxyErr);
          }
        }

        const img = new Image();
        // Only set crossOrigin for non-data URLs
        if (!imageSrc.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }

        // Add timeout for loading
        const timeoutId = setTimeout(() => {
          console.log("[SpriteEditor] Image load timeout");
          setError("Image load timeout - try again");
          setLoadingImage(false);
        }, 30000); // Increased timeout

        img.onload = () => {
          clearTimeout(timeoutId);
          console.log("[SpriteEditor] Image loaded successfully:", img.width, "x", img.height);
          // Set canvas size to image size (max 1024)
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          setCanvasSize({ width, height });

          // Update canvas dimensions
          imageCanvas.width = width;
          imageCanvas.height = height;
          maskCanvas.width = width;
          maskCanvas.height = height;

          // Draw image
          imageCtx.drawImage(img, 0, 0, width, height);

          // Clear mask
          maskCtx.clearRect(0, 0, width, height);

          setLoadingImage(false);

          // Save initial state to history
          const initialMaskData = maskCtx.getImageData(0, 0, width, height);
          setHistory([{ maskData: initialMaskData }]);
          setHistoryIndex(0);
        };

        img.onerror = (e) => {
          clearTimeout(timeoutId);
          console.error("[SpriteEditor] Image load error:", e);
          setError("Failed to load image. Please try again.");
          setLoadingImage(false);
        };

        img.src = imageSrc;
      } catch (err) {
        console.error("[SpriteEditor] Load error:", err);
        setError("Failed to load image");
        setLoadingImage(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  // ===========================================
  // DRAWING FUNCTIONS
  // ===========================================

  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const drawBrush = useCallback(
    (x: number, y: number, erase: boolean = false) => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);

      if (erase) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fill();
      }
    },
    [brushSize]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoordinates(e);

      if (tool === "rectangle") {
        setRectStart({ x, y });
      } else {
        setIsDrawing(true);
        drawBrush(x, y, tool === "eraser");
      }
    },
    [tool, getCanvasCoordinates, drawBrush]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === "rectangle" && rectStart) {
        // Preview rectangle (handled in render)
        return;
      }

      if (!isDrawing) return;

      const { x, y } = getCanvasCoordinates(e);
      drawBrush(x, y, tool === "eraser");
    },
    [isDrawing, tool, rectStart, getCanvasCoordinates, drawBrush]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === "rectangle" && rectStart) {
        const { x, y } = getCanvasCoordinates(e);
        const canvas = maskCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw filled rectangle
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(
          Math.min(rectStart.x, x),
          Math.min(rectStart.y, y),
          Math.abs(x - rectStart.x),
          Math.abs(y - rectStart.y)
        );

        setRectStart(null);
      }

      if (isDrawing) {
        setIsDrawing(false);
        saveToHistory();
      }
    },
    [tool, rectStart, isDrawing, getCanvasCoordinates]
  );

  // ===========================================
  // HISTORY (UNDO/REDO)
  // ===========================================

  const saveToHistory = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ maskData });

    // Keep only last 20 entries
    if (newHistory.length > 20) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex].maskData, 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex].maskData, 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  }, [saveToHistory]);

  // ===========================================
  // INPAINTING
  // ===========================================

  const handleInpaint = async () => {
    if (!prompt.trim()) {
      setError("Please describe what you want in the selected area");
      return;
    }

    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imageCanvas || !maskCanvas) return;

    // Check if mask has any content
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    let hasMask = false;
    for (let i = 3; i < maskData.data.length; i += 4) {
      if (maskData.data[i] > 0) {
        hasMask = true;
        break;
      }
    }

    if (!hasMask) {
      setError("Please paint the area you want to change");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Convert mask to black/white PNG
      const bwMaskCanvas = document.createElement("canvas");
      bwMaskCanvas.width = maskCanvas.width;
      bwMaskCanvas.height = maskCanvas.height;
      const bwCtx = bwMaskCanvas.getContext("2d");
      if (!bwCtx) throw new Error("Failed to create mask canvas");

      // Black background
      bwCtx.fillStyle = "black";
      bwCtx.fillRect(0, 0, bwMaskCanvas.width, bwMaskCanvas.height);

      // White where mask is
      const originalMaskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const bwMaskData = bwCtx.getImageData(0, 0, bwMaskCanvas.width, bwMaskCanvas.height);

      for (let i = 0; i < originalMaskData.data.length; i += 4) {
        if (originalMaskData.data[i + 3] > 0) {
          // If alpha > 0, make white
          bwMaskData.data[i] = 255;
          bwMaskData.data[i + 1] = 255;
          bwMaskData.data[i + 2] = 255;
          bwMaskData.data[i + 3] = 255;
        }
      }

      bwCtx.putImageData(bwMaskData, 0, 0);

      // Get base64 data
      const imageBase64 = imageCanvas.toDataURL("image/png").split(",")[1];
      const maskBase64 = bwMaskCanvas.toDataURL("image/png").split(",")[1];

      // Call inpaint API
      const response = await fetch("/api/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          maskBase64,
          prompt: prompt.trim(),
          originalData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Inpainting failed");
      }

      setResult(data.imageUrl);
      setShowResult(true);
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inpainting failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptResult = () => {
    if (result && onSave) {
      onSave(result);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleRejectResult = () => {
    setResult(null);
    setShowResult(false);
  };

  // ===========================================
  // RENDER
  // ===========================================

  const toolBtn = (active: boolean) =>
    `flex aspect-square w-full items-center justify-center rounded-xl border transition-all ${
      active
        ? "border-[#FF8A3D] bg-[#FF8A3D]/10 text-[#FFB27A] ring-2 ring-[#FF8A3D]/25"
        : "border-white/[0.06] bg-[#151922] text-[#8B93A5] hover:border-white/20 hover:bg-[#1A1F2A] hover:text-white"
    }`;
  const actionBtn =
    "flex aspect-square w-full items-center justify-center rounded-xl border border-white/[0.06] bg-[#151922] text-[#8B93A5] transition-all hover:border-white/20 hover:bg-[#1A1F2A] hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0D12] text-[#ECEEF3]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0E1016] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#151922]">
            <Paintbrush className="h-4 w-4 text-[#FF8A3D]" />
          </div>
          <div>
            <h2 className="font-display text-[18px] font-semibold leading-tight text-white">Inpainting editor</h2>
            <p className="text-[12px] text-[#8B93A5]">Paint the area you want to change</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex w-[68px] flex-col gap-1.5 border-r border-white/[0.06] bg-[#0E1016] p-2.5">
          {/* Tools */}
          <button type="button" onClick={() => setTool("brush")} className={toolBtn(tool === "brush")} title="Brush (B)">
            <Paintbrush className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={() => setTool("eraser")} className={toolBtn(tool === "eraser")} title="Eraser (E)">
            <Eraser className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={() => setTool("rectangle")} className={toolBtn(tool === "rectangle")} title="Rectangle Select (R)">
            <Square className="h-[18px] w-[18px]" />
          </button>

          <div className="my-1.5 h-px bg-white/[0.06]" />

          {/* Actions */}
          <button type="button" onClick={undo} disabled={historyIndex <= 0} className={actionBtn} title="Undo (Ctrl+Z)">
            <Undo2 className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className={actionBtn} title="Redo (Ctrl+Y)">
            <Redo2 className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={clearMask} className={actionBtn} title="Clear Mask">
            <Trash2 className="h-[18px] w-[18px]" />
          </button>

          <div className="my-1.5 h-px bg-white/[0.06]" />

          {/* Toggle Mask Visibility */}
          <button type="button" onClick={() => setShowMask(!showMask)} className={toolBtn(showMask)} title="Toggle Mask Visibility">
            {showMask ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex flex-1 flex-col">
          {/* Brush Size Slider */}
          <div className="flex items-center gap-4 border-b border-white/[0.06] px-4 py-3">
            <span className="w-24 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">Brush size</span>
            <Slider
              value={[brushSize]}
              onValueChange={([value]) => setBrushSize(value)}
              min={5}
              max={100}
              step={1}
              className="max-w-xs flex-1"
            />
            <span className="w-12 font-mono text-[12px] text-[#C9CFDB]">{brushSize}px</span>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="flex flex-1 items-center justify-center overflow-auto bg-[#0B0D12] p-6"
            style={{ backgroundImage: "repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px" }}
          >
            {loadingImage ? (
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#FF8A3D]" />
                <p className="text-[13px] text-[#8B93A5]">Loading image…</p>
              </div>
            ) : showResult && result ? (
              /* Result Preview */
              <div className="flex flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result}
                  alt="Result"
                  className={`max-h-[calc(100vh-300px)] max-w-full rounded-2xl border border-white/[0.06] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] ${
                    originalData?.styleId?.toUpperCase().includes("PIXEL") ? "pixel-perfect" : ""
                  }`}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptResult}
                    className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectResult}
                    className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              /* Editor Canvas */
              <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
                {/* Background canvas (original image) */}
                <canvas
                  ref={imageCanvasRef}
                  className="absolute inset-0 rounded-2xl border border-white/[0.06] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
                  style={{ imageRendering: "pixelated" }}
                />

                {/* Mask canvas (overlay) */}
                <canvas
                  ref={maskCanvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => setIsDrawing(false)}
                  className={`absolute inset-0 cursor-crosshair rounded-2xl ${
                    showMask ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    cursor: tool === "brush" || tool === "eraser" ? "crosshair" : "crosshair",
                  }}
                />

                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-[#0B0D12]/70 backdrop-blur-[2px]">
                    <div className="relative h-14 w-14">
                      <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FF8A3D]" />
                      <Wand2 className="absolute inset-0 m-auto h-5 w-5 text-[#FF8A3D]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[14px] font-medium text-white">Regenerating area…</p>
                      <p className="mt-1 font-mono text-[12px] text-[#8B93A5]">usually 15–30s</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Prompt Input */}
        <div className="flex w-80 flex-col border-l border-white/[0.06] bg-[#0E1016]">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">What should appear here?</p>
              <div className="rounded-2xl border border-white/[0.08] bg-[#151922] transition-colors focus-within:border-[#FF8A3D]/50">
                <textarea
                  placeholder="Describe what you want in the selected area…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#7A8294] disabled:opacity-60"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#151922] px-3 py-2.5 text-[13px] text-[#C9CFDB] transition-colors hover:border-white/20 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#8B93A5]" />
                  Quick actions
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showQuickActions ? "rotate-180" : ""}`} />
              </button>

              {showQuickActions && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 space-y-0.5 rounded-xl border border-white/[0.08] bg-[#151922] p-1.5 shadow-2xl">
                  {quickActions.map((action) => (
                    <button
                      type="button"
                      key={action.label}
                      onClick={() => {
                        setPrompt(action.prompt);
                        setShowQuickActions(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#C9CFDB] transition-colors hover:bg-[#1A1F2A] hover:text-white"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8B93A5]">
              <p className="mb-1 font-medium text-[#C9CFDB]">How to use</p>
              <ol className="space-y-1">
                <li><span className="font-mono text-[#FFB27A]">1</span> Paint the area you want to change (red overlay)</li>
                <li><span className="font-mono text-[#FFB27A]">2</span> Describe what should appear there</li>
                <li><span className="font-mono text-[#FFB27A]">3</span> Click &ldquo;Regenerate area&rdquo;</li>
              </ol>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">
                {error}
              </p>
            )}
          </div>

          {/* Generate Button */}
          <div className="border-t border-white/[0.06] p-4">
            <button
              type="button"
              onClick={handleInpaint}
              disabled={loading || !prompt.trim()}
              className="px-corners flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Regenerate area <span className="font-mono text-[13px] font-normal opacity-80">· 2 credits</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
