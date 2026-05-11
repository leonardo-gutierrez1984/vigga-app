import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { supabase } from "../lib/supabase";
import { aiInsights, dashboardData } from "../data/mockData";

function Dashboard() {
  const [currentInsight, setCurrentInsight] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchTransactions() {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar lançamentos no Dashboard:", error);
        return;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error("Erro inesperado no Dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

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
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.created_at);

      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });
  }, [transactions]);

  const totalMonth = useMemo(() => {
    return currentMonthTransactions.reduce((total, transaction) => {
      return total + Number(transaction.amount || 0);
    }, 0);
  }, [currentMonthTransactions]);

  const totalToday = useMemo(() => {
    const today = new Date();

    return transactions.reduce((total, transaction) => {
      const transactionDate = new Date(transaction.created_at);

      const isToday =
        transactionDate.getDate() === today.getDate() &&
        transactionDate.getMonth() === today.getMonth() &&
        transactionDate.getFullYear() === today.getFullYear();

      if (!isToday) return total;

      return total + Number(transaction.amount || 0);
    }, 0);
  }, [transactions]);

  const formattedTotalMonth = totalMonth.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formattedTotalToday = totalToday.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const committedPercentage = Math.min((totalMonth / 5000) * 100, 100);

  const quickStats = [
    {
      title: "Gastos hoje",
      value: formattedTotalToday,
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
          ? Math.max(
              ...currentMonthTransactions.map((transaction) =>
                Number(transaction.amount || 0),
              ),
            ).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "R$ 0,00",
      subtitle: "Maior lançamento",
    },
    {
      title: "Base real",
      value: isLoading ? "..." : "Supabase",
      subtitle: "Dados conectados",
    },
  ];

  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-viggaMuted">{dashboardData.greeting}</p>

          <h1 className="mt-2 text-4xl font-semibold leading-tight">
            {dashboardData.title}
          </h1>
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard">
          <Bell size={18} className="text-viggaGold" />
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative mt-10 overflow-hidden p-6">
          <div className="absolute right-[-60px] top-[-60px] h-40 w-40 rounded-full bg-viggaGold/10 blur-3xl" />

          <p className="text-sm text-viggaMuted">Comprometido este mês</p>

          <h2 className="mt-3 text-5xl font-semibold tracking-tight">
            {isLoading ? "Carregando..." : formattedTotalMonth}
          </h2>

          <p className="mt-3 text-sm leading-6 text-viggaMuted">
            Soma dos lançamentos registrados neste mês.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-viggaGold/10 bg-black/20 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-viggaGreen" />

            <span className="text-xs text-viggaText">
              Dados reais conectados ao Supabase
            </span>
          </div>

          <div className="mt-7 h-3 overflow-hidden rounded-full bg-black/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${committedPercentage}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-viggaGold"
            />
          </div>
        </Card>
      </motion.div>

      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-medium">Visão rápida</h2>

          <button className="text-sm text-viggaGold">Ver tudo</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {quickStats.map((item) => (
            <motion.div key={item.title} whileTap={{ scale: 0.98 }}>
              <StatCard
                title={item.title}
                value={item.value}
                subtitle={item.subtitle}
              />
            </motion.div>
          ))}
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="relative mt-6 overflow-hidden p-5">
          <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-viggaGold" />

            <p className="text-sm text-viggaMuted">
              {aiInsights[currentInsight].label}
            </p>
          </div>

          <p className="mt-4 text-[16px] leading-8">
            {aiInsights[currentInsight].text}
          </p>

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
