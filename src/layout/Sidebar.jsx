import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { NAV_SECTIONS } from "../data/navigation.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const role = String(user?.role || "").trim().toLowerCase();
  const canManageTestData = permissions.length > 0
    ? permissions.includes("*") || permissions.includes("test-data.manage")
    : ["super admin", "admin", "finance", "accounting"].includes(role);
  const [openKey, setOpenKey] = useState(null);

  // Auto-expand the section that matches the current route.
  useEffect(() => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (
          item.children?.some(
            (child) => child.path === location.pathname
          )
        ) {
          setOpenKey(item.key);
          return;
        }
      }
    }
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200
        ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        } lg:translate-x-0`}
      >

        {/* Profile / Company Header */}
        <div className="flex items-center gap-2.5 px-5 h-[65px] border-b border-slate-100 shrink-0">

          <img
            src="/img/profile.jpg"
            alt="System Admin"
            className="w-9 h-9 rounded-lg object-cover shrink-0"
          />

          <div className="min-w-0 leading-tight">
            <p className="text-[13px] font-medium text-slate-800 truncate">
              System Admin
            </p>

            <p className="text-[11px] text-slate-400 truncate">
              Fast · Safe · Worldwide
            </p>
          </div>

        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">

          {NAV_SECTIONS.filter(section => section.items.some(item => item.key !== "test-data" || canManageTestData)).map((section, si) => (

            <div
              key={si}
              className="mb-1"
            >

              {section.section && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400">
                  {section.section}
                </p>
              )}

              {section.items.filter(item => item.key !== "test-data" || canManageTestData).map((item) => {

                const Icon = item.icon;

                const hasChildren =
                  !!item.children;

                const isOpen =
                  openKey === item.key;

                const isActiveParent =
                  location.pathname === item.path ||
                  (
                    hasChildren &&
                    item.children.some(
                      (child) =>
                        child.path === location.pathname
                    )
                  );

                return (
                  <div
                    key={item.key}
                    className="mb-0.5"
                  >

                    {/* Parent with submenu */}
                    {hasChildren ? (

                      <button
                        onClick={() =>
                          setOpenKey(
                            isOpen
                              ? null
                              : item.key
                          )
                        }
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13.5px] transition-colors
                        ${
                          isActiveParent
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >

                        <span className="flex items-center gap-2.5">

                          <Icon
                            size={17}
                            strokeWidth={2}
                          />

                          {item.label}

                        </span>

                        <ChevronDown
                          size={14}
                          className={`text-slate-400 transition-transform ${
                            isOpen
                              ? "rotate-180"
                              : ""
                          }`}
                        />

                      </button>

                    ) : (

                      /* Normal Link */
                      <NavLink
                        to={item.path}
                        onClick={() =>
                          setMobileOpen(false)
                        }
                        className={({ isActive }) =>
                          `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] transition-colors ${
                            isActive
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-slate-600 hover:bg-slate-50"
                          }`
                        }
                      >

                        <Icon
                          size={17}
                          strokeWidth={2}
                        />

                        {item.label}

                      </NavLink>

                    )}

                    {/* Children */}
                    {hasChildren && isOpen && (

                      <div className="ml-4 pl-3 border-l border-slate-100 mt-0.5 flex flex-col gap-0.5">

                        {item.children.map(
                          (child) => (

                            <NavLink
                              key={child.key}
                              to={child.path}
                              end
                              onClick={() =>
                                setMobileOpen(false)
                              }
                              className={({ isActive }) =>
                                `px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                                  isActive
                                    ? "bg-blue-50 text-blue-600 font-medium"
                                    : "text-slate-500 hover:bg-slate-50"
                                }`
                              }
                            >
                              {child.label}
                            </NavLink>

                          )
                        )}

                      </div>

                    )}

                  </div>
                );
              })}

            </div>

          ))}

        </nav>

        {/* Bottom Banner */}
        <div className="p-3 shrink-0">

          <div className="relative rounded-xl overflow-hidden h-28 bg-gradient-to-br from-slate-800 to-blue-900 flex flex-col justify-end p-3">

            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.6),transparent_60%)]" />

            <p className="relative text-white text-[13px] font-semibold leading-tight">
              Global Logistics
              <br />
              Better Together
            </p>

            <button
              className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
              type="button"
            >
              <ArrowRight
                size={14}
                className="text-slate-800"
              />
            </button>

          </div>

          <p className="text-[10px] text-slate-400 mt-2 px-1">
            v15.0.0
          </p>

        </div>

      </aside>
    </>
  );
}