import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, History } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Card from "../components/Card";
import BottomNav from "../components/BottomNav";
import { supabase } from "../lib/supabase";
import { ui } from "../styles/ui";
import { useAuth } from "../contexts/AuthContext";

const CATEGORY_COLORS = {
  Mercado: "#C5A46D",
  Delivery: "#E8845A",
  Combustível: "#7B9ED9",
  Farmácia: "#7DC4A0",
  Recorrente: "#B57FD4",
  Geral: "#9CA3AF",
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["Geral"];
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

const INITIAL_COUNT = 5;

function Details() {
  const navigate = useNavigate();
  const { householdId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function fetchTransactions() {
    if (!householdId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (error) console.error("Erro ao buscar transações:", error);
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

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const map = {};
    currentMonthTransactions.forEach((t) => {
      const cat = t.category || "Geral";
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        color: getCategoryColor(name),
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions]);

  const allTransactions = useMemo(() => transactions, [transactions]);
  const visibleTransactions = useMemo(
    () => (showAll ? allTransactions : allTransactions.slice(0, INITIAL_COUNT)),
    [allTransactions, showAll],
  );

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
          <span className={ui.eyebrow}>Detalhes</span>
          <h1 className="text-2xl font-semibold text-viggaText">
            Análise financeira
          </h1>
        </div>
      </header>

      {/* GASTOS POR CATEGORIA */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-viggaMuted" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-viggaMuted">
            Gastos por categoria
          </h2>
        </div>

        {isLoading ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">Carregando...</p>
          </Card>
        ) : categoryData.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">
              Nenhum gasto registrado este mês.
            </p>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="space-y-5">
              {categoryData.map((cat, index) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.07 }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm font-medium text-viggaText">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-viggaMuted">
                        {cat.percentage}%
                      </span>
                      <span className="text-sm font-bold text-viggaGold">
                        {formatCurrency(cat.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.07 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-viggaGold/10 pt-4">
              <span className="text-sm text-viggaMuted">Total do mês</span>
              <span className="text-base font-bold text-viggaGold">
                {formatCurrency(
                  categoryData.reduce((sum, c) => sum + c.value, 0),
                )}
              </span>
            </div>
          </Card>
        )}
      </section>

      {/* ÚLTIMOS LANÇAMENTOS */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <History size={14} className="text-viggaMuted" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-viggaMuted">
            Últimos lançamentos
          </h2>
        </div>

        {isLoading ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">Carregando...</p>
          </Card>
        ) : allTransactions.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-viggaMuted">
              Nenhum lançamento encontrado.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {visibleTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="flex items-center justify-between px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(transaction.category),
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-viggaText">
                        {transaction.description}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider text-viggaMuted">
                        {transaction.category || "Geral"} •{" "}
                        {transaction.payment_method || "—"} •{" "}
                        {formatDate(transaction.transaction_date)}
                      </p>
                    </div>
                  </div>
                  <p className="ml-3 shrink-0 text-sm font-semibold text-viggaGold">
                    {formatCurrency(transaction.amount)}
                  </p>
                </Card>
              </motion.div>
            ))}

            {allTransactions.length > INITIAL_COUNT && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 w-full rounded-2xl border border-viggaGold/10 bg-black/20 py-3 text-sm font-medium text-viggaGold transition-opacity hover:opacity-80"
              >
                {showAll
                  ? "Ver menos"
                  : `Ver mais ${allTransactions.length - INITIAL_COUNT} lançamentos`}
              </motion.button>
            )}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

export default Details;
