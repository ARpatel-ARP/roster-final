import { useState } from "react";
import Sidebar from "./SideBar";
import Header from "./Header";

function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      {sidebarOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}

      <div className="flex-1 min-w-0">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main>{children}</main>
      </div>
    </div>
  );
}

export default AppShell;