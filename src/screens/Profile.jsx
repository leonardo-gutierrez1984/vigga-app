import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Home,
  Copy,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Target,
  Loader2,
  Users,
} from "lucide-react";

import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ui } from "../styles/ui";
import BottomNav from "../components/BottomNav";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Profile() {
  const navigate = useNavigate();
  const { profile, householdId, signOut, refreshProfile } = useAuth();

  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── EDITAR META MENSAL ────────────────────────
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // ── EDITAR NOME ───────────────────────────────
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  async function fetchHousehold() {
    if (!householdId) return;
    try {
      setIsLoading(true);
      const [{ data: householdData }, { data: membersData }] =
        await Promise.all([
          supabase
            .from("households")
            .select("*")
            .eq("id", householdId)
            .single(),
          supabase.from("profiles").select("*").eq("household_id", householdId),
        ]);
      setHousehold(householdData || null);
      setMembers(membersData || []);
      if (householdData?.monthly_goal) {
        setMonthlyGoal(String(householdData.monthly_goal).replace(".", ","));
      }
    } catch (err) {
      console.error("Erro ao buscar household:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchHousehold();
    if (profile?.name) setNewName(profile.name);
  }, [householdId, profile]);

  function handleCopyCode() {
    if (!household?.invite_code) return;
    navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveGoal() {
    if (!monthlyGoal.trim() || !householdId) return;
    try {
      setIsSavingGoal(true);
      const parsed = Number(
        monthlyGoal.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      const { error } = await supabase
        .from("households")
        .update({ monthly_goal: parsed })
        .eq("id", householdId);
      if (error) {
        console.error("Erro ao salvar meta:", error);
        return;
      }
      await fetchHousehold();
      setShowGoalEdit(false);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function handleSaveName() {
    if (!newName.trim()) return;
    try {
      setIsSavingName(true);
      const { error } = await supabase
        .from("profiles")
        .update({ name: newName })
        .eq("id", profile.id);
      if (error) {
        console.error("Erro ao salvar nome:", error);
        return;
      }
      await refreshProfile();
      setShowNameEdit(false);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      {/* HEADER */}
      <header className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard text-viggaMuted"
        >
          <ArrowLeft size={18} />
        </motion.button>
        <div>
          <span className={ui.eyebrow}>Conta</span>
          <h1 className="text-2xl font-semibold text-viggaText">Perfil</h1>
        </div>
      </header>

      <div className="mt-8 space-y-4">
        {/* ── DADOS PESSOAIS ───────────────────── */}
        <Card className="p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-viggaMuted">
            Dados pessoais
          </p>
          <div className="space-y-3">
            {/* Nome */}
            <button
              type="button"
              onClick={() => setShowNameEdit(true)}
              className="flex w-full items-center justify-between rounded-2xl bg-black/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <User size={16} className="text-viggaGold" />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                    Nome
                  </p>
                  <p className="text-sm font-medium text-viggaText">
                    {profile?.name || "—"}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-viggaMuted" />
            </button>

            {/* Email */}
            <div className="flex items-center gap-3 rounded-2xl bg-black/20 px-4 py-3">
              <Mail size={16} className="text-viggaGold" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                  Email
                </p>
                <p className="text-sm font-medium text-viggaText">
                  {profile?.email || "—"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── GRUPO FAMILIAR ───────────────────── */}
        <Card className="p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-viggaMuted">
            Grupo familiar
          </p>
          <div className="space-y-3">
            {/* Nome do grupo */}
            <div className="flex items-center gap-3 rounded-2xl bg-black/20 px-4 py-3">
              <Home size={16} className="text-viggaGold" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                  Grupo
                </p>
                <p className="text-sm font-medium text-viggaText">
                  {household?.name || "—"}
                </p>
              </div>
            </div>

            {/* Código de convite */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex w-full items-center justify-between rounded-2xl bg-black/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-viggaGold/10">
                  {copied ? (
                    <CheckCircle2 size={14} className="text-viggaGreen" />
                  ) : (
                    <Copy size={14} className="text-viggaGold" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                    Código de convite
                  </p>
                  <p className="font-mono text-sm font-bold tracking-widest text-viggaGold">
                    {household?.invite_code || "—"}
                  </p>
                </div>
              </div>
              <span className="text-xs text-viggaMuted">
                {copied ? "Copiado!" : "Copiar"}
              </span>
            </button>

            {/* Membros */}
            <div className="rounded-2xl bg-black/20 px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <Users size={16} className="text-viggaGold" />
                <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                  Membros ({members.length})
                </p>
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-viggaGold/20 text-xs font-bold text-viggaGold">
                      {(member.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-viggaText">
                      {member.name || "Sem nome"}
                    </p>
                    {member.id === profile?.id && (
                      <span className="rounded-full bg-viggaGold/10 px-2 py-0.5 text-[10px] text-viggaGold">
                        Você
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── META MENSAL ──────────────────────── */}
        <Card className="p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-viggaMuted">
            Configurações
          </p>

          <button
            type="button"
            onClick={() => setShowGoalEdit(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-black/20 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Target size={16} className="text-viggaGold" />
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                  Meta mensal
                </p>
                <p className="text-sm font-medium text-viggaText">
                  {household?.monthly_goal
                    ? formatCurrency(household.monthly_goal)
                    : "R$ 5.000,00"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-viggaMuted" />
          </button>
        </Card>

        {/* ── SAIR ─────────────────────────────── */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-300"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>

      {/* MODAL EDITAR NOME */}
      <AnimatePresence>
        {showNameEdit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNameEdit(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
            >
              <p className={ui.eyebrow}>Editar</p>
              <h2 className="mt-1 mb-4 text-xl font-semibold text-viggaText">
                Seu nome
              </h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Digite seu nome"
                className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none placeholder:text-viggaMuted mb-4"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowNameEdit(false)}
                  className="rounded-2xl border border-viggaGold/10 bg-viggaBrown py-3 text-sm font-medium text-viggaGold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-viggaGold py-3 text-sm font-medium text-black disabled:opacity-60"
                >
                  {isSavingName ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {isSavingName ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDITAR META MENSAL */}
      <AnimatePresence>
        {showGoalEdit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGoalEdit(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
            >
              <p className={ui.eyebrow}>Configurar</p>
              <h2 className="mt-1 mb-1 text-xl font-semibold text-viggaText">
                Meta mensal
              </h2>
              <p className="mb-4 text-sm text-viggaMuted">
                Define o limite de gastos do mês para toda a família.
              </p>
              <input
                type="text"
                inputMode="decimal"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                placeholder="Ex: 5.000,00"
                className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none placeholder:text-viggaMuted mb-4"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowGoalEdit(false)}
                  className="rounded-2xl border border-viggaGold/10 bg-viggaBrown py-3 text-sm font-medium text-viggaGold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  disabled={isSavingGoal}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-viggaGold py-3 text-sm font-medium text-black disabled:opacity-60"
                >
                  {isSavingGoal ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {isSavingGoal ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

export default Profile;
