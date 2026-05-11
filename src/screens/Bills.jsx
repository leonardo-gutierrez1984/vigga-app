import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { ui } from "../styles/ui";

function Bills() {
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showNewBillForm, setShowNewBillForm] = useState(false);

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  const [isSavingBill, setIsSavingBill] = useState(false);

  async function fetchBills() {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("bills")
        .select("*")
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
        },
      ]);

      if (error) {
        console.error("Erro ao salvar conta:", error);
        return;
      }

      setBillName("");
      setBillAmount("");
      setBillDueDate("");

      setShowNewBillForm(false);

      await fetchBills();
    } catch (err) {
      console.error("Erro inesperado ao salvar conta:", err);
    } finally {
      setIsSavingBill(false);
    }
  }

  const nextBill = useMemo(() => {
    if (bills.length === 0) return null;
    return bills[0];
  }, [bills]);

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

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

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
                    : "Nenhuma conta"}
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
                {nextBill ? getDueLabel(nextBill.due_date) : "Sem vencimentos"}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      <section className="mt-10">
        <div className="mb-5 space-y-4">
          <h2 className="text-lg font-medium">Próximos pagamentos</h2>

          <div className="flex items-center gap-3">
            <button className="text-sm text-viggaMuted transition-opacity hover:opacity-80">
              Ver calendário
            </button>

            <button
              onClick={() => setShowNewBillForm((prev) => !prev)}
              className="rounded-full border border-viggaGold/10 bg-viggaBrown px-4 py-2 text-sm font-medium text-viggaGold transition-all hover:scale-[1.02]"
            >
              {showNewBillForm ? "Fechar" : "Nova conta"}
            </button>
          </div>

          {showNewBillForm && (
            <Card className="p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-viggaMuted">Nome da conta</p>

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
                    "Salvar conta"
                  )}
                </button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-5">
              <p className="text-sm text-viggaMuted">
                Carregando vencimentos...
              </p>
            </Card>
          ) : bills.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-viggaMuted">
                Nenhuma conta cadastrada ainda.
              </p>
            </Card>
          ) : (
            bills.map((bill) => (
              <Card key={bill.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={ui.eyebrow}>{formatDate(bill.due_date)}</p>

                    <h3 className="mt-2 text-2xl font-semibold">{bill.name}</h3>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-semibold">
                      {formatCurrency(bill.amount)}
                    </p>

                    <p className="mt-1 text-sm text-viggaGold">
                      {bill.status === "paid" ? "Pago" : "Pendente"}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

export default Bills;
