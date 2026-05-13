import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Share2,
  FileDown,
  X,
  ChevronDown,
  ChevronUp,
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

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHour(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_EMOJI = {
  Mercado: "🛒",
  Delivery: "🍔",
  Combustível: "⛽",
  Lazer: "🎉",
  Farmácia: "💊",
  Escola: "📚",
  Assinaturas: "📱",
  Casa: "🏠",
  Contas: "📄",
  "Atividade Física": "🏋️",
  Pets: "🐾",
  "Plano de Saúde": "❤️",
  Viagens: "✈️",
  Geral: "📌",
  Outros: "📦",
};

const BAR_COLORS = [
  "bg-viggaGold",
  "bg-blue-400",
  "bg-viggaGreen",
  "bg-purple-400",
  "bg-orange-400",
  "bg-pink-400",
  "bg-red-400",
];

// Data de hoje no formato YYYY-MM-DD para o input date
function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function Report() {
  const { householdId, monthlyGoal } = useAuth();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const now = new Date();

  // Estado do filtro de período
  const [dateFrom, setDateFrom] = useState(
    toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [dateTo, setDateTo] = useState(toInputDate(now));

  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null); // "image" | "pdf"
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Modal de categoria
  const [selectedCategory, setSelectedCategory] = useState(null);

  async function fetchData() {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      setAllTransactions(data || []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [householdId]);

  // Filtra transações pelo período selecionado
  const transactions = useMemo(() => {
    if (!dateFrom || !dateTo) return allTransactions;
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T23:59:59`);
    return allTransactions.filter((t) => {
      const d = new Date(t.created_at);
      return d >= from && d <= to;
    });
  }, [allTransactions, dateFrom, dateTo]);

  // Label do período para exibir no relatório
  const periodoLabel = useMemo(() => {
    if (!dateFrom || !dateTo) return "";
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    const sameMonth =
      from.getMonth() === to.getMonth() &&
      from.getFullYear() === to.getFullYear();
    if (sameMonth && from.getDate() === 1) {
      return from.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    }
    return `${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
  }, [dateFrom, dateTo]);

  const total = useMemo(
    () => transactions.reduce((s, t) => s + Number(t.amount || 0), 0),
    [transactions],
  );

  const goalPercent = Math.min(Math.round((total / monthlyGoal) * 100), 100);

  const byCategory = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const cat = t.category || "Geral";
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
        transactions: transactions.filter(
          (t) => (t.category || "Geral") === name,
        ),
      }));
  }, [transactions, total]);

  const byPayment = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const m = t.payment_method || "Outros";
      map[m] = (map[m] || 0) + Number(t.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }));
  }, [transactions, total]);

  const avgPerTx = transactions.length > 0 ? total / transactions.length : 0;

  const biggestTx = useMemo(() => {
    if (transactions.length === 0) return null;
    return transactions.reduce((max, t) =>
      Number(t.amount || 0) > Number(max.amount || 0) ? t : max,
    );
  }, [transactions]);

  // Gera canvas a partir do relatório
  async function generateCanvas() {
    const { default: html2canvas } =
      await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js");
    return html2canvas(reportRef.current, {
      backgroundColor: "#0B1016",
      scale: 2,
      useCORS: true,
    });
  }

  // Exportar como imagem / compartilhar
  async function handleExportImage() {
    setIsExporting(true);
    setExportType("image");
    setShowExportMenu(false);
    try {
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL("image/png");

      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File(
          [blob],
          `vigga-relatorio-${dateFrom}-${dateTo}.png`,
          { type: "image/png" },
        );
        await navigator.share({
          files: [file],
          title: `Relatório Vigga — ${periodoLabel}`,
        });
      } else {
        const link = document.createElement("a");
        link.download = `vigga-relatorio-${dateFrom}-${dateTo}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Erro ao exportar imagem:", err);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  }

  // Exportar como PDF
  async function handleExportPdf() {
    setIsExporting(true);
    setExportType("pdf");
    setShowExportMenu(false);
    try {
      const canvas = await generateCanvas();
      const imgData = canvas.toDataURL("image/png");

      const { default: jsPDF } =
        await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`vigga-relatorio-${dateFrom}-${dateTo}.pdf`);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  }

  // Lançamentos da categoria selecionada no modal
  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter((t) => (t.category || "Geral") === selectedCategory)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [selectedCategory, transactions]);

  const categoryTotal = useMemo(
    () => categoryTransactions.reduce((s, t) => s + Number(t.amount || 0), 0),
    [categoryTransactions],
  );

  return (
    <div className="min-h-screen px-5 pb-32 pt-8">
      {/* HEADER */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-viggaGold/10 bg-viggaCard"
          >
            <ArrowLeft size={18} className="text-viggaGold" />
          </motion.button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-viggaMuted">
              Relatório
            </p>
            <h1 className="text-2xl font-semibold capitalize text-viggaText">
              {periodoLabel}
            </h1>
          </div>
        </div>

        {/* BOTÃO EXPORTAR COM MENU */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={isExporting || isLoading || transactions.length === 0}
            className="flex items-center gap-2 rounded-2xl border border-viggaGold/20 bg-viggaGold/10 px-4 py-2.5 text-sm font-medium text-viggaGold disabled:opacity-40"
          >
            {isExporting ? (
              <span>
                {exportType === "pdf" ? "Gerando PDF..." : "Gerando..."}
              </span>
            ) : (
              <>
                <Share2 size={15} />
                Exportar
                {showExportMenu ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </>
            )}
          </motion.button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-2xl border border-viggaGold/10 bg-viggaCard shadow-2xl"
              >
                <button
                  type="button"
                  onClick={handleExportImage}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-viggaText hover:bg-black/20"
                >
                  <Share2 size={15} className="text-viggaGold" />
                  Compartilhar imagem
                </button>
                <div className="h-px bg-viggaGold/10" />
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-viggaText hover:bg-black/20"
                >
                  <FileDown size={15} className="text-viggaGold" />
                  Baixar PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* FILTRO DE PERÍODO */}
      <div className="mb-6">
        <Card className="p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-viggaMuted">
            Período
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-viggaMuted">
                De
              </p>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2 text-sm text-viggaText outline-none"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-viggaMuted">
                Até
              </p>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2 text-sm text-viggaText outline-none"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* CONTEÚDO CAPTURÁVEL PELO HTML2CANVAS */}
      <div ref={reportRef} className="space-y-4 rounded-3xl bg-viggaBg p-1">
        {/* TOTAL DO PERÍODO */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="relative overflow-hidden p-6">
            <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-viggaGold/10 blur-3xl" />
            <div className="mb-1 flex items-start justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-viggaMuted">
                  Total gasto
                </p>
                <h2 className="text-4xl font-semibold tracking-tight text-viggaText">
                  {isLoading ? "—" : formatCurrency(total)}
                </h2>
                <p className="mt-1 text-sm text-viggaMuted">
                  {transactions.length} lançamento
                  {transactions.length !== 1 ? "s" : ""} • {periodoLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs text-viggaMuted">Meta</p>
                <p
                  className={`text-lg font-bold ${
                    goalPercent >= 100
                      ? "text-red-400"
                      : goalPercent >= 80
                        ? "text-yellow-400"
                        : "text-viggaGreen"
                  }`}
                >
                  {goalPercent}%
                </p>
                <p className="text-xs text-viggaMuted">
                  {formatCurrency(monthlyGoal)}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-black/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPercent}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full rounded-full ${
                    goalPercent >= 100
                      ? "bg-red-400"
                      : goalPercent >= 80
                        ? "bg-yellow-400"
                        : "bg-viggaGold"
                  }`}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* TICKET MÉDIO + MAIOR GASTO */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="p-4 text-center">
            <p className="mb-1 text-xs text-viggaMuted">Ticket médio</p>
            <p className="text-lg font-bold text-viggaGold">
              {formatCurrency(avgPerTx)}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="mb-1 text-xs text-viggaMuted">Maior gasto</p>
            <p className="text-lg font-bold text-viggaText">
              {biggestTx ? formatCurrency(biggestTx.amount) : "—"}
            </p>
            {biggestTx && (
              <p className="mt-0.5 truncate text-[10px] text-viggaMuted">
                {biggestTx.description}
              </p>
            )}
          </Card>
        </motion.div>

        {/* POR CATEGORIA — cada linha é clicável */}
        {byCategory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-viggaMuted">
                Por categoria
              </p>
              <p className="mb-4 text-[10px] text-viggaMuted">
                Toque em uma categoria para ver os lançamentos
              </p>
              <div className="space-y-3">
                {byCategory.map((cat, i) => (
                  <motion.button
                    key={cat.name}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {CATEGORY_EMOJI[cat.name] || "📌"}
                        </span>
                        <span className="text-sm font-medium text-viggaText">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-viggaMuted">
                          ({cat.transactions.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-viggaGold">
                          {formatCurrency(cat.value)}
                        </span>
                        <span className="text-[10px] text-viggaMuted">
                          {cat.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percent}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* POR FORMA DE PAGAMENTO */}
        {byPayment.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-viggaMuted">
                Forma de pagamento
              </p>
              <div className="space-y-3">
                {byPayment.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    />
                    <span className="w-24 shrink-0 text-sm text-viggaText">
                      {p.name}
                    </span>
                    <div
                      className="flex-1 overflow-hidden rounded-full bg-black/30"
                      style={{ height: "6px" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.percent}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold text-viggaGold">
                      {p.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* RODAPÉ */}
        <div className="py-3 text-center">
          <p className="text-xs text-viggaMuted">
            Gerado pelo Vigga • {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* ESTADO VAZIO */}
      {!isLoading && transactions.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-viggaMuted">
            Nenhum lançamento no período selecionado.
          </p>
        </div>
      )}

      {/* MODAL DE CATEGORIA */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCategory(null)}
          >
            <div className="flex min-h-full items-start justify-center px-5 py-6 pb-32">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[430px] rounded-[2rem] border border-viggaGold/10 bg-viggaCard p-5 shadow-2xl"
              >
                {/* Cabeçalho do modal */}
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">
                        {CATEGORY_EMOJI[selectedCategory] || "📌"}
                      </span>
                      <h2 className="text-xl font-semibold text-viggaText">
                        {selectedCategory}
                      </h2>
                    </div>
                    <p className="text-xs text-viggaMuted">
                      {categoryTransactions.length} lançamento
                      {categoryTransactions.length !== 1 ? "s" : ""} •{" "}
                      {periodoLabel}
                    </p>
                    <p className="mt-1 text-lg font-bold text-viggaGold">
                      {formatCurrency(categoryTotal)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20 text-viggaMuted"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Lista de lançamentos */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {categoryTransactions.length === 0 ? (
                    <p className="text-center text-sm text-viggaMuted py-6">
                      Nenhum lançamento neste período.
                    </p>
                  ) : (
                    categoryTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-viggaText">
                            {t.description}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-viggaMuted">
                            {formatDate(t.created_at)} •{" "}
                            {formatHour(t.created_at)} •{" "}
                            {t.payment_method || "—"}
                          </p>
                        </div>
                        <p className="ml-3 shrink-0 text-sm font-bold text-viggaGold">
                          {formatCurrency(t.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Report;
