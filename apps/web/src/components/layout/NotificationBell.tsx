import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useOutreachNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-etapa2.js";
import { useAuth } from "@/providers/auth-provider.js";
import {
  useAppNotifications,
  useMarkAppNotificationRead,
  useMarkAllAppNotificationsRead,
} from "@/hooks/use-app-notifications.js";
import type { OutreachNotificationRow } from "@/lib/etapa2-api.js";
import type { AppNotificationRow } from "@/lib/notifications-api.js";
import { voidAsyncHandler } from "@/lib/void-async-handlers.js";

function AppNotificationLine({
  n,
  onRead,
}: {
  readonly n: AppNotificationRow;
  readonly onRead: (n: AppNotificationRow) => void;
}) {
  const unread = !n.readAt;
  return (
    <li>
      <button
        type="button"
        className={`w-full text-left rounded px-2 py-1 hover:bg-s700 text-t2 ${unread ? "border-l-2 border-amber-500/80 pl-1.5" : ""}`}
        onClick={() => onRead(n)}
      >
        <span className="font-medium text-t1 block">{n.title}</span>
        {n.body && <span className="text-t3 line-clamp-2">{n.body}</span>}
        <span className="text-t4 text-[10px] uppercase mt-0.5 block">{n.type}</span>
      </button>
    </li>
  );
}

function OutreachNotificationLine({
  item,
  onRead,
}: {
  readonly item: OutreachNotificationRow;
  readonly onRead: (item: OutreachNotificationRow) => void;
}) {
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

/**
 * Clopoțel unificat: notificări aplicație (HITL, import, alerte) + notificări outreach existente.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data: appResp } = useAppNotifications(true, { enabled: !!token });
  const { data: outResp } = useOutreachNotifications(true, { enabled: !!token });

  const appUnread = appResp?.data?.unreadCount ?? 0;
  const outUnread = outResp?.data?.unreadCount ?? 0;
  const totalUnread = appUnread + outUnread;

  const appItems = appResp?.data?.items ?? [];
  const outItems = outResp?.data?.items ?? [];

  const markAppRead = useMarkAppNotificationRead();
  const markAllApp = useMarkAllAppNotificationsRead();
  const markAllOut = useMarkAllNotificationsRead();
  const markOutRead = useMarkNotificationRead();

  async function onAppClick(n: AppNotificationRow) {
    await markAppRead.mutateAsync(n.id);
  }

  async function onOutClick(item: OutreachNotificationRow) {
    await markOutRead.mutateAsync(item.id);
    if (item.resourceType === "lead_journey" && item.resourceId) {
      navigate(`/outreach/leads/${item.resourceId}`);
    }
  }

  return (
    <div className="relative group">
      <button
        className="hb"
        aria-label="Notificări"
        onClick={() => navigate("/outreach/leads")}
        type="button"
        title="Notificări (aplicație + outreach)"
      >
        <Bell size={18} />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-600 text-[10px] text-white flex items-center justify-center">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>
      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-80 rounded-md border border-s600 bg-s800 shadow-lg p-2 text-xs">
        {totalUnread === 0 ? (
          <p className="text-t3 py-2 text-center">Nicio notificare necitită</p>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2 gap-2">
              <p className="text-t3">{`Necitite: ${totalUnread} (app ${appUnread} · outreach ${outUnread})`}</p>
              {(appUnread > 0 || outUnread > 0) && (
                <button
                  type="button"
                  className="text-t4 hover:text-t2 underline"
                  onClick={() => {
                    void Promise.all([
                      appUnread > 0 ? markAllApp.mutateAsync() : Promise.resolve(),
                      outUnread > 0 ? markAllOut.mutateAsync() : Promise.resolve(),
                    ]).catch(voidAsyncHandler);
                  }}
                >
                  Marchează tot citit
                </button>
              )}
            </div>
            {appUnread > 0 && (
              <>
                <p className="text-t4 font-semibold mb-1">Aplicație</p>
                <ul className="max-h-40 overflow-y-auto space-y-1 mb-2">
                  {appItems.slice(0, 8).map((n) => (
                    <AppNotificationLine key={n.id} n={n} onRead={(x) => void onAppClick(x)} />
                  ))}
                </ul>
              </>
            )}
            {outUnread > 0 && (
              <>
                <p className="text-t4 font-semibold mb-1">Outreach</p>
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {outItems.slice(0, 8).map((item) => (
                    <OutreachNotificationLine
                      key={item.id}
                      item={item}
                      onRead={(x) => void onOutClick(x)}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
