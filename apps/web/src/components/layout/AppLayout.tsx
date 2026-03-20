import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import { CommandPalette } from "../navigation/CommandPalette.js";
import { navigation } from "@/config/navigation.js";

const commandPaletteItems = navigation.flatMap((section) =>
  section.items.map((item) => ({
    label: `${section.title} › ${item.label}`,
    path: item.path,
    keywords: [item.label.toLowerCase(), section.title.toLowerCase()],
  })),
);

export function AppLayout() {
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
