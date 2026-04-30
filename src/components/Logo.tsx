"use client";
import React from 'react';
import { Shield } from 'lucide-react';
import { useSiteSettings } from '@/hooks/use-site-settings';

interface LogoProps {
  size?: number;
  className?: string;
  invert?: boolean;
  showText?: boolean;
}

/** Inject Cloudinary resize transforms into a Cloudinary URL */
function cloudinaryResize(url: string, width: number, height: number): string {
  if (!url?.includes("res.cloudinary.com")) return url;
  // Request 4x height for maximum sharpness on high-resolution displays
  const targetH = Math.round(height * 4);
  const targetW = Math.round(width * 4);
  return url.replace(
    /\/upload\//,
    `/upload/w_${targetW},h_${targetH},c_limit,f_auto,q_auto:best/`
  );
}

export function Logo({ size = 32, className = "", invert = false, showText = true }: LogoProps) {
  const { logoUrl, siteTitle } = useSiteSettings();
  const [logoError, setLogoError] = React.useState(false);

  return (
    <div className={`flex items-center ${className} ${invert ? 'invert dark:invert-0' : ''}`}>
      <div 
        className="flex items-center justify-center overflow-hidden"
        style={{ height: size }}
      >
        {logoUrl && !logoError ? (
          <img
            src={cloudinaryResize(logoUrl, size * 6, size)}
            alt={siteTitle}
            className="h-full w-auto object-contain transition-opacity duration-300"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all duration-300"
                 style={{ width: size, height: size }}>
              <Shield 
                className="text-white drop-shadow-sm" 
                size={size * 0.55} 
                strokeWidth={2.5}
              />
            </div>
            {showText && size >= 24 && (
              <span className="font-bold tracking-tight text-gray-900 dark:text-white" style={{ fontSize: size * 0.65 }}>
                LeadCop<span className="text-primary">.io</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  const { logoUrl } = useSiteSettings();
  const [error, setError] = React.useState(false);

  if (logoUrl && !error) {
    return (
      <img
        src={cloudinaryResize(logoUrl, size * 2, size * 2)}
        alt="Logo"
        style={{ width: size, height: size }}
        className={`object-contain ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div 
      className={`bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Shield className="text-white fill-white/10" size={size * 0.6} strokeWidth={2.5} />
    </div>
  );
}
