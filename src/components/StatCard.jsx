import Card from "./Card";

function StatCard({ title, value, subtitle }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-viggaMuted">
        {title}
      </p>

      <h3 className="mt-2 text-xl font-semibold tracking-tight text-viggaText">
        {value}
      </h3>

      <p className="mt-1 text-xs text-viggaMuted">{subtitle}</p>
    </Card>
  );
}

export default StatCard;
