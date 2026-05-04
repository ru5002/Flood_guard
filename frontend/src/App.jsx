import { BrowserRouter, Routes, Route } from "react-router-dom";
import './styles/global.css';

import Home from "./pages/Home";
import MapView from "./pages/MapView";
import Weather from "./pages/Weather";
import Predictions from "./pages/Predictions";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Donate from "./pages/Donate";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import AlertsManagement from "./pages/admin/AlertsManagement";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/donate" element={<Donate />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/alerts" element={<AlertsManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
