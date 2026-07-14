import React, { useEffect, useRef } from 'react';
import { ThemeConfig } from '../types';

interface AnimatedBackgroundProps {
  theme: ThemeConfig;
}

export default function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic resize handler
    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Setup objects based on effect
    const effect = theme.bgEffect;
    const isDark = theme.mode === 'dark';

    // Particle/dot arrays
    const dots: { x: number; y: number; vx: number; vy: number; radius: number; alpha: number }[] = [];
    const gridSize = 40;

    // Initialize particles
    if (effect === 'particles' || effect === 'cyber' || effect === 'dots') {
      const numParticles = effect === 'particles' ? 60 : effect === 'cyber' ? 40 : 80;
      for (let i = 0; i < numParticles; i++) {
        dots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (effect === 'cyber' ? 1.5 : 0.6),
          vy: (Math.random() - 0.5) * (effect === 'cyber' ? 1.5 : 0.6),
          radius: Math.random() * (effect === 'cyber' ? 3.5 : 2) + 1,
          alpha: Math.random() * 0.4 + 0.1
        });
      }
    }

    // Matrix characters initialization
    let matrixCols = Math.floor(width / 16) + 1;
    let matrixDrops = Array(matrixCols).fill(1);
    const chars = "NBKRISTCSEECEMECHEEECIVIL01".split("");

    // Wave variables
    let waveAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Render Basic Canvas Backgrounds if anim/solid/gradient is canvas-managed (most are CSS, handled in container, but Canvas adds overlay)
      if (effect === 'grid') {
        // Digital College Grid Layout
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 58, 138, 0.04)';
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw cross markers at intervals
        ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 58, 138, 0.15)';
        for (let x = gridSize * 2; x < width; x += gridSize * 4) {
          for (let y = gridSize * 2; y < height; y += gridSize * 4) {
            ctx.fillRect(x - 2, y - 2, 4, 4);
          }
        }
      } 
      else if (effect === 'particles') {
        // Moving Ambient Particles
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.04)' : 'rgba(30, 58, 138, 0.02)';
        ctx.lineWidth = 0.8;

        dots.forEach((dot, index) => {
          // Update
          dot.x += dot.vx;
          dot.y += dot.vy;

          if (dot.x < 0 || dot.x > width) dot.vx *= -1;
          if (dot.y < 0 || dot.y > height) dot.vy *= -1;

          // Draw
          ctx.fillStyle = isDark
            ? `rgba(99, 102, 241, ${dot.alpha})` // indigo
            : `rgba(30, 58, 138, ${dot.alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
          ctx.fill();

          // Connections
          for (let j = index + 1; j < dots.length; j++) {
            const next = dots[j];
            const dist = Math.hypot(dot.x - next.x, dot.y - next.y);
            if (dist < 120) {
              const alphaFactor = (1 - dist / 120) * 0.12;
              ctx.strokeStyle = isDark 
                ? `rgba(99, 102, 241, ${alphaFactor})`
                : `rgba(30, 58, 138, ${alphaFactor * 0.3})`;
              ctx.beginPath();
              ctx.moveTo(dot.x, dot.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
            }
          }
        });
      } 
      else if (effect === 'dots') {
        // Slow drifting dots without connection lines
        dots.forEach((dot) => {
          dot.x += dot.vx * 0.5;
          dot.y += dot.vy * 0.5;

          if (dot.x < 0 || dot.x > width) dot.vx *= -1;
          if (dot.y < 0 || dot.y > height) dot.vy *= -1;

          ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 118, 110, 0.1)';
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      } 
      else if (effect === 'cyber') {
        // Technological circuit nodes
        ctx.lineWidth = 1.5;
        dots.forEach((dot, index) => {
          dot.x += dot.vx;
          dot.y += dot.vy;

          if (dot.x < 0 || dot.x > width) dot.vx *= -1;
          if (dot.y < 0 || dot.y > height) dot.vy *= -1;

          ctx.fillStyle = theme.primaryColor;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
          ctx.fill();

          // Connect strictly to 2 nearby dots creating circuit layout
          let connectionsCount = 0;
          for (let j = 0; j < dots.length && connectionsCount < 2; j++) {
            if (j === index) continue;
            const next = dots[j];
            const dist = Math.hypot(dot.x - next.x, dot.y - next.y);
            if (dist < 150) {
              const alpha = (1 - dist / 150) * 0.18;
              ctx.strokeStyle = theme.primaryColor + Math.round(alpha * 255).toString(16).padStart(2, '0');
              ctx.beginPath();
              ctx.moveTo(dot.x, dot.y);
              // Orthogonal-looking bend
              ctx.lineTo(dot.x + (next.x - dot.x) * 0.5, dot.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
              connectionsCount++;
            }
          }
        });
      }
      else if (effect === 'waves') {
        // Abstract flowing waves
        waveAngle += 0.003;
        ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.05)' : 'rgba(219, 234, 254, 0.08)';
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 58, 138, 0.05)';
        ctx.lineWidth = 2;

        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const amp = 40 + i * 20;
          const freq = 0.002 + i * 0.001;
          const phase = i * Math.PI * 0.3 + waveAngle;

          for (let x = 0; x <= width; x += 30) {
            const y = height * 0.7 + Math.sin(x * freq + phase) * amp + (i * 20);
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  // CSS values represent solid color, gradients, or image configs
  const getContainerStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
      transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    if (theme.bgType === 'solid') {
      style.backgroundColor = theme.bgColor;
    } else if (theme.bgType === 'gradient') {
      style.background = theme.bgGradient;
    } else if (theme.bgType === 'image' && theme.bgImageUrl) {
      style.backgroundImage = `url(${theme.bgImageUrl})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
    } else {
      // Fallback/Default for animation frame
      style.background = theme.mode === 'dark' ? '#020617' : '#f8fafc';
    }

    return style;
  };

  return (
    <div style={getContainerStyle()} className="overflow-hidden">
      {theme.bgType === 'image' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      )}
      {theme.bgEffect !== 'none' && (
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full opacity-80" />
      )}
    </div>
  );
}
