import { useEffect, useMemo, useState } from "react";
import { CreditCard, Pencil, X } from "lucide-react";
import { motion } from "framer-motion";

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

function Cards() {
  const { householdId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [editName, setEditName] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editClosingDay, setEditClosingDay] = useState("");
  const [editDueDay, setEditDueDay] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  async function fetchCardData() {
    try {
      setIsLoading(true);

      const [
        { data: transactionsData, error: transactionsError },
        { data: cardsData, error: cardsError },
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("payment_method", "Crédito")
          .eq("household_id", householdId)
          .order("transaction_date", { ascending: false }),

        supabase.from("credit_cards").select("*").limit(1).single(),
      ]);

      if (transactionsError)
        console.error("Erro ao buscar lançamentos:", transactionsError);
      if (cardsError) console.error("Erro ao buscar cartão:", cardsError);

      setTransactions(transactionsData || []);
      setCardData(cardsData || null);

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
  }, []);

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

  const currentInvoice = useMemo(() => {
    return currentMonthCreditTransactions.reduce(
      (total, t) => total + Number(t.amount || 0),
      0,
    );
  }, [currentMonthCreditTransactions]);

  const cardLimit = Number(cardData?.limit_amount || 0);
  const usedLimitPercentage =
    cardLimit > 0
      ? Math.min(Math.round((currentInvoice / cardLimit) * 100), 100)
      : 0;
  const availableLimit = cardLimit - currentInvoice;

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
              <p className={ui.eyebrow}>Cartão principal</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {cardData?.name || "Cartão"}
              </h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              <CreditCard size={24} className="text-viggaGold" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingCard(true)}
            className="mt-6 flex items-center gap-2 rounded-2xl border border-viggaGold/10 bg-black/20 px-4 py-3 text-sm text-viggaGold transition-opacity hover:opacity-80"
          >
            <Pencil size={16} />
            Editar cartão
          </button>

          <div className="mt-10">
            <p className={ui.eyebrow}>Fatura atual</p>
            <h3 className="mt-2 text-5xl font-semibold tracking-tight">
              {isLoading ? "..." : formatCurrency(currentInvoice)}
            </h3>
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
                className="h-full rounded-full bg-viggaGold"
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

      {/* MODAL DE EDIÇÃO DO CARTÃO */}
      {isEditingCard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-5 pb-32 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-6">
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
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Cards;
