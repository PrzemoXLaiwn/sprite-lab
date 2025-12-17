"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    const colors = ["#00ff88", "#00d4ff", "#c084fc"];
    const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    particlesRef.current = particles;

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Mouse interaction - particles move away from cursor
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 150;

        if (distance < maxDistance) {
          const force = (maxDistance - distance) / maxDistance;
          particle.x -= (dx / distance) * force * 2;
          particle.y -= (dy / distance) * force * 2;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();

        // Draw connections
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = particle.color;
            ctx.globalAlpha = (1 - distance / 120) * 0.2;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
}

// Simpler floating orbs version for better performance on mobile
export function FloatingOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Large orbs */}
      <div
        className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-[#00ff88]/10 rounded-full blur-[100px] animate-float"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-[#c084fc]/10 rounded-full blur-[100px] animate-float"
        style={{ animationDelay: "2s", animationDuration: "10s" }}
      />
      <div
        className="absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-[#00d4ff]/8 rounded-full blur-[80px] animate-float"
        style={{ animationDelay: "4s", animationDuration: "12s" }}
      />

      {/* Small accent orbs */}
      <div
        className="absolute top-[30%] right-[25%] w-[150px] h-[150px] bg-[#00ff88]/15 rounded-full blur-[60px] animate-float-sway"
        style={{ animationDuration: "6s" }}
      />
      <div
        className="absolute bottom-[40%] left-[20%] w-[120px] h-[120px] bg-[#c084fc]/15 rounded-full blur-[50px] animate-float-sway"
        style={{ animationDelay: "3s", animationDuration: "7s" }}
      />

      {/* Tiny sparkles */}
      <div className="absolute top-[20%] right-[30%] w-2 h-2 rounded-full bg-[#00ff88] animate-pulse shadow-lg shadow-[#00ff88]" />
      <div
        className="absolute bottom-[35%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#c084fc] animate-pulse shadow-lg shadow-[#c084fc]"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute top-[45%] left-[15%] w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse shadow-lg shadow-[#00d4ff]"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-[25%] right-[35%] w-2 h-2 rounded-full bg-[#ffd93d] animate-pulse shadow-lg shadow-[#ffd93d]"
        style={{ animationDelay: "1.5s" }}
      />
    </div>
  );
}
