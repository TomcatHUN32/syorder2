'use client';

import { cn } from '@/lib/utils';

interface SyorderLogoProps {
  size?: number;
  className?: string;
  variant?: 'light' | 'dark';
}

export function SyorderLogoMark({ size = 32, className, variant = 'light' }: SyorderLogoProps) {
  const stroke = variant === 'light' ? 'white' : '#0f172a';
  const center = variant === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.5)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="SYORDER"
    >
      {/* Top ring */}
      <circle cx="20" cy="13" r="9" stroke={stroke} strokeWidth="2.5" strokeOpacity="0.95"/>
      {/* Bottom-left ring */}
      <circle cx="12" cy="27" r="9" stroke={stroke} strokeWidth="2.5" strokeOpacity="0.75"/>
      {/* Bottom-right ring */}
      <circle cx="28" cy="27" r="9" stroke={stroke} strokeWidth="2.5" strokeOpacity="0.75"/>
      {/* Center node — centroid of the three circles */}
      <circle cx="20" cy="22.3" r="2.8" fill={center}/>
    </svg>
  );
}

export function SyorderLogo({
  size = 32,
  className,
  variant = 'light',
  showText = false,
  textSize = 'sm',
}: SyorderLogoProps & { showText?: boolean; textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' }) {
  if (!showText) return <SyorderLogoMark size={size} className={className} variant={variant} />;

  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';
  const subColor = variant === 'light' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <SyorderLogoMark size={size} variant={variant} />
      <div className="flex flex-col leading-tight">
        <span className={cn(`text-${textSize} font-bold tracking-widest uppercase`, textColor)}>
          SYORDER
        </span>
        {textSize !== 'xs' && (
          <span className={cn('text-xs', subColor)}>Étteremkezelő Platform</span>
        )}
      </div>
    </div>
  );
}
