import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";

export function AppLayout() {
  return (
    <div className="ar">
      <Sidebar />
      <div className="ma">
        <Header />
        <main className="ct2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
