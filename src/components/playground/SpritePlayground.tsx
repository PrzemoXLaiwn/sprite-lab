"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Download,
  Keyboard,
  RotateCcw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
} from "lucide-react";

// ===========================================
// TYPES
// ===========================================

interface SpritePlaygroundProps {
  spriteUrl: string;
  spriteType?: "single" | "spritesheet";
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  onClose?: () => void;
}

// ===========================================
// PHASER GAME CONFIG
// ===========================================

const createGameConfig = (
  parent: HTMLElement,
  spriteUrl: string,
  isSpritesheet: boolean,
  frameWidth: number,
  frameHeight: number,
  frameCount: number
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 800,
  height: 500,
  backgroundColor: "#1a1a28",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false,
    },
  },
  scene: {
    preload: function (this: Phaser.Scene) {
      // Load sprite
      if (isSpritesheet && frameCount > 1) {
        this.load.spritesheet("player", spriteUrl, {
          frameWidth,
          frameHeight,
        });
      } else {
        this.load.image("player", spriteUrl);
      }
    },
    create: function (this: Phaser.Scene) {
      // Store reference to scene
      const scene = this;

      // Create sky background with gradient effect using multiple rectangles
      const graphics = this.add.graphics();
      // Simulate gradient with layered rectangles
      graphics.fillStyle(0x1a1a2e);
      graphics.fillRect(0, 0, 800, 167);
      graphics.fillStyle(0x16213e);
      graphics.fillRect(0, 167, 800, 167);
      graphics.fillStyle(0x0f3460);
      graphics.fillRect(0, 334, 800, 166);

      // Create simple parallax clouds
      for (let i = 0; i < 5; i++) {
        const cloud = this.add.ellipse(
          Math.random() * 800,
          50 + Math.random() * 100,
          80 + Math.random() * 60,
          30 + Math.random() * 20,
          0x2a2a4d,
          0.5
        );
        this.tweens.add({
          targets: cloud,
          x: cloud.x + 100,
          duration: 10000 + Math.random() * 5000,
          yoyo: true,
          repeat: -1,
        });
      }

      // Create ground platform
      const groundHeight = 60;
      const ground = this.add.rectangle(
        400,
        500 - groundHeight / 2,
        800,
        groundHeight,
        0x228b22
      );
      this.physics.add.existing(ground, true);

      // Add grass texture effect
      for (let i = 0; i < 100; i++) {
        const grass = this.add.rectangle(
          i * 8 + 4,
          500 - groundHeight - 5,
          2,
          10 + Math.random() * 10,
          0x32cd32
        );
      }

      // Create some platforms
      const platforms = [
        { x: 200, y: 350, w: 150, h: 20 },
        { x: 500, y: 280, w: 150, h: 20 },
        { x: 350, y: 180, w: 100, h: 20 },
      ];

      platforms.forEach((p) => {
        const platform = this.add.rectangle(p.x, p.y, p.w, p.h, 0x4a4a6a);
        this.physics.add.existing(platform, true);
        // Add collider later when player exists
        (this as any).platformBodies = (this as any).platformBodies || [];
        (this as any).platformBodies.push(platform);
      });

      // Create player sprite
      let player: Phaser.Physics.Arcade.Sprite;

      if (isSpritesheet && frameCount > 1) {
        player = this.physics.add.sprite(400, 300, "player");

        // Create animations
        this.anims.create({
          key: "idle",
          frames: this.anims.generateFrameNumbers("player", {
            start: 0,
            end: Math.min(3, frameCount - 1),
          }),
          frameRate: 8,
          repeat: -1,
        });

        this.anims.create({
          key: "walk",
          frames: this.anims.generateFrameNumbers("player", {
            start: 0,
            end: frameCount - 1,
          }),
          frameRate: 10,
          repeat: -1,
        });

        player.play("idle");
      } else {
        player = this.physics.add.sprite(400, 300, "player");
      }

      // Scale player to reasonable size
      const targetSize = 64;
      const scaleX = targetSize / player.width;
      const scaleY = targetSize / player.height;
      player.setScale(Math.min(scaleX, scaleY));

      // Set up player physics
      player.setBounce(0.1);
      player.setCollideWorldBounds(true);
      player.setDrag(100, 0);

      // Add collision with ground
      this.physics.add.collider(player, ground as any);

      // Add collision with platforms
      ((this as any).platformBodies || []).forEach((platform: any) => {
        this.physics.add.collider(player, platform);
      });

      // Store player reference
      (this as any).player = player;

      // Create cursor keys
      (this as any).cursors = this.input.keyboard?.createCursorKeys();
      (this as any).wasd = this.input.keyboard?.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      });

      // Add control instructions text
      this.add
        .text(10, 10, "WASD / Arrow Keys to move\nSPACE to jump", {
          fontSize: "12px",
          color: "#a0a0b0",
          backgroundColor: "#1a1a2800",
          padding: { x: 8, y: 4 },
        })
        .setDepth(100);

      // Track if player is on ground for double jump prevention
      (this as any).canJump = true;
      (this as any).jumpCount = 0;
    },
    update: function (this: Phaser.Scene) {
      const player = (this as any).player as Phaser.Physics.Arcade.Sprite;
      const cursors = (this as any).cursors;
      const wasd = (this as any).wasd;

      if (!player || !cursors || !wasd) return;

      const onGround = player.body?.touching.down;

      // Reset jump when on ground
      if (onGround) {
        (this as any).jumpCount = 0;
        (this as any).canJump = true;
      }

      // Horizontal movement
      const moveSpeed = 200;
      let isMoving = false;

      if (cursors.left.isDown || wasd.left.isDown) {
        player.setVelocityX(-moveSpeed);
        player.setFlipX(true);
        isMoving = true;
      } else if (cursors.right.isDown || wasd.right.isDown) {
        player.setVelocityX(moveSpeed);
        player.setFlipX(false);
        isMoving = true;
      } else {
        player.setVelocityX(0);
      }

      // Jump
      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(cursors.up) ||
        Phaser.Input.Keyboard.JustDown(wasd.up) ||
        Phaser.Input.Keyboard.JustDown(cursors.space) ||
        Phaser.Input.Keyboard.JustDown(wasd.space);

      if (jumpPressed && (this as any).jumpCount < 2) {
        player.setVelocityY(-400);
        (this as any).jumpCount++;
      }

      // Play animations if available
      if (player.anims && player.anims.currentAnim) {
        if (isMoving && player.anims.currentAnim.key !== "walk") {
          player.play("walk");
        } else if (!isMoving && player.anims.currentAnim.key !== "idle") {
          player.play("idle");
        }
      }
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

// ===========================================
// MAIN COMPONENT
// ===========================================

export function SpritePlayground({
  spriteUrl,
  spriteType = "single",
  frameWidth = 64,
  frameHeight = 64,
  frameCount = 1,
  onClose,
}: SpritePlaygroundProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    // Dynamically import Phaser (client-side only)
    const initGame = async () => {
      const Phaser = (await import("phaser")).default;

      if (gameContainerRef.current && !gameRef.current) {
        const config = createGameConfig(
          gameContainerRef.current,
          spriteUrl,
          spriteType === "spritesheet",
          frameWidth,
          frameHeight,
          frameCount
        );

        gameRef.current = new Phaser.Game(config);
      }
    };

    initGame();

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [spriteUrl, spriteType, frameWidth, frameHeight, frameCount]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleReset = () => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;

      // Reinitialize
      const initGame = async () => {
        const Phaser = (await import("phaser")).default;
        if (gameContainerRef.current) {
          const config = createGameConfig(
            gameContainerRef.current,
            spriteUrl,
            spriteType === "spritesheet",
            frameWidth,
            frameHeight,
            frameCount
          );
          gameRef.current = new Phaser.Game(config);
        }
      };
      initGame();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(spriteUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sprite-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
            <span className="text-xl">🎮</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Sprite Playground</h2>
            <p className="text-xs text-[#a0a0b0]">
              Test your sprite in action!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowControls(!showControls)}
            className="border-[#2a2a3d]"
          >
            <Keyboard className="w-4 h-4 mr-1" />
            Controls
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-[#2a2a3d]"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
            className="border-[#2a2a3d]"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="border-[#00ff88] text-[#00ff88]"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#a0a0b0] hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div
          ref={gameContainerRef}
          className="rounded-2xl overflow-hidden shadow-2xl border border-[#2a2a3d]"
          style={{ width: 800, height: 500 }}
        />

        {/* Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-card rounded-xl p-4">
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    W
                  </kbd>
                </div>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    A
                  </kbd>
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    S
                  </kbd>
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    D
                  </kbd>
                </div>
                <span className="text-[10px] text-[#a0a0b0] mt-1">Move</span>
              </div>

              <div className="text-[#a0a0b0]">or</div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    ↑
                  </kbd>
                </div>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    ←
                  </kbd>
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    ↓
                  </kbd>
                  <kbd className="px-2 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                    →
                  </kbd>
                </div>
                <span className="text-[10px] text-[#a0a0b0] mt-1">Move</span>
              </div>

              <div className="h-12 w-px bg-[#2a2a3d]" />

              <div className="flex flex-col items-center gap-1">
                <kbd className="px-4 py-1 rounded bg-[#2a2a3d] text-white text-sm">
                  SPACE
                </kbd>
                <span className="text-[10px] text-[#a0a0b0] mt-1">
                  Jump (2x)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
