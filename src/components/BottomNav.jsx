import { Home, Plus, CreditCard, Calendar, BarChart3 } from "lucide-react";

import { NavLink } from "react-router-dom";

const items = [
  {
    to: "/",
    icon: Home,
    label: "Início",
  },
  {
    to: "/launch",
    icon: Plus,
    label: "Lançar",
  },
  {
    to: "/cards",
    icon: CreditCard,
    label: "Cartões",
  },
  {
    to: "/bills",
    icon: Calendar,
    label: "Contas",
  },
  {
    to: "/insights",
    icon: BarChart3,
    label: "Insights",
  },
];

function BottomNav() {
  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 px-4">
      <nav className="flex items-center justify-between rounded-[28px] border border-viggaGold/10 bg-viggaCard/80 px-3 py-3 shadow-2xl backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] transition-all duration-300 ${
                  isActive
                    ? "bg-viggaGold/10 text-viggaGold"
                    : "text-viggaMuted"
                }`
              }
            >
              <Icon size={20} strokeWidth={2.2} />

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default BottomNav;
