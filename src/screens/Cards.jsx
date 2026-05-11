import { CreditCard } from "lucide-react";
import { motion } from "framer-motion";

import BottomNav from "../components/BottomNav";
import Card from "../components/Card";

import { creditCardData, futureCommitments } from "../data/mockData";

import { ui } from "../styles/ui";

function Cards() {
  return (
    <div className="min-h-screen px-5 pb-56 pt-8">
      <header>
        <p className={ui.eyebrow}>Cartões</p>

        <h1 className={ui.title}>Seu futuro financeiro.</h1>
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
              <p className={ui.eyebrow}>Cartão principal</p>

              <h2 className="mt-2 text-3xl font-semibold">
                {creditCardData.name}
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-viggaGold/10 bg-black/20">
              <CreditCard size={24} className="text-viggaGold" />
            </div>
          </div>

          <div className="mt-10">
            <p className={ui.eyebrow}>Fatura atual</p>

            <h3 className="mt-2 text-5xl font-semibold tracking-tight">
              {creditCardData.currentInvoice}
            </h3>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2 text-sm text-viggaMuted">
                {creditCardData.closingDate}
              </div>

              <div className="rounded-full border border-viggaGold/10 bg-black/20 px-4 py-2 text-sm text-viggaMuted">
                {creditCardData.dueDate}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className={ui.eyebrow}>Limite utilizado</p>

              <span className="text-sm text-viggaGold">
                {creditCardData.usedLimit}%
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${creditCardData.usedLimit}%`,
                }}
                transition={{ duration: 1 }}
                className="h-full rounded-full bg-viggaGold"
              />
            </div>

            <p className="mt-3 text-sm text-viggaMuted">
              {creditCardData.availableLimit}
            </p>
          </div>
        </Card>
      </motion.div>

      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-medium">Futuro comprometido</h2>

          <button className="text-sm text-viggaGold">Ver detalhes</button>
        </div>

        <div className="space-y-4">
          {futureCommitments.map((item) => (
            <Card key={item.month} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={ui.eyebrow}>{item.month}</p>

                  <h3 className="mt-2 text-2xl font-semibold">{item.amount}</h3>
                </div>

                <span className="text-sm text-viggaGold">
                  {item.percentage}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${item.percentage}%`,
                  }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full bg-viggaGold"
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

export default Cards;
