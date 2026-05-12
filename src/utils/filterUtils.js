function applyPeriodFilter(items, filters, dateField) {
  if (!filters.period || filters.period === "all") return items;

  const now = new Date();

  if (filters.period === "custom") {
    if (!filters.dateFrom && !filters.dateTo) return items;
    return items.filter((item) => {
      const raw = item[dateField] || item.created_at || "";
      const d = raw.includes("T") ? new Date(raw) : new Date(`${raw}T00:00:00`);
      const from = filters.dateFrom
        ? new Date(`${filters.dateFrom}T00:00:00`)
        : null;
      const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  return items.filter((item) => {
    const raw = item[dateField] || item.created_at || "";
    const d = raw.includes("T") ? new Date(raw) : new Date(`${raw}T00:00:00`);
    if (filters.period === "this_month") {
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }
    if (filters.period === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    }
    if (filters.period === "last_7") {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
      return d >= cutoff;
    }
    if (filters.period === "last_30") {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
      return d >= cutoff;
    }
    return true;
  });
}

export function applyTransactionFilters(transactions, filters) {
  let result = [...transactions];
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.payment_method?.toLowerCase().includes(q),
    );
  }
  if (filters.category)
    result = result.filter((t) => t.category === filters.category);
  if (filters.payment)
    result = result.filter((t) => t.payment_method === filters.payment);
  result = applyPeriodFilter(result, filters, "transaction_date");
  return result;
}

export function applyBillFilters(bills, filters) {
  let result = [...bills];
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter((b) => b.name?.toLowerCase().includes(q));
  }
  if (filters.status) {
    const statusMap = { Pendente: "pending", Pago: "paid" };
    const mapped = statusMap[filters.status] || filters.status.toLowerCase();
    result = result.filter((b) => (b.status || "").toLowerCase() === mapped);
  }
  result = applyPeriodFilter(result, filters, "due_date");
  return result;
}
