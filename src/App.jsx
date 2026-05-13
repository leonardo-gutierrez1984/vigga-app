import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Dashboard from "./screens/Dashboard";
import Launch from "./screens/Launch";
import Cards from "./screens/Cards";
import Bills from "./screens/Bills";
import Insights from "./screens/Insights";
import Details from "./screens/Details";
import Login from "./screens/Login";
import Register from "./screens/Register";
import Household from "./screens/Household";
import Profile from "./screens/Profile";
import Goals from "./screens/Goals";
import Report from "./screens/Report";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

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

function AppRoutes() {
  const { session, profile, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <div className="min-h-screen bg-viggaBg" />;

  const isLoggedIn = !!session;
  const hasHousehold = !!profile?.household_id;

  return (
    <>
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>

      <Routes>
        {/* PÚBLICAS */}
        <Route
          path="/login"
          element={!isLoggedIn ? <Login /> : <Navigate to="/" replace />}
        />
        <Route
          path="/register"
          element={!isLoggedIn ? <Register /> : <Navigate to="/" replace />}
        />

        {/* GRUPO FAMILIAR */}
        <Route
          path="/household"
          element={
            !isLoggedIn ? (
              <Navigate to="/login" replace />
            ) : hasHousehold ? (
              <Navigate to="/" replace />
            ) : (
              <Household />
            )
          }
        />

        {/* PRIVADAS */}
        <Route
          path="/"
          element={
            !isLoggedIn ? (
              <Navigate to="/login" replace />
            ) : !hasHousehold ? (
              <Navigate to="/household" replace />
            ) : (
              <Dashboard />
            )
          }
        />
        <Route
          path="/launch"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Launch />}
        />
        <Route
          path="/cards"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Cards />}
        />
        <Route
          path="/bills"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Bills />}
        />
        <Route
          path="/insights"
          element={
            !isLoggedIn ? <Navigate to="/login" replace /> : <Insights />
          }
        />
        <Route
          path="/details"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Details />}
        />
        <Route
          path="/profile"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Profile />}
        />
        <Route
          path="/goals"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Goals />}
        />
        <Route
          path="/report"
          element={!isLoggedIn ? <Navigate to="/login" replace /> : <Report />}
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <main className="min-h-screen bg-viggaBg text-viggaText">
          <div className="mx-auto min-h-screen max-w-[430px] bg-viggaBg">
            <AppRoutes />
          </div>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
