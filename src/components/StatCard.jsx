import Card from "./Card";

function StatCard({ title, value, subtitle, clickable }) {
  return (
    <Card
      className={`p-4 ${clickable ? "border border-viggaGold/20 transition-opacity hover:opacity-80" : ""}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-viggaMuted">
        {title}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-viggaText">
        {value}
      </h3>
      <p className="mt-1 text-xs text-viggaMuted">{subtitle}</p>
      {clickable && (
        <p className="mt-2 text-[10px] font-medium text-viggaGold">
          Toque para ver →
        </p>
      )}
    </Card>
  );
}

export default StatCard;
