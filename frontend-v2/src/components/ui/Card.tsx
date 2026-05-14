import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("bg-surface border border-border-subtle rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300", className)}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("px-6 py-4 border-b border-border-subtle bg-surface/50", className)}>
    {children}
  </div>
);

export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

export const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("px-6 py-4 border-t border-border-subtle bg-surface/30", className)}>
    {children}
  </div>
);
