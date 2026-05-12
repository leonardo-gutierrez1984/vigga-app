import { useEffect, useMemo, useState } from "react";
import { Bell, ArrowRight, CalendarClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { supabase } from "../lib/supabase";
import { aiInsights, dashboardData } from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Dashboard() {
  const { userName, householdId } = useAuth();
  const navigate = useNavigate();
  const [currentInsight, setCurrentInsight] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchData() {
    if (!householdId) return;
    try {
      setIsLoading(true);
      const [{ data: transactionsData }, { data: billsData }] =
        await Promise.all([
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
        ]);
      setTransactions(transactionsData || []);
      setBills(billsData || []);
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

  // ── CÁLCULOS ─────────────────────────────────
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
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

  const totalToday = useMemo(() => {
    const today = new Date();
    return transactions.reduce((sum, t) => {
      const d = new Date(t.created_at);
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      return isToday ? sum + Number(t.amount || 0) : sum;
    }, 0);
  }, [transactions]);

  const dailyAverage = useMemo(() => {
    const day = new Date().getDate();
    return day > 0 ? totalMonth / day : 0;
  }, [totalMonth]);

  const committedPercentage = Math.min((totalMonth / 5000) * 100, 100);

  const quickStats = [
    {
      title: "Gastos hoje",
      value: formatCurrency(totalToday),
      subtitle: "Lançamentos do dia",
    },
    {
      title: "Lançamentos",
      value: String(currentMonthTransactions.length),
      subtitle: "Neste mês",
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
    },
    {
      title: "Média diária",
      value: formatCurrency(dailyAverage),
      subtitle: "Gasto por dia",
    },
  ];

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
        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard">
          <Bell size={18} className="text-viggaGold" />
        </button>
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
                {Math.round(committedPercentage)}% de R$ 5.000
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${committedPercentage}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${
                  committedPercentage >= 90
                    ? "bg-red-400"
                    : committedPercentage >= 70
                      ? "bg-yellow-400"
                      : "bg-viggaGold"
                }`}
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
              <StatCard
                title={item.title}
                value={item.value}
                subtitle={item.subtitle}
                compact
              />
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

      <BottomNav />
    </div>
  );
}

export default Dashboard;
