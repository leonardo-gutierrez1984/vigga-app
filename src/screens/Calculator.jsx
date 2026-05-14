import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function guessCategory(name) {
  const n = name.toLowerCase();
  if (
    /roupa|camisa|calça|vestido|sapato|tênis|blusa|jaqueta|zara|renner|c&a|riachuelo|hering/i.test(
      n,
    )
  )
    return "Lazer";
  if (/mercado|supermercado|hortifruti|açougue|padaria|condor/i.test(n))
    return "Mercado";
  if (/farmácia|farmacia|remédio|remedio|drogaria/i.test(n)) return "Farmácia";
  if (/pet|ração|racao|veterinário/i.test(n)) return "Pets";
  if (/escola|curso|faculdade|livro/i.test(n)) return "Escola";
  if (/academia|ginástica|esporte/i.test(n)) return "Atividade Física";
  if (/restaurante|lanche|pizza|hamburguer|ifood|delivery/i.test(n))
    return "Delivery";
  if (/posto|gasolina|combustível/i.test(n)) return "Combustível";
  if (/casa|móvel|decoração|utilidade/i.test(n)) return "Casa";
  return "Geral";
}

function guessStoreName(items) {
  if (items.length === 0) return "Compras";
  const first = items[0].name.trim();
  const words = first.split(/\s+/);
  if (words.length >= 2)
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const PAYMENT_METHODS = ["Pix", "Crédito", "Dinheiro"];

function Calculator() {
  const { householdId } = useAuth();
  const navigate = useNavigate();

  const [limitInput, setLimitInput] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemValue, setItemValue] = useState("");
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLimitInput, setShowLimitInput] = useState(false);

  const limit = useMemo(() => {
    if (!limitInput.trim()) return null;
    return Number(limitInput.replace(",", ".").replace(/[^\d.]/g, ""));
  }, [limitInput]);

  const total = useMemo(() => items.reduce((s, i) => s + i.value, 0), [items]);

  const remaining = limit !== null ? limit - total : null;
  const percent = limit ? Math.min(Math.round((total / limit) * 100), 100) : 0;

  function getBarColor() {
    if (percent >= 100) return "bg-red-400";
    if (percent >= 80) return "bg-yellow-400";
    return "bg-viggaGreen";
  }

  function handleAddItem() {
    if (!itemName.trim() || !itemValue.trim()) return;
    const parsed = Number(itemValue.replace(",", ".").replace(/[^\d.]/g, ""));
    if (!parsed) return;
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: itemName.trim(), value: parsed },
    ]);
    setItemName("");
    setItemValue("");
  }

  function handleRemoveItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleLaunch() {
    if (items.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const storeName = guessStoreName(items);
      const category = guessCategory(items[0].name);
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("transactions").insert([
        {
          description: storeName,
          amount: total,
          category,
          payment_method: paymentMethod,
          type: "expense",
          transaction_date: today,
          source: "manual",
          household_id: householdId,
        },
      ]);

      if (error) {
        console.error("Erro ao lançar:", error);
        return;
      }

      setSaved(true);
      setItems([]);
      setLimitInput("");
      setItemName("");
      setItemValue("");
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-5 pb-32 pt-8">
      {/* HEADER */}
      <header className="mb-8 flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard"
        >
          <ArrowLeft size={18} className="text-viggaGold" />
        </motion.button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-viggaMuted">
            Ferramenta
          </p>
          <h1 className="text-2xl font-semibold text-viggaText">
            Calculadora de compras
          </h1>
        </div>
      </header>

      {/* FEEDBACK DE SUCESSO */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center gap-3 rounded-2xl border border-viggaGreen/20 bg-viggaGreen/10 p-4 text-sm text-viggaGreen"
          >
            <CheckCircle2 size={18} />
            <span>Compra lançada com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD TOTAL */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden p-6">
          <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />

          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-viggaMuted mb-2">
                Total da compra
              </p>
              <h2 className="text-5xl font-semibold tracking-tight text-viggaText">
                {formatCurrency(total)}
              </h2>
              {remaining !== null && (
                <p
                  className={`mt-2 text-sm font-medium ${remaining < 0 ? "text-red-400" : "text-viggaGreen"}`}
                >
                  {remaining < 0
                    ? `⚠ Excedeu ${formatCurrency(Math.abs(remaining))}`
                    : `Sobram ${formatCurrency(remaining)}`}
                </p>
              )}
            </div>

            {/* Botão limite */}
            <button
              type="button"
              onClick={() => setShowLimitInput((v) => !v)}
              className={`rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${
                limit
                  ? "border-viggaGold/30 bg-viggaGold/10 text-viggaGold"
                  : "border-viggaGold/10 bg-black/20 text-viggaMuted"
              }`}
            >
              {limit ? `Limite: ${formatCurrency(limit)}` : "Definir limite"}
            </button>
          </div>

          {/* Input de limite */}
          <AnimatePresence>
            {showLimitInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder="Ex: 1000,00"
                    className="flex-1 rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLimitInput("");
                      setShowLimitInput(false);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLimitInput(false)}
                    className="rounded-xl bg-viggaGold px-4 py-2.5 text-xs font-medium text-black"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barra de progresso (só se tiver limite) */}
          {limit && (
            <div className="mt-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-black/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${getBarColor()}`}
                />
              </div>
              <p
                className={`mt-1.5 text-right text-[10px] font-medium ${
                  percent >= 100
                    ? "text-red-400"
                    : percent >= 80
                      ? "text-yellow-400"
                      : "text-viggaMuted"
                }`}
              >
                {percent}% do limite
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ADICIONAR ITEM */}
      <Card className="mb-6 p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-viggaMuted">
          Adicionar item
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            placeholder="Nome ou loja (ex: Zara)"
            className="flex-1 rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
          />
          <input
            type="text"
            inputMode="decimal"
            value={itemValue}
            onChange={(e) => setItemValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            placeholder="R$"
            className="w-24 rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-sm text-viggaText outline-none placeholder:text-viggaMuted"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={handleAddItem}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-viggaGold text-black"
          >
            <Plus size={18} />
          </motion.button>
        </div>
      </Card>

      {/* LISTA DE ITENS */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 space-y-2"
          >
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-viggaText">
                      {item.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-viggaMuted mt-0.5">
                      {guessCategory(item.name)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <p className="text-sm font-bold text-viggaGold">
                      {formatCurrency(item.value)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-viggaMuted opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORMA DE PAGAMENTO + LANÇAR */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-viggaMuted">
              Forma de pagamento
            </p>
            <div className="flex gap-2 mb-5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                    paymentMethod === m
                      ? "bg-viggaGold text-black"
                      : "border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mb-3 rounded-2xl bg-black/20 p-3 flex items-center justify-between">
              <p className="text-xs text-viggaMuted">
                {items.length} item{items.length !== 1 ? "s" : ""} •{" "}
                {guessStoreName(items)}
              </p>
              <p className="text-sm font-bold text-viggaGold">
                {formatCurrency(total)}
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleLaunch}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-viggaGold py-4 text-sm font-medium text-black disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Lançando...
                </>
              ) : (
                <>
                  <ShoppingCart size={16} /> Lançar compra
                </>
              )}
            </motion.button>
          </Card>
        </motion.div>
      )}

      {/* ESTADO VAZIO */}
      {items.length === 0 && !saved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-10 text-center"
        >
          <ShoppingCart size={40} className="mb-3 text-viggaMuted opacity-30" />
          <p className="text-sm text-viggaMuted">
            Adicione itens acima para começar a calcular.
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default Calculator;
