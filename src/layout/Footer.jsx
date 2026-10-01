import React from "react";

export default function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 py-4 text-xs text-slate-400">
      <p>© 2026 HFL Logistics. All rights reserved.</p>
      <div className="flex items-center gap-4">
        <a className="hover:text-slate-600" href="#">Privacy</a>
        <a className="hover:text-slate-600" href="#">Terms</a>
        <a className="hover:text-slate-600" href="#">Help</a>
        <a className="hover:text-slate-600" href="#">Contact</a>
        <span className="italic text-slate-500 font-medium hidden sm:inline">Logistics Moves the World</span>
      </div>
    </footer>
  );
}
