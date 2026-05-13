import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Trash2, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { ui } from "../styles/ui";
import FilterBar from "../components/FilterBar";
import { applyBillFilters } from "../utils/filterUtils";
import { useAuth } from "../contexts/AuthContext";

function getStatusLabel(status) {
  if (status === "paid") return "Registrado";
  if (status === "credit") return "Na fatura";
  return "Pendente";
}

function getStatusColor(status) {
  if (status === "paid") return "text-viggaGreen";
  if (status === "credit") return "text-blue-400";
  return "text-yellow-400";
}

function getStatusDot(status) {
  if (status === "paid") return "bg-viggaGreen";
  if (status === "credit") return "bg-blue-400";
  return "bg-yellow-400";
}

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  payment: "",
  period: "this_month",
  status: "",
  dateFrom: "",
  dateTo: "",
};

const INITIAL_COUNT = 5;

function Bills() {
  const { householdId } = useAuth();
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [showNewBillForm, setShowNewBillForm] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState("Pix");
  const [isSavingBill, setIsSavingBill] = useState(false);

  const [selectedBill, setSelectedBill] = useState(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDate, setEditBillDueDate] = useState("");
  const [editBillStatus, setEditBillStatus] = useState("pending");
  const [editBillPaymentMethod, setEditBillPaymentMethod] = useState("Pix");

  const [showPayModal, setShowPayModal] = useState(false);
  const [payingBill, setPayingBill] = useState(null);
  const [payMethod, setPayMethod] = useState("Pix");
  const [isSavingPay, setIsSavingPay] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  async function fetchBills() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("household_id", householdId)
        .order("due_date", { ascending: true });
      if (error) {
        console.error("Erro ao buscar vencimentos:", error);
        return;
      }
      setBills(data || []);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBills();
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() ||
      filters.status ||
      (filters.period && filters.period !== "this_month")
    );
  }, [filters]);

  const filteredBills = useMemo(() => {
    if (!hasActiveFilters) return bills;
    return applyBillFilters(bills, filters);
  }, [bills, filters, hasActiveFilters]);

  const visibleBills = useMemo(() => {
    return showAll ? filteredBills : filteredBills.slice(0, INITIAL_COUNT);
  }, [filteredBills, showAll]);

  const nextBill = useMemo(() => {
    const pending = bills.filter((b) => b.status === "pending");
    return pending.length > 0 ? pending[0] : null;
  }, [bills]);

  async function handleSaveBill() {
    if (!billName.trim() || !billAmount.trim() || !billDueDate) return;
    try {
      setIsSavingBill(true);
      const parsedAmount = Number(
        billAmount.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      const { error } = await supabase.from("bills").insert([
        {
          name: billName,
          amount: parsedAmount,
          due_date: billDueDate,
          status: "pending",
          recurrence: "monthly",
          payment_method: billPaymentMethod,
          household_id: householdId,
        },
      ]);
      if (error) {
        console.error("Erro ao salvar vencimento:", error);
        return;
      }
      setBillName("");
      setBillAmount("");
      setBillDueDate("");
      setBillPaymentMethod("Pix");
      setShowNewBillForm(false);
      await fetchBills();
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsSavingBill(false);
    }
  }

  function handleOpenPayModal(bill) {
    setPayingBill(bill);
    setPayMethod(bill.payment_method || "Pix");
    setShowPayModal(true);
    setSelectedBill(null);
  }

  async function handleConfirmPay() {
    if (!payingBill) return;
    try {
      setIsSavingPay(true);
      const newStatus = payMethod === "Crédito" ? "credit" : "paid";

      // 1. Atualiza status do vencimento atual
      const { error: billError } = await supabase
        .from("bills")
        .update({ status: newStatus, payment_method: payMethod })
        .eq("id", payingBill.id);

      if (billError) {
        console.error("Erro ao atualizar vencimento:", billError);
        return;
      }

      // 2. Cria transação real com a data de hoje
      const today = new Date().toISOString().split("T")[0];
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            description: payingBill.name,
            amount: payingBill.amount,
            category: "Contas",
            payment_method: payMethod,
            type: "expense",
            transaction_date: today,
            source: "bill",
            household_id: householdId,
          },
        ]);

      if (transactionError)
        console.error("Erro ao criar transação:", transactionError);

      // 3. Se for recorrente, gera o próximo mês automaticamente
      if (payingBill.recurrence === "monthly" && payingBill.due_date) {
        const currentDue = new Date(`${payingBill.due_date}T00:00:00`);
        const nextDue = new Date(currentDue);
        nextDue.setMonth(nextDue.getMonth() + 1);
        const nextDueStr = nextDue.toISOString().split("T")[0];

        // Verifica se já existe vencimento para o próximo mês
        const { data: existing } = await supabase
          .from("bills")
          .select("id")
          .eq("household_id", householdId)
          .eq("name", payingBill.name)
          .eq("due_date", nextDueStr)
          .single();

        // Só cria se não existir ainda
        if (!existing) {
          const { error: nextBillError } = await supabase.from("bills").insert([
            {
              name: payingBill.name,
              amount: payingBill.amount,
              due_date: nextDueStr,
              status: "pending",
              recurrence: "monthly",
              payment_method: payingBill.payment_method,
              household_id: householdId,
            },
          ]);

          if (nextBillError)
            console.error("Erro ao criar próximo vencimento:", nextBillError);
        }
      }

      setShowPayModal(false);
      setPayingBill(null);
      await fetchBills();
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsSavingPay(false);
    }
  }

  function handleOpenBill(bill) {
    setSelectedBill(bill);
    setEditBillName(bill.name || "");
    setEditBillAmount(String(bill.amount || "").replace(".", ","));
    setEditBillDueDate(bill.due_date || "");
    setEditBillStatus(bill.status || "pending");
    setEditBillPaymentMethod(bill.payment_method || "Pix");
  }

  async function handleUpdateBill() {
    if (
      !selectedBill ||
      !editBillName.trim() ||
      !editBillAmount.trim() ||
      !editBillDueDate
    )
      return;
    try {
      const parsedAmount = Number(
        editBillAmount.replace(",", ".").replace(/[^\d.]/g, ""),
      );
      const { error } = await supabase
        .from("bills")
        .update({
          name: editBillName,
          amount: parsedAmount,
          due_date: editBillDueDate,
          status: editBillStatus,
          payment_method: editBillPaymentMethod,
        })
        .eq("id", selectedBill.id);
      if (error) {
        console.error("Erro ao atualizar:", error);
        return;
      }
      await fetchBills();
      setSelectedBill(null);
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  }

  async function handleDeleteBill() {
    if (!selectedBill) return;
    try {
      const { error } = await supabase
        .from("bills")
        .delete()
        .eq("id", selectedBill.id);
      if (error) {
        console.error("Erro ao excluir:", error);
        return;
      }
      await fetchBills();
      setSelectedBill(null);
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  }

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
    });
  }

  function getDueLabel(date, status) {
    if (status !== "pending") return "";
    if (!date) return "Sem vencimento";
    const today = new Date();
    const dueDate = new Date(`${date}T00:00:00`);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Vence hoje";
    if (diffDays === 1) return "Vence amanhã";
    if (diffDays < 0) return `Venceu há ${Math.abs(diffDays)} dias`;
    return `Vence em ${diffDays} dias`;
  }

  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header>
        <p className={ui.eyebrow}>Vencimentos</p>
        <h1 className={ui.title}>Tudo sob controle.</h1>
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
              <p className={ui.eyebrow}>Próximo vencimento</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {isLoading
                  ? "Carregando..."
                  : nextBill
                    ? nextBill.name
                    : "Nenhum pendente"}
              </h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              <CalendarDays size={24} className="text-viggaGold" />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-4xl font-semibold tracking-tight">
              {nextBill ? formatCurrency(nextBill.amount) : "R$ 0,00"}
            </h3>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-sm text-viggaText">
                {nextBill
                  ? getDueLabel(nextBill.due_date, nextBill.status)
                  : "Sem pendências"}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* LISTA */}
      <section className="mt-10">
        <div className="mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {hasActiveFilters ? "Resultados" : "Próximos pagamentos"}
            </h2>
            <button
              type="button"
              onClick={() => setShowNewBillForm((prev) => !prev)}
              className="rounded-full border border-viggaGold/10 bg-viggaBrown px-4 py-2 text-sm font-medium text-viggaGold"
            >
              {showNewBillForm ? "Fechar" : "Novo vencimento"}
            </button>
          </div>

          <AnimatePresence>
            {showNewBillForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Card className="p-5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-viggaMuted">Nome</p>
                      <input
                        type="text"
                        value={billName}
                        onChange={(e) => setBillName(e.target.value)}
                        placeholder="Ex: Academia"
                        className="mt-2 w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none placeholder:text-viggaMuted"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-viggaMuted">Valor</p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        placeholder="0,00"
                        className="mt-2 w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none placeholder:text-viggaMuted"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-viggaMuted">Vencimento</p>
                      <input
                        type="date"
                        value={billDueDate}
                        onChange={(e) => setBillDueDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-viggaMuted">
                        Forma de pagamento
                      </p>
                      <div className="flex gap-2">
                        {["Pix", "Crédito", "Dinheiro"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setBillPaymentMethod(m)}
                            className={`flex-1 rounded-2xl py-3 text-sm font-medium transition-colors ${
                              billPaymentMethod === m
                                ? "bg-viggaGold text-black"
                                : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveBill}
                      disabled={isSavingBill}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold px-4 py-3 font-medium text-black disabled:opacity-60"
                    >
                      {isSavingBill ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar vencimento"
                      )}
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <FilterBar
            context="bills"
            filters={filters}
            onChange={setFilters}
            resultsCount={hasActiveFilters ? filteredBills.length : undefined}
          />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card className="p-5">
              <p className="text-sm text-viggaMuted">
                Carregando vencimentos...
              </p>
            </Card>
          ) : filteredBills.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-sm text-viggaMuted">
                {hasActiveFilters
                  ? "Nenhum vencimento encontrado para este filtro."
                  : "Nenhum vencimento cadastrado ainda."}
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
              {visibleBills.map((bill) => (
                <button
                  key={bill.id}
                  type="button"
                  onClick={() => handleOpenBill(bill)}
                  className="w-full text-left"
                >
                  <Card className="p-4 transition-opacity hover:opacity-90">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-viggaMuted">
                          {formatDate(bill.due_date)}
                        </p>
                        <h3 className="mt-1 truncate text-sm font-semibold text-viggaText">
                          {bill.name}
                        </h3>
                        {bill.status === "pending" && (
                          <p className="mt-0.5 text-[10px] text-viggaMuted">
                            {getDueLabel(bill.due_date, bill.status)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-viggaGold">
                          {formatCurrency(bill.amount)}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${getStatusDot(bill.status)}`}
                          />
                          <p
                            className={`text-[10px] font-medium ${getStatusColor(bill.status)}`}
                          >
                            {getStatusLabel(bill.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
              {filteredBills.length > INITIAL_COUNT && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 py-3 text-sm font-medium text-viggaGold"
                >
                  {showAll
                    ? "Ver menos"
                    : `Ver mais ${filteredBills.length - INITIAL_COUNT} vencimentos`}
                </motion.button>
              )}
            </>
          )}
        </div>
      </section>

      {/* MODAL MARCAR COMO PAGO — centralizado simples */}
      <AnimatePresence>
        {showPayModal && payingBill && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPayModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
            >
              <div className="mb-5">
                <p className={ui.eyebrow}>Registrar pagamento</p>
                <h2 className="mt-1 text-xl font-semibold text-viggaText">
                  {payingBill.name}
                </h2>
                <p className="mt-1 text-sm text-viggaGold">
                  {formatCurrency(payingBill.amount)}
                </p>
              </div>
              <p className="mb-3 text-sm text-viggaMuted">Como foi pago?</p>
              <div className="mb-5 flex gap-2">
                {["Pix", "Crédito", "Dinheiro"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`flex-1 rounded-2xl py-3 text-sm font-medium transition-colors ${
                      payMethod === m
                        ? "bg-viggaGold text-black"
                        : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="rounded-2xl border border-viggaGold/10 bg-viggaBrown py-3 text-sm font-medium text-viggaGold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPay}
                  disabled={isSavingPay}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-viggaGold py-3 text-sm font-medium text-black disabled:opacity-60"
                >
                  {isSavingPay ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {isSavingPay ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO — scroll no container, modal sem altura fixa */}
      <AnimatePresence>
        {selectedBill && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBill(null)}
          >
            <div className="flex min-h-full items-start justify-center px-5 py-6 pb-32">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-6 shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className={ui.eyebrow}>Vencimento</p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Editar vencimento
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBill(null)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">Nome</p>
                    <input
                      type="text"
                      value={editBillName}
                      onChange={(e) => setEditBillName(e.target.value)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">Valor</p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editBillAmount}
                      onChange={(e) => setEditBillAmount(e.target.value)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">Vencimento</p>
                    <input
                      type="date"
                      value={editBillDueDate}
                      onChange={(e) => setEditBillDueDate(e.target.value)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">
                      Forma de pagamento
                    </p>
                    <div className="flex gap-2">
                      {["Pix", "Crédito", "Dinheiro"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEditBillPaymentMethod(m)}
                          className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition-colors ${
                            editBillPaymentMethod === m
                              ? "bg-viggaGold text-black"
                              : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedBill.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleOpenPayModal(selectedBill)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-sm text-viggaGold"
                    >
                      <CheckCircle2 size={18} />
                      Registrar pagamento
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleUpdateBill}
                    className="w-full rounded-2xl bg-viggaGold px-5 py-3 text-sm font-medium text-black"
                  >
                    Salvar alterações
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteBill}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300"
                  >
                    <Trash2 size={18} />
                    Excluir vencimento
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

export default Bills;
