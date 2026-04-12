import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { EditorPage } from "./pages/EditorPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { JobsPage } from "./pages/JobsPage";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠", end: true },
  { to: "/editor", label: "Editor", icon: "📄", end: false },
  { to: "/workflow", label: "Workflow", icon: "⚡", end: false },
  { to: "/jobs", label: "Jobs", icon: "📋", end: false },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar navigation */}
        <nav className="w-14 flex flex-col items-center py-4 bg-card border-r border-border gap-1 shrink-0">
          {/* Logo */}
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mb-4">
            <span className="text-lg font-bold text-primary-foreground">P</span>
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `w-10 h-10 flex flex-col items-center justify-center rounded-lg text-lg transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              {item.icon}
            </NavLink>
          ))}

          <div className="flex-1" />

          {/* Settings icon */}
          <button
            title="Einstellungen"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ⚙️
          </button>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
