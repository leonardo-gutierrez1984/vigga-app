import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (error) {
        setError("Erro ao criar conta. Verifique os dados.");
        return;
      }

      // Após cadastro o App.jsx redireciona para /household
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-viggaBg px-6 pb-12 pt-12">
      {/* VOLTAR */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        type="button"
        onClick={() => navigate("/login")}
        className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard text-viggaMuted"
      >
        <ArrowLeft size={18} />
      </motion.button>

      {/* TÍTULO */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-viggaGold">
          Bem-vindo
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-viggaText">
          Criar sua conta
        </h1>
        <p className="mt-2 text-sm text-viggaMuted">É rápido e gratuito.</p>
      </motion.div>

      {/* FORMULÁRIO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div>
          <p className="mb-2 text-sm text-viggaMuted">Seu nome</p>
          <div className="flex items-center gap-3 rounded-2xl border border-viggaGold/10 bg-viggaCard px-4 py-4">
            <User size={16} className="shrink-0 text-viggaMuted" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
              className="flex-1 bg-transparent text-sm text-viggaText placeholder:text-viggaMuted focus:outline-none"
            />
          </div>
        </div>

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
              placeholder="Mínimo 6 caracteres"
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

        {/* BOTÃO CRIAR */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleRegister}
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold py-4 font-medium text-black disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
          {isLoading ? "Criando conta..." : "Criar conta"}
        </motion.button>

        <p className="text-center text-sm text-viggaMuted">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-medium text-viggaGold underline underline-offset-2"
          >
            Entrar
          </button>
        </p>
      </motion.div>
    </div>
  );
}

export default Register;
