import { BrowserRouter, Routes, Route } from "react-router-dom";
import ApplicationsPage from "./pages/ApplicationsPage";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import CreateApplicationPage from "./pages/CreateApplicationPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ApplicationsPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/create" element={<CreateApplicationPage />} />
      </Routes>
    </BrowserRouter>
  );
}