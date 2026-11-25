'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Re-mounts on every navigation, giving each page a short "rise into place" entrance.
 * Only opacity/transform are animated; framer-motion clears the transform once it settles,
 * so fixed-position children (modals, the chat widget) are not trapped in a containing block.
 */
export default function Template({ children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0.4, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: '50% 0%' }}
    >
      {children}
    </motion.div>
  );
}
