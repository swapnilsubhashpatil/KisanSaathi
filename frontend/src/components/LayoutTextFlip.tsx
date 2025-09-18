// src/components/LayoutTextFlip.tsx
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../utils/cn"

interface LayoutTextFlipProps {
  text?: string
  words: string[]
  duration?: number
  className?: string
  textClassName?: string
  wordClassName?: string
}

const LayoutTextFlip: React.FC<LayoutTextFlipProps> = ({
  text = "",
  words = [],
  duration = 3000,
  className = "",
  textClassName = "",
  wordClassName = "",
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0)

  useEffect(() => {
    if (words.length === 0) return

    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length)
    }, duration)

    return () => clearInterval(interval)
  }, [words.length, duration])

  if (words.length === 0) {
    return (
      <div
        className={cn(
          "text-4xl font-bold text-black dark:text-white",
          className
        )}
      >
        {text}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {/* Static text */}
      {text && (
        <span
          className={cn(
            "text-4xl font-bold text-black dark:text-white mr-3",
            textClassName
          )}
        >
          {text}
        </span>
      )}

      {/* Animated flipping words */}
      <div className="relative inline-flex h-auto min-h-[1.5em] items-center overflow-visible">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentWordIndex}
            initial={{
              opacity: 0,
              y: 20,
              rotateX: 90,
            }}
            animate={{
              opacity: 1,
              y: 0,
              rotateX: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
              rotateX: -90,
            }}
            transition={{
              duration: 0.4,
              ease: "easeInOut",
            }}
            className={cn(
              "inline-block text-4xl font-bold whitespace-nowrap bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent",
              wordClassName
            )}
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "center",
            }}
          >
            {words[currentWordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default LayoutTextFlip
