import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Mic,
  Send,
  CheckCircle2,
  Loader2,
  History,
  X,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ui } from "../styles/ui";
import BottomNav from "../components/BottomNav";
import FilterBar from "../components/FilterBar";
import { applyTransactionFilters } from "../utils/filterUtils";
import { useAuth } from "../contexts/AuthContext";

// ─────────────────────────────────────────────
// ESTADO INICIAL DOS FILTROS
// ─────────────────────────────────────────────
const DEFAULT_FILTERS = {
  search: "",
  category: "",
  payment: "",
  period: "this_month",
  status: "",
};

const Launch = () => {
  const { householdId } = useAuth();
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editDate, setEditDate] = useState("");

  // ── FILTROS ──────────────────────────────────
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // ─────────────────────────────────────────────
  // BUSCA NO SUPABASE
  // ─────────────────────────────────────────────
  // Quando há filtros ativos, buscamos mais registros para filtrar localmente.
  // Quando não há filtros, mostramos os 5 mais recentes (comportamento original).
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() ||
      filters.category ||
      filters.payment ||
      (filters.period && filters.period !== "this_month")
    );
  }, [filters]);

  async function fetchTransactions() {
    try {
      setLoadingTransactions(true);

      const query = supabase
        .from("transactions")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      // Com filtros ativos: busca mais registros para filtrar localmente
      // Sem filtros: comportamento original (últimos 5)
      if (hasActiveFilters) {
        query.limit(200);
      } else {
        query.limit(5);
      }

      const { data, error } = await query;

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
  }, [hasActiveFilters]); // re-busca quando muda entre "com filtros" e "sem filtros"

  // ─────────────────────────────────────────────
  // FILTRAGEM LOCAL
  // ─────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    if (!hasActiveFilters) return transactions; // sem filtros = exibe direto
    return applyTransactionFilters(transactions, filters);
  }, [transactions, filters, hasActiveFilters]);

  // ─────────────────────────────────────────────
  // FORMATADORES
  // ─────────────────────────────────────────────
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date) {
    if (!date) return "Sem data";
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // ─────────────────────────────────────────────
  // MODAL
  // ─────────────────────────────────────────────
  function openTransactionDetails(transaction) {
    setSelectedTransaction(transaction);
    setIsEditing(false);
    setEditDescription(transaction.description || "");
    setEditAmount(String(transaction.amount || "").replace(".", ","));
    setEditCategory(transaction.category || "Geral");
    setEditPaymentMethod(transaction.payment_method || "Não identificado");
    setEditDate(transaction.transaction_date || "");
  }

  function closeTransactionDetails() {
    setSelectedTransaction(null);
    setIsEditing(false);
  }

  // ─────────────────────────────────────────────
  // PARSE DE TEXTO
  // ─────────────────────────────────────────────
  function parseLaunchText(text) {
    const normalizedText = text.toLowerCase().trim();

    const amountMatch = normalizedText.match(/\d+([,.]\d{1,2})?/);
    const amount = amountMatch
      ? parseFloat(amountMatch[0].replace(",", "."))
      : 0;

    let category = "Geral";
    if (/mercado|supermercado|condor/i.test(normalizedText))
      category = "Mercado";
    if (/ifood|delivery|lanche/i.test(normalizedText)) category = "Delivery";
    if (/combustível|combustivel|gasolina|posto/i.test(normalizedText))
      category = "Combustível";
    if (/farmacia|farmácia|remedio|remédio|medicamento/i.test(normalizedText))
      category = "Farmácia";
    if (
      /netflix|spotify|assinatura|mensalidade|plano|academia|internet|telefone|celular/i.test(
        normalizedText,
      )
    )
      category = "Recorrente";

    let paymentMethod = "Não identificado";
    if (/pix/i.test(normalizedText)) paymentMethod = "Pix";
    if (/cartão|cartao|credito|crédito/i.test(normalizedText))
      paymentMethod = "Crédito";
    if (/dinheiro/i.test(normalizedText)) paymentMethod = "Dinheiro";

    let transactionDate = new Date();
    if (/ontem/i.test(normalizedText))
      transactionDate.setDate(transactionDate.getDate() - 1);
    const formattedDate = transactionDate.toISOString().split("T")[0];

    let cleanDescription = normalizedText;
    cleanDescription = cleanDescription.replace(/\d+([,.]\d{1,2})?/g, "");
    cleanDescription = cleanDescription.replace(
      /\bpix\b|\bcartão\b|\bcartao\b|\bcredito\b|\bcrédito\b|\bdinheiro\b/g,
      "",
    );
    cleanDescription = cleanDescription.replace(/\bontem\b|\bhoje\b/g, "");
    cleanDescription = cleanDescription.replace(/\s+/g, " ").trim();
    cleanDescription =
      cleanDescription.charAt(0).toUpperCase() + cleanDescription.slice(1);

    return {
      description: cleanDescription || "Lançamento",
      amount,
      category,
      payment_method: paymentMethod,
      type: "expense",
      transaction_date: formattedDate,
      source: "manual",
      notes: null,
    };
  }

  // ─────────────────────────────────────────────
  // REGISTRAR
  // ─────────────────────────────────────────────
  async function handleRegister() {
    if (!input.trim() || isAnalyzing) return;
    try {
      setIsAnalyzing(true);
      const parsedLaunch = {
        ...parseLaunchText(input),
        household_id: householdId,
      };
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
      setTimeout(() => setLastSaved(null), 3000);
    } catch (err) {
      console.error("Erro inesperado ao registrar lançamento:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ─────────────────────────────────────────────
  // SALVAR EDIÇÃO
  // ─────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!selectedTransaction) return;
    if (!editDescription.trim()) return;
    if (!editAmount.trim()) return;

    try {
      setIsSavingEdit(true);
      const parsedAmount = Number(
        editAmount.replace(",", ".").replace(/[^\d.]/g, ""),
      );

      const { data, error } = await supabase
        .from("transactions")
        .update({
          description: editDescription,
          amount: parsedAmount,
          category: editCategory,
          payment_method: editPaymentMethod,
          transaction_date: editDate,
        })
        .eq("id", selectedTransaction.id)
        .select();

      if (error) {
        console.error("Erro ao editar lançamento:", error);
        return;
      }

      const updatedTransaction = data?.[0];
      if (updatedTransaction) setSelectedTransaction(updatedTransaction);

      setIsEditing(false);
      await fetchTransactions();
    } catch (err) {
      console.error("Erro inesperado ao editar lançamento:", err);
    } finally {
      setIsSavingEdit(false);
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className={`${ui.screen} pb-32`}>
      <header className="mb-8 pt-4">
        <span className={ui.eyebrow}>Entrada de dados</span>
        <h1 className={ui.title}>O que você gastou?</h1>
      </header>

      <div className="space-y-6">
        {/* ── CARD DE INPUT ──────────────────────── */}
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

        {/* ── FEEDBACK DE SUCESSO ─────────────────── */}
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

        {/* ── HISTÓRICO + FILTROS ─────────────────── */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2 px-1 text-viggaMuted">
            <History size={14} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">
              {hasActiveFilters ? "Resultados" : "Últimos lançamentos"}
            </h2>
          </div>

          {/* FilterBar */}
          <div className="mb-4">
            <FilterBar
              context="launch"
              filters={filters}
              onChange={setFilters}
              resultsCount={
                hasActiveFilters ? filteredTransactions.length : undefined
              }
            />
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {loadingTransactions ? (
              <div className={`${ui.card} p-5 text-sm text-viggaMuted`}>
                Carregando lançamentos...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${ui.card} p-5 text-center`}
              >
                <p className="text-sm text-viggaMuted">
                  {hasActiveFilters
                    ? "Nenhum lançamento encontrado para este filtro."
                    : "Nenhum lançamento encontrado ainda."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="mt-2 text-xs font-medium text-viggaGold underline underline-offset-2"
                  >
                    Limpar filtros
                  </button>
                )}
              </motion.div>
            ) : (
              filteredTransactions.map((transaction) => (
                <motion.button
                  key={transaction.id}
                  type="button"
                  onClick={() => openTransactionDetails(transaction)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${ui.card} flex w-full items-center justify-between border-none bg-viggaCard/50 px-5 py-4 text-left`}
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
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL DE DETALHES ───────────────────── */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-5 pb-28 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTransactionDetails}
          >
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className={ui.eyebrow}>
                    {isEditing ? "Editar lançamento" : "Detalhes do lançamento"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-viggaText">
                    {formatCurrency(
                      isEditing
                        ? editAmount.replace(",", ".").replace(/[^\d.]/g, "")
                        : selectedTransaction.amount,
                    )}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeTransactionDetails}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                    Descrição
                  </p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="mt-2 w-full bg-transparent text-sm text-viggaText outline-none"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-viggaText">
                      {selectedTransaction.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                      Categoria
                    </p>
                    {isEditing ? (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="mt-2 w-full bg-transparent text-sm text-viggaText outline-none"
                      >
                        <option value="Geral">Geral</option>
                        <option value="Mercado">Mercado</option>
                        <option value="Delivery">Delivery</option>
                        <option value="Combustível">Combustível</option>
                        <option value="Farmácia">Farmácia</option>
                        <option value="Recorrente">Recorrente</option>
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-viggaText">
                        {selectedTransaction.category || "Geral"}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                      Forma
                    </p>
                    {isEditing ? (
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                        className="mt-2 w-full bg-transparent text-sm text-viggaText outline-none"
                      >
                        <option value="Não identificado">
                          Não identificado
                        </option>
                        <option value="Pix">Pix</option>
                        <option value="Crédito">Crédito</option>
                        <option value="Dinheiro">Dinheiro</option>
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-viggaText">
                        {selectedTransaction.payment_method ||
                          "Não identificado"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                      Valor
                    </p>
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="mt-2 w-full bg-transparent text-sm text-viggaText outline-none"
                      />
                    ) : (
                      <p className="mt-2 text-sm text-viggaText">
                        {formatCurrency(selectedTransaction.amount)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                      Data
                    </p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="mt-2 w-full bg-transparent text-sm text-viggaText outline-none"
                      />
                    ) : (
                      <p className="mt-2 text-sm text-viggaText">
                        {formatDate(selectedTransaction.transaction_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-viggaGold/10 bg-viggaBrown px-4 py-3 text-sm font-medium text-viggaGold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-viggaGold px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Salvar
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-viggaGold/10 bg-viggaBrown px-4 py-3 text-sm font-medium text-viggaGold"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Launch;
