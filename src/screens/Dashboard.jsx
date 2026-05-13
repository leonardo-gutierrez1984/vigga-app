import { useEffect, useMemo, useState } from "react";
import {
  UserCircle,
  ArrowRight,
  CalendarClock,
  X,
  Plus,
  Trash2,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { supabase } from "../lib/supabase";
import { aiInsights } from "../data/mockData";
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

function formatHour(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const { userName, householdId, monthlyGoal } = useAuth();
  const navigate = useNavigate();
  const [currentInsight, setCurrentInsight] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [goalType, setGoalType] = useState("category");
  const [goalCategory, setGoalCategory] = useState("Mercado");
  const [goalLimit, setGoalLimit] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  async function fetchData() {
    if (!householdId) return;
    try {
      setIsLoading(true);
      const [
        { data: transactionsData },
        { data: billsData },
        { data: goalsData },
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("household_id", householdId)
          .order("created_at", { ascending: false }),
        supabase
          .from("bills")
          .select("*")
          .eq("household_id", householdId)
          .eq("status", "pending")
          .order("due_date", { ascending: true })
          .limit(3),
        supabase
          .from("goals")
          .select("*")
          .eq("household_id", householdId)
          .order("created_at", { ascending: true }),
      ]);
      setTransactions(transactionsData || []);
      setBills(billsData || []);
      setGoals(goalsData || []);
    } catch (err) {
      console.error("Erro no Dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [householdId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInsight((prev) =>
        prev === aiInsights.length - 1 ? 0 : prev + 1,
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
  }, [transactions]);

  const todayTransactions = useMemo(() => {
    const today = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });
  }, [transactions]);

  const totalMonth = useMemo(
    () =>
      currentMonthTransactions.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0,
      ),
    [currentMonthTransactions],
  );

  const totalToday = useMemo(
    () => todayTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [todayTransactions],
  );

  // Usa monthlyGoal do contexto (dinâmico)
  const committedPercentage = Math.min((totalMonth / monthlyGoal) * 100, 100);

  const goalsWithProgress = useMemo(() => {
    return goals.map((goal) => {
      let spent = 0;
      if (goal.type === "monthly") spent = totalMonth;
      else if (goal.type === "category") {
        spent = currentMonthTransactions
          .filter((t) => t.category === goal.category)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      }
      const percentage =
        goal.limit_amount > 0
          ? Math.min(Math.round((spent / goal.limit_amount) * 100), 100)
          : 0;
      return { ...goal, spent, percentage };
    });
  }, [goals, currentMonthTransactions, totalMonth]);

  const goalsOk = goalsWithProgress.filter((g) => g.percentage < 80).length;
  const goalsTotal = goalsWithProgress.length;

  const quickStats = [
    {
      title: "Gastos hoje",
      value: formatCurrency(totalToday),
      subtitle: "Lançamentos do dia",
      onClick: () => setShowTodayModal(true),
      clickable: true,
    },
    {
      title: "Lançamentos",
      value: String(currentMonthTransactions.length),
      subtitle: "Neste mês",
      onClick: null,
    },
    {
      title: "Maior gasto",
      value:
        currentMonthTransactions.length > 0
          ? formatCurrency(
              Math.max(
                ...currentMonthTransactions.map((t) => Number(t.amount || 0)),
              ),
            )
          : "R$ 0,00",
      subtitle: "No mês",
      onClick: null,
    },
    {
      title: "Metas",
      value: goalsTotal === 0 ? "Configurar" : `${goalsOk}/${goalsTotal} ok`,
      subtitle: goalsTotal === 0 ? "Toque para criar" : "Este mês",
      onClick: () => setShowGoalsModal(true),
      clickable: true,
    },
  ];

  async function handleSaveGoal() {
    if (!goalLimit.trim()) return;
    try {
      setIsSavingGoal(true);
      const parsedLimit = Number(
        goalLimit.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      const name =
        goalType === "monthly"
          ? "Gasto total do mês"
          : `Limite de ${goalCategory}`;
      const { error } = await supabase.from("goals").insert([
        {
          household_id: householdId,
          type: goalType,
          category: goalType === "category" ? goalCategory : null,
          name,
          limit_amount: parsedLimit,
        },
      ]);
      if (error) {
        console.error("Erro ao salvar meta:", error);
        return;
      }
      setGoalLimit("");
      setGoalType("category");
      setGoalCategory("Mercado");
      setShowNewGoalForm(false);
      await fetchData();
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function handleDeleteGoal(id) {
    try {
      await supabase.from("goals").delete().eq("id", id);
      await fetchData();
    } catch (err) {
      console.error("Erro ao excluir meta:", err);
    }
  }

  function getDueLabel(date) {
    if (!date) return "";
    const today = new Date();
    const due = new Date(`${date}T00:00:00`);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Amanhã";
    if (diff < 0) return "Vencido";
    return `${diff} dias`;
  }

  function getDueLabelColor(date) {
    if (!date) return "text-viggaMuted";
    const today = new Date();
    const due = new Date(`${date}T00:00:00`);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "text-red-400";
    if (diff <= 3) return "text-yellow-400";
    return "text-viggaGreen";
  }

  function getGoalBarColor(percentage) {
    if (percentage >= 100) return "bg-red-400";
    if (percentage >= 80) return "bg-yellow-400";
    return "bg-viggaGreen";
  }

  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      {/* HEADER */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-viggaMuted">
            Olá, {userName || "bem-vindo"} 👋
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight">
            Sua vida financeira.
          </h1>
        </div>
        {/* Sino → Perfil */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate("/profile")}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard"
        >
          <UserCircle size={20} className="text-viggaGold" />
        </motion.button>
      </header>

      {/* CARD PRINCIPAL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative mt-10 overflow-hidden p-6">
          <div className="absolute right-[-60px] top-[-60px] h-40 w-40 rounded-full bg-viggaGold/10 blur-3xl" />
          <p className="text-sm text-viggaMuted">Comprometido este mês</p>
          <h2 className="mt-3 text-5xl font-semibold tracking-tight">
            {isLoading ? "Carregando..." : formatCurrency(totalMonth)}
          </h2>
          <p className="mt-3 text-sm leading-6 text-viggaMuted">
            Soma dos lançamentos registrados neste mês.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-viggaGold/10 bg-black/20 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-viggaGreen" />
            <span className="text-xs text-viggaText">
              Atualizado em tempo real
            </span>
          </div>
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-viggaMuted">Meta mensal</span>
              <span className="text-xs font-semibold text-viggaGold">
                {Math.round(committedPercentage)}% de{" "}
                {formatCurrency(monthlyGoal)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${committedPercentage}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${committedPercentage >= 90 ? "bg-red-400" : committedPercentage >= 70 ? "bg-yellow-400" : "bg-viggaGold"}`}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* QUICK STATS */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Visão rápida</h2>
          <button
            onClick={() => navigate("/details")}
            className="flex items-center gap-1 text-sm text-viggaGold"
          >
            Ver tudo <ArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickStats.map((item) => (
            <motion.div key={item.title} whileTap={{ scale: 0.98 }}>
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="w-full text-left"
                >
                  <StatCard
                    title={item.title}
                    value={item.value}
                    subtitle={item.subtitle}
                    clickable
                    compact
                  />
                </button>
              ) : (
                <StatCard
                  title={item.title}
                  value={item.value}
                  subtitle={item.subtitle}
                  compact
                />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* VENCIMENTOS PRÓXIMOS */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock size={14} className="text-viggaMuted" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-viggaMuted">
            Vencimentos próximos
          </h2>
        </div>
        {isLoading ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">Carregando...</p>
          </Card>
        ) : bills.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">
              Nenhum vencimento pendente.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {bills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-viggaText">
                      {bill.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-viggaMuted">
                      {new Date(`${bill.due_date}T00:00:00`).toLocaleDateString(
                        "pt-BR",
                        { day: "2-digit", month: "long" },
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-viggaGold">
                      {formatCurrency(bill.amount)}
                    </p>
                    <p
                      className={`text-[11px] font-medium ${getDueLabelColor(bill.due_date)}`}
                    >
                      {getDueLabel(bill.due_date)}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* INSIGHT ROTATIVO */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Card className="relative overflow-hidden p-5">
          <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-viggaGold" />
            <p className="text-sm text-viggaMuted">
              {aiInsights[currentInsight].label}
            </p>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentInsight}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="mt-4 text-[16px] leading-8"
            >
              {aiInsights[currentInsight].text}
            </motion.p>
          </AnimatePresence>
          <button className="mt-5 text-sm text-viggaGold transition-opacity hover:opacity-80">
            {aiInsights[currentInsight].action}
          </button>
        </Card>
      </motion.div>

      {/* MODAL GASTOS HOJE */}
      <AnimatePresence>
        {showTodayModal && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTodayModal(false)}
          >
            <div className="flex min-h-full items-start justify-center px-5 py-6 pb-32">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-viggaGold">
                      Hoje
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-viggaText">
                      {formatCurrency(totalToday)}
                    </h2>
                    <p className="mt-1 text-xs text-viggaMuted">
                      {todayTransactions.length} lançamento
                      {todayTransactions.length !== 1 ? "s" : ""} hoje
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTodayModal(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  >
                    <X size={18} />
                  </button>
                </div>
                {todayTransactions.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 p-5 text-center">
                    <p className="text-sm text-viggaMuted">
                      Nenhum lançamento hoje ainda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-viggaText">
                            {t.description}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-viggaMuted">
                            {t.category || "Geral"} • {t.payment_method || "—"}{" "}
                            • {formatHour(t.created_at)}
                          </p>
                        </div>
                        <p className="ml-3 shrink-0 text-sm font-bold text-viggaGold">
                          {formatCurrency(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL METAS */}
      <AnimatePresence>
        {showGoalsModal && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGoalsModal(false)}
          >
            <div className="flex min-h-full items-start justify-center px-5 py-6 pb-32">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-viggaGold">
                      Este mês
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-viggaText">
                      Minhas metas
                    </h2>
                    <p className="mt-1 text-xs text-viggaMuted">
                      {goalsTotal === 0
                        ? "Nenhuma meta criada ainda"
                        : `${goalsOk} de ${goalsTotal} dentro do limite`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoalsModal(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  >
                    <X size={18} />
                  </button>
                </div>

                {goalsWithProgress.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 p-5 text-center mb-4">
                    <Target
                      size={32}
                      className="mx-auto mb-2 text-viggaMuted"
                    />
                    <p className="text-sm text-viggaMuted">
                      Crie sua primeira meta abaixo.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 space-y-4">
                    {goalsWithProgress.map((goal) => (
                      <div
                        key={goal.id}
                        className="rounded-2xl bg-black/20 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-viggaText">
                              {goal.name}
                            </p>
                            <p className="text-xs text-viggaMuted">
                              {formatCurrency(goal.spent)} de{" "}
                              {formatCurrency(goal.limit_amount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${goal.percentage >= 100 ? "text-red-400" : goal.percentage >= 80 ? "text-yellow-400" : "text-viggaGreen"}`}
                            >
                              {goal.percentage}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="text-viggaMuted opacity-60 hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-black/30">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.percentage}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full rounded-full ${getGoalBarColor(goal.percentage)}`}
                          />
                        </div>
                        {goal.percentage >= 100 && (
                          <p className="mt-1.5 text-[10px] font-medium text-red-400">
                            ⚠ Limite excedido
                          </p>
                        )}
                        {goal.percentage >= 80 && goal.percentage < 100 && (
                          <p className="mt-1.5 text-[10px] font-medium text-yellow-400">
                            ⚡ Próximo do limite
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {showNewGoalForm ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-2xl bg-black/20 p-4">
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-wider text-viggaMuted">
                            Tipo de meta
                          </p>
                          <div className="flex gap-2">
                            {[
                              { v: "category", l: "Por categoria" },
                              { v: "monthly", l: "Total do mês" },
                            ].map((t) => (
                              <button
                                key={t.v}
                                type="button"
                                onClick={() => setGoalType(t.v)}
                                className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${goalType === t.v ? "bg-viggaGold text-black" : "border border-viggaGold/10 bg-black/20 text-viggaMuted"}`}
                              >
                                {t.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {goalType === "category" && (
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
                        )}
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
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewGoalForm(false)}
                            className="flex-1 rounded-xl border border-viggaGold/10 bg-viggaBrown py-2.5 text-sm font-medium text-viggaGold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveGoal}
                            disabled={isSavingGoal}
                            className="flex-1 rounded-xl bg-viggaGold py-2.5 text-sm font-medium text-black disabled:opacity-60"
                          >
                            {isSavingGoal ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewGoalForm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-viggaGold/10 bg-black/20 py-3 text-sm font-medium text-viggaGold"
                    >
                      <Plus size={16} />
                      Nova meta
                    </button>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

export default Dashboard;
