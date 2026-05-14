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
  RefreshCw,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ui } from "../styles/ui";
import BottomNav from "../components/BottomNav";
import FilterBar from "../components/FilterBar";
import { applyTransactionFilters } from "../utils/filterUtils";
import { useAuth } from "../contexts/AuthContext";

const BASE_CATEGORIES = [
  "Assinaturas",
  "Atividade Física",
  "Casa",
  "Combustível",
  "Contas",
  "Cursos",
  "Delivery",
  "Escola",
  "Farmácia",
  "Geral",
  "Lazer",
  "Mercado",
  "Pets",
  "Saúde",
  "Viagens",
  "Outros",
];

const PAYMENT_METHODS = ["Pix", "Crédito", "Dinheiro", "Não identificado"];

const CUSTOM_CATEGORIES_KEY = "vigga_custom_categories";

function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomCategories(cats) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
  } catch {}
}

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  payment: "",
  period: "this_month",
  status: "",
};

const INITIAL_TX_COUNT = 5;

const Launch = () => {
  const { householdId } = useAuth();
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);

  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editDate, setEditDate] = useState("");

  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [pendingLaunch, setPendingLaunch] = useState(null);
  const [recurrencePayment, setRecurrencePayment] = useState("Pix");
  const [isSavingRecurrence, setIsSavingRecurrence] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Categorias personalizadas (salvas no localStorage)
  const [customCategories, setCustomCategories] =
    useState(loadCustomCategories);

  // Controle do campo "Outros" personalizado — no modal de edição
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editIsCustom, setEditIsCustom] = useState(false);

  // Todas as categorias = base + personalizadas (sem duplicar "Outros" no meio)
  const allCategories = useMemo(() => {
    const base = BASE_CATEGORIES.filter((c) => c !== "Outros");
    const customs = customCategories.filter((c) => !base.includes(c));
    return [...base, ...customs, "Outros"];
  }, [customCategories]);

  function addCustomCategory(name) {
    const trimmed = name.trim();
    if (!trimmed || allCategories.includes(trimmed)) return trimmed;
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    saveCustomCategories(updated);
    return trimmed;
  }

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

      if (hasActiveFilters) {
        query.limit(200);
      } else {
        query.limit(50);
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
  }, [hasActiveFilters]);

  // Quando abre edição, detecta se a categoria atual é personalizada
  useEffect(() => {
    if (!isEditing) return;
    if (BASE_CATEGORIES.includes(editCategory)) {
      setEditIsCustom(false);
      setEditCustomCategory("");
    } else {
      // categoria personalizada já salva
      setEditIsCustom(true);
      setEditCustomCategory(editCategory);
    }
  }, [isEditing]);

  const filteredTransactions = useMemo(() => {
    if (!hasActiveFilters) return transactions;
    return applyTransactionFilters(transactions, filters);
  }, [transactions, filters, hasActiveFilters]);

  const visibleTransactions = useMemo(() => {
    if (hasActiveFilters || showAllTransactions) return filteredTransactions;
    return filteredTransactions.slice(0, INITIAL_TX_COUNT);
  }, [filteredTransactions, showAllTransactions, hasActiveFilters]);

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

  function openTransactionDetails(transaction) {
    setSelectedTransaction(transaction);
    setIsEditing(false);
    setEditDescription(transaction.description || "");
    setEditAmount(String(transaction.amount || "").replace(".", ","));
    setEditCategory(transaction.category || "Geral");
    setEditPaymentMethod(transaction.payment_method || "Não identificado");
    setEditDate(transaction.transaction_date || "");
    setEditIsCustom(false);
    setEditCustomCategory("");
  }

  function closeTransactionDetails() {
    setSelectedTransaction(null);
    setIsEditing(false);
    setEditIsCustom(false);
    setEditCustomCategory("");
  }

  function parseLaunchText(text) {
    const normalizedText = text.toLowerCase().trim();

    const amountMatch = normalizedText.match(
      /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+/,
    );
    const amount = amountMatch
      ? parseFloat(amountMatch[0].replace(",", "."))
      : 0;

    let category = "Geral";
    if (/mercado|supermercado|condor/i.test(normalizedText))
      category = "Mercado";
    if (/ifood|rappi|delivery|lanche|hamburguer|pizza/i.test(normalizedText))
      category = "Delivery";
    if (/combustível|combustivel|gasolina|posto|etanol/i.test(normalizedText))
      category = "Combustível";
    if (
      /farmacia|farmácia|remedio|remédio|medicamento|drogaria/i.test(
        normalizedText,
      )
    )
      category = "Farmácia";
    if (/netflix|spotify|disney|prime|youtube|assinatura/i.test(normalizedText))
      category = "Assinaturas";
    if (/mensalidade|escola|faculdade|colegio|colégio/i.test(normalizedText))
      category = "Escola";
    if (/curso|workshop|treinamento/i.test(normalizedText)) category = "Cursos";
    if (
      /academia|ginástica|ginastica|natação|natacao|crossfit|atividade/i.test(
        normalizedText,
      )
    )
      category = "Atividade Física";
    if (
      /unimed|plano de saúde|plano saude|convenio|convênio|medico|médico|psicologo|psicóloga|psicopedagoga|terapeuta/i.test(
        normalizedText,
      )
    )
      category = "Saúde";
    if (
      /luz|água|agua|internet|telefone|celular|conta de/i.test(normalizedText)
    )
      category = "Contas";
    if (
      /aluguel|condominio|condomínio|reforma|casa|merceria/i.test(
        normalizedText,
      )
    )
      category = "Casa";
    if (/cinema|teatro|show|ingresso|lazer|parque/i.test(normalizedText))
      category = "Lazer";
    if (/pet|petshop|ração|racao|veterinario|veterinário/i.test(normalizedText))
      category = "Pets";
    if (/viagem|hotel|passagem|airbnb|hostel/i.test(normalizedText))
      category = "Viagens";

    let paymentMethod = "Não identificado";
    if (/pix/i.test(normalizedText)) paymentMethod = "Pix";
    if (/cartão|cartao|credito|crédito/i.test(normalizedText))
      paymentMethod = "Crédito";
    if (/dinheiro/i.test(normalizedText)) paymentMethod = "Dinheiro";

    let transactionDate = new Date();
    let detectedDate = null;

    if (/ontem/i.test(normalizedText)) {
      transactionDate.setDate(transactionDate.getDate() - 1);
    }

    const dateMatch = normalizedText.match(
      /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
    );
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = dateMatch[3]
        ? dateMatch[3].length === 2
          ? 2000 + parseInt(dateMatch[3])
          : parseInt(dateMatch[3])
        : new Date().getFullYear();
      transactionDate = new Date(year, month, day);
      detectedDate = true;
    }

    const formattedDate = transactionDate.toISOString().split("T")[0];

    let cleanDescription = normalizedText;
    cleanDescription = cleanDescription.replace(
      /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+/g,
      "",
    );
    cleanDescription = cleanDescription.replace(
      /\bpix\b|\bcartão\b|\bcartao\b|\bcredito\b|\bcrédito\b|\bdinheiro\b/g,
      "",
    );
    cleanDescription = cleanDescription.replace(/\bontem\b|\bhoje\b/g, "");
    cleanDescription = cleanDescription.replace(
      /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g,
      "",
    );
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
      detectedDate,
    };
  }

  async function handleRegister() {
    if (!input.trim() || isAnalyzing) return;
    try {
      setIsAnalyzing(true);
      const parsed = parseLaunchText(input);
      if (parsed.detectedDate) {
        setPendingLaunch(parsed);
        setRecurrencePayment(
          parsed.payment_method !== "Não identificado"
            ? parsed.payment_method
            : "Pix",
        );
        setShowRecurrenceModal(true);
        setIsAnalyzing(false);
        return;
      }
      await saveLaunch(parsed);
    } catch (err) {
      console.error("Erro inesperado ao registrar lançamento:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveLaunch(parsed) {
    const { detectedDate, ...launchData } = parsed;
    const { data, error } = await supabase
      .from("transactions")
      .insert([{ ...launchData, household_id: householdId }])
      .select();

    if (error) {
      console.error("Erro ao salvar lançamento:", error);
      return;
    }

    setLastSaved(data?.[0] || launchData);
    setInput("");
    setShowAllTransactions(false);
    await fetchTransactions();
    setTimeout(() => setLastSaved(null), 3000);
  }

  async function handleSaveWithoutRecurrence() {
    if (!pendingLaunch) return;
    try {
      setIsSavingRecurrence(true);
      await saveLaunch(pendingLaunch);
      setShowRecurrenceModal(false);
      setPendingLaunch(null);
    } finally {
      setIsSavingRecurrence(false);
    }
  }

  async function handleSaveWithRecurrence() {
    if (!pendingLaunch) return;
    try {
      setIsSavingRecurrence(true);
      const launchWithPayment = {
        ...pendingLaunch,
        payment_method: recurrencePayment,
      };
      await saveLaunch(launchWithPayment);
      const { error: billError } = await supabase.from("bills").insert([
        {
          name: pendingLaunch.description,
          amount: pendingLaunch.amount,
          due_date: pendingLaunch.transaction_date,
          status: "paid",
          recurrence: "monthly",
          payment_method: recurrencePayment,
          household_id: householdId,
        },
      ]);
      if (billError) console.error("Erro ao salvar vencimento:", billError);
      setShowRecurrenceModal(false);
      setPendingLaunch(null);
    } catch (err) {
      console.error("Erro ao salvar com recorrência:", err);
    } finally {
      setIsSavingRecurrence(false);
    }
  }

  // Resolve a categoria final ao salvar edição
  function resolveEditCategory() {
    if (
      editCategory === "Outros" &&
      editIsCustom &&
      editCustomCategory.trim()
    ) {
      return addCustomCategory(editCustomCategory.trim());
    }
    return editCategory;
  }

  async function handleSaveEdit() {
    if (!selectedTransaction || !editDescription.trim() || !editAmount.trim())
      return;
    try {
      setIsSavingEdit(true);
      const parsedAmount = Number(
        editAmount.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      const finalCategory = resolveEditCategory();

      const { data, error } = await supabase
        .from("transactions")
        .update({
          description: editDescription,
          amount: parsedAmount,
          category: finalCategory,
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

  async function handleDeleteTransaction() {
    if (!selectedTransaction) return;
    try {
      setIsDeletingTransaction(true);
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", selectedTransaction.id);
      if (error) {
        console.error("Erro ao excluir lançamento:", error);
        return;
      }
      closeTransactionDetails();
      await fetchTransactions();
    } catch (err) {
      console.error("Erro inesperado ao excluir:", err);
    } finally {
      setIsDeletingTransaction(false);
    }
  }

  return (
    <div className={`${ui.screen} pb-32`}>
      <header className="mb-8 pt-4">
        <span className={ui.eyebrow}>Entrada de dados</span>
        <h1 className={ui.title}>O que você gastou?</h1>
      </header>

      <div className="space-y-6">
        {/* CARD DE INPUT */}
        <div className={`${ui.card} border-viggaGold/10 p-5`}>
          <textarea
            className="w-full resize-none border-none bg-transparent p-0 text-lg text-viggaText placeholder:text-viggaMuted focus:ring-0"
            placeholder="Ex: mercado 120,00 no pix... ou netflix 55 crédito 15/05"
            rows="3"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Mercado",
              "Delivery",
              "Combustível",
              "Farmácia",
              "Pix",
              "Crédito",
              "Dinheiro",
            ].map((chip) => (
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

        {/* FEEDBACK DE SUCESSO */}
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

        {/* HISTÓRICO + FILTROS */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-viggaMuted">
              <History size={14} />
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">
                {hasActiveFilters ? "Resultados" : "Últimos lançamentos"}
              </h2>
            </div>
            {hasActiveFilters && filteredTransactions.length > 0 && (
              <span className="text-xs font-semibold text-viggaGold">
                {filteredTransactions
                  .reduce((sum, t) => sum + Number(t.amount || 0), 0)
                  .toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
              </span>
            )}
          </div>

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
              <>
                {visibleTransactions.map((transaction) => (
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
                        {transaction.payment_method || "Não identificado"} •{" "}
                        {transaction.transaction_date
                          ? new Date(
                              `${transaction.transaction_date}T00:00:00`,
                            ).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold leading-none text-viggaGold">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </motion.button>
                ))}

                {!hasActiveFilters &&
                  filteredTransactions.length > INITIAL_TX_COUNT && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowAllTransactions((v) => !v)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 py-3 text-sm font-medium text-viggaGold"
                    >
                      {showAllTransactions
                        ? "Ver menos"
                        : `Ver mais ${filteredTransactions.length - INITIAL_TX_COUNT} lançamentos`}
                    </motion.button>
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE RECORRÊNCIA */}
      <AnimatePresence>
        {showRecurrenceModal && pendingLaunch && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-5 pb-28 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className={ui.eyebrow}>Lançamento com data</p>
                  <h2 className="mt-1 text-xl font-semibold text-viggaText">
                    {pendingLaunch.description}
                  </h2>
                  <p className="mt-1 text-sm text-viggaGold">
                    {formatCurrency(pendingLaunch.amount)} ·{" "}
                    {formatDate(pendingLaunch.transaction_date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecurrenceModal(false);
                    setPendingLaunch(null);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-viggaMuted">
                  Forma de pagamento
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Pix", "Crédito", "Dinheiro"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setRecurrencePayment(method)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        recurrencePayment === method
                          ? "bg-viggaGold text-black"
                          : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mb-3 text-sm text-viggaMuted">
                Este lançamento se repete todo mês?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSaveWithoutRecurrence}
                  disabled={isSavingRecurrence}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-viggaGold/10 bg-viggaBrown px-4 py-3 text-sm font-medium text-viggaGold disabled:opacity-60"
                >
                  {isSavingRecurrence ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  Não, só dessa vez
                </button>
                <button
                  type="button"
                  onClick={handleSaveWithRecurrence}
                  disabled={isSavingRecurrence}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-viggaGold px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
                >
                  {isSavingRecurrence ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  Sim, é recorrente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE DETALHES / EDIÇÃO */}
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
                {/* Descrição */}
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
                  {/* Categoria */}
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                      Categoria
                    </p>
                    {isEditing ? (
                      <div className="mt-2">
                        <select
                          value={editIsCustom ? "Outros" : editCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Outros") {
                              setEditIsCustom(true);
                              setEditCategory("Outros");
                              setEditCustomCategory("");
                            } else {
                              setEditIsCustom(false);
                              setEditCategory(val);
                              setEditCustomCategory("");
                            }
                          }}
                          className="w-full bg-transparent text-sm text-viggaText outline-none"
                          style={{ color: "var(--color-viggaText, #e8e0cc)" }}
                        >
                          {allCategories.map((cat) => (
                            <option
                              key={cat}
                              value={cat}
                              style={{
                                backgroundColor: "#1a1a2e",
                                color: "#e8e0cc",
                              }}
                            >
                              {cat}
                            </option>
                          ))}
                        </select>
                        {/* Campo livre quando "Outros" selecionado */}
                        <AnimatePresence>
                          {editIsCustom && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 overflow-hidden"
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editCustomCategory}
                                  onChange={(e) =>
                                    setEditCustomCategory(e.target.value)
                                  }
                                  placeholder="Nome da categoria..."
                                  className="flex-1 bg-transparent text-xs text-viggaText outline-none placeholder:text-viggaMuted/60"
                                  autoFocus
                                />
                                <Plus
                                  size={12}
                                  className="text-viggaGold shrink-0"
                                />
                              </div>
                              <div className="mt-1 h-px bg-viggaGold/20" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-viggaText">
                        {selectedTransaction.category || "Geral"}
                      </p>
                    )}
                  </div>

                  {/* Forma de pagamento */}
                  <div className="rounded-2xl bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-viggaMuted">
                      Forma
                    </p>
                    {isEditing ? (
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                        className="mt-2 w-full bg-transparent text-sm text-viggaText outline-none"
                        style={{ color: "var(--color-viggaText, #e8e0cc)" }}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option
                            key={m}
                            value={m}
                            style={{
                              backgroundColor: "#1a1a2e",
                              color: "#e8e0cc",
                            }}
                          >
                            {m}
                          </option>
                        ))}
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
                  {/* Valor */}
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

                  {/* Data */}
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
                          <Loader2 size={16} className="animate-spin" />{" "}
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Salvar
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
                      onClick={handleDeleteTransaction}
                      disabled={isDeletingTransaction}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 disabled:opacity-60"
                    >
                      {isDeletingTransaction ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      {isDeletingTransaction ? "Excluindo..." : "Excluir"}
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
