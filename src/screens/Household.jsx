import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Users, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VIGGA-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function Household() {
  const [mode, setMode] = useState(null); // "create" | "join"
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);

  // ── CRIAR GRUPO ───────────────────────────────
  async function handleCreate() {
    if (!householdName.trim()) {
      setError("Digite o nome do grupo.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Usuário não autenticado.");
        return;
      }

      const code = generateInviteCode();

      // Criar household
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert([{ name: householdName, invite_code: code }])
        .select()
        .single();

      if (householdError) {
        setError("Erro ao criar grupo.");
        return;
      }

      // Vincular usuário ao grupo
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ household_id: household.id })
        .eq("id", user.id);

      if (profileError) {
        setError("Erro ao vincular ao grupo.");
        return;
      }

      setCreatedCode(code);
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── ENTRAR EM GRUPO ───────────────────────────
  async function handleJoin() {
    if (!inviteCode.trim()) {
      setError("Digite o código de convite.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Usuário não autenticado.");
        return;
      }

      // Buscar household pelo código
      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("*")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (householdError || !household) {
        setError("Código não encontrado. Verifique e tente novamente.");
        return;
      }

      // Vincular usuário ao grupo
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ household_id: household.id })
        .eq("id", user.id);

      if (profileError) {
        setError("Erro ao entrar no grupo.");
        return;
      }

      // Recarrega a sessão para o App.jsx detectar o household
      window.location.href = "/";
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── COPIAR CÓDIGO ─────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── CONTINUAR APÓS CRIAR ──────────────────────
  function handleContinue() {
    window.location.href = "/";
  }

  // ─────────────────────────────────────────────
  // RENDER — CÓDIGO CRIADO
  // ─────────────────────────────────────────────
  if (createdCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-viggaBg px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[380px] space-y-6 text-center"
        >
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-viggaGold/20 bg-viggaCard">
              <CheckCircle2 size={36} className="text-viggaGreen" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-viggaText">
              Grupo criado!
            </h2>
            <p className="mt-2 text-sm text-viggaMuted">
              Compartilhe o código abaixo com sua família para que eles entrem
              no grupo.
            </p>
          </div>

          {/* Código de convite */}
          <div className="rounded-2xl border border-viggaGold/20 bg-viggaCard p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-viggaMuted">
              Código de convite
            </p>
            <p className="mt-3 text-3xl font-bold tracking-widest text-viggaGold">
              {createdCode}
            </p>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-viggaGold/10 bg-black/20 py-3 text-sm text-viggaGold"
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? "Copiado!" : "Copiar código"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-2xl bg-viggaGold py-4 font-medium text-black"
          >
            Ir para o app
          </button>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — SELEÇÃO DE MODO
  // ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-viggaBg px-6 pb-12 pt-16">
      {/* TÍTULO */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <div className="mb-5 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-viggaGold/20 bg-viggaCard">
            <Home size={32} className="text-viggaGold" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-viggaText">
          Seu grupo familiar
        </h1>
        <p className="mt-2 text-sm text-viggaMuted">
          Gerencie as finanças junto com quem você ama.
        </p>
      </motion.div>

      {/* OPÇÕES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {/* Criar grupo */}
        <button
          type="button"
          onClick={() => {
            setMode("create");
            setError("");
          }}
          className={`w-full rounded-2xl border p-5 text-left transition-colors ${
            mode === "create"
              ? "border-viggaGold/40 bg-viggaGold/10"
              : "border-viggaGold/10 bg-viggaCard"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-viggaGold/10">
              <Home size={18} className="text-viggaGold" />
            </div>
            <div>
              <p className="font-medium text-viggaText">Criar um grupo</p>
              <p className="text-xs text-viggaMuted">
                Serei o responsável pelo grupo
              </p>
            </div>
          </div>
        </button>

        {/* Entrar em grupo */}
        <button
          type="button"
          onClick={() => {
            setMode("join");
            setError("");
          }}
          className={`w-full rounded-2xl border p-5 text-left transition-colors ${
            mode === "join"
              ? "border-viggaGold/40 bg-viggaGold/10"
              : "border-viggaGold/10 bg-viggaCard"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-viggaGold/10">
              <Users size={18} className="text-viggaGold" />
            </div>
            <div>
              <p className="font-medium text-viggaText">Entrar em um grupo</p>
              <p className="text-xs text-viggaMuted">
                Tenho um código de convite
              </p>
            </div>
          </div>
        </button>

        {/* Formulário dinâmico */}
        <AnimatePresence mode="wait">
          {mode === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                <div>
                  <p className="mb-2 text-sm text-viggaMuted">Nome do grupo</p>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="Ex: Família Silva"
                    className="w-full rounded-2xl border border-viggaGold/10 bg-viggaCard px-4 py-4 text-sm text-viggaText placeholder:text-viggaMuted focus:border-viggaGold/30 focus:outline-none"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold py-4 font-medium text-black disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : null}
                  {isLoading ? "Criando..." : "Criar grupo"}
                </button>
              </div>
            </motion.div>
          )}

          {mode === "join" && (
            <motion.div
              key="join"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                <div>
                  <p className="mb-2 text-sm text-viggaMuted">
                    Código de convite
                  </p>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode(e.target.value.toUpperCase())
                    }
                    placeholder="Ex: VIGGA-AB12"
                    className="w-full rounded-2xl border border-viggaGold/10 bg-viggaCard px-4 py-4 text-center font-mono text-lg tracking-widest text-viggaGold placeholder:text-viggaMuted/50 placeholder:text-sm placeholder:tracking-normal focus:border-viggaGold/30 focus:outline-none"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold py-4 font-medium text-black disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : null}
                  {isLoading ? "Entrando..." : "Entrar no grupo"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default Household;
