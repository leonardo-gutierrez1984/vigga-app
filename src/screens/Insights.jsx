import { BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";

import { insightsData } from "../data/mockData";
import { ui } from "../styles/ui";

function Insights() {
  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header>
        <p className={ui.eyebrow}>Insights</p>

        <h1 className={ui.title}>Sua vida financeira está falando.</h1>
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
              <p className={ui.eyebrow}>Insight principal</p>

              <h2 className="mt-2 text-4xl font-semibold leading-tight">
                Delivery aumentou.
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              <BrainCircuit size={24} className="text-viggaGold" />
            </div>
          </div>

          <p className="mt-8 text-[17px] leading-8 text-viggaText">
            Você gastou 18% mais com delivery nas últimas 2 semanas.
          </p>

          <button className="mt-6 text-sm text-viggaGold transition-opacity hover:opacity-80">
            Entender comportamento →
          </button>
        </Card>
      </motion.div>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-medium">Outros insights</h2>

          <button className="text-sm text-viggaGold">Ver histórico</button>
        </div>

        <div className="space-y-4">
          {insightsData.map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="text-xl font-semibold">{item.title}</h3>

              <p className="mt-3 text-[15px] leading-7 text-viggaMuted">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

export default Insights;
