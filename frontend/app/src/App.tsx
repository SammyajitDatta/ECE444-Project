import { BrowserRouter, Routes, Route } from "react-router-dom";
import ApplicationsPage from "./pages/ApplicationsPage";
import CreateApplicationPage from "./pages/CreateApplicationPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ApplicationsPage />} />

        <Route path="/create" element={<CreateApplicationPage />} />
      </Routes>
    </BrowserRouter>
  );
}