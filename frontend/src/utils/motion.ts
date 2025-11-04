type MotionTransition = {
  type?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
  delay?: number;
  duration?: number;
  staggerChildren?: number;
  delayChildren?: number;
};

type MotionState = {
  opacity?: number;
  y?: number;
  scale?: number;
  transition?: MotionTransition;
};

type MotionPreset = {
  initial: MotionState;
  animate: MotionState;
  hover?: MotionState;
  exit?: MotionState;
};

export const springTransition = {
  type: "spring",
  stiffness: 220,
  damping: 28,
  mass: 1,
} as const satisfies MotionTransition;

export const gentleSpring = {
  type: "spring",
  stiffness: 180,
  damping: 26,
  mass: 1,
} as const satisfies MotionTransition;

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.18 },
  },
} as const satisfies MotionPreset;

export const glassCardMotion = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      stiffness: 260,
    },
  },
  hover: {
    scale: 1.01,
    transition: {
      ...gentleSpring,
      stiffness: 320,
    },
  },
} as const satisfies MotionPreset;

export const heroHeadlineMotion = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      ...springTransition,
      delay: 0.05,
    },
  },
} as const satisfies MotionPreset;

export const heroCardMotion = {
  initial: { opacity: 0, y: 32, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: 0.12,
    },
  },
} as const satisfies MotionPreset;

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
} as const satisfies MotionPreset;
