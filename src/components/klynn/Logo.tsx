import { Droplets } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  iconColor?: string;
}

export function Logo({ size = "md", showWordmark = true, className = "", iconColor }: LogoProps) {
  const dim = {
    sm: "h-7 w-7",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-20 w-20"
  }[size];

  const text = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
    xl: "text-7xl"
  }[size];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${dim} flex items-center justify-center`}>
        <Droplets 
          className={`h-full w-full ${iconColor ? "" : "text-[#0074ff]"}`} 
          style={iconColor ? { color: iconColor } : {}}
          strokeWidth={2.2} 
        />
      </div>
      {showWordmark && (
        <span className={`font-display ${text} font-black tracking-tighter transition-colors`}>
          Klynn
        </span>
      )}
    </div>
  );
}
