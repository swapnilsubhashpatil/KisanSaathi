// import React from 'react';
import { motion } from 'framer-motion';

export const GrowingSprout = () => (
  <div className="flex items-center justify-center p-2">
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-2xl"
    >
      🌱
    </motion.div>
  </div>
);

export const RotatingSun = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    className="text-2xl"
  >
    ☀️
  </motion.div>
);

export const WaterRipple = () => (
  <div className="relative w-6 h-6 flex items-center justify-center">
    <motion.div
      className="absolute w-full h-full bg-blue-400 rounded-full"
      animate={{ scale: [0.5, 1.5], opacity: [1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
    />
    <div className="text-sm">💧</div>
  </div>
);

export const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-2">
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
  </div>
);