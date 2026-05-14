import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Card from "../components/Card";
import BottomNav from "../components/BottomNav";
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

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(month) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Injeta CSS global uma única vez para esconder scrollbar webkit (Chrome, Safari, celular)
if (
  typeof document !== "undefined" &&
  !document.getElementById("vigga-hide-scrollbar")
) {
  const el = document.createElement("style");
  el.id = "vigga-hide-scrollbar";
  el.textContent = `.vigga-months-scroll::-webkit-scrollbar { display: none; }`;
  document.head.appendChild(el);
}

function Budget() {
  const { householdId } = useAuth();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [incomes, setIncomes] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados formulário receita
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeDesc, setIncomeDesc] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [isSavingIncome, setIsSavingIncome] = useState(false);

  // Estados formulário estimativa
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [estimateCategory, setEstimateCategory] = useState("Mercado");
  const [estimateAmount, setEstimateAmount] = useState("");
  const [isSavingEstimate, setIsSavingEstimate] = useState(false);

  async function fetchData() {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const startOfMonth = new Date(
        Number(year),
        Number(month) - 1,
        1,
      ).toISOString();
      const endOfMonth = new Date(
        Number(year),
        Number(month),
        0,
        23,
        59,
        59,
      ).toISOString();

      const [{ data: incomesData }, { data: estimatesData }, { data: txData }] =
        await Promise.all([
          supabase
            .from("budget_incomes")
            .select("*")
            .eq("household_id", householdId)
            .eq("month", selectedMonth)
            .order("created_at", { ascending: true }),
          supabase
            .from("budget_estimates")
            .select("*")
            .eq("household_id", householdId)
            .eq("month", selectedMonth)
            .order("created_at", { ascending: true }),
          supabase
            .from("transactions")
            .select("*")
            .eq("household_id", householdId)
            .gte("created_at", startOfMonth)
            .lte("created_at", endOfMonth),
        ]);

      setIncomes(incomesData || []);
      setEstimates(estimatesData || []);
      setTransactions(txData || []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [householdId, selectedMonth]);

  // Totais
  const totalIncome = useMemo(
    () => incomes.reduce((s, i) => s + Number(i.amount || 0), 0),
    [incomes],
  );

  const totalEstimated = useMemo(
    () => estimates.reduce((s, e) => s + Number(e.amount || 0), 0),
    [estimates],
  );

  const totalReal = useMemo(
    () => transactions.reduce((s, t) => s + Number(t.amount || 0), 0),
    [transactions],
  );

  const balanceEstimated = totalIncome - totalEstimated;
  const balanceReal = totalIncome - totalReal;

  // Gasto real por categoria
  const realByCategory = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const cat = t.category || "Geral";
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    return map;
  }, [transactions]);

  // Categorias com estimativa
  const categoriesWithData = useMemo(() => {
    const cats = new Set([
      ...estimates.map((e) => e.category),
      ...Object.keys(realByCategory),
    ]);
    return Array.from(cats)
      .map((cat) => {
        const estimated =
          estimates.find((e) => e.category === cat)?.amount || 0;
        const real = realByCategory[cat] || 0;
        const diff = Number(estimated) - real;
        const pct =
          estimated > 0
            ? Math.min(Math.round((real / estimated) * 100), 999)
            : null;
        return { cat, estimated: Number(estimated), real, diff, pct };
      })
      .sort((a, b) => b.estimated - a.estimated);
  }, [estimates, realByCategory]);

  // Meses disponíveis (mês atual + 2 anteriores + 1 próximo)
  const availableMonths = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = -2; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(val);
    }
    return months;
  }, []);

  async function handleSaveIncome() {
    if (!incomeDesc.trim() || !incomeAmount.trim()) return;
    setIsSavingIncome(true);
    try {
      const amount = Number(
        incomeAmount.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      await supabase.from("budget_incomes").insert([
        {
          household_id: householdId,
          description: incomeDesc,
          amount,
          month: selectedMonth,
        },
      ]);
      setIncomeDesc("");
      setIncomeAmount("");
      setShowIncomeForm(false);
      await fetchData();
    } finally {
      setIsSavingIncome(false);
    }
  }

  async function handleDeleteIncome(id) {
    await supabase.from("budget_incomes").delete().eq("id", id);
    await fetchData();
  }

  async function handleSaveEstimate() {
    if (!estimateAmount.trim()) return;
    setIsSavingEstimate(true);
    try {
      const amount = Number(
        estimateAmount.replace(",", ".").replace(/[^\d.]/g, ""),
      );

      const existing = estimates.find((e) => e.category === estimateCategory);
      if (existing) {
        await supabase
          .from("budget_estimates")
          .update({ amount })
          .eq("id", existing.id);
      } else {
        await supabase.from("budget_estimates").insert([
          {
            household_id: householdId,
            category: estimateCategory,
            amount,
            month: selectedMonth,
          },
        ]);
      }
      setEstimateAmount("");
      setShowEstimateForm(false);
      await fetchData();
    } finally {
      setIsSavingEstimate(false);
    }
  }

  async function handleDeleteEstimate(id) {
    await supabase.from("budget_estimates").delete().eq("id", id);
    await fetchData();
  }

  function getBarColor(pct) {
    if (pct === null) return "bg-viggaMuted";
    if (pct >= 100) return "bg-red-400";
    if (pct >= 80) return "bg-yellow-400";
    return "bg-viggaGreen";
  }

  return (
    <div className="min-h-screen px-5 pb-32 pt-8">
      {/* HEADER */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-viggaMuted">
            Planejamento
          </p>
          <h1 className="text-2xl font-semibold text-viggaText">Orçamento</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard"
        >
          <ArrowLeft size={18} className="text-viggaGold" />
        </motion.button>
      </header>

      {/* SELETOR DE MÊS
          - classe "vigga-months-scroll" aplica o ::-webkit-scrollbar via CSS global injetado acima
          - style inline cobre Firefox e IE/Edge antigo
          - overflow-x-auto mantém o scroll funcionando normalmente
      */}
      <div
        className="vigga-months-scroll mb-6 flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {availableMonths.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSelectedMonth(m)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              selectedMonth === m
                ? "bg-viggaGold text-black"
                : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
            }`}
          >
            {getMonthLabel(m).split(" de ")[0].charAt(0).toUpperCase() +
              getMonthLabel(m).split(" de ")[0].slice(1)}{" "}
            {getMonthLabel(m).split(" de ")[1]}
          </button>
        ))}
      </div>

      {/* CARD RESUMO */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden p-5">
          <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />

          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-viggaMuted">
            Resumo — {getMonthLabel(selectedMonth)}
          </p>

          {/* Três totais em linhas com divisores */}
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-viggaMuted">Receitas</p>
              <p className="text-base font-bold text-viggaGreen">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="h-px bg-viggaGold/10" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-viggaMuted">Estimado</p>
              <p className="text-base font-bold text-viggaGold">
                {formatCurrency(totalEstimated)}
              </p>
            </div>
            <div className="h-px bg-viggaGold/10" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-viggaMuted">Gasto real</p>
              <p className="text-base font-bold text-viggaText">
                {formatCurrency(totalReal)}
              </p>
            </div>
          </div>

          {/* Saldos lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-2xl p-3 ${balanceEstimated >= 0 ? "bg-viggaGreen/10" : "bg-red-400/10"}`}
            >
              <p className="mb-1 text-[10px] text-viggaMuted">Saldo previsto</p>
              <div className="flex items-center gap-1">
                {balanceEstimated >= 0 ? (
                  <TrendingUp size={12} className="shrink-0 text-viggaGreen" />
                ) : (
                  <TrendingDown size={12} className="shrink-0 text-red-400" />
                )}
                <p
                  className={`text-sm font-bold leading-tight ${balanceEstimated >= 0 ? "text-viggaGreen" : "text-red-400"}`}
                >
                  {formatCurrency(Math.abs(balanceEstimated))}
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-viggaMuted">
                {balanceEstimated >= 0 ? "sobra" : "falta"}
              </p>
            </div>

            <div
              className={`rounded-2xl p-3 ${balanceReal >= 0 ? "bg-viggaGreen/10" : "bg-red-400/10"}`}
            >
              <p className="mb-1 text-[10px] text-viggaMuted">Saldo real</p>
              <div className="flex items-center gap-1">
                {balanceReal >= 0 ? (
                  <TrendingUp size={12} className="shrink-0 text-viggaGreen" />
                ) : (
                  <TrendingDown size={12} className="shrink-0 text-red-400" />
                )}
                <p
                  className={`text-sm font-bold leading-tight ${balanceReal >= 0 ? "text-viggaGreen" : "text-red-400"}`}
                >
                  {formatCurrency(Math.abs(balanceReal))}
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-viggaMuted">
                {balanceReal >= 0 ? "sobra" : "falta"}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* RECEITAS */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-viggaText">Receitas</p>
          <button
            type="button"
            onClick={() => setShowIncomeForm((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-viggaGold/10 bg-viggaBrown px-3 py-1.5 text-xs font-medium text-viggaGold"
          >
            <Plus size={12} />
            Adicionar
          </button>
        </div>

        <AnimatePresence>
          {showIncomeForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <Card className="space-y-3 p-4">
                <input
                  type="text"
                  value={incomeDesc}
                  onChange={(e) => setIncomeDesc(e.target.value)}
                  placeholder="Ex: Salário, Freelance..."
                  className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="Valor (R$)"
                  className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIncomeForm(false)}
                    className="flex-1 rounded-xl border border-viggaGold/10 bg-viggaBrown py-2.5 text-xs font-medium text-viggaGold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIncome}
                    disabled={isSavingIncome}
                    className="flex-1 rounded-xl bg-viggaGold py-2.5 text-xs font-medium text-black disabled:opacity-60"
                  >
                    {isSavingIncome ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {incomes.length === 0 ? (
          <Card className="p-4 text-center">
            <p className="text-sm text-viggaMuted">
              Nenhuma receita cadastrada.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {incomes.map((income) => (
              <Card
                key={income.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-viggaText">
                    {income.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-viggaGreen">
                    {formatCurrency(income.amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteIncome(income.id)}
                    className="text-viggaMuted opacity-50 hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* GASTOS ESTIMADOS VS REAL */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-viggaText">
            Estimado vs Real
          </p>
          <button
            type="button"
            onClick={() => setShowEstimateForm((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-viggaGold/10 bg-viggaBrown px-3 py-1.5 text-xs font-medium text-viggaGold"
          >
            <Plus size={12} />
            Estimar
          </button>
        </div>

        <AnimatePresence>
          {showEstimateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <Card className="space-y-3 p-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-viggaMuted">
                    Categoria
                  </p>
                  <select
                    value={estimateCategory}
                    onChange={(e) => setEstimateCategory(e.target.value)}
                    className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={estimateAmount}
                  onChange={(e) => setEstimateAmount(e.target.value)}
                  placeholder="Valor estimado (R$)"
                  className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEstimateForm(false)}
                    className="flex-1 rounded-xl border border-viggaGold/10 bg-viggaBrown py-2.5 text-xs font-medium text-viggaGold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEstimate}
                    disabled={isSavingEstimate}
                    className="flex-1 rounded-xl bg-viggaGold py-2.5 text-xs font-medium text-black disabled:opacity-60"
                  >
                    {isSavingEstimate ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {categoriesWithData.length === 0 ? (
          <Card className="p-4 text-center">
            <p className="text-sm text-viggaMuted">
              Adicione estimativas por categoria para comparar com o gasto real.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {categoriesWithData.map(({ cat, estimated, real, diff, pct }) => (
              <Card key={cat} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-viggaText">
                      {cat}
                    </p>
                    {estimated > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteEstimate(
                            estimates.find((e) => e.category === cat)?.id,
                          )
                        }
                        className="text-viggaMuted opacity-40 hover:opacity-80"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    {pct !== null && (
                      <p
                        className={`text-xs font-bold ${pct >= 100 ? "text-red-400" : pct >= 80 ? "text-yellow-400" : "text-viggaGreen"}`}
                      >
                        {pct}%
                      </p>
                    )}
                  </div>
                </div>

                {estimated > 0 && (
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct || 0, 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${getBarColor(pct)}`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-viggaMuted">Real</p>
                    <p className="text-sm font-semibold text-viggaText">
                      {formatCurrency(real)}
                    </p>
                  </div>
                  {estimated > 0 && (
                    <>
                      <div className="text-center">
                        <p className="text-[10px] text-viggaMuted">Estimado</p>
                        <p className="text-sm font-semibold text-viggaGold">
                          {formatCurrency(estimated)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-viggaMuted">
                          {diff >= 0 ? "Sobra" : "Excedeu"}
                        </p>
                        <p
                          className={`text-sm font-semibold ${diff >= 0 ? "text-viggaGreen" : "text-red-400"}`}
                        >
                          {formatCurrency(Math.abs(diff))}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

export default Budget;
