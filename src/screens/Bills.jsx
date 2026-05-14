import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Loader2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { ui } from "../styles/ui";
import FilterBar from "../components/FilterBar";
import { applyBillFilters } from "../utils/filterUtils";
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

const PAYMENT_METHODS = ["Pix", "Crédito", "Dinheiro", "Boleto"];

const RECURRENCE_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "weekly", label: "Semanal" },
];

function getStatusLabel(status, dueDate) {
  if (status === "paid") return "Registrado";
  if (status === "credit") return "Na fatura";
  if (status !== "pending") return "Pendente";
  if (!dueDate) return "No prazo";
  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Vencido";
  if (diff <= 2) return "Próximo do vencimento";
  return "No prazo";
}

function getStatusColor(status, dueDate) {
  if (status === "paid") return "text-viggaGreen";
  if (status === "credit") return "text-blue-400";
  if (status !== "pending") return "text-yellow-400";
  if (!dueDate) return "text-viggaGreen";
  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "text-red-400";
  if (diff <= 2) return "text-yellow-400";
  return "text-viggaGreen";
}

function getStatusDot(status, dueDate) {
  if (status === "paid") return "bg-viggaGreen";
  if (status === "credit") return "bg-blue-400";
  if (status !== "pending") return "bg-yellow-400";
  if (!dueDate) return "bg-viggaGreen";
  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "bg-red-400";
  if (diff <= 2) return "bg-yellow-400";
  return "bg-viggaGreen";
}

// Verifica se vence em até 5 dias e precisa confirmar valor
function needsValueConfirmation(dueDate, status) {
  if (status !== "pending") return false;
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(`${dueDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 5;
}

// Gera datas futuras para recorrência semanal/quinzenal no mês
function generateRecurringDates(startDate, recurrence) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(`${startDate}T00:00:00`);
  const intervalDays = recurrence === "weekly" ? 7 : 15;

  // Descobre o fim do mês da data inicial
  const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  const dates = [];
  let current = new Date(start);

  while (current <= endOfMonth) {
    if (current >= today) {
      dates.push(current.toISOString().split("T")[0]);
    }
    current = new Date(current);
    current.setDate(current.getDate() + intervalDays);
  }

  return dates;
}

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
  const [savedBill, setSavedBill] = useState(false);

  const [showNewBillForm, setShowNewBillForm] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState("Pix");
  const [billCategory, setBillCategory] = useState("Contas");
  const [billRecurrence, setBillRecurrence] = useState("monthly");
  const [isSavingBill, setIsSavingBill] = useState(false);

  const [selectedBill, setSelectedBill] = useState(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDate, setEditBillDueDate] = useState("");
  const [editBillStatus, setEditBillStatus] = useState("pending");
  const [editBillPaymentMethod, setEditBillPaymentMethod] = useState("Pix");
  const [editBillCategory, setEditBillCategory] = useState("Contas");

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

  const filteredTotal = useMemo(() => {
    return filteredBills
      .filter((b) => b.status === "pending")
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);
  }, [filteredBills]);

  const visibleBills = useMemo(() => {
    return showAll ? filteredBills : filteredBills.slice(0, INITIAL_COUNT);
  }, [filteredBills, showAll]);

  const nextBill = useMemo(() => {
    const pending = bills.filter((b) => b.status === "pending");
    return pending.length > 0 ? pending[0] : null;
  }, [bills]);

  // Cria um bill e opcionalmente uma transação antecipada de crédito
  async function createBillWithCredit(billPayload, parsedAmount, payMethod) {
    const { data: billData, error } = await supabase
      .from("bills")
      .insert([billPayload])
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar vencimento:", error);
      return null;
    }

    if (payMethod === "Crédito" && parsedAmount > 0 && billData) {
      await supabase.from("transactions").insert([
        {
          description: billPayload.name,
          amount: parsedAmount,
          category: billPayload.category,
          payment_method: "Crédito",
          type: "expense",
          transaction_date: billPayload.due_date,
          source: "bill_credit",
          household_id: householdId,
          notes: billData.id,
        },
      ]);
    }

    return billData;
  }

  async function handleSaveBill() {
    if (!billName.trim() || !billDueDate) return;
    try {
      setIsSavingBill(true);
      const parsedAmount = billAmount.trim()
        ? Number(billAmount.replace(",", ".").replace(/[^\d.]/g, ""))
        : 0;

      if (billRecurrence === "weekly" || billRecurrence === "biweekly") {
        // Gera todas as datas do mês a partir da data informada
        const dates = generateRecurringDates(billDueDate, billRecurrence);

        for (const date of dates) {
          await createBillWithCredit(
            {
              name: billName,
              amount: parsedAmount,
              due_date: date,
              status: "pending",
              recurrence: billRecurrence,
              payment_method: billPaymentMethod,
              category: billCategory,
              household_id: householdId,
            },
            parsedAmount,
            billPaymentMethod,
          );
        }
      } else {
        // Mensal — comportamento original
        await createBillWithCredit(
          {
            name: billName,
            amount: parsedAmount,
            due_date: billDueDate,
            status: "pending",
            recurrence: "monthly",
            payment_method: billPaymentMethod,
            category: billCategory,
            household_id: householdId,
          },
          parsedAmount,
          billPaymentMethod,
        );
      }

      setBillName("");
      setBillAmount("");
      setBillDueDate("");
      setBillPaymentMethod("Pix");
      setBillCategory("Contas");
      setBillRecurrence("monthly");
      setShowNewBillForm(false);
      setSavedBill(true);
      setTimeout(() => setSavedBill(false), 3000);
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

      const { error: billError } = await supabase
        .from("bills")
        .update({ status: newStatus, payment_method: payMethod })
        .eq("id", payingBill.id);
      if (billError) {
        console.error("Erro ao atualizar vencimento:", billError);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      // Remove transação antecipada de crédito se existir
      await supabase
        .from("transactions")
        .delete()
        .eq("household_id", householdId)
        .eq("source", "bill_credit")
        .eq("notes", payingBill.id);

      // Cria transação real com data de hoje
      await supabase.from("transactions").insert([
        {
          description: payingBill.name,
          amount: payingBill.amount,
          category: payingBill.category || "Contas",
          payment_method: payMethod,
          type: "expense",
          transaction_date: today,
          source: "bill",
          household_id: householdId,
        },
      ]);

      // Lógica de recorrência
      const recurrence = payingBill.recurrence;

      if (recurrence === "monthly") {
        // Mensal — gera próximo mês
        const currentDue = new Date(`${payingBill.due_date}T00:00:00`);
        const nextDue = new Date(currentDue);
        nextDue.setMonth(nextDue.getMonth() + 1);
        const nextDueStr = nextDue.toISOString().split("T")[0];

        const { data: existing } = await supabase
          .from("bills")
          .select("id")
          .eq("household_id", householdId)
          .eq("name", payingBill.name)
          .eq("due_date", nextDueStr)
          .single();

        if (!existing) {
          await createBillWithCredit(
            {
              name: payingBill.name,
              amount: payingBill.amount,
              due_date: nextDueStr,
              status: "pending",
              recurrence: "monthly",
              payment_method: payingBill.payment_method,
              category: payingBill.category || "Contas",
              household_id: householdId,
            },
            payingBill.amount,
            payingBill.payment_method,
          );
        }
      } else if (recurrence === "weekly" || recurrence === "biweekly") {
        // Verifica se este é o último vencimento pendente do grupo no mês
        const { data: remaining } = await supabase
          .from("bills")
          .select("id, due_date")
          .eq("household_id", householdId)
          .eq("name", payingBill.name)
          .eq("recurrence", recurrence)
          .eq("status", "pending")
          .neq("id", payingBill.id);

        const currentDue = new Date(`${payingBill.due_date}T00:00:00`);
        const currentMonth = currentDue.getMonth();
        const currentYear = currentDue.getFullYear();

        const remainingInMonth = (remaining || []).filter((b) => {
          const d = new Date(`${b.due_date}T00:00:00`);
          return (
            d.getMonth() === currentMonth && d.getFullYear() === currentYear
          );
        });

        // Se é o último do mês, gera os próximos 4
        if (remainingInMonth.length === 0) {
          const nextDates = generateNextRecurringDates(
            payingBill.due_date,
            recurrence,
          );

          for (const date of nextDates) {
            const { data: existingNext } = await supabase
              .from("bills")
              .select("id")
              .eq("household_id", householdId)
              .eq("name", payingBill.name)
              .eq("due_date", date)
              .single();

            if (!existingNext) {
              await createBillWithCredit(
                {
                  name: payingBill.name,
                  amount: payingBill.amount,
                  due_date: date,
                  status: "pending",
                  recurrence,
                  payment_method: payingBill.payment_method,
                  category: payingBill.category || "Contas",
                  household_id: householdId,
                },
                payingBill.amount,
                payingBill.payment_method,
              );
            }
          }
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
    setEditBillCategory(bill.category || "Contas");
  }

  async function handleUpdateBill() {
    if (!selectedBill || !editBillName.trim() || !editBillDueDate) return;
    try {
      const parsedAmount = editBillAmount.trim()
        ? Number(editBillAmount.replace(",", ".").replace(/[^\d.]/g, ""))
        : 0;
      const { error } = await supabase
        .from("bills")
        .update({
          name: editBillName,
          amount: parsedAmount,
          due_date: editBillDueDate,
          status: editBillStatus,
          payment_method: editBillPaymentMethod,
          category: editBillCategory,
        })
        .eq("id", selectedBill.id);
      if (error) {
        console.error("Erro ao atualizar:", error);
        return;
      }

      await supabase
        .from("transactions")
        .update({
          description: editBillName,
          amount: parsedAmount,
          category: editBillCategory,
          transaction_date: editBillDueDate,
        })
        .eq("household_id", householdId)
        .eq("source", "bill_credit")
        .eq("notes", selectedBill.id);

      await fetchBills();
      setSelectedBill(null);
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  }

  async function handleDeleteBill() {
    if (!selectedBill) return;
    try {
      await supabase
        .from("transactions")
        .delete()
        .eq("household_id", householdId)
        .eq("source", "bill_credit")
        .eq("notes", selectedBill.id);

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

  function getRecurrenceLabel(recurrence) {
    if (recurrence === "weekly") return "Semanal";
    if (recurrence === "biweekly") return "Quinzenal";
    return "Mensal";
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
              <h2 className="mt-2 text-xl font-semibold leading-tight">
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
              {nextBill
                ? nextBill.amount > 0
                  ? formatCurrency(nextBill.amount)
                  : "A definir"
                : "R$ 0,00"}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2">
                <div
                  className={`h-2 w-2 rounded-full ${nextBill ? getStatusDot("pending", nextBill?.due_date) : "bg-viggaGreen"}`}
                />
                <span className="text-sm text-viggaText">
                  {nextBill
                    ? getDueLabel(nextBill.due_date, nextBill.status)
                    : "Sem pendências"}
                </span>
              </div>
              {/* Alerta de confirmar valor no card principal */}
              {nextBill &&
                needsValueConfirmation(nextBill.due_date, nextBill.status) && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2">
                    <AlertTriangle size={12} className="text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">
                      Confirme o valor
                    </span>
                  </div>
                )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* FEEDBACK SALVO */}
      <AnimatePresence>
        {savedBill && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-viggaGreen/20 bg-viggaGreen/10 p-4 text-sm text-viggaGreen"
          >
            <CheckCircle2 size={18} />
            <span>Vencimento salvo com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTA */}
      <section className="mt-6">
        <div className="mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">
                {hasActiveFilters ? "Resultados" : "Próximos pagamentos"}
              </h2>
              {hasActiveFilters && filteredBills.length > 0 && (
                <p className="mt-0.5 text-xs text-viggaMuted">
                  Total pendente:{" "}
                  <span className="font-semibold text-viggaGold">
                    {formatCurrency(filteredTotal)}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowNewBillForm((prev) => !prev)}
              className="rounded-full border border-viggaGold/10 bg-viggaBrown px-4 py-2 text-sm font-medium text-viggaGold"
            >
              {showNewBillForm ? "Fechar" : "Novo vencimento"}
            </button>
          </div>

          {/* FORMULÁRIO */}
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
                        placeholder="Ex: Psicóloga"
                        className="mt-2 w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none placeholder:text-viggaMuted"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-viggaMuted">
                        Valor{" "}
                        <span className="text-xs text-viggaMuted/60">
                          (estimado)
                        </span>
                      </p>
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
                      <p className="text-sm text-viggaMuted">
                        {billRecurrence === "monthly"
                          ? "Data de vencimento"
                          : "Primeira data"}
                      </p>
                      <input
                        type="date"
                        value={billDueDate}
                        onChange={(e) => setBillDueDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-viggaMuted">
                        Recorrência
                      </p>
                      <div className="flex gap-2">
                        {RECURRENCE_OPTIONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setBillRecurrence(r.value)}
                            className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition-colors ${
                              billRecurrence === r.value
                                ? "bg-viggaGold text-black"
                                : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      {(billRecurrence === "weekly" ||
                        billRecurrence === "biweekly") &&
                        billDueDate && (
                          <p className="mt-2 text-xs text-viggaMuted">
                            Serão criados os vencimentos futuros de{" "}
                            {billRecurrence === "weekly"
                              ? "7 em 7"
                              : "15 em 15"}{" "}
                            dias até o fim do mês, a partir de{" "}
                            {new Date(
                              `${billDueDate}T00:00:00`,
                            ).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                            })}
                            .
                          </p>
                        )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-viggaMuted">Categoria</p>
                      <select
                        value={billCategory}
                        onChange={(e) => setBillCategory(e.target.value)}
                        className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="mb-2 text-sm text-viggaMuted">
                        Forma de pagamento
                      </p>
                      {billPaymentMethod === "Crédito" && billAmount && (
                        <p className="mb-2 text-xs text-blue-400">
                          💳 Vai aparecer na aba Cartões na data do vencimento
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setBillPaymentMethod(m)}
                            className={`rounded-2xl py-3 text-sm font-medium transition-colors ${
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
                          <Loader2 size={18} className="animate-spin" />{" "}
                          Salvando...
                        </>
                      ) : billRecurrence !== "monthly" ? (
                        `Criar vencimentos ${billRecurrence === "weekly" ? "semanais" : "quinzenais"}`
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
                          {bill.category && (
                            <span className="ml-2 text-viggaGold/70">
                              • {bill.category}
                            </span>
                          )}
                          {bill.recurrence && bill.recurrence !== "monthly" && (
                            <span className="ml-2 text-viggaMuted/60">
                              • {getRecurrenceLabel(bill.recurrence)}
                            </span>
                          )}
                        </p>
                        <h3 className="mt-1 truncate text-sm font-semibold text-viggaText">
                          {bill.name}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2">
                          {bill.status === "pending" && (
                            <p className="text-[10px] text-viggaMuted">
                              {getDueLabel(bill.due_date, bill.status)}
                            </p>
                          )}
                          {/* Alerta de confirmar valor */}
                          {needsValueConfirmation(
                            bill.due_date,
                            bill.status,
                          ) && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle
                                size={10}
                                className="text-yellow-400"
                              />
                              <span className="text-[10px] font-medium text-yellow-400">
                                Confirme o valor
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-viggaGold">
                          {bill.amount > 0
                            ? formatCurrency(bill.amount)
                            : "A definir"}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${getStatusDot(bill.status, bill.due_date)}`}
                          />
                          <p
                            className={`text-[10px] font-medium ${getStatusColor(bill.status, bill.due_date)}`}
                          >
                            {getStatusLabel(bill.status, bill.due_date)}
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

      {/* MODAL MARCAR COMO PAGO */}
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
                  {payingBill.amount > 0
                    ? formatCurrency(payingBill.amount)
                    : "Valor a definir"}
                </p>
              </div>
              <p className="mb-3 text-sm text-viggaMuted">Como foi pago?</p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`rounded-2xl py-3 text-sm font-medium transition-colors ${
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

      {/* MODAL DE EDIÇÃO */}
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

                {/* Alerta no modal de edição */}
                {needsValueConfirmation(
                  selectedBill.due_date,
                  selectedBill.status,
                ) && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
                    <AlertTriangle
                      size={16}
                      className="text-yellow-400 shrink-0"
                    />
                    <p className="text-xs text-yellow-400">
                      Este vencimento está próximo. Confirme ou atualize o valor
                      antes de pagar.
                    </p>
                  </div>
                )}

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
                    <p className="mb-2 text-sm text-viggaMuted">
                      Valor{" "}
                      <span className="text-xs text-viggaMuted/60">
                        (estimado)
                      </span>
                    </p>
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
                    <p className="mb-2 text-sm text-viggaMuted">Categoria</p>
                    <select
                      value={editBillCategory}
                      onChange={(e) => setEditBillCategory(e.target.value)}
                      className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-viggaText outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-viggaMuted">
                      Forma de pagamento
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEditBillPaymentMethod(m)}
                          className={`rounded-2xl py-2.5 text-sm font-medium transition-colors ${
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
