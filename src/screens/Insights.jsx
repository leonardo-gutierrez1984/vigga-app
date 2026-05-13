import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ui } from "../styles/ui";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const DAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function Insights() {
  const { householdId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchTransactions() {
    if (!householdId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erro ao buscar transações:", error);
        return;
      }
      setTransactions(data || []);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, [householdId]);

  // ─────────────────────────────────────────────
  // CÁLCULOS
  // ─────────────────────────────────────────────
  const now = new Date();

  const currentMonthTx = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
  }, [transactions]);

  const lastMonthTx = useMemo(() => {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    });
  }, [transactions]);

  const totalCurrentMonth = useMemo(
    () => currentMonthTx.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [currentMonthTx],
  );

  const totalLastMonth = useMemo(
    () => lastMonthTx.reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [lastMonthTx],
  );

  // Variação mês a mês
  const monthVariation = useMemo(() => {
    if (totalLastMonth === 0) return null;
    return Math.round(
      ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100,
    );
  }, [totalCurrentMonth, totalLastMonth]);

  // Categoria que mais gastou este mês
  const topCategory = useMemo(() => {
    const map = {};
    currentMonthTx.forEach((t) => {
      const cat = t.category || "Geral";
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0
      ? { name: sorted[0][0], value: sorted[0][1] }
      : null;
  }, [currentMonthTx]);

  // Categoria que mais gastou mês passado
  const topCategoryLastMonth = useMemo(() => {
    const map = {};
    lastMonthTx.forEach((t) => {
      const cat = t.category || "Geral";
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0
      ? { name: sorted[0][0], value: sorted[0][1] }
      : null;
  }, [lastMonthTx]);

  // Variação da categoria top
  const topCategoryVariation = useMemo(() => {
    if (!topCategory || !topCategoryLastMonth) return null;
    if (topCategory.name !== topCategoryLastMonth.name) return null;
    if (topCategoryLastMonth.value === 0) return null;
    return Math.round(
      ((topCategory.value - topCategoryLastMonth.value) /
        topCategoryLastMonth.value) *
        100,
    );
  }, [topCategory, topCategoryLastMonth]);

  // Dia da semana que mais gasta
  const topDayOfWeek = useMemo(() => {
    const map = {};
    currentMonthTx.forEach((t) => {
      const d = new Date(`${t.transaction_date}T00:00:00`);
      const day = d.getDay();
      map[day] = (map[day] || 0) + Number(t.amount || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? DAYS[sorted[0][0]] : null;
  }, [currentMonthTx]);

  // Forma de pagamento mais usada
  const topPaymentMethod = useMemo(() => {
    const map = {};
    currentMonthTx.forEach((t) => {
      const m = t.payment_method || "Não identificado";
      map[m] = (map[m] || 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0
      ? { name: sorted[0][0], count: sorted[0][1] }
      : null;
  }, [currentMonthTx]);

  // Média por lançamento
  const avgPerTransaction = useMemo(() => {
    if (currentMonthTx.length === 0) return 0;
    return totalCurrentMonth / currentMonthTx.length;
  }, [totalCurrentMonth, currentMonthTx]);

  // Maior gasto único
  const biggestTransaction = useMemo(() => {
    if (currentMonthTx.length === 0) return null;
    return currentMonthTx.reduce((max, t) =>
      Number(t.amount || 0) > Number(max.amount || 0) ? t : max,
    );
  }, [currentMonthTx]);

  // ─────────────────────────────────────────────
  // INSIGHT PRINCIPAL
  // ─────────────────────────────────────────────
  const mainInsight = useMemo(() => {
    if (monthVariation === null) {
      return {
        title: topCategory ? `${topCategory.name} lidera` : "Começando o mês",
        text: topCategory
          ? `Sua maior despesa este mês está em ${topCategory.name}, com ${formatCurrency(topCategory.value)} gastos.`
          : "Você ainda não tem lançamentos suficientes para gerar insights.",
        icon: "neutral",
      };
    }
    if (monthVariation > 0) {
      return {
        title: `+${monthVariation}% em relação ao mês passado`,
        text: `Você gastou ${formatCurrency(totalCurrentMonth)} este mês, contra ${formatCurrency(totalLastMonth)} no mês passado. Um aumento de ${monthVariation}%.`,
        icon: "up",
      };
    }
    if (monthVariation < 0) {
      return {
        title: `${monthVariation}% em relação ao mês passado`,
        text: `Ótimo! Você gastou ${formatCurrency(totalCurrentMonth)} este mês, contra ${formatCurrency(totalLastMonth)} no mês passado. Uma redução de ${Math.abs(monthVariation)}%.`,
        icon: "down",
      };
    }
    return {
      title: "Mesmo ritmo do mês passado",
      text: `Seus gastos estão estáveis em torno de ${formatCurrency(totalCurrentMonth)}.`,
      icon: "neutral",
    };
  }, [monthVariation, totalCurrentMonth, totalLastMonth, topCategory]);

  // ─────────────────────────────────────────────
  // CARDS DE INSIGHTS
  // ─────────────────────────────────────────────
  const insightCards = useMemo(() => {
    const cards = [];

    if (topCategory) {
      cards.push({
        title: `${topCategory.name} é seu maior gasto`,
        description:
          topCategoryVariation !== null
            ? `Você gastou ${formatCurrency(topCategory.value)} em ${topCategory.name} este mês — ${topCategoryVariation > 0 ? `${topCategoryVariation}% a mais` : `${Math.abs(topCategoryVariation)}% a menos`} que no mês passado.`
            : `Você gastou ${formatCurrency(topCategory.value)} em ${topCategory.name} este mês.`,
        color: "text-viggaGold",
      });
    }

    if (topDayOfWeek) {
      cards.push({
        title: `${topDayOfWeek} é seu dia mais caro`,
        description: `A maioria dos seus gastos acontece às ${topDayOfWeek.toLowerCase()}s. Fique atento a compras por impulso nesse dia.`,
        color: "text-blue-400",
      });
    }

    if (topPaymentMethod) {
      cards.push({
        title: `${topPaymentMethod.name} é sua forma preferida`,
        description: `Você usou ${topPaymentMethod.name} em ${topPaymentMethod.count} lançamento${topPaymentMethod.count !== 1 ? "s" : ""} este mês.`,
        color: "text-viggaGreen",
      });
    }

    if (avgPerTransaction > 0) {
      cards.push({
        title: "Ticket médio por lançamento",
        description: `Cada lançamento seu custa em média ${formatCurrency(avgPerTransaction)} este mês, com base em ${currentMonthTx.length} lançamentos.`,
        color: "text-purple-400",
      });
    }

    if (biggestTransaction) {
      cards.push({
        title: "Maior gasto do mês",
        description: `${biggestTransaction.description} foi seu maior lançamento: ${formatCurrency(biggestTransaction.amount)}.`,
        color: "text-red-400",
      });
    }

    return cards;
  }, [
    topCategory,
    topCategoryVariation,
    topDayOfWeek,
    topPaymentMethod,
    avgPerTransaction,
    biggestTransaction,
    currentMonthTx,
  ]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header>
        <p className={ui.eyebrow}>Insights</p>
        <h1 className={ui.title}>Sua vida financeira está falando.</h1>
      </header>

      {/* CARD PRINCIPAL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative mt-10 overflow-hidden p-6">
          <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />

          <div className="flex items-center justify-between">
            <div>
              <p className={ui.eyebrow}>Insight principal</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight">
                {isLoading ? "Calculando..." : mainInsight.title}
              </h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              {mainInsight.icon === "up" ? (
                <TrendingUp size={24} className="text-red-400" />
              ) : mainInsight.icon === "down" ? (
                <TrendingDown size={24} className="text-viggaGreen" />
              ) : (
                <BrainCircuit size={24} className="text-viggaGold" />
              )}
            </div>
          </div>

          <p className="mt-6 text-[16px] leading-7 text-viggaMuted">
            {isLoading ? "Analisando seus lançamentos..." : mainInsight.text}
          </p>

          {/* Mini resumo do mês */}
          {!isLoading && currentMonthTx.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/20 p-3 text-center">
                <p className="text-xs text-viggaMuted">Este mês</p>
                <p className="mt-1 text-base font-bold text-viggaGold">
                  {formatCurrency(totalCurrentMonth)}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-3 text-center">
                <p className="text-xs text-viggaMuted">Mês passado</p>
                <p className="mt-1 text-base font-bold text-viggaText">
                  {formatCurrency(totalLastMonth)}
                </p>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* OUTROS INSIGHTS */}
      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-medium">Análise detalhada</h2>
          <span className="text-sm text-viggaMuted">
            {currentMonthTx.length} lançamentos
          </span>
        </div>

        {isLoading ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">Calculando insights...</p>
          </Card>
        ) : insightCards.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">
              Lance mais transações para gerar insights detalhados.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {insightCards.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <Card className="p-5">
                  <h3 className={`text-base font-semibold ${item.color}`}>
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-viggaMuted">
                    {item.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

export default Insights;
