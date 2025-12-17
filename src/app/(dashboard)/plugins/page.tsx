"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Copy,
  Check,
  Box,
  Gamepad2,
  Key,
  Terminal,
  FileCode,
  BookOpen,
  ChevronRight,
} from "lucide-react";

// ===========================================
// PLUGIN INFO
// ===========================================

const PLUGINS = [
  {
    id: "unity",
    name: "Unity Plugin",
    icon: "🎮",
    version: "1.0.0",
    engine: "Unity 2021.3+",
    description: "Generate sprites directly in the Unity Editor",
    features: [
      "Generate assets from editor window",
      "Automatic texture import settings",
      "Bulk generation support",
      "Gallery browser integration",
      "Multiple art styles",
    ],
    downloadUrl: "/plugins/spritelab-unity-v1.0.0.unitypackage",
    docsUrl: "#unity-docs",
    color: "#00d4ff",
  },
  {
    id: "godot",
    name: "Godot Plugin",
    icon: "🤖",
    version: "1.0.0",
    engine: "Godot 4.0+",
    description: "Native Godot plugin for asset generation",
    features: [
      "Dock panel integration",
      "Direct texture resource creation",
      "Project file management",
      "Style presets",
      "Batch generation",
    ],
    downloadUrl: "/plugins/spritelab-godot-v1.0.0.zip",
    docsUrl: "#godot-docs",
    color: "#00ff88",
  },
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function PluginsPage() {
  const [copiedApi, setCopiedApi] = useState(false);
  const [activeTab, setActiveTab] = useState<"unity" | "godot">("unity");

  const copyApiKey = () => {
    navigator.clipboard.writeText("YOUR_API_KEY_HERE");
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div
        className="fixed bottom-20 right-10 w-80 h-80 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[#a0a0b0] hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
              <Box className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black gradient-text neon-text">
                ENGINE PLUGINS
              </h1>
              <p className="text-[#a0a0b0]">
                Generate assets directly in your game engine
              </p>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#ffd93d]/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-[#ffd93d]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your API Key</h2>
              <p className="text-sm text-[#a0a0b0]">
                Use this key to authenticate the plugins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] font-mono text-sm text-[#a0a0b0]">
              Generate your API key in{" "}
              <Link href="/settings" className="text-[#00d4ff] hover:underline">
                Settings
              </Link>
            </div>
            <Button
              onClick={copyApiKey}
              variant="outline"
              className="border-[#ffd93d] text-[#ffd93d]"
            >
              {copiedApi ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Plugin Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {PLUGINS.map((plugin) => (
            <div
              key={plugin.id}
              className={`glass-card rounded-2xl p-6 border-2 transition-all ${
                activeTab === plugin.id
                  ? `border-[${plugin.color}]/50`
                  : "border-transparent hover:border-white/10"
              }`}
              onClick={() => setActiveTab(plugin.id as "unity" | "godot")}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${plugin.color}20` }}
                  >
                    {plugin.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {plugin.name}
                    </h3>
                    <p className="text-sm text-[#a0a0b0]">{plugin.engine}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-[#1a1a28] text-xs text-[#a0a0b0]">
                  v{plugin.version}
                </span>
              </div>

              <p className="text-[#a0a0b0] mb-4">{plugin.description}</p>

              <ul className="space-y-2 mb-6">
                {plugin.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-white"
                  >
                    <ChevronRight
                      className="w-4 h-4"
                      style={{ color: plugin.color }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  style={{
                    backgroundColor: plugin.color,
                    color: "#030305",
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="border-[#2a2a3d]">
                  <BookOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Documentation Tabs */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-[#2a2a3d]">
            <button
              onClick={() => setActiveTab("unity")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "unity"
                  ? "text-[#00d4ff] border-b-2 border-[#00d4ff] bg-[#00d4ff]/5"
                  : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              <span className="mr-2">🎮</span>
              Unity Documentation
            </button>
            <button
              onClick={() => setActiveTab("godot")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "godot"
                  ? "text-[#00ff88] border-b-2 border-[#00ff88] bg-[#00ff88]/5"
                  : "text-[#a0a0b0] hover:text-white"
              }`}
            >
              <span className="mr-2">🤖</span>
              Godot Documentation
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "unity" ? (
              <div className="space-y-6" id="unity-docs">
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#00d4ff]" />
                    Installation
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-[#a0a0b0]">
                    <li>Download the Unity package above</li>
                    <li>
                      In Unity, go to <code className="text-[#00d4ff]">Assets → Import Package → Custom Package</code>
                    </li>
                    <li>Select the downloaded .unitypackage file</li>
                    <li>Import all assets</li>
                    <li>
                      Open <code className="text-[#00d4ff]">Window → SpriteLab</code>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#ffd93d]" />
                    Configuration
                  </h3>
                  <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
                    <code className="text-sm text-[#a0a0b0]">
                      <span className="text-[#c084fc]">// In SpriteLab window:</span><br />
                      1. Enter your API key<br />
                      2. Click "Verify Key"<br />
                      3. Start generating!
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-[#00ff88]" />
                    Usage Example
                  </h3>
                  <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] overflow-x-auto">
                    <pre className="text-sm text-[#a0a0b0]">
{`// Generate sprite from code
using SpriteLab;

public class Example : MonoBehaviour
{
    async void GenerateSprite()
    {
        var result = await SpriteLabAPI.Generate(
            prompt: "fire sword, pixel art",
            category: "WEAPONS",
            style: "PIXEL_ART_32"
        );

        GetComponent<SpriteRenderer>().sprite = result.sprite;
    }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6" id="godot-docs">
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#00ff88]" />
                    Installation
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-[#a0a0b0]">
                    <li>Download and extract the ZIP file</li>
                    <li>
                      Copy the <code className="text-[#00ff88]">addons/spritelab</code> folder to your project
                    </li>
                    <li>
                      Go to <code className="text-[#00ff88]">Project → Project Settings → Plugins</code>
                    </li>
                    <li>Enable "SpriteLab"</li>
                    <li>The SpriteLab dock will appear in the editor</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#ffd93d]" />
                    Configuration
                  </h3>
                  <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
                    <code className="text-sm text-[#a0a0b0]">
                      <span className="text-[#c084fc]"># In SpriteLab dock:</span><br />
                      1. Paste your API key<br />
                      2. Click "Connect"<br />
                      3. Start generating!
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-[#00ff88]" />
                    Usage Example
                  </h3>
                  <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] overflow-x-auto">
                    <pre className="text-sm text-[#a0a0b0]">
{`# Generate sprite from GDScript
extends Node2D

func _ready():
    var spritelab = SpriteLab.new()

    var result = await spritelab.generate({
        "prompt": "fire sword, pixel art",
        "category": "WEAPONS",
        "style": "PIXEL_ART_32"
    })

    $Sprite2D.texture = result.texture`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 text-center">
          <p className="text-[#a0a0b0] mb-4">
            Need help? Check our{" "}
            <Link href="/docs" className="text-[#00d4ff] hover:underline">
              full documentation
            </Link>{" "}
            or{" "}
            <Link href="/support" className="text-[#00d4ff] hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
