import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Target, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const CATEGORIES = [
  "Assinaturas",
  "Atividade Física",
  "Casa",
  "Combustível",
  "Contas",
  "Delivery",
  "Escola",
  "Farmácia",
  "Geral",
  "Lazer",
  "Mercado",
  "Outros",
  "Pets",
  "Plano de Saúde",
  "Viagens",
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getBarColor(pct) {
  if (pct >= 100) return "bg-red-400";
  if (pct >= 80) return "bg-yellow-400";
  return "bg-viggaGreen";
}

function getStatusLabel(pct) {
  if (pct >= 100) return { text: "⚠ Limite excedido", color: "text-red-400" };
  if (pct >= 80)
    return { text: "⚡ Próximo do limite", color: "text-yellow-400" };
  return { text: "✓ Dentro do limite", color: "text-viggaGreen" };
}

function GoalIcon({ category }) {
  const map = {
    Mercado: "🛒",
    Delivery: "🍔",
    Combustível: "⛽",
    Lazer: "🎉",
    Farmácia: "💊",
    Escola: "📚",
    Assinaturas: "📱",
    Casa: "🏠",
    Contas: "📄",
    "Atividade Física": "🏋️",
    Pets: "🐾",
    "Plano de Saúde": "❤️",
    Viagens: "✈️",
    Geral: "📌",
    Outros: "📦",
  };
  return <span className="text-2xl">{map[category] || "📌"}</span>;
}

function Goals() {
  const { householdId } = useAuth();
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [goalCategory, setGoalCategory] = useState("Mercado");
  const [goalLimit, setGoalLimit] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function fetchData() {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      const [{ data: goalsData }, { data: txData }] = await Promise.all([
        supabase
          .from("goals")
          .select("*")
          .eq("household_id", householdId)
          .order("created_at", { ascending: true }),
        supabase
          .from("transactions")
          .select("*")
          .eq("household_id", householdId)
          .gte("created_at", startOfMonth),
      ]);
      setGoals(goalsData || []);
      setTransactions(txData || []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [householdId]);

  const goalsWithProgress = useMemo(() => {
    return goals.map((goal) => {
      const spent = transactions
        .filter((t) => t.category === goal.category)
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const pct =
        goal.limit_amount > 0
          ? Math.min(Math.round((spent / goal.limit_amount) * 100), 100)
          : 0;
      const remaining = Math.max(goal.limit_amount - spent, 0);
      return { ...goal, spent, pct, remaining };
    });
  }, [goals, transactions]);

  const okCount = goalsWithProgress.filter((g) => g.pct < 80).length;
  const alertCount = goalsWithProgress.filter(
    (g) => g.pct >= 80 && g.pct < 100,
  ).length;
  const exceededCount = goalsWithProgress.filter((g) => g.pct >= 100).length;

  async function handleSave() {
    if (!goalLimit.trim()) return;
    setIsSaving(true);
    try {
      const parsedLimit = Number(
        goalLimit.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      await supabase.from("goals").insert([
        {
          household_id: householdId,
          type: "category",
          category: goalCategory,
          name: `Limite de ${goalCategory}`,
          limit_amount: parsedLimit,
        },
      ]);
      setGoalLimit("");
      setGoalCategory("Mercado");
      setShowForm(false);
      await fetchData();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id) {
    await supabase.from("goals").delete().eq("id", id);
    await fetchData();
  }

  return (
    <div className="min-h-screen px-5 pb-32 pt-8">
      {/* HEADER */}
      <header className="mb-8 flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard"
        >
          <ArrowLeft size={18} className="text-viggaGold" />
        </motion.button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-viggaMuted">
            Controle
          </p>
          <h1 className="text-2xl font-semibold text-viggaText">
            Minhas metas
          </h1>
        </div>
      </header>

      {/* RESUMO */}
      {goalsWithProgress.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-viggaMuted">
              Resumo do mês
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-semibold text-viggaGreen">
                  {okCount}
                </p>
                <p className="mt-0.5 text-[10px] text-viggaMuted">No limite</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-yellow-400">
                  {alertCount}
                </p>
                <p className="mt-0.5 text-[10px] text-viggaMuted">Em alerta</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-red-400">
                  {exceededCount}
                </p>
                <p className="mt-0.5 text-[10px] text-viggaMuted">Excedidas</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* LISTA */}
      {isLoading ? (
        <Card className="p-5">
          <p className="text-sm text-viggaMuted">Carregando metas...</p>
        </Card>
      ) : goalsWithProgress.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Target size={48} className="mb-4 text-viggaMuted opacity-40" />
          <p className="mb-1 font-medium text-viggaText">Nenhuma meta ainda</p>
          <p className="text-sm text-viggaMuted">
            Crie limites de gasto por categoria.
          </p>
        </motion.div>
      ) : (
        <div className="mb-6 space-y-3">
          {goalsWithProgress.map((goal, i) => {
            const status = getStatusLabel(goal.pct);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30">
                        <GoalIcon category={goal.category} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-viggaText">
                          {goal.name}
                        </p>
                        <p
                          className={`mt-0.5 text-[11px] font-medium ${status.color}`}
                        >
                          {status.text}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal.id)}
                      className="mt-1 text-viggaMuted opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-black/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.pct}%` }}
                      transition={{ duration: 0.9, delay: i * 0.06 }}
                      className={`h-full rounded-full ${getBarColor(goal.pct)}`}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-viggaMuted">Gasto</p>
                      <p className="text-sm font-semibold text-viggaText">
                        {formatCurrency(goal.spent)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-viggaMuted">Uso</p>
                      <p
                        className={`text-sm font-bold ${
                          goal.pct >= 100
                            ? "text-red-400"
                            : goal.pct >= 80
                              ? "text-yellow-400"
                              : "text-viggaGreen"
                        }`}
                      >
                        {goal.pct}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-viggaMuted">
                        {goal.pct >= 100 ? "Excedeu" : "Restante"}
                      </p>
                      <p
                        className={`text-sm font-semibold ${goal.pct >= 100 ? "text-red-400" : "text-viggaText"}`}
                      >
                        {goal.pct >= 100
                          ? `+ ${formatCurrency(goal.spent - goal.limit_amount)}`
                          : formatCurrency(goal.remaining)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FORMULÁRIO NOVA META */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4"
          >
            <Card className="space-y-4 p-5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-viggaText">
                  Nova meta
                </p>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-viggaMuted"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-viggaMuted">
                  Categoria
                </p>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                  className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-viggaMuted">
                  Limite (R$)
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={goalLimit}
                  onChange={(e) => setGoalLimit(e.target.value)}
                  placeholder="Ex: 500,00"
                  className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-viggaGold/10 bg-viggaBrown py-2.5 text-sm font-medium text-viggaGold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-viggaGold py-2.5 text-sm font-medium text-black disabled:opacity-60"
                >
                  {isSaving ? "Salvando..." : "Salvar meta"}
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÃO NOVA META */}
      {!showForm && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-viggaGold/20 bg-viggaGold/10 py-4 text-sm font-medium text-viggaGold"
        >
          <Plus size={16} />
          Nova meta
        </motion.button>
      )}
    </div>
  );
}

export default Goals;
