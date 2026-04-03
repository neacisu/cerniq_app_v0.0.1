import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import { CommandPalette } from "../navigation/CommandPalette.js";
import { getNavigationForRole } from "@/config/navigation-helpers.js";
import { useAuth } from "@/providers/auth-provider.js";

export function AppLayout() {
  const { user } = useAuth();
  const navForUser = getNavigationForRole(user?.role);
  const commandPaletteItems = navForUser.flatMap((section) =>
    section.items.map((item) => ({
      label: `${section.title} › ${item.label}`,
      path: item.path,
      keywords: [item.label.toLowerCase(), section.title.toLowerCase()],
    })),
  );

  return (
    <div className="ar rel">
      <a href="#main-content" className="skip-link">
        Sari la conținut
      </a>
      <CommandPalette commands={commandPaletteItems} />
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
