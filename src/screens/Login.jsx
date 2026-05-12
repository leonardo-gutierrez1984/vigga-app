import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Email ou senha incorretos.");
        return;
      }

      // Navegação é controlada pelo App.jsx via onAuthStateChange
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-viggaBg px-6 pb-12 pt-16">
      {/* LOGO */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-viggaGold/20 bg-viggaCard shadow-2xl">
          <img
            src="/icons/icon-192.png"
            alt="Vigga"
            className="h-16 w-16 rounded-[1rem]"
          />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[0.2em] text-viggaGold">
          VIGGA
        </h1>
        <p className="mt-2 text-sm text-viggaMuted">
          O suporte da sua vida financeira.
        </p>
      </motion.div>

      {/* FORMULÁRIO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-4"
      >
        <div>
          <p className="mb-2 text-sm text-viggaMuted">Email</p>
          <div className="flex items-center gap-3 rounded-2xl border border-viggaGold/10 bg-viggaCard px-4 py-4">
            <Mail size={16} className="shrink-0 text-viggaMuted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 bg-transparent text-sm text-viggaText placeholder:text-viggaMuted focus:outline-none"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-viggaMuted">Senha</p>
          <div className="flex items-center gap-3 rounded-2xl border border-viggaGold/10 bg-viggaCard px-4 py-4">
            <Lock size={16} className="shrink-0 text-viggaMuted" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex-1 bg-transparent text-sm text-viggaText placeholder:text-viggaMuted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 text-viggaMuted"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* ERRO */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}

        {/* BOTÃO ENTRAR */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold py-4 font-medium text-black disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
          {isLoading ? "Entrando..." : "Entrar"}
        </motion.button>

        {/* LINK CADASTRO */}
        <p className="text-center text-sm text-viggaMuted">
          Não tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-medium text-viggaGold underline underline-offset-2"
          >
            Criar conta
          </button>
        </p>
      </motion.div>
    </div>
  );
}

export default Login;
