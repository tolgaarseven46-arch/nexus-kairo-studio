import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Grid,
  Sparkles,
  Eye,
  Crosshair,
  RotateCcw,
} from 'lucide-react';
import { CharacterPlaceholderVisual } from './CharacterPlaceholderVisual';
import { DroitPhysical } from '../../types';

interface EditorCanvasViewportProps {
  physical: DroitPhysical;
  currentExpression?: string;
  hairStyle?: string;
  outfitStyle?: string;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export const EditorCanvasViewport: React.FC<EditorCanvasViewportProps> = ({
  physical,
  currentExpression = 'normal',
  hairStyle = 'Cyber Mohawk',
  outfitStyle = 'Taktik Zırh',
  zoomLevel,
  setZoomLevel,
  panOffset,
  setPanOffset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoomLevel((prev) => Math.min(Math.max(0.3, prev * zoomFactor), 3.0));
  };

  // Pan / Drag start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag on left click or middle click
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
    }
  };

  // Pan / Drag move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  // Pan / Drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3.0, prev + 0.15));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.3, prev - 0.15));
  };

  const handleReset = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 h-full w-full bg-[#07090e] overflow-hidden select-none cursor-${
        isDragging ? 'grabbing' : 'grab'
      }`}
      style={{
        backgroundImage: showGrid
          ? 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 1px, transparent 1px), radial-gradient(circle, rgba(148, 163, 184, 0.03) 1px, transparent 1px)'
          : 'none',
        backgroundSize: '32px 32px, 8px 8px',
        backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
      }}
    >
      {/* Subtle Studio Lighting Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.7)_100%)]" />

      {/* Axis Crosshair Guides */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/40"
          style={{ transform: `translateX(${panOffset.x}px)` }}
        />
        <div
          className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/40"
          style={{ transform: `translateY(${panOffset.y}px)` }}
        />
      </div>

      {/* Center Character Anchor Stage */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.08s ease-out',
        }}
      >
        <div className="relative pointer-events-auto">
          {/* Target Reticle Frame around the character */}
          <div className="absolute -inset-6 border border-cyan-500/20 rounded-3xl pointer-events-none">
            {/* Top-left corner mark */}
            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            {/* Top-right corner mark */}
            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            {/* Bottom-left corner mark */}
            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            {/* Bottom-right corner mark */}
            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
          </div>

          {/* Droit Holographic Visual */}
          <CharacterPlaceholderVisual
            physical={physical}
            currentExpression={currentExpression}
            hairStyle={hairStyle}
            outfitStyle={outfitStyle}
            wireframeMode={wireframeMode}
          />
        </div>
      </div>

      {/* Floating Canvas HUD Overlay (Top Right: Quick Toggles) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-xl p-1 shadow-2xl z-10">
        <button
          onClick={() => setShowGrid(!showGrid)}
          title="Izgara Aç/Kapat"
          className={`p-2 rounded-lg text-xs font-mono transition-colors ${
            showGrid
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          onClick={() => setWireframeMode(!wireframeMode)}
          title="Tel Kafes (Wireframe) Modu"
          className={`p-2 rounded-lg text-xs font-mono transition-colors ${
            wireframeMode
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-800 mx-0.5" />

        <button
          onClick={handleReset}
          title="Merkeze Sıfırla"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-xs font-mono transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Canvas HUD Overlay (Bottom Right: Zoom & Navigation Controls) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-10">
        <button
          onClick={handleZoomOut}
          title="Uzaklaştır (-)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="w-14 text-center font-mono text-xs font-semibold text-zinc-200 select-none">
          {Math.round(zoomLevel * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          title="Yakınlaştır (+)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Canvas Coordinates Helper (Bottom Left) */}
      <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-400 pointer-events-none z-10">
        <div className="flex items-center gap-1">
          <Move className="w-3 h-3 text-cyan-400" />
          <span>X: {Math.round(panOffset.x)}px</span>
          <span className="ml-1">Y: {Math.round(panOffset.y)}px</span>
        </div>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400">Sürükle: Taşı | Tekerlek: Yakınlaştır</span>
      </div>
    </div>
  );
};
