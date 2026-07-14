import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import SuperAdminDashboard from "../pages/admin/SuperAdminDashboard";
import DepartmentDashboard from "../pages/department/DepartmentDashboard";
import DisplayPage from "../pages/display/DisplayPage";
import NotFound from "../pages/errors/NotFound";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<SuperAdminDashboard />} />
        <Route path="/department" element={<DepartmentDashboard />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;