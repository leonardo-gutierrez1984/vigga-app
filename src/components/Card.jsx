import { motion } from "framer-motion";

function Card({ children, className = "" }) {
  return (
    <motion.div
      whileHover={{
        y: -2,
      }}
      whileTap={{
        scale: 0.99,
      }}
      transition={{
        duration: 0.2,
      }}
      className={`rounded-3xl border border-viggaGold/10 bg-viggaCard shadow-xl transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default Card;
