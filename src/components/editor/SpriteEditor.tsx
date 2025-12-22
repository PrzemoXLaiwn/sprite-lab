"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Paintbrush,
  Eraser,
  Square,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Loader2,
  Wand2,
  Eye,
  EyeOff,
  Zap,
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
  // LOAD IMAGE
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
        const img = new Image();
        img.crossOrigin = "anonymous";

        // Add timeout for loading
        const timeoutId = setTimeout(() => {
          console.log("[SpriteEditor] Image load timeout");
          setError("Image load timeout - try again");
          setLoadingImage(false);
        }, 15000);

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
          setError("Failed to load image - CORS issue or invalid URL");
          setLoadingImage(false);
        };

        // Handle potential CORS issues by trying without crossOrigin first for data URLs
        if (imageUrl.startsWith("data:")) {
          img.crossOrigin = "";
        }

        img.src = imageUrl;
      } catch (err) {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
            <Paintbrush className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Inpainting Editor</h2>
            <p className="text-xs text-[#a0a0b0]">Paint the area you want to change</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-[#a0a0b0] hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 border-r border-[#2a2a3d] p-2 flex flex-col gap-2">
          {/* Tools */}
          <div className="space-y-1">
            <button
              onClick={() => setTool("brush")}
              className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                tool === "brush"
                  ? "bg-[#c084fc] text-white"
                  : "bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d]"
              }`}
              title="Brush (B)"
            >
              <Paintbrush className="w-5 h-5" />
            </button>

            <button
              onClick={() => setTool("eraser")}
              className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                tool === "eraser"
                  ? "bg-[#c084fc] text-white"
                  : "bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d]"
              }`}
              title="Eraser (E)"
            >
              <Eraser className="w-5 h-5" />
            </button>

            <button
              onClick={() => setTool("rectangle")}
              className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                tool === "rectangle"
                  ? "bg-[#c084fc] text-white"
                  : "bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d]"
              }`}
              title="Rectangle Select (R)"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>

          <div className="h-px bg-[#2a2a3d] my-2" />

          {/* Actions */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="w-full aspect-square rounded-lg flex items-center justify-center bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-5 h-5" />
          </button>

          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="w-full aspect-square rounded-lg flex items-center justify-center bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-5 h-5" />
          </button>

          <button
            onClick={clearMask}
            className="w-full aspect-square rounded-lg flex items-center justify-center bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] transition-all"
            title="Clear Mask"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="h-px bg-[#2a2a3d] my-2" />

          {/* Toggle Mask Visibility */}
          <button
            onClick={() => setShowMask(!showMask)}
            className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
              showMask
                ? "bg-[#00ff88]/20 text-[#00ff88]"
                : "bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d]"
            }`}
            title="Toggle Mask Visibility"
          >
            {showMask ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Brush Size Slider */}
          <div className="p-3 border-b border-[#2a2a3d] flex items-center gap-4">
            <span className="text-xs text-[#a0a0b0] w-20">Brush Size</span>
            <Slider
              value={[brushSize]}
              onValueChange={([value]) => setBrushSize(value)}
              min={5}
              max={100}
              step={1}
              className="flex-1 max-w-xs"
            />
            <span className="text-xs text-white font-mono w-8">{brushSize}px</span>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0a0a0f]"
          >
            {loadingImage ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#c084fc] animate-spin mx-auto mb-4" />
                <p className="text-[#a0a0b0]">Loading image...</p>
              </div>
            ) : showResult && result ? (
              /* Result Preview */
              <div className="relative">
                <img
                  src={result}
                  alt="Result"
                  className="max-w-full max-h-[calc(100vh-300px)] rounded-lg shadow-2xl"
                />
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-3">
                  <Button
                    onClick={handleAcceptResult}
                    className="bg-[#00ff88] hover:bg-[#00ff88]/80 text-[#030305]"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    onClick={handleRejectResult}
                    variant="outline"
                    className="border-[#ff4444] text-[#ff4444] hover:bg-[#ff4444]/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              /* Editor Canvas */
              <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
                {/* Background canvas (original image) */}
                <canvas
                  ref={imageCanvasRef}
                  className="absolute inset-0 rounded-lg shadow-2xl"
                  style={{ imageRendering: "pixelated" }}
                />

                {/* Mask canvas (overlay) */}
                <canvas
                  ref={maskCanvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => setIsDrawing(false)}
                  className={`absolute inset-0 rounded-lg cursor-crosshair ${
                    showMask ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    cursor: tool === "brush" || tool === "eraser" ? "crosshair" : "crosshair",
                  }}
                />

                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 rounded-lg bg-black/70 flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20 mb-4">
                      <div className="absolute inset-0 rounded-full bg-[#c084fc]/30 blur-xl animate-pulse" />
                      <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] border-t-[#c084fc] animate-spin" />
                      <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#c084fc]" />
                    </div>
                    <p className="text-white font-medium">Regenerating area...</p>
                    <p className="text-sm text-[#a0a0b0]">This may take 15-30 seconds</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Prompt Input */}
        <div className="w-80 border-l border-[#2a2a3d] p-4 flex flex-col">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#c084fc]" />
            What should appear here?
          </h3>

          <div className="space-y-4 flex-1">
            {/* Prompt Input */}
            <div className="relative">
              <Input
                placeholder="Describe what you want in the selected area..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-24 text-sm input-gaming pr-4 resize-none"
                disabled={loading}
              />
            </div>

            {/* Quick Actions */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1a28] text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] transition-all text-sm"
              >
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Quick Actions
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showQuickActions ? "rotate-180" : ""}`} />
              </button>

              {showQuickActions && (
                <div className="absolute top-full left-0 right-0 mt-1 p-2 rounded-lg bg-[#1a1a28] border border-[#2a2a3d] z-10 space-y-1">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setPrompt(action.prompt);
                        setShowQuickActions(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] transition-all"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/20 text-xs text-[#c084fc]">
              <p className="font-medium mb-1">How to use:</p>
              <ol className="space-y-1 text-[#a0a0b0]">
                <li>1. Paint the area you want to change (red overlay)</li>
                <li>2. Describe what should appear there</li>
                <li>3. Click "Regenerate Area"</li>
              </ol>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#ff4444]/10 border border-[#ff4444]/30 text-sm text-[#ff4444]">
                {error}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleInpaint}
            disabled={loading || !prompt.trim()}
            className="w-full h-12 bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white font-semibold disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Regenerate Area (2 credits)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
