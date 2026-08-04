"use client";

import { useEffect, useRef } from "react";
import type { Overlay } from "@/types/overlay";
import { renderOverlayToCanvas } from "@/lib/overlay-renderer";

type OverlayRendererProps = {
  overlay: Overlay;
  width: number;
  height: number;
  image?: HTMLImageElement | null;
};

export default function OverlayRenderer({
  overlay,
  width,
  height,
  image,
}: OverlayRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const backingWidth = Math.max(1, Math.round(width * dpr));
    const backingHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const source = renderOverlayToCanvas(overlay, backingWidth, backingHeight, image);
    ctx.drawImage(source, 0, 0);
  }, [overlay, width, height, image]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none h-full w-full"
      style={{ width, height }}
      aria-hidden
    />
  );
}
