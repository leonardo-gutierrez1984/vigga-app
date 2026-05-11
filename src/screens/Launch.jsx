import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Mic, Send, CheckCircle2, Loader2, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ui } from "../styles/ui";
import BottomNav from "../components/BottomNav";

const Launch = () => {
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  async function fetchTransactions() {
    try {
      setLoadingTransactions(true);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Erro ao buscar lançamentos:", error);
        return;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error("Erro inesperado ao buscar lançamentos:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  function parseLaunchText(text) {
    const amountMatch = text.match(/\d+([,.]\d{1,2})?/);

    const amount = amountMatch
      ? parseFloat(amountMatch[0].replace(",", "."))
      : 0;

    let category = "Geral";

    if (/mercado|supermercado|condor/i.test(text)) {
      category = "Mercado";
    }

    if (/ifood|delivery|lanche/i.test(text)) {
      category = "Delivery";
    }

    if (/combustível|combustivel|gasolina|posto/i.test(text)) {
      category = "Combustível";
    }
    if (/farmacia|farmácia|remedio|remédio|medicamento/i.test(text)) {
      category = "Farmácia";
    }
    if (
      /netflix|spotify|assinatura|mensalidade|plano|academia|internet|telefone|celular/i.test(
        text,
      )
    ) {
      category = "Recorrente";
    }

    let paymentMethod = "Não identificado";

    if (/pix/i.test(text)) {
      paymentMethod = "Pix";
    }

    if (/cartão|cartao|credito|crédito/i.test(text)) {
      paymentMethod = "Crédito";
    }

    if (/dinheiro/i.test(text)) {
      paymentMethod = "Dinheiro";
    }

    return {
      description: text,
      amount,
      category,
      payment_method: paymentMethod,
      type: "expense",
      transaction_date: new Date().toISOString().split("T")[0],
      source: "manual",
      notes: null,
    };
  }

  async function handleRegister() {
    if (!input.trim() || isAnalyzing) return;

    try {
      setIsAnalyzing(true);

      const parsedLaunch = parseLaunchText(input);

      const { data, error } = await supabase
        .from("transactions")
        .insert([parsedLaunch])
        .select();

      if (error) {
        console.error("Erro ao salvar lançamento:", error);
        return;
      }

      setLastSaved(data?.[0] || parsedLaunch);
      setInput("");

      await fetchTransactions();

      setTimeout(() => {
        setLastSaved(null);
      }, 3000);
    } catch (err) {
      console.error("Erro inesperado ao registrar lançamento:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className={`${ui.screen} pb-32`}>
      <header className="mb-8 pt-4">
        <span className={ui.eyebrow}>Entrada de dados</span>
        <h1 className={ui.title}>O que você gastou?</h1>
      </header>

      <div className="space-y-6">
        <div className={`${ui.card} border-viggaGold/10 p-5`}>
          <textarea
            className="w-full resize-none border-none bg-transparent p-0 text-lg text-viggaText placeholder:text-viggaMuted focus:ring-0"
            placeholder="Ex: mercado 120,00 no pix..."
            rows="3"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {["Mercado", "Cartão", "Combustível", "Pix"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() =>
                  setInput((current) =>
                    current.trim() ? `${current} ${chip}` : chip,
                  )
                }
                className="rounded-full border border-viggaGold/10 bg-viggaBrown px-3 py-2 text-xs font-medium text-viggaMuted"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-viggaGold/5 pt-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              className="relative rounded-full bg-viggaBrown p-3 text-viggaGold"
            >
              <span className="absolute inset-0 rounded-full bg-viggaGold/10 animate-ping" />
              <Mic size={20} className="relative z-10" />
            </motion.button>

            <button
              type="button"
              onClick={handleRegister}
              disabled={isAnalyzing || !input.trim()}
              className={`${ui.primaryButton} flex items-center gap-2 px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isAnalyzing ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}

              <span className="font-medium">
                {isAnalyzing ? "Analisando..." : "Registrar"}
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {lastSaved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-viggaGreen/20 bg-viggaGreen/10 p-4 text-sm text-viggaGreen"
            >
              <CheckCircle2 size={18} />
              <span>Lançamento registrado com sucesso!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2 px-1 text-viggaMuted">
            <History size={14} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Últimos lançamentos
            </h2>
          </div>

          <div className="space-y-3">
            {loadingTransactions ? (
              <div className={`${ui.card} p-5 text-sm text-viggaMuted`}>
                Carregando lançamentos...
              </div>
            ) : transactions.length === 0 ? (
              <div className={`${ui.card} p-5 text-sm text-viggaMuted`}>
                Nenhum lançamento encontrado ainda.
              </div>
            ) : (
              transactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${ui.card} flex items-center justify-between border-none bg-viggaCard/50 px-5 py-4`}
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-semibold tracking-tight text-viggaText">
                      {transaction.description}
                    </p>

                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-viggaMuted">
                      {transaction.category || "Geral"} •{" "}
                      {transaction.payment_method || "Não identificado"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold leading-none text-viggaGold">
                      {Number(transaction.amount || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Launch;
