"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { formatAppDateTime } from "@/lib/date-format";
import { loadNotifications, markNotificationRead, markAllNotificationsRead, } from "@/lib/notifications";
const NOTIFICATION_REFRESH_INTERVAL_MS = 10000;
const NOTIFICATION_FETCH_LIMIT = 20;
export function NotificationsMenu({ session, compact = false }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [markingAllRead, setMarkingAllRead] = useState(false);
    const [feed, setFeed] = useState({
        unreadCount: 0,
        notifications: [],
    });
    useEffect(() => {
        void refreshNotifications();
    }, [session.token, session.userId]);
    useAutoRefresh({
        enabled: Boolean(session.token),
        intervalMs: NOTIFICATION_REFRESH_INTERVAL_MS,
        onRefresh: () => refreshNotifications(true),
    });
    useEffect(() => {
        if (!open) {
            return;
        }
        void refreshNotifications();
    }, [open]);
    const unreadCount = feed.unreadCount;
    async function refreshNotifications(silent = false) {
        if (!silent) {
            setLoading(true);
        }
        try {
            const nextFeed = await loadNotifications(session, NOTIFICATION_FETCH_LIMIT);
            setFeed(nextFeed);
            setErrorMessage("");
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load notifications right now.");
        }
        finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }
    async function handleMarkAllRead() {
        if (markingAllRead || unreadCount === 0) {
            return;
        }
        setMarkingAllRead(true);
        try {
            await markAllNotificationsRead(session);
            setFeed((currentFeed) => ({
                unreadCount: 0,
                notifications: currentFeed.notifications.map((item) => ({
                    ...item,
                    isRead: true,
                })),
            }));
            setErrorMessage("");
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not update notification status.");
        }
        finally {
            setMarkingAllRead(false);
        }
    }
    async function handleNotificationClick(notificationId) {
        const target = feed.notifications.find((item) => item.id === notificationId);
        if (!target || target.isRead) {
            return;
        }
        setFeed((currentFeed) => ({
            unreadCount: Math.max(0, currentFeed.unreadCount - 1),
            notifications: currentFeed.notifications.map((item) => item.id === notificationId
                ? {
                    ...item,
                    isRead: true,
                }
                : item),
        }));
        try {
            await markNotificationRead(notificationId, session);
            setErrorMessage("");
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not update notification status.");
            void refreshNotifications(true);
        }
    }
    return (<DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size={compact ? "icon-sm" : "icon"} className="relative" aria-label="Open notifications">
          <Bell className="h-4 w-4"/>
          {unreadCount > 0 && (<span className="absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,24rem)] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void handleMarkAllRead()} disabled={markingAllRead || unreadCount === 0}>
            <CheckCheck className="h-4 w-4"/>
            {markingAllRead ? "Saving..." : "Mark all read"}
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && feed.notifications.length === 0 ? (<p className="px-2 py-4 text-center text-xs text-muted-foreground">
              Loading notifications...
            </p>) : feed.notifications.length === 0 ? (<p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>) : (feed.notifications.map((item) => (<button key={item.id} type="button" onClick={() => void handleNotificationClick(item.id)} className={`mb-2 block w-full rounded-md border px-3 py-2 text-left transition-colors last:mb-0 ${item.isRead
                ? "border-border bg-background hover:bg-muted/30"
                : "border-primary/30 bg-primary/5 hover:bg-primary/10"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  {!item.isRead && <Badge variant="default">New</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatAppDateTime(item.createdAt)}
                </p>
              </button>)))}
        </div>
        {errorMessage && (<>
            <DropdownMenuSeparator />
            <p className="px-3 py-2 text-[11px] text-destructive">{errorMessage}</p>
          </>)}
      </DropdownMenuContent>
    </DropdownMenu>);
}
