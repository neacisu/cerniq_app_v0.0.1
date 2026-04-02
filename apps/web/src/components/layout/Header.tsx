import { Bell, Settings, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOutreachNotifications, useMarkNotificationRead } from "@/hooks/use-etapa2.js";
import { useAuth } from "@/providers/auth-provider.js";
import type { OutreachNotificationRow } from "@/lib/etapa2-api.js";

// ─── NotificationItem ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  readonly item: OutreachNotificationRow;
  readonly onRead: (item: OutreachNotificationRow) => void;
}

function NotificationItem({ item, onRead }: NotificationItemProps) {
  return (
    <li>
      <button
        type="button"
        className="w-full text-left rounded px-2 py-1 hover:bg-s700 text-t2"
        onClick={() => onRead(item)}
      >
        <span className="font-medium text-t1 block">{item.title}</span>
        {item.body && <span className="text-t3 line-clamp-2">{item.body}</span>}
      </button>
    </li>
  );
}

// ─── NotificationDropdown ─────────────────────────────────────────────────────

interface NotificationDropdownProps {
  readonly unread: number;
  readonly items: OutreachNotificationRow[];
  readonly onRead: (item: OutreachNotificationRow) => void;
}

function NotificationDropdown({ unread, items, onRead }: NotificationDropdownProps) {
  if (unread === 0) return null;

  return (
    <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-72 rounded-md border border-s600 bg-s800 shadow-lg p-2 text-xs">
      <p className="text-t3 mb-2">{`Notificări necitite (${unread})`}</p>
      <ul className="max-h-48 overflow-y-auto space-y-1">
        {items.slice(0, 8).map((n) => (
          <NotificationItem key={n.id} item={n} onRead={onRead} />
        ))}
      </ul>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1] ?? "dashboard";

  const { token } = useAuth();
  const { data: notifResp } = useOutreachNotifications(true, { enabled: !!token });
  const unread = notifResp?.data?.unreadCount ?? 0;
  const items = notifResp?.data?.items ?? [];
  const markRead = useMarkNotificationRead();

  function handleNotificationRead(item: OutreachNotificationRow) {
    markRead
      .mutateAsync(item.id)
      .then(() => {
        if (item.resourceType === "lead_journey" && item.resourceId) {
          navigate(`/outreach/leads/${item.resourceId}`);
        }
      })
      .catch(() => undefined);
  }

  return (
    <header className="hdr">
      <div className="bc">
        <span>cerniq.app</span>
        <span className="t4">{">"}</span>
        <span className="bcc">{currentPage.replaceAll("-", " ")}</span>
      </div>

      <div className="flex ac g3">
        <div className="relative group">
          <button
            className="hb"
            aria-label="Notificari outreach"
            onClick={() => navigate("/outreach/leads")}
            type="button"
            title="Notificari (raspunsuri noi)"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-600 text-[10px] text-white flex items-center justify-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          <NotificationDropdown unread={unread} items={items} onRead={handleNotificationRead} />
        </div>

        <button
          className="hb"
          aria-label="Settings"
          onClick={() => navigate("/settings")}
          type="button"
        >
          <Settings size={18} />
        </button>

        <div className="av" style={{ width: 32, height: 32, fontSize: 10 }}>
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
