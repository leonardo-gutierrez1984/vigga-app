import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Dashboard from "./screens/Dashboard";
import Launch from "./screens/Launch";
import Cards from "./screens/Cards";
import Bills from "./screens/Bills";
import Insights from "./screens/Insights";

function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-viggaBg"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-viggaGold/20 bg-viggaCard shadow-2xl">
          <img
            src="/icons/icon-192.png"
            alt="Vigga"
            className="h-20 w-20 rounded-[1.5rem]"
          />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[0.25em] text-viggaGold">
          VIGGA
        </h1>

        <p className="mt-3 text-sm text-viggaMuted">
          O suporte da sua vida financeira.
        </p>
      </motion.div>
    </motion.div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <main className="min-h-screen bg-viggaBg text-viggaText">
        <div className="mx-auto min-h-screen max-w-[430px] bg-viggaBg">
          <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  );
}

export default App;
