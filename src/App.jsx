import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./screens/Dashboard";
import Launch from "./screens/Launch";
import Cards from "./screens/Cards";
import Bills from "./screens/Bills";
import Insights from "./screens/Insights";

function App() {
  return (
    <BrowserRouter>
      <main className="min-h-screen bg-viggaBg text-viggaText">
        <div className="mx-auto min-h-screen max-w-[430px] bg-viggaBg">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  );
}

export default App;
