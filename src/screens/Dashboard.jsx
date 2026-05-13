import { useEffect, useMemo, useState, useRef } from "react";
import {
  UserCircle,
  ArrowRight,
  CalendarClock,
  X,
  FileBarChart,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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
  const { userName, householdId } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Estados da IA
  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const abortRef = useRef(null);

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

  const goalsWithProgress = useMemo(() => {
    return goals.map((goal) => {
      const spent = currentMonthTransactions
        .filter((t) => t.category === goal.category)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const percentage =
        goal.limit_amount > 0
          ? Math.min(Math.round((spent / goal.limit_amount) * 100), 100)
          : 0;
      return { ...goal, spent, percentage };
    });
  }, [goals, currentMonthTransactions]);

  const goalsOk = goalsWithProgress.filter((g) => g.percentage < 80).length;
  const goalsTotal = goalsWithProgress.length;
  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long" });

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
      onClick: () => navigate("/goals"),
      clickable: true,
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

  // ─────────────────────────────────────────────
  // GERAR ANÁLISE COM IA
  // ─────────────────────────────────────────────
  async function handleGenerateAI() {
    if (currentMonthTransactions.length === 0) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsGenerating(true);
    setAiText("");
    setAiError(null);

    const categoryMap = {};
    currentMonthTransactions.forEach((t) => {
      const cat = t.category || "Geral";
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
    });
    const categoriesSorted = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => `${cat}: ${formatCurrency(val)}`)
      .join(", ");

    const avgPerTx =
      currentMonthTransactions.length > 0
        ? totalMonth / currentMonthTransactions.length
        : 0;

    const biggestTx =
      currentMonthTransactions.length > 0
        ? currentMonthTransactions.reduce((max, t) =>
            Number(t.amount || 0) > Number(max.amount || 0) ? t : max,
          )
        : null;

    const topPayment = (() => {
      const map = {};
      currentMonthTransactions.forEach((t) => {
        const m = t.payment_method || "Outros";
        map[m] = (map[m] || 0) + 1;
      });
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : null;
    })();

    const prompt = `Você é um consultor financeiro pessoal simpático e direto. Analise os dados financeiros abaixo e responda em português brasileiro.

DADOS DO MÊS ATUAL:
- Total gasto: ${formatCurrency(totalMonth)}
- Número de lançamentos: ${currentMonthTransactions.length}
- Ticket médio: ${formatCurrency(avgPerTx)}
- Maior gasto: ${biggestTx ? `${biggestTx.description} (${formatCurrency(biggestTx.amount)})` : "N/A"}
- Gastos por categoria: ${categoriesSorted}
- Forma de pagamento preferida: ${topPayment || "N/A"}

Responda com:
1. Uma análise honesta e personalizada do padrão de gastos (2-3 frases)
2. Dois ou três pontos de atenção ou sugestões práticas de economia
3. Um elogio ou alerta final dependendo da situação

Seja direto, use linguagem simples e amigável. Não use markdown, asteriscos ou formatação especial. Escreva em parágrafos corridos.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              setAiText((prev) => prev + parsed.delta.text);
            }
          } catch {}
        }
      }
      setGeneratedAt(new Date());
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Erro ao gerar análise:", err);
      setAiError(
        "Não foi possível gerar a análise. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setIsGenerating(false);
    }
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

          {/* BOTÃO RELATÓRIO */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/report")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-viggaGold/15 bg-black/20 py-3 text-sm font-medium text-viggaGold"
          >
            <FileBarChart size={15} />
            Ver relatório de {mesAtual}
          </motion.button>
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
                        {
                          day: "2-digit",
                          month: "long",
                        },
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

      {/* IA DA VIGGA — card clicável */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAiModal(true)}
          className="w-full text-left"
        >
          <Card className="relative overflow-hidden p-5">
            <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-viggaGold/10">
                  <Sparkles size={16} className="text-viggaGold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-viggaText">
                    IA da Vigga
                  </p>
                  <p className="text-xs text-viggaMuted">
                    {generatedAt
                      ? `Última análise às ${generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                      : "Toque para analisar seus gastos"}
                  </p>
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-viggaGold/10 bg-black/20">
                <ArrowRight size={14} className="text-viggaGold" />
              </div>
            </div>
            {aiText && (
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-viggaMuted">
                {aiText}
              </p>
            )}
          </Card>
        </motion.button>
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

      {/* MODAL IA DA VIGGA */}
      <AnimatePresence>
        {showAiModal && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAiModal(false)}
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
                {/* Cabeçalho */}
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-viggaGold/10">
                      <Sparkles size={18} className="text-viggaGold" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-viggaText">
                        IA da Vigga
                      </h2>
                      {generatedAt && !isGenerating && (
                        <p className="text-[10px] text-viggaMuted">
                          Gerado às{" "}
                          {generatedAt.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="mb-5">
                  {!aiText && !isGenerating && !aiError && (
                    <div className="rounded-2xl bg-black/20 px-4 py-8 text-center">
                      <Sparkles
                        size={28}
                        className="mx-auto mb-3 text-viggaGold opacity-40"
                      />
                      <p className="text-sm text-viggaMuted">
                        {currentMonthTransactions.length === 0
                          ? "Lance algumas transações para gerar uma análise."
                          : 'Toque em "Analisar" para receber uma análise personalizada dos seus gastos.'}
                      </p>
                    </div>
                  )}

                  {isGenerating && aiText === "" && (
                    <div className="rounded-2xl bg-black/20 px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-2 w-2 rounded-full bg-viggaGold"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-viggaMuted">
                        Analisando seus dados...
                      </p>
                    </div>
                  )}

                  {aiError && (
                    <div className="rounded-2xl bg-red-400/10 px-4 py-4">
                      <p className="text-sm text-red-400">{aiError}</p>
                    </div>
                  )}

                  {aiText && (
                    <div className="rounded-2xl bg-black/20 px-4 py-4">
                      <p className="text-[15px] leading-7 text-viggaText whitespace-pre-wrap">
                        {aiText}
                        {isGenerating && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="ml-0.5 inline-block h-4 w-0.5 bg-viggaGold align-middle"
                          />
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Botão analisar / regerar */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={
                    isGenerating || currentMonthTransactions.length === 0
                  }
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium disabled:opacity-40 ${
                    aiText
                      ? "border border-viggaGold/20 bg-black/20 text-viggaGold"
                      : "bg-viggaGold text-black"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />{" "}
                      Analisando...
                    </>
                  ) : aiText ? (
                    <>
                      <RefreshCw size={14} /> Regerar análise
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Analisar com IA
                    </>
                  )}
                </motion.button>
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
