import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Globe, Sun, Moon, ChevronDown } from "lucide-react";
import { NAV_SECTIONS } from "../data/navigation.js";

const NOTIFICATIONS = [
  { title: "New mobile user registered", time: "1 minute ago" },
  { title: "Customer Sokha Trading created", time: "5 minutes ago" },
  { title: "HFL Package #HFL-20250910-001 updated", time: "12 minutes ago" },
  { title: "3 approvals are overdue", time: "20 minutes ago" },
  { title: "Data import completed", time: "28 minutes ago" },
];

function useOutsideClick(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onOutside]);
  return ref;
}

// Flatten every routable nav entry once, for the search box.
const ALL_ROUTES = NAV_SECTIONS.flatMap((s) =>
  s.items.flatMap((item) => [
    { label: item.label, path: item.path },
    ...(item.children || []).map((c) => ({ label: `${item.label} · ${c.label}`, path: c.path })),
  ])
);

export default function Header({ onMenuClick, darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lang, setLang] = useState("English");

  const searchRef = useOutsideClick(() => setShowResults(false));
  const notifRef = useOutsideClick(() => setShowNotif(false));
  const langRef = useOutsideClick(() => setShowLang(false));
  const profileRef = useOutsideClick(() => setShowProfile(false));

  const results = query
    ? ALL_ROUTES.filter((r) => r.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <header className="h-[65px] shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 relative z-20">
      <button
        onClick={onMenuClick}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1 max-w-md hidden sm:block relative" ref={searchRef}>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 h-10">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search or type a command (⌘ + G)"
            className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-full"
          />
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.path}
                onClick={() => {
                  navigate(r.path);
                  setQuery("");
                  setShowResults(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
          >
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-semibold">
              {NOTIFICATIONS.length > 9 ? "9+" : NOTIFICATIONS.length}
            </span>
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-30">
              <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Notifications</div>
              <div className="max-h-80 overflow-y-auto">
                {NOTIFICATIONS.map((n, i) => (
                  <div key={i} className="px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <p className="text-[13px] text-slate-700">{n.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative hidden md:block" ref={langRef}>
          <button
            onClick={() => setShowLang((v) => !v)}
            className="flex items-center gap-1 h-9 px-2 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
          >
            <Globe size={16} />
            <span>{lang}</span>
            <ChevronDown size={13} />
          </button>
          {showLang && (
            <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
              {["English", "Khmer", "Chinese"].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    setShowLang(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${l === lang ? "text-blue-600 font-medium" : "text-slate-600"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setDarkMode((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
        >
          {darkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="relative" ref={profileRef}>
          <button onClick={() => setShowProfile((v) => !v)} className="flex items-center gap-2 pl-2 border-l border-slate-200 h-9">
            <img
              src="/img/profile.jpg"
              alt="System Admin"
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[13px] font-medium text-slate-800">System Admin</p>
              <p className="text-[11px] text-slate-400">System Administrator</p>
            </div>
            <ChevronDown size={13} className="hidden md:block text-slate-400" />
          </button>
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
              
                {["My Profile", "Account Settings", "Switch Company", "Log Out"].map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === "Log Out") {
                      localStorage.removeItem("hfl_auth_token");
                      window.location.href = "/login";
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
