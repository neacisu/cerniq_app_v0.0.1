import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";

export function AppLayout() {
  return (
    <div className="ar rel">
      <a href="#main-content" className="skip-link">
        Sari la conținut
      </a>
      <Sidebar />
      <div className="ma">
        <Header />
        <main id="main-content" className="ct2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
