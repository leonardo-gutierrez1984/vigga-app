import React, { useState } from "react";
import { Search, SlidersHorizontal, X, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────
// CONFIGURAÇÕES POR CONTEXTO
// ─────────────────────────────────────────────
const CONFIG = {
  launch: {
    categories: [
      "Geral",
      "Mercado",
      "Delivery",
      "Combustível",
      "Farmácia",
      "Recorrente",
    ],
    payments: ["Pix", "Crédito", "Dinheiro", "Não identificado"],
    showSearch: true,
    showPeriod: true,
  },
  cards: {
    categories: [],
    payments: [],
    showSearch: true,
    showPeriod: true,
  },
  bills: {
    categories: [],
    payments: [],
    showSearch: true,
    showPeriod: true,
    statuses: ["Pendente", "Pago"],
  },
};

const PERIODS = [
  { label: "Este mês", value: "this_month" },
  { label: "Mês passado", value: "last_month" },
  { label: "Últimos 7 dias", value: "last_7" },
  { label: "Últimos 30 dias", value: "last_30" },
  { label: "Tudo", value: "all" },
];

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const FilterBar = ({ context = "launch", filters, onChange, resultsCount }) => {
  const [showFilters, setShowFilters] = useState(false);
  const cfg = CONFIG[context] || CONFIG.launch;

  const isCustomPeriod = filters.period === "custom";

  const hasActiveFilters =
    filters.category ||
    filters.payment ||
    filters.status ||
    (filters.period && filters.period !== "this_month");

  const activeCount = [
    filters.category,
    filters.payment,
    filters.status,
    filters.period && filters.period !== "this_month" ? filters.period : null,
  ].filter(Boolean).length;

  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({
      search: "",
      category: "",
      payment: "",
      period: "this_month",
      status: "",
      dateFrom: "",
      dateTo: "",
    });
  }

  function selectPeriod(value) {
    if (value === "custom") {
      onChange({ ...filters, period: "custom" });
    } else {
      onChange({ ...filters, period: value, dateFrom: "", dateTo: "" });
    }
  }

  function getPeriodLabel() {
    if (filters.period === "custom") {
      if (filters.dateFrom && filters.dateTo) {
        const from = new Date(
          `${filters.dateFrom}T00:00:00`,
        ).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        const to = new Date(`${filters.dateTo}T00:00:00`).toLocaleDateString(
          "pt-BR",
          { day: "2-digit", month: "short" },
        );
        return `${from} → ${to}`;
      }
      return "Personalizado";
    }
    return (
      PERIODS.find((p) => p.value === filters.period)?.label || filters.period
    );
  }

  return (
    <div className="space-y-3">
      {/* ── LINHA DE BUSCA ─────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-viggaMuted"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-2xl border border-viggaGold/10 bg-black/20 py-3 pl-9 pr-4 text-sm text-viggaText placeholder:text-viggaMuted focus:border-viggaGold/30 focus:outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-viggaMuted"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowFilters((v) => !v)}
          className={`relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border transition-colors ${
            showFilters || hasActiveFilters
              ? "border-viggaGold/30 bg-viggaGold/10 text-viggaGold"
              : "border-viggaGold/10 bg-black/20 text-viggaMuted"
          }`}
        >
          <SlidersHorizontal size={16} />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-viggaGold text-[9px] font-bold text-black">
              {activeCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* ── PAINEL DE FILTROS ───────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-2xl border border-viggaGold/10 bg-black/20 p-4">
              {/* Período */}
              {cfg.showPeriod && (
                <FilterSection label="Período">
                  <div className="flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                      <FilterChip
                        key={p.value}
                        label={p.label}
                        active={filters.period === p.value}
                        onClick={() => selectPeriod(p.value)}
                      />
                    ))}

                    {/* Chip personalizado com ícone de calendário */}
                    <FilterChip
                      label={
                        <span className="flex items-center gap-1.5">
                          <Calendar size={11} />
                          Personalizado
                        </span>
                      }
                      active={isCustomPeriod}
                      onClick={() => selectPeriod("custom")}
                    />
                  </div>

                  {/* Inputs de data — aparecem só quando "Personalizado" está ativo */}
                  <AnimatePresence>
                    {isCustomPeriod && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="mt-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-viggaMuted">
                              De
                            </p>
                            <input
                              type="date"
                              value={filters.dateFrom || ""}
                              onChange={(e) =>
                                update("dateFrom", e.target.value)
                              }
                              className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-xs text-viggaText outline-none focus:border-viggaGold/30"
                            />
                          </div>
                          <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-viggaMuted">
                              Até
                            </p>
                            <input
                              type="date"
                              value={filters.dateTo || ""}
                              onChange={(e) => update("dateTo", e.target.value)}
                              className="w-full rounded-xl border border-viggaGold/10 bg-black/30 px-3 py-2.5 text-xs text-viggaText outline-none focus:border-viggaGold/30"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </FilterSection>
              )}

              {/* Categoria */}
              {cfg.categories.length > 0 && (
                <FilterSection label="Categoria">
                  <div className="flex flex-wrap gap-2">
                    {cfg.categories.map((cat) => (
                      <FilterChip
                        key={cat}
                        label={cat}
                        active={filters.category === cat}
                        onClick={() =>
                          update(
                            "category",
                            filters.category === cat ? "" : cat,
                          )
                        }
                      />
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Forma de pagamento */}
              {cfg.payments.length > 0 && (
                <FilterSection label="Pagamento">
                  <div className="flex flex-wrap gap-2">
                    {cfg.payments.map((pay) => (
                      <FilterChip
                        key={pay}
                        label={pay}
                        active={filters.payment === pay}
                        onClick={() =>
                          update("payment", filters.payment === pay ? "" : pay)
                        }
                      />
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Status — só para Bills */}
              {cfg.statuses?.length > 0 && (
                <FilterSection label="Status">
                  <div className="flex flex-wrap gap-2">
                    {cfg.statuses.map((s) => (
                      <FilterChip
                        key={s}
                        label={s}
                        active={filters.status === s}
                        onClick={() =>
                          update("status", filters.status === s ? "" : s)
                        }
                      />
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Rodapé */}
              <div className="flex items-center justify-between border-t border-viggaGold/5 pt-3">
                <span className="text-xs text-viggaMuted">
                  {resultsCount !== undefined
                    ? `${resultsCount} resultado${resultsCount !== 1 ? "s" : ""}`
                    : ""}
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-medium text-viggaGold underline underline-offset-2"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHIPS ATIVOS ───────────────────────── */}
      <AnimatePresence>
        {!showFilters && hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-2"
          >
            {filters.category && (
              <ActiveChip
                label={filters.category}
                onRemove={() => update("category", "")}
              />
            )}
            {filters.payment && (
              <ActiveChip
                label={filters.payment}
                onRemove={() => update("payment", "")}
              />
            )}
            {filters.status && (
              <ActiveChip
                label={filters.status}
                onRemove={() => update("status", "")}
              />
            )}
            {filters.period && filters.period !== "this_month" && (
              <ActiveChip
                label={getPeriodLabel()}
                onRemove={() =>
                  onChange({
                    ...filters,
                    period: "this_month",
                    dateFrom: "",
                    dateTo: "",
                  })
                }
              />
            )}
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-viggaMuted underline underline-offset-2"
            >
              Limpar tudo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────
const FilterSection = ({ label, children }) => (
  <div>
    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-viggaMuted">
      {label}
    </p>
    {children}
  </div>
);

const FilterChip = ({ label, active, onClick }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.93 }}
    onClick={onClick}
    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-viggaGold text-black"
        : "border border-viggaGold/10 bg-viggaBrown text-viggaMuted"
    }`}
  >
    {label}
  </motion.button>
);

const ActiveChip = ({ label, onRemove }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex items-center gap-1.5 rounded-full border border-viggaGold/20 bg-viggaGold/10 px-3 py-1.5 text-xs font-medium text-viggaGold"
  >
    {label}
    <button type="button" onClick={onRemove}>
      <X size={11} />
    </button>
  </motion.div>
);

export default FilterBar;
