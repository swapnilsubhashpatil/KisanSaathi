// src/components/LayoutTextFlipDemo.tsx
import React from "react"
import { motion } from "framer-motion"
import LayoutTextFlip from "./LayoutTextFlip"

const LayoutTextFlipDemo: React.FC = () => {
  return (
    <div>
      <motion.div className="relative mx-4 my-4 flex flex-col items-center justify-center gap-4 text-center sm:mx-0 sm:mb-0 sm:flex-row">
        <LayoutTextFlip
          text="Welcome to "
          words={["Aceternity UI", "Fight Club", "The Matrix", "The Jungle"]}
        />
      </motion.div>
      <p className="mt-4 text-center text-base text-neutral-600 dark:text-neutral-400">
        Experience the power of modern UI components that bring your ideas to
        life.
      </p>
    </div>
  )
}

export default LayoutTextFlipDemo
