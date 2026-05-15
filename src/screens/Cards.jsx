import { useEffect, useMemo, useState } from "react";
import { CreditCard, Pencil, X, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { ui } from "../styles/ui";
import FilterBar from "../components/FilterBar";
import { applyTransactionFilters } from "../utils/filterUtils";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  payment: "",
  period: "this_month",
  status: "",
};

const INITIAL_COUNT = 5;

// Gera próximas 4 datas semanais/quinzenais a partir de uma data
function generateNextRecurringDates(fromDate, recurrence) {
  const intervalDays = recurrence === "weekly" ? 7 : 15;
  const dates = [];
  let current = new Date(`${fromDate}T00:00:00`);
  for (let i = 0; i < 4; i++) {
    current = new Date(current);
    current.setDate(current.getDate() + intervalDays);
    dates.push(current.toISOString().split("T")[0]);
  }
  return dates;
}

function Cards() {
  const { householdId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [cardPayments, setCardPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [editName, setEditName] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editClosingDay, setEditClosingDay] = useState("");
  const [editDueDay, setEditDueDay] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [showPayInvoiceModal, setShowPayInvoiceModal] = useState(false);
  const [paymentType, setPaymentType] = useState("total");
  const [partialAmount, setPartialAmount] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [billsSettled, setBillsSettled] = useState(0); // quantos vencimentos foram quitados

  async function fetchCardData() {
    if (!householdId) return;
    try {
      setIsLoading(true);

      const now = new Date();
      const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [
        { data: transactionsData, error: transactionsError },
        { data: cardsData, error: cardsError },
        { data: paymentsData },
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("payment_method", "Crédito")
          .eq("household_id", householdId)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("credit_cards")
          .select("*")
          .eq("household_id", householdId)
          .limit(1)
          .single(),
        supabase
          .from("card_payments")
          .select("*")
          .eq("household_id", householdId)
          .eq("reference_month", referenceMonth),
      ]);

      if (transactionsError)
        console.error("Erro ao buscar lançamentos:", transactionsError);
      if (cardsError && cardsError.code !== "PGRST116")
        console.error("Erro ao buscar cartão:", cardsError);

      setTransactions(transactionsData || []);
      setCardData(cardsData || null);
      setCardPayments(paymentsData || []);

      if (cardsData) {
        setEditName(cardsData.name || "");
        setEditLimit(cardsData.limit_amount || "");
        setEditClosingDay(cardsData.closing_day || "");
        setEditDueDay(cardsData.due_day || "");
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCardData();
  }, [householdId]);

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
      month: "short",
    });
  }

  const currentMonthCreditTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(`${t.transaction_date}T00:00:00`);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
  }, [transactions]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() ||
      (filters.period && filters.period !== "this_month")
    );
  }, [filters]);

  const filteredTransactions = useMemo(() => {
    const base = hasActiveFilters
      ? transactions
      : currentMonthCreditTransactions;
    return applyTransactionFilters(base, filters);
  }, [transactions, currentMonthCreditTransactions, filters, hasActiveFilters]);

  const grossInvoice = useMemo(() => {
    return currentMonthCreditTransactions.reduce(
      (total, t) => total + Number(t.amount || 0),
      0,
    );
  }, [currentMonthCreditTransactions]);

  const totalPaid = useMemo(() => {
    return cardPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [cardPayments]);

  const currentInvoice = useMemo(() => {
    return Math.max(grossInvoice - totalPaid, 0);
  }, [grossInvoice, totalPaid]);

  const cardLimit = Number(cardData?.limit_amount || 0);
  const usedLimitPercentage =
    cardLimit > 0
      ? Math.min(Math.round((currentInvoice / cardLimit) * 100), 100)
      : 0;
  const availableLimit = cardLimit - currentInvoice;

  // ── QUITAR VENCIMENTOS DE CRÉDITO DO MÊS ─────────────
  // Mesma lógica do Bills.jsx — marca como pago e gera próximo mês
  async function settleCreditBills() {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Busca todos os vencimentos de crédito pendentes do mês atual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: pendingBills } = await supabase
      .from("bills")
      .select("*")
      .eq("household_id", householdId)
      .eq("payment_method", "Crédito")
      .eq("status", "pending")
      .gte("due_date", startOfMonth)
      .lte("due_date", endOfMonth);

    if (!pendingBills || pendingBills.length === 0) return 0;

    for (const bill of pendingBills) {
      // Marca como "credit" (pago no crédito)
      await supabase
        .from("bills")
        .update({ status: "credit" })
        .eq("id", bill.id);

      // Remove transação antecipada se existir
      await supabase
        .from("transactions")
        .delete()
        .eq("household_id", householdId)
        .eq("source", "bill_credit")
        .eq("notes", bill.id);

      // Cria transação real com data de hoje
      await supabase.from("transactions").insert([
        {
          description: bill.name,
          amount: bill.amount,
          category: bill.category || "Contas",
          payment_method: "Crédito",
          type: "expense",
          transaction_date: today,
          source: "bill",
          household_id: householdId,
        },
      ]);

      // Gera próximo vencimento (mesma lógica do Bills.jsx)
      const recurrence = bill.recurrence;

      if (recurrence === "monthly") {
        const nextDue = new Date(`${bill.due_date}T00:00:00`);
        nextDue.setMonth(nextDue.getMonth() + 1);
        const nextDueStr = nextDue.toISOString().split("T")[0];

        const { data: existing } = await supabase
          .from("bills")
          .select("id")
          .eq("household_id", householdId)
          .eq("name", bill.name)
          .eq("due_date", nextDueStr)
          .single();

        if (!existing) {
          const { data: newBill } = await supabase
            .from("bills")
            .insert([
              {
                name: bill.name,
                amount: bill.amount,
                due_date: nextDueStr,
                status: "pending",
                recurrence: "monthly",
                payment_method: bill.payment_method,
                category: bill.category || "Contas",
                household_id: householdId,
              },
            ])
            .select()
            .single();

          // Cria transação antecipada para o próximo mês
          if (newBill && bill.amount > 0) {
            await supabase.from("transactions").insert([
              {
                description: bill.name,
                amount: bill.amount,
                category: bill.category || "Contas",
                payment_method: "Crédito",
                type: "expense",
                transaction_date: nextDueStr,
                source: "bill_credit",
                household_id: householdId,
                notes: newBill.id,
              },
            ]);
          }
        }
      } else if (recurrence === "weekly" || recurrence === "biweekly") {
        const { data: remaining } = await supabase
          .from("bills")
          .select("id, due_date")
          .eq("household_id", householdId)
          .eq("name", bill.name)
          .eq("recurrence", recurrence)
          .eq("status", "pending")
          .neq("id", bill.id);

        const currentDue = new Date(`${bill.due_date}T00:00:00`);
        const remainingInMonth = (remaining || []).filter((b) => {
          const d = new Date(`${b.due_date}T00:00:00`);
          return (
            d.getMonth() === currentDue.getMonth() &&
            d.getFullYear() === currentDue.getFullYear()
          );
        });

        if (remainingInMonth.length === 0) {
          const nextDates = generateNextRecurringDates(
            bill.due_date,
            recurrence,
          );
          for (const date of nextDates) {
            const { data: existingNext } = await supabase
              .from("bills")
              .select("id")
              .eq("household_id", householdId)
              .eq("name", bill.name)
              .eq("due_date", date)
              .single();

            if (!existingNext) {
              const { data: newBill } = await supabase
                .from("bills")
                .insert([
                  {
                    name: bill.name,
                    amount: bill.amount,
                    due_date: date,
                    status: "pending",
                    recurrence,
                    payment_method: bill.payment_method,
                    category: bill.category || "Contas",
                    household_id: householdId,
                  },
                ])
                .select()
                .single();

              if (newBill && bill.amount > 0) {
                await supabase.from("transactions").insert([
                  {
                    description: bill.name,
                    amount: bill.amount,
                    category: bill.category || "Contas",
                    payment_method: "Crédito",
                    type: "expense",
                    transaction_date: date,
                    source: "bill_credit",
                    household_id: householdId,
                    notes: newBill.id,
                  },
                ]);
              }
            }
          }
        }
      }
    }

    return pendingBills.length;
  }
  // ─────────────────────────────────────────────────────

  async function handlePayInvoice() {
    if (!cardData) return;

    const amountToPay =
      paymentType === "total"
        ? currentInvoice
        : Number(partialAmount.replace(",", ".").replace(/[^\d.]/g, ""));

    if (!amountToPay || amountToPay <= 0) return;

    try {
      setIsSavingPayment(true);

      const now = new Date();
      const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const today = now.toISOString().split("T")[0];

      // 1. Registra o pagamento da fatura
      const { error } = await supabase.from("card_payments").insert([
        {
          household_id: householdId,
          card_id: cardData.id,
          amount: amountToPay,
          payment_date: today,
          reference_month: referenceMonth,
        },
      ]);

      if (error) {
        console.error("Erro ao registrar pagamento:", error);
        return;
      }

      // 2. Se pagamento total → quita todos os vencimentos de crédito do mês
      let settled = 0;
      if (paymentType === "total") {
        settled = await settleCreditBills();
      }

      setBillsSettled(settled);
      setPaymentSuccess(true);
      setPartialAmount("");
      setPaymentType("total");
      await fetchCardData();

      setTimeout(() => {
        setPaymentSuccess(false);
        setShowPayInvoiceModal(false);
        setBillsSettled(0);
      }, 3000);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsSavingPayment(false);
    }
  }

  async function handleSaveCard() {
    try {
      const { error } = await supabase
        .from("credit_cards")
        .update({
          name: editName,
          limit_amount: Number(editLimit),
          closing_day: Number(editClosingDay),
          due_day: Number(editDueDay),
        })
        .eq("id", cardData.id);

      if (error) {
        console.error("Erro ao atualizar cartão:", error);
        return;
      }

      await fetchCardData();
      setIsEditingCard(false);
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  }

  const visibleTransactions = showAll
    ? filteredTransactions
    : filteredTransactions.slice(0, INITIAL_COUNT);

  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header>
        <p className={ui.eyebrow}>Cartões</p>
        <h1 className={ui.title}>Seu futuro financeiro.</h1>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative mt-10 overflow-hidden p-6">
          <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />

          <div className="flex items-center justify-between">
            <div>
              <p className={ui.eyebrow}>Cartão principal</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {cardData?.name || "Cartão"}
              </h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              <CreditCard size={24} className="text-viggaGold" />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditingCard(true)}
              className="flex items-center gap-2 rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-sm text-viggaGold"
            >
              <Pencil size={16} />
              Editar
            </button>
            {currentInvoice > 0 && (
              <button
                type="button"
                onClick={() => setShowPayInvoiceModal(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-viggaGold px-4 py-3 text-sm font-medium text-black"
              >
                <CheckCircle2 size={16} />
                Pagar fatura
              </button>
            )}
          </div>

          <div className="mt-8">
            <p className={ui.eyebrow}>Fatura atual</p>
            <h3 className="mt-2 text-5xl font-semibold tracking-tight">
              {isLoading ? "..." : formatCurrency(currentInvoice)}
            </h3>

            {totalPaid > 0 && (
              <div className="mt-3 rounded-2xl bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-viggaMuted">Total da fatura</span>
                  <span className="text-viggaText">
                    {formatCurrency(grossInvoice)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-viggaMuted">Já pago</span>
                  <span className="text-viggaGreen">
                    - {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                  <span className="text-viggaMuted">Saldo pendente</span>
                  <span className="text-viggaGold">
                    {formatCurrency(currentInvoice)}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2 text-sm text-viggaMuted">
                Fechamento: dia {cardData?.closing_day || "--"}
              </div>
              <div className="rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2 text-sm text-viggaMuted">
                Vencimento: dia {cardData?.due_day || "--"}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className={ui.eyebrow}>Limite utilizado</p>
              <span className="text-sm text-viggaGold">
                {usedLimitPercentage}%
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usedLimitPercentage}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${
                  usedLimitPercentage >= 90
                    ? "bg-red-400"
                    : usedLimitPercentage >= 70
                      ? "bg-yellow-400"
                      : "bg-viggaGold"
                }`}
              />
            </div>
            <p className="mt-3 text-sm text-viggaMuted">
              {formatCurrency(availableLimit)} disponíveis de{" "}
              {formatCurrency(cardLimit)}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* LANÇAMENTOS NO CRÉDITO */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Lançamentos no crédito</h2>
          <span className="text-sm text-viggaGold">
            {filteredTransactions.length} lançamentos
          </span>
        </div>

        <div className="mb-4">
          <FilterBar
            context="cards"
            filters={filters}
            onChange={setFilters}
            resultsCount={
              hasActiveFilters ? filteredTransactions.length : undefined
            }
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card className="p-5">
              <p className="text-sm text-viggaMuted">
                Carregando lançamentos...
              </p>
            </Card>
          ) : filteredTransactions.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-sm text-viggaMuted">
                {hasActiveFilters
                  ? "Nenhum lançamento encontrado para este filtro."
                  : "Nenhum lançamento no crédito este mês."}
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
            </Card>
          ) : (
            <>
              {visibleTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                        {formatDate(transaction.transaction_date)}
                        {transaction.source === "bill_credit" && (
                          <span className="ml-2 text-blue-400">
                            • Vencimento
                          </span>
                        )}
                      </p>
                      <h3 className="mt-1 truncate text-sm font-semibold">
                        {transaction.description}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-viggaMuted">
                        {transaction.category || "Geral"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-viggaGold">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </Card>
              ))}

              {filteredTransactions.length > INITIAL_COUNT && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 py-3 text-sm font-medium text-viggaGold"
                >
                  {showAll
                    ? "Ver menos"
                    : `Ver mais ${filteredTransactions.length - INITIAL_COUNT} lançamentos`}
                </motion.button>
              )}
            </>
          )}
        </div>
      </section>

      {/* MODAL PAGAR FATURA */}
      <AnimatePresence>
        {showPayInvoiceModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSavingPayment && setShowPayInvoiceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
            >
              {paymentSuccess ? (
                /* Tela de sucesso */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center"
                >
                  <CheckCircle2
                    size={48}
                    className="mx-auto mb-3 text-viggaGreen"
                  />
                  <h2 className="text-xl font-semibold text-viggaText">
                    Fatura paga!
                  </h2>
                  <p className="mt-2 text-sm text-viggaMuted">
                    Seu limite foi atualizado.
                  </p>
                  {billsSettled > 0 && (
                    <p className="mt-1 text-xs text-viggaGreen">
                      {billsSettled} vencimento{billsSettled > 1 ? "s" : ""} de
                      crédito{" "}
                      {billsSettled > 1 ? "foram quitados" : "foi quitado"} e o
                      próximo mês já foi gerado.
                    </p>
                  )}
                </motion.div>
              ) : (
                <>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className={ui.eyebrow}>Pagar fatura</p>
                      <h2 className="mt-1 text-xl font-semibold text-viggaText">
                        {cardData?.name}
                      </h2>
                      <p className="mt-1 text-sm text-viggaMuted">
                        Fatura pendente:{" "}
                        <span className="font-semibold text-viggaGold">
                          {formatCurrency(currentInvoice)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPayInvoiceModal(false)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p className="mb-3 text-sm text-viggaMuted">
                    Como vai pagar?
                  </p>
                  <div className="mb-4 flex gap-2">
                    {[
                      {
                        v: "total",
                        l: `Total (${formatCurrency(currentInvoice)})`,
                      },
                      { v: "partial", l: "Valor parcial" },
                    ].map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => setPaymentType(t.v)}
                        className={`flex-1 rounded-2xl py-3 text-xs font-medium transition-colors ${
                          paymentType === t.v
                            ? "bg-viggaGold text-black"
                            : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                        }`}
                      >
                        {t.l}
                      </button>
                    ))}
                  </div>

                  {/* Aviso sobre quitação automática — só no pagamento total */}
                  <AnimatePresence>
                    {paymentType === "total" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="rounded-2xl border border-viggaGreen/20 bg-viggaGreen/10 px-4 py-3">
                          <p className="text-xs text-viggaGreen">
                            ✓ Os vencimentos de crédito pendentes deste mês
                            serão quitados automaticamente e o próximo mês será
                            gerado.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {paymentType === "partial" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <p className="mb-2 text-sm text-viggaMuted">
                          Valor a pagar
                        </p>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                          placeholder="Ex: 500,00"
                          className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none placeholder:text-viggaMuted"
                        />
                        <p className="mt-2 text-xs text-viggaMuted">
                          No pagamento parcial os vencimentos não são quitados
                          automaticamente.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPayInvoiceModal(false)}
                      className="rounded-2xl border border-viggaGold/10 bg-viggaBrown py-3 text-sm font-medium text-viggaGold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handlePayInvoice}
                      disabled={
                        isSavingPayment ||
                        (paymentType === "partial" && !partialAmount.trim())
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl bg-viggaGold py-3 text-sm font-medium text-black disabled:opacity-60"
                    >
                      {isSavingPayment ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {isSavingPayment ? "Processando..." : "Confirmar"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDIÇÃO DO CARTÃO */}
      <AnimatePresence>
        {isEditingCard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-5 pb-32 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditingCard(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className={ui.eyebrow}>Configuração</p>
                  <h2 className="mt-2 text-2xl font-semibold text-viggaText">
                    Editar cartão
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingCard(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-viggaMuted">Nome do cartão</p>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm text-viggaMuted">Limite total</p>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">Fechamento</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editClosingDay}
                      onChange={(e) => setEditClosingDay(e.target.value)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">Vencimento</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editDueDay}
                      onChange={(e) => setEditDueDay(e.target.value)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCard}
                  className="mt-2 w-full rounded-2xl bg-viggaGold px-5 py-4 font-medium text-black"
                >
                  Salvar alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

export default Cards;
