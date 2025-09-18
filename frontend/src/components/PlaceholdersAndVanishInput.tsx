// src/components/PlaceholdersAndVanishInput.tsx
import React, {
  useState,
  useEffect,
  useRef,
  memo,
  type InputHTMLAttributes,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../utils/cn"

interface PlaceholdersAndVanishInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSubmit"> {
  placeholders?: string[]
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  className?: string
  inputClassName?: string
  placeholderClassName?: string
  duration?: number
}

const PlaceholdersAndVanishInput: React.FC<PlaceholdersAndVanishInputProps> = ({
  placeholders = [],
  onChange,
  onSubmit,
  className = "",
  inputClassName = "",
  placeholderClassName = "",
  duration = 2000,
  value = "",
  ...props
}) => {
  const [currentPlaceholder, setCurrentPlaceholder] = useState<number>(0)
  const [internalValue, setInternalValue] = useState<string>(
    (value as string) || ""
  )
  const [animationPaused, setAnimationPaused] = useState<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync internal state with external value
  useEffect(() => {
    // Only update internal value when external value changes
    // and is different from the current internal value
    if (value !== internalValue) {
      setInternalValue((value as string) || "")

      // When value is updated externally (e.g., from transcription),
      // ensure placeholder disappears
      if (value && inputRef.current) {
        // Focus the input to maintain focus after external value change
        inputRef.current.focus()
      }
    }
  }, [value, internalValue])

  useEffect(() => {
    if (placeholders.length === 0 || animationPaused) return

    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, duration)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [placeholders.length, duration, animationPaused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
    if (onChange) {
      onChange(e)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Only trigger submission if there's actually text in the input
    if (internalValue.trim() && onSubmit) {
      onSubmit(e)

      // Vanish effect
      if (inputRef.current) {
        inputRef.current.style.transform = "translateY(-100px)"
        inputRef.current.style.opacity = "0"
        setTimeout(() => {
          setInternalValue("")
          if (inputRef.current) {
            inputRef.current.style.transform = "translateY(0px)"
            inputRef.current.style.opacity = "1"
          }
        }, 300)
      }
    }
  }

  // Handle blur event more carefully
  const handleBlur = () => {
    // Only pause animation when blurring, keep focus state
    setTimeout(() => {
      setAnimationPaused(false)
    }, 100)
  }

  // Improve focus preservation
  const handleFocus = () => {
    setAnimationPaused(true)
  }

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && internalValue.trim()) {
      e.preventDefault()

      // Call the handleSubmit function that we already have defined in this component
      // This ensures consistent behavior between Enter key and Submit button
      if (onSubmit) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
      }
    }
  }

  return (
    <form
      className={cn(
        "relative w-full max-w-xl mx-auto bg-white dark:bg-zinc-800 h-12 rounded-full overflow-hidden shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] transition duration-200",
        className
      )}
      onSubmit={handleSubmit}
      style={{ minWidth: 0 }} // Add this to help with flex sizing
    >
      <canvas
        className="absolute pointer-events-none inset-0 h-full w-full"
        id="canvas"
      />

      <input
        ref={inputRef}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        value={internalValue}
        type="text"
        autoComplete="off"
        spellCheck="false"
        className={cn(
          "relative text-xs sm:text-sm md:text-base z-50 border-none dark:text-white bg-transparent text-black h-full w-full rounded-full focus:outline-none focus:ring-0 pl-3 sm:pl-4 md:pl-6 pr-8 sm:pr-12",
          inputClassName
        )}
        style={{
          transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
        }}
        {...props}
      />

      {/* Animated Placeholders */}
      <div className="absolute inset-0 flex items-center rounded-full pointer-events-none">
        <AnimatePresence mode="wait">
          {placeholders.length > 0 && !internalValue && (
            <motion.p
              key={currentPlaceholder}
              initial={{
                y: 5,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: -15,
                opacity: 0,
              }}
              transition={{
                duration: 0.3,
                ease: "linear",
              }}
              className={cn(
                "dark:text-zinc-500 text-xs sm:text-sm md:text-base font-normal text-neutral-500 pl-3 sm:pl-4 md:pl-6 text-left w-[calc(100%-3rem)] truncate",
                placeholderClassName
              )}
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <button
        disabled={!internalValue}
        type="submit"
        aria-label="Submit message"
        className="absolute right-1 sm:right-2 top-1/2 z-50 -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 rounded-full disabled:bg-gray-100 bg-black dark:bg-zinc-900 dark:disabled:bg-zinc-800 transition duration-200 flex items-center justify-center"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-600 dark:text-gray-300 h-4 w-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: internalValue ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <path d="m5 12 7-7 7 7" />
          <path d="m12 19 0-14" />
        </motion.svg>
      </button>
    </form>
  )
}

// Wrap with memo to prevent unnecessary re-renders
export default memo(PlaceholdersAndVanishInput)
