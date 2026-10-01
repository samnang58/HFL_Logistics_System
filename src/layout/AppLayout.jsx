import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import Breadcrumb from "./Breadcrumb.jsx";
import Footer from "./Footer.jsx";

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();

  // Close the mobile sidebar whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className={`h-screen w-full flex bg-slate-50 font-sans overflow-hidden ${darkMode ? "dark" : ""}`}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileOpen((v) => !v)} darkMode={darkMode} setDarkMode={setDarkMode} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#f6f8fb]">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-5">
            <Breadcrumb />
            <Outlet />
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
