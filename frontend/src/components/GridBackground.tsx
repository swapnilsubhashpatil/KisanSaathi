// src/components/GridBackground.tsx
import React from "react"
import { cn } from "../utils/cn" // or '../lib/utils' depending on your folder structure

interface GridBackgroundProps {
  children?: React.ReactNode
  className?: string
  gridSize?: string
  gridColor?: string
  darkGridColor?: string
  fadeIntensity?: string
  height?: string
}

const GridBackground: React.FC<GridBackgroundProps> = ({
  children,
  className = "",
  gridSize = "40px",
  gridColor = "#e4e4e7",
  darkGridColor = "#262626",
  fadeIntensity = "20%",
  height = "50rem",
}) => {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center bg-white dark:bg-black",
        className
      )}
      style={{ height }}
    >
      {/* Grid Background for Light Mode */}
      <div
        className="absolute inset-0"
        style={{
          backgroundSize: `${gridSize} ${gridSize}`,
          backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
        }}
      />

      {/* Grid Background for Dark Mode */}
      <div
        className="absolute inset-0 opacity-0 dark:opacity-100"
        style={{
          backgroundSize: `${gridSize} ${gridSize}`,
          backgroundImage: `linear-gradient(to right, ${darkGridColor} 1px, transparent 1px), linear-gradient(to bottom, ${darkGridColor} 1px, transparent 1px)`,
        }}
      />

      {/* Radial gradient overlay for faded effect */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white dark:bg-black"
        style={{
          maskImage: `radial-gradient(ellipse at center, transparent ${fadeIntensity}, black)`,
          WebkitMaskImage: `radial-gradient(ellipse at center, transparent ${fadeIntensity}, black)`,
        }}
      />

      {/* Content */}
      <div className="relative z-20">{children}</div>
    </div>
  )
}

export default GridBackground
export type { GridBackgroundProps }
