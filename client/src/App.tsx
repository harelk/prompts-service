import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import PromptsListPage from "./pages/PromptsListPage";
import CreatePromptPage from "./pages/CreatePromptPage";
import PromptDetailPage from "./pages/PromptDetailPage";
import ServicesPage from "./pages/ServicesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route path="/" element={<PromptsListPage />} />
          <Route path="/prompts/new" element={<CreatePromptPage />} />
          <Route path="/prompts/:id" element={<PromptDetailPage />} />
          <Route path="/services" element={<ServicesPage />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}
