import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ variant = 'dark', showTagline = true, className = "", size = 'md' }: LogoProps) {
  const isLight = variant === 'light';
  
  const iconSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-12 h-12 rounded-[14px]',
    lg: 'w-16 h-16 rounded-[20px]'
  };

  const svgSizes = {
    sm: { w: 18, h: 18, stroke: 2.5, r: 1.2, dotsX: 16 },
    md: { w: 28, h: 28, stroke: 3, r: 1.8, dotsX: 23 },
    lg: { w: 36, h: 36, stroke: 4, r: 2.2, dotsX: 30 }
  };

  const textSizes = {
    sm: { main: 'text-xl', tagline: 'text-[6px]', gap: 'gap-2' },
    md: { main: 'text-3xl', tagline: 'text-[8px]', gap: 'gap-4' },
    lg: { main: 'text-4xl', tagline: 'text-[10px]', gap: 'gap-5' }
  };

  const currentSvg = svgSizes[size];
  const currentText = textSizes[size];

  return (
    <div className={cn("flex items-center", currentText.gap, className)}>
      {/* Logo Icon Box */}
      <div className={cn(
        "bg-[#1D9E75] flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/10",
        iconSizes[size]
      )}>
        <svg 
          width={currentSvg.w} 
          height={currentSvg.h} 
          viewBox={`0 0 ${currentSvg.w} ${currentSvg.h}`} 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main vertical stem of P */}
          <path 
            d={`M${currentSvg.w * 0.28} ${currentSvg.h * 0.22}V${currentSvg.h * 0.78}`} 
            stroke="white" 
            strokeWidth={currentSvg.stroke} 
            strokeLinecap="round" 
          />
          {/* Curve of P - refining loop to end in middle */}
          <path 
            d={`M${currentSvg.w * 0.28} ${currentSvg.h * 0.22}H${currentSvg.w * 0.45}C${currentSvg.w * 0.65} ${currentSvg.h * 0.22} ${currentSvg.w * 0.75} ${currentSvg.h * 0.32} ${currentSvg.w * 0.75} ${currentSvg.h * 0.42}C${currentSvg.w * 0.75} ${currentSvg.h * 0.52} ${currentSvg.w * 0.65} ${currentSvg.h * 0.62} ${currentSvg.w * 0.45} ${currentSvg.h * 0.62}H${currentSvg.w * 0.28}`} 
            stroke="white" 
            strokeWidth={currentSvg.stroke} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Progress dots on the right */}
          <circle cx={currentSvg.dotsX} cy={currentSvg.h * 0.32} r={currentSvg.r} fill="white" fillOpacity="0.3" />
          <circle cx={currentSvg.dotsX} cy={currentSvg.h * 0.5} r={currentSvg.r} fill="white" fillOpacity="0.6" />
          <circle cx={currentSvg.dotsX} cy={currentSvg.h * 0.68} r={currentSvg.r} fill="white" />
        </svg>
      </div>

      {/* Textual Branding */}
      <div className="flex flex-col">
        <div className="flex items-baseline leading-none">
          <span className={cn(
            "font-bold tracking-tight", 
            currentText.main,
            isLight ? "text-white" : "text-[#0F172A]"
          )}>P</span>
          <span className={cn(
            "font-medium tracking-tight -ml-0.5", 
            currentText.main,
            isLight ? "text-white" : "text-[#0F172A]"
          )}>ratiqo</span>
        </div>
        {showTagline && (
          <div className="mt-2 relative">
            <p className={cn(
              "font-bold uppercase tracking-[0.25em] whitespace-nowrap", 
              currentText.tagline,
              isLight ? "text-teal-400" : "text-slate-600"
            )}>
              APPRENDRE. PRATIQUER. PROGRESSER.
            </p>
            <div className={cn(
              "absolute -bottom-1.5 left-0 right-0 h-[1.5px] rounded-full", 
              isLight ? "bg-teal-500/30" : "bg-[#1D9E75]/30"
            )} />
            <div className={cn(
              "absolute -bottom-1.5 left-0 w-1/3 h-[1.5px] rounded-full", 
              isLight ? "bg-teal-400" : "bg-[#1D9E75]"
            )} />
          </div>
        )}
      </div>
    </div>
  );
}
