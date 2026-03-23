"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useMemo, useRef } from "react";
import { createNoise3D } from "simplex-noise";

interface WavyBackgroundProps {
  children?: React.ReactNode; // ← ReactNode instead of any
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
}

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
}: WavyBackgroundProps) => {
  // ← no ...props — prevents waveYOffset DOM warning
  const noise = createNoise3D();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(0); // ← use ref for animationId

  // Canvas context refs — avoid let declarations in render scope
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const wRef = useRef<number>(0);
  const hRef = useRef<number>(0);
  const ntRef = useRef<number>(0);

  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.001;
      case "fast":
        return 0.002;
      default:
        return 0.001;
    }
  };

  const waveColors = colors ?? [
    "#38bdf8",
    "#818cf8",
    "#c084fc",
    "#e879f9",
    "#22d3ee",
  ];

  const drawWave = (n: number) => {
    ntRef.current += getSpeed();
    for (let i = 0; i < n; i++) {
      // ← let instead of var
      const ctx = ctxRef.current!;
      ctx.beginPath();
      ctx.lineWidth = waveWidth ?? 50;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      for (let x = 0; x < wRef.current; x += 5) {
        // ← let instead of var
        const y = noise(x / 800, 0.3 * i, ntRef.current) * 100; // ← const instead of var
        ctx.lineTo(x, y + hRef.current * 0.5);
      }
      ctx.stroke();
      ctx.closePath();
    }
  };

  const render = () => {
    const ctx = ctxRef.current!;
    ctx.fillStyle = backgroundFill ?? "black";
    ctx.globalAlpha = waveOpacity ?? 0.5;
    ctx.fillRect(0, 0, wRef.current, hRef.current);
    drawWave(5);
    animationIdRef.current = requestAnimationFrame(render);
  };

  const init = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;
    wRef.current = ctx.canvas.width = window.innerWidth;
    hRef.current = ctx.canvas.height = window.innerHeight;
    ctx.filter = `blur(${blur}px)`;
    ntRef.current = 0;

    const handleResize = () => {
      if (!ctxRef.current) return;
      wRef.current = ctxRef.current.canvas.width = window.innerWidth;
      hRef.current = ctxRef.current.canvas.height = window.innerHeight;
      ctxRef.current.filter = `blur(${blur}px)`;
    };

    window.addEventListener("resize", handleResize); // ← addEventListener not onresize
    render();

    return () => window.removeEventListener("resize", handleResize);
  };

  useEffect(() => {
    const cleanup = init();
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      cleanup?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSafari = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      navigator.userAgent.includes("Safari") &&
      !navigator.userAgent.includes("Chrome")
    );
  }, []); // ← runs once, no setState, no effect

  return (
    <div
      className={cn(
        "h-screen flex flex-col items-center justify-center",
        containerClassName,
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={isSafari ? { filter: `blur(${blur}px)` } : undefined}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};
