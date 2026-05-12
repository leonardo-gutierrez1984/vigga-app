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

// ─────────────────────────────────────────────
// ESTADO INICIAL DOS FILTROS
// ─────────────────────────────────────────────
const DEFAULT_FILTERS = {
  search: "",
  category: "",
  payment: "",
  period: "this_month",
  status: "",
  dateFrom: "",
  dateTo: "",
};

function Bills() {
  const { householdId } = useAuth();
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showNewBillForm, setShowNewBillForm] = useState(false);

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [isSavingBill, setIsSavingBill] = useState(false);

  const [selectedBill, setSelectedBill] = useState(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDate, setEditBillDueDate] = useState("");
  const [editBillStatus, setEditBillStatus] = useState("pending");

  // ── FILTROS ──────────────────────────────────
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // ─────────────────────────────────────────────
  // BUSCA NO SUPABASE
  // ─────────────────────────────────────────────
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
      console.error("Erro inesperado ao buscar vencimentos:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBills();
  }, []);

  // ─────────────────────────────────────────────
  // FILTROS LOCAIS
  // ─────────────────────────────────────────────
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() ||
      filters.status ||
      (filters.period && filters.period !== "this_month")
    );
  }, [filters]);

  const filteredBills = useMemo(() => {
    // Sem filtros: mostra todos os bills (comportamento original)
    if (!hasActiveFilters) return bills;
    return applyBillFilters(bills, filters);
  }, [bills, filters, hasActiveFilters]);

  // Próximo vencimento: sempre baseado em TODOS os bills, ignora filtros
  const nextBill = useMemo(() => {
    const pendingBills = bills.filter((bill) => bill.status !== "paid");
    if (pendingBills.length === 0) return null;
    return pendingBills[0];
  }, [bills]);

  // ─────────────────────────────────────────────
  // SALVAR NOVO VENCIMENTO
  // ─────────────────────────────────────────────
  async function handleSaveBill() {
    if (!billName.trim()) return;
    if (!billAmount.trim()) return;
    if (!billDueDate) return;

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
      setShowNewBillForm(false);
      await fetchBills();
    } catch (err) {
      console.error("Erro inesperado ao salvar vencimento:", err);
    } finally {
      setIsSavingBill(false);
    }
  }

  // ─────────────────────────────────────────────
  // ABRIR MODAL DE EDIÇÃO
  // ─────────────────────────────────────────────
  function handleOpenBill(bill) {
    setSelectedBill(bill);
    setEditBillName(bill.name || "");
    setEditBillAmount(String(bill.amount || "").replace(".", ","));
    setEditBillDueDate(bill.due_date || "");
    setEditBillStatus(bill.status || "pending");
  }

  // ─────────────────────────────────────────────
  // ATUALIZAR VENCIMENTO
  // ─────────────────────────────────────────────
  async function handleUpdateBill() {
    if (!selectedBill) return;
    if (!editBillName.trim()) return;
    if (!editBillAmount.trim()) return;
    if (!editBillDueDate) return;

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
        })
        .eq("id", selectedBill.id);

      if (error) {
        console.error("Erro ao atualizar vencimento:", error);
        return;
      }

      await fetchBills();
      setSelectedBill(null);
    } catch (err) {
      console.error("Erro inesperado ao atualizar vencimento:", err);
    }
  }

  // ─────────────────────────────────────────────
  // EXCLUIR VENCIMENTO
  // ─────────────────────────────────────────────
  async function handleDeleteBill() {
    if (!selectedBill) return;

    try {
      const { error } = await supabase
        .from("bills")
        .delete()
        .eq("id", selectedBill.id);
      if (error) {
        console.error("Erro ao excluir vencimento:", error);
        return;
      }
      await fetchBills();
      setSelectedBill(null);
    } catch (err) {
      console.error("Erro inesperado ao excluir vencimento:", err);
    }
  }

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
    });
  }

  function getDueLabel(date) {
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

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header>
        <p className={ui.eyebrow}>Vencimentos</p>
        <h1 className={ui.title}>Tudo sob controle.</h1>
      </header>

      {/* ── CARD PRINCIPAL ─────────────────────── */}
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
              <h2 className="mt-2 text-4xl font-semibold">
                {isLoading
                  ? "Carregando..."
                  : nextBill
                    ? nextBill.name
                    : "Nenhum vencimento"}
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              <CalendarDays size={24} className="text-viggaGold" />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-5xl font-semibold tracking-tight">
              {nextBill ? formatCurrency(nextBill.amount) : "R$ 0,00"}
            </h3>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-sm text-viggaText">
                {nextBill ? getDueLabel(nextBill.due_date) : "Sem pendências"}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── LISTA DE VENCIMENTOS ────────────────── */}
      <section className="mt-10">
        <div className="mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {hasActiveFilters ? "Resultados" : "Próximos pagamentos"}
            </h2>

            <button
              type="button"
              onClick={() => setShowNewBillForm((prev) => !prev)}
              className="rounded-full border border-viggaGold/10 bg-viggaBrown px-4 py-2 text-sm font-medium text-viggaGold transition-all hover:scale-[1.02]"
            >
              {showNewBillForm ? "Fechar" : "Novo vencimento"}
            </button>
          </div>

          {/* Formulário novo vencimento */}
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

                    <button
                      type="button"
                      onClick={handleSaveBill}
                      disabled={isSavingBill}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold px-4 py-3 font-medium text-black transition-all hover:opacity-90 disabled:opacity-60"
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

          {/* FilterBar — contexto "bills" */}
          <FilterBar
            context="bills"
            filters={filters}
            onChange={setFilters}
            resultsCount={hasActiveFilters ? filteredBills.length : undefined}
          />
        </div>

        {/* Lista */}
        <div className="space-y-4">
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
            filteredBills.map((bill) => (
              <button
                key={bill.id}
                type="button"
                onClick={() => handleOpenBill(bill)}
                className="w-full text-left"
              >
                <Card className="p-5 transition-opacity hover:opacity-90">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={ui.eyebrow}>{formatDate(bill.due_date)}</p>
                      <h3 className="mt-2 text-2xl font-semibold">
                        {bill.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-semibold">
                        {formatCurrency(bill.amount)}
                      </p>
                      <p
                        className={`mt-1 text-sm ${bill.status === "paid" ? "text-viggaGreen" : "text-viggaGold"}`}
                      >
                        {bill.status === "paid" ? "Pago" : "Pendente"}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            ))
          )}
        </div>
      </section>

      {/* ── MODAL DE EDIÇÃO ─────────────────────── */}
      <AnimatePresence>
        {selectedBill && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-5 pb-32 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBill(null)}
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
                  <p className={ui.eyebrow}>Vencimento</p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Editar vencimento
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-viggaMuted">Nome</p>
                  <input
                    type="text"
                    value={editBillName || ""}
                    onChange={(e) => setEditBillName(e.target.value)}
                    placeholder="Nome do vencimento"
                    className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm text-viggaMuted">Valor</p>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editBillAmount}
                    onChange={(e) => setEditBillAmount(e.target.value)}
                    className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm text-viggaMuted">Vencimento</p>
                  <input
                    type="date"
                    value={editBillDueDate}
                    onChange={(e) => setEditBillDueDate(e.target.value)}
                    className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaText outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditBillStatus((prev) =>
                      prev === "paid" ? "pending" : "paid",
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-4 text-viggaGold"
                >
                  <CheckCircle2 size={18} />
                  {editBillStatus === "paid"
                    ? "Marcado como pago"
                    : "Marcar como pago"}
                </button>

                <button
                  type="button"
                  onClick={handleUpdateBill}
                  className="w-full rounded-2xl bg-viggaGold px-5 py-4 font-medium text-black"
                >
                  Salvar alterações
                </button>

                <button
                  type="button"
                  onClick={handleDeleteBill}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-500/10 px-5 py-4 font-medium text-red-300"
                >
                  <Trash2 size={18} />
                  Excluir vencimento
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

export default Bills;
