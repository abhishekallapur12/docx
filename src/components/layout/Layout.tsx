import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Play, History, LogOut } from "lucide-react";
import { cn } from "@/src/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Templates", icon: FileText, path: "/templates" },
  { label: "Generate", icon: Play, path: "/generate" },
  { label: "History", icon: History, path: "/history" },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-16 items-center border-bottom px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-black">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">D</div>
            <span>DocuFlow AI</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-zinc-100 text-black"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-black"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 p-4">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-black">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b border-zinc-200 bg-white px-6">
          <div className="flex items-center gap-3">
             <span className="text-sm font-medium text-zinc-500">abhishek@docuflow.ai</span>
             <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold">AA</div>
          </div>
        </header>
        <div className="p-8 pb-16">{children}</div>
      </main>
    </div>
  );
};
