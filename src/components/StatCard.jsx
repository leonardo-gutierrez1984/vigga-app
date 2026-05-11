import Card from "./Card";

function StatCard({ title, value, subtitle }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-viggaMuted">{title}</p>

      <h3 className="mt-2 text-[34px] font-semibold tracking-tight">{value}</h3>

      <p className="mt-2 text-xs text-viggaMuted">{subtitle}</p>
    </Card>
  );
}

export default StatCard;
