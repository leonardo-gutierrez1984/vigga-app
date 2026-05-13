import { useEffect, useMemo, useState, useRef } from "react";
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Estados da IA
  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const abortRef = useRef(null);

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
        console.error("Erro:", error);
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

  const monthVariation = useMemo(() => {
    if (totalLastMonth === 0) return null;
    return Math.round(
      ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100,
    );
  }, [totalCurrentMonth, totalLastMonth]);

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

  const avgPerTransaction = useMemo(() => {
    if (currentMonthTx.length === 0) return 0;
    return totalCurrentMonth / currentMonthTx.length;
  }, [totalCurrentMonth, currentMonthTx]);

  const biggestTransaction = useMemo(() => {
    if (currentMonthTx.length === 0) return null;
    return currentMonthTx.reduce((max, t) =>
      Number(t.amount || 0) > Number(max.amount || 0) ? t : max,
    );
  }, [currentMonthTx]);

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
  // GERAR ANÁLISE COM IA
  // ─────────────────────────────────────────────
  async function handleGenerateAI() {
    if (currentMonthTx.length === 0) return;

    // Cancela geração anterior se existir
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsGenerating(true);
    setAiText("");
    setAiError(null);

    // Monta resumo financeiro para mandar para a IA
    const categoryMap = {};
    currentMonthTx.forEach((t) => {
      const cat = t.category || "Geral";
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
    });
    const categoriesSorted = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => `${cat}: ${formatCurrency(val)}`)
      .join(", ");

    const prompt = `Você é um consultor financeiro pessoal simpático e direto. Analise os dados financeiros abaixo e responda em português brasileiro.

DADOS DO MÊS ATUAL:
- Total gasto: ${formatCurrency(totalCurrentMonth)}
- Número de lançamentos: ${currentMonthTx.length}
- Ticket médio: ${formatCurrency(avgPerTransaction)}
- Maior gasto: ${biggestTransaction ? `${biggestTransaction.description} (${formatCurrency(biggestTransaction.amount)})` : "N/A"}
- Gastos por categoria: ${categoriesSorted}
- Forma de pagamento preferida: ${topPaymentMethod ? topPaymentMethod.name : "N/A"}
- Dia da semana com mais gastos: ${topDayOfWeek || "N/A"}
${monthVariation !== null ? `- Variação em relação ao mês passado: ${monthVariation > 0 ? "+" : ""}${monthVariation}% (mês passado: ${formatCurrency(totalLastMonth)})` : ""}

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

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      // Lê o streaming linha por linha
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
          } catch {
            // ignora linhas inválidas
          }
        }
      }

      setGeneratedAt(new Date());
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Erro ao gerar análise:", err);
      setAiError(
        "Não foi possível gerar a análise. Verifique sua chave de API e tente novamente.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

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

      {/* ANÁLISE COM IA */}
      <section className="mt-8">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute right-[-40px] top-[-40px] h-28 w-28 rounded-full bg-viggaGold/5 blur-3xl" />

          {/* Cabeçalho da seção IA */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-viggaGold/10">
                <Sparkles size={15} className="text-viggaGold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-viggaText">
                  Análise com IA
                </p>
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

            {/* Botão gerar / regerar */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handleGenerateAI}
              disabled={isGenerating || currentMonthTx.length === 0}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                aiText
                  ? "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  : "bg-viggaGold text-black"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Analisando...
                </>
              ) : aiText ? (
                <>
                  <RefreshCw size={12} />
                  Regerar
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Analisar com IA
                </>
              )}
            </motion.button>
          </div>

          {/* Conteúdo da análise */}
          <AnimatePresence mode="wait">
            {!aiText && !isGenerating && !aiError && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl bg-black/20 px-4 py-6 text-center"
              >
                <Sparkles
                  size={28}
                  className="mx-auto mb-2 text-viggaGold opacity-40"
                />
                <p className="text-sm text-viggaMuted">
                  {currentMonthTx.length === 0
                    ? "Lance algumas transações para gerar uma análise."
                    : 'Toque em "Analisar com IA" para receber uma análise personalizada dos seus gastos.'}
                </p>
              </motion.div>
            )}

            {isGenerating && aiText === "" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl bg-black/20 px-4 py-6 text-center"
              >
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
              </motion.div>
            )}

            {aiError && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl bg-red-400/10 px-4 py-4"
              >
                <p className="text-sm text-red-400">{aiError}</p>
              </motion.div>
            )}

            {aiText && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </section>

      {/* ANÁLISE DETALHADA */}
      <section className="mt-8">
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
