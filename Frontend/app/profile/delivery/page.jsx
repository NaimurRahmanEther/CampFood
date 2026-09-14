"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bike, CheckCircle2, ClipboardList, RefreshCcw, } from "lucide-react";
import { StudentProfileShell } from "@/components/profile/student-profile-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardErrorState, CardLoadingState, InlineStatusMessage } from "@/components/ui/page-state";
import { formatAppDateTime } from "@/lib/date-format";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { DELIVERY_PARTNER_MAX_ACTIVE_ORDERS, formatDeliveryPlanLabel, formatDeliveryRegistrationStatusLabel, getFreeQueueStatusText, } from "@/lib/delivery-partner";
import { acceptDeliveryOrder, completeDeliveryOrder, } from "@/lib/delivery-orders";
import { getAcceptedOrdersForUser, getActionablePendingOrders, getExpiredFreeQueueOrders, loadDeliveryWorkspace, } from "@/lib/delivery-workspace";
import { useLiveNow } from "@/hooks/use-live-now";
export default function ProfileDeliveryPage() {
    return (<StudentProfileShell title="Delivery" description="Track delivery-partner approval and your delivery performance from one place.">
      {(session) => <DeliveryContent session={session}/>}
    </StudentProfileShell>);
}
function DeliveryContent({ session }) {
    const [workspace, setWorkspace] = useState(null);
    const [deliveryMessage, setDeliveryMessage] = useState("");
    const [deliveryMessageTone, setDeliveryMessageTone] = useState("success");
    const [loadingDelivery, setLoadingDelivery] = useState(true);
    const [refreshingOrders, setRefreshingOrders] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const now = useLiveNow();
    const pointState = workspace?.pointState ?? null;
    const registrationStatuses = workspace?.registrationStatuses ?? {
        free: "not-submitted",
        permanent: "not-submitted",
    };
    const allowedPlans = workspace?.allowedPlans ?? [];
    const canApplyFreePlan = registrationStatuses.free === "not-submitted" || registrationStatuses.free === "rejected";
    const canApplyPermanentPlan = registrationStatuses.permanent === "not-submitted" ||
        registrationStatuses.permanent === "rejected";
    const deliveryOrders = workspace?.orders ?? [];
    useEffect(() => {
        let cancelled = false;
        async function initializeDelivery() {
            setLoadingDelivery(true);
            try {
                const nextWorkspace = await loadDeliveryWorkspace(session);
                if (!cancelled) {
                    setWorkspace(nextWorkspace);
                }
            }
            catch (error) {
                if (!cancelled) {
                    setDeliveryMessage(error instanceof Error ? error.message : "Could not load delivery data.");
                    setDeliveryMessageTone("error");
                }
            }
            finally {
                if (!cancelled) {
                    setLoadingDelivery(false);
                }
            }
        }
        void initializeDelivery();
        return () => {
            cancelled = true;
        };
    }, [session]);
    useAutoRefresh({
        enabled: Boolean(session),
        intervalMs: 30000,
        onRefresh: () => refreshDeliveryOrders(true),
    });
    const actionablePendingOrders = useMemo(() => getActionablePendingOrders(deliveryOrders, allowedPlans, now, session.userId), [allowedPlans, deliveryOrders, now, session.userId]);
    const actionableFreeOrders = useMemo(() => actionablePendingOrders.filter((order) => resolveDeliveryPlanForOrder(order) === "free"), [actionablePendingOrders]);
    const actionablePaidOrders = useMemo(() => actionablePendingOrders.filter((order) => resolveDeliveryPlanForOrder(order) === "permanent"), [actionablePendingOrders]);
    const expiredFreeQueueOrders = useMemo(() => allowedPlans.includes("free")
        ? getExpiredFreeQueueOrders(deliveryOrders, now, session.userId)
        : [], [allowedPlans, deliveryOrders, now, session.userId]);
    const myAcceptedDeliveryOrders = useMemo(() => getAcceptedOrdersForUser(deliveryOrders, session.userId), [deliveryOrders, session.userId]);
    const myAcceptedFreeDeliveryOrders = useMemo(() => myAcceptedDeliveryOrders.filter((order) => resolveDeliveryPlanForOrder(order) === "free"), [myAcceptedDeliveryOrders]);
    const myAcceptedPaidDeliveryOrders = useMemo(() => myAcceptedDeliveryOrders.filter((order) => resolveDeliveryPlanForOrder(order) === "permanent"), [myAcceptedDeliveryOrders]);
    const hasReachedFreeOrderLimit = myAcceptedFreeDeliveryOrders.length >= DELIVERY_PARTNER_MAX_ACTIVE_ORDERS;
    async function refreshDeliveryOrders(silent = false) {
        if (!silent) {
            setRefreshingOrders(true);
        }
        try {
            setWorkspace(await loadDeliveryWorkspace(session));
            if (!silent) {
                setDeliveryMessage("Delivery workspace refreshed.");
                setDeliveryMessageTone("success");
            }
        }
        catch (error) {
            if (!silent) {
                setDeliveryMessage(error instanceof Error ? error.message : "Could not refresh delivery requests.");
                setDeliveryMessageTone("error");
            }
        }
        finally {
            if (!silent) {
                setRefreshingOrders(false);
            }
        }
    }
    async function handleReceiveDeliveryOrder(order) {
        const plan = resolveDeliveryPlanForOrder(order);
        if (plan === "free" && hasReachedFreeOrderLimit) {
            setDeliveryMessage(`Free delivery partners can manage up to ${DELIVERY_PARTNER_MAX_ACTIVE_ORDERS} active orders at a time. Complete one first.`);
            setDeliveryMessageTone("error");
            return;
        }
        setActiveOrderId(order.id);
        try {
            const result = await acceptDeliveryOrder(order.id, session, plan);
            setWorkspace((currentWorkspace) => currentWorkspace ? { ...currentWorkspace, orders: result.orders } : currentWorkspace);
            if (result.ok) {
                setDeliveryMessage(`Order received as ${formatDeliveryPlanLabel(plan)}.`);
                setDeliveryMessageTone("success");
            }
            else {
                setDeliveryMessage(result.error ?? "Could not receive this order.");
                setDeliveryMessageTone("error");
            }
        }
        finally {
            setActiveOrderId(null);
        }
    }
    async function handleCompleteDeliveryOrder(orderId) {
        setActiveOrderId(orderId);
        try {
            const result = await completeDeliveryOrder(orderId, session);
            setWorkspace((currentWorkspace) => currentWorkspace ? { ...currentWorkspace, orders: result.orders } : currentWorkspace);
            if (!result.ok) {
                setDeliveryMessage(result.error ?? "Could not complete this order.");
                setDeliveryMessageTone("error");
                return;
            }
            if (result.rewardPoints && result.rewardPoints > 0) {
                setWorkspace(await loadDeliveryWorkspace(session));
                setDeliveryMessage(`Delivery completed. +${result.rewardPoints} points added.`);
                setDeliveryMessageTone("success");
                return;
            }
            setDeliveryMessage("Delivery completed.");
            setDeliveryMessageTone("success");
        }
        finally {
            setActiveOrderId(null);
        }
    }
    if (loadingDelivery) {
        return <CardLoadingState message="Loading delivery workspace..."/>;
    }
    if (!pointState) {
        return (<CardErrorState message={deliveryMessage || "Could not load delivery workspace right now."} actionLabel="Try Again" onAction={() => void refreshDeliveryOrders()}/>);
    }
    return (<Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-primary"/>
              Delivery Workspace
            </CardTitle>
            <CardDescription>
              Admin-approved students can receive delivery orders, complete runs, and monitor plan access from here.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/delivery-partner/orders">
                <ClipboardList className="h-4 w-4"/>
                Open Full Desk
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void refreshDeliveryOrders()} disabled={refreshingOrders}>
              <RefreshCcw className="h-4 w-4"/>
              {refreshingOrders ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={registrationStatuses.free === "approved" ? "default" : "secondary"}>
            Free Plan: {formatDeliveryRegistrationStatusLabel(registrationStatuses.free)}
          </Badge>
          <Badge variant={registrationStatuses.permanent === "approved" ? "default" : "secondary"}>
            Permanent Plan: {formatDeliveryRegistrationStatusLabel(registrationStatuses.permanent)}
          </Badge>
          <Badge variant="outline">Available Points: {pointState.points}</Badge>
          <Badge variant="outline">Earned: {pointState.totalEarned}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {allowedPlans.length === 0 ? (<div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {getRegistrationGuidance(registrationStatuses)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canApplyFreePlan ? (<Button variant="outline" size="sm" asChild>
                  <Link href="/delivery-partner/free">Apply for Free Delivery</Link>
                </Button>) : null}
              {canApplyPermanentPlan ? (<Button variant="ghost" size="sm" asChild>
                  <Link href="/delivery-partner/permanent">Apply for Permanent Delivery</Link>
                </Button>) : null}
            </div>
          </div>) : (<>
            {(canApplyFreePlan || canApplyPermanentPlan) && (<div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">Plan Management</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your current delivery access stays active. You can still apply for another plan
                  whenever it is not approved yet.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canApplyFreePlan ? (<Button variant="outline" size="sm" asChild>
                      <Link href="/delivery-partner/free">Apply for Free Delivery</Link>
                    </Button>) : null}
                  {canApplyPermanentPlan ? (<Button variant="ghost" size="sm" asChild>
                      <Link href="/delivery-partner/permanent">Apply for Permanent Delivery</Link>
                    </Button>) : null}
                </div>
              </div>)}

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryTile label="Actionable Orders" value={String(actionablePendingOrders.length)} hint="Orders you can receive right now"/>
              <SummaryTile label="Accepted By Me" value={String(myAcceptedDeliveryOrders.length)} hint={`Free plan max ${DELIVERY_PARTNER_MAX_ACTIVE_ORDERS}, paid plan unlimited`}/>
              <SummaryTile label="Recently Shifted" value={String(expiredFreeQueueOrders.length)} hint="Orders now available in paid delivery service"/>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold text-foreground">Orders Ready For You</h3>
                {hasReachedFreeOrderLimit ? (<p className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                    Free delivery limit reached. Complete one free-delivery order to receive another.
                  </p>) : null}
                <DeliveryOrderGroupSection title="Free Delivery Service" count={actionableFreeOrders.length} emptyMessage={allowedPlans.includes("free")
                ? "No free-delivery orders are currently in your queue."
                : "Free delivery plan is not approved for your account."}>
                  {actionableFreeOrders.map((order) => (<DeliveryOrderCard key={order.id} order={order} showPrivateDetails={false} statusText={getFreeQueueStatusText(order, now)} actionLabel={hasReachedFreeOrderLimit
                    ? "Limit Reached"
                    : activeOrderId === order.id
                        ? "Receiving..."
                        : "Receive Order"} actionIcon={Bike} onAction={() => void handleReceiveDeliveryOrder(order)} disabled={activeOrderId === order.id || hasReachedFreeOrderLimit}/>))}
                </DeliveryOrderGroupSection>
                <DeliveryOrderGroupSection title="Paid Delivery Service" count={actionablePaidOrders.length} emptyMessage={allowedPlans.includes("permanent")
                ? "No paid-delivery orders are currently available."
                : "Permanent delivery plan is not approved for your account."}>
                  {actionablePaidOrders.map((order) => (<DeliveryOrderCard key={order.id} order={order} showPrivateDetails={false} statusText={getFreeQueueStatusText(order, now)} actionLabel={activeOrderId === order.id ? "Receiving..." : "Receive Order"} actionIcon={Bike} onAction={() => void handleReceiveDeliveryOrder(order)} disabled={activeOrderId === order.id}/>))}
                </DeliveryOrderGroupSection>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold text-foreground">My Accepted Orders</h3>
                <DeliveryOrderGroupSection title="Accepted as Free Delivery Partner" count={myAcceptedFreeDeliveryOrders.length} emptyMessage="No active free-delivery orders assigned to you.">
                  {myAcceptedFreeDeliveryOrders.map((order) => (<DeliveryOrderCard key={order.id} order={order} showPrivateDetails statusText={`Accepted as ${formatDeliveryPlanLabel(resolveDeliveryPlanForOrder(order))}`} actionLabel={activeOrderId === order.id ? "Saving..." : "Mark Delivered"} actionIcon={CheckCircle2} onAction={() => void handleCompleteDeliveryOrder(order.id)} disabled={activeOrderId === order.id}/>))}
                </DeliveryOrderGroupSection>
                <DeliveryOrderGroupSection title="Accepted as Permanent Delivery Partner" count={myAcceptedPaidDeliveryOrders.length} emptyMessage="No active paid-delivery orders assigned to you.">
                  {myAcceptedPaidDeliveryOrders.map((order) => (<DeliveryOrderCard key={order.id} order={order} showPrivateDetails statusText={`Accepted as ${formatDeliveryPlanLabel(resolveDeliveryPlanForOrder(order))}`} actionLabel={activeOrderId === order.id ? "Saving..." : "Mark Delivered"} actionIcon={CheckCircle2} onAction={() => void handleCompleteDeliveryOrder(order.id)} disabled={activeOrderId === order.id}/>))}
                </DeliveryOrderGroupSection>
              </div>
            </div>

            {expiredFreeQueueOrders.length > 0 ? (<div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  {expiredFreeQueueOrders.length} order{expiredFreeQueueOrders.length === 1 ? "" : "s"} moved to paid delivery service.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  These orders are now shown to paid delivery partners.
                </p>
              </div>) : null}
          </>)}

        <InlineStatusMessage message={deliveryMessage} tone={deliveryMessageTone === "error" ? "error" : "success"}/>
      </CardContent>
    </Card>);
}
function resolveDeliveryPlanForOrder(order) {
    if (order.assignedPlan === "free" || order.assignedPlan === "permanent") {
        return order.assignedPlan;
    }
    return order.routeMode === "paid-only" ? "permanent" : "free";
}
function DeliveryOrderGroupSection({ title, count, emptyMessage, children, }) {
    return (<div className="space-y-2 rounded-md border border-border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <Badge variant="outline">{count}</Badge>
      </div>
      {count === 0 ? <p className="text-xs text-muted-foreground">{emptyMessage}</p> : children}
    </div>);
}
function DeliveryOrderCard({ order, showPrivateDetails, statusText, actionLabel, actionIcon: ActionIcon, onAction, disabled, }) {
    return (<div className="rounded-md border border-border bg-background px-3 py-3">
      <p className="text-sm font-medium text-foreground">
        #{order.id.slice(0, 8)}
      </p>
      {showPrivateDetails ? (<p className="mt-1 text-xs text-muted-foreground">
          {order.studentName || "Customer"}
          {order.studentEmail ? ` (${order.studentEmail})` : ""}
        </p>) : (<p className="mt-1 text-xs text-muted-foreground">
          Customer details unlock after acceptance.
        </p>)}
      <p className="mt-1 text-xs text-muted-foreground">{statusText}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Destination zone: {order.deliveryDetails.hallName || "Not provided"}
      </p>
      {showPrivateDetails ? (<div className="mt-2 space-y-1 rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-xs text-muted-foreground">
          <p>Recipient: {order.deliveryDetails.recipientName || "N/A"}</p>
          <p>Phone: {order.deliveryDetails.phone || "N/A"}</p>
          <p>Address: {order.deliveryDetails.addressLine || "N/A"}</p>
          {order.deliveryDetails.landmark ? <p>Landmark: {order.deliveryDetails.landmark}</p> : null}
          {order.deliveryDetails.note ? <p>Note: {order.deliveryDetails.note}</p> : null}
        </div>) : (<p className="mt-1 text-xs text-muted-foreground">
          Exact address, phone, and note are visible after you receive this order.
        </p>)}
      <p className="mt-1 text-xs text-muted-foreground">
        {order.totals.items} item{order.totals.items === 1 ? "" : "s"} | Cash{" "}
        {order.totals.cashPayable} BDT | Points {order.totals.pointsPayable}
      </p>
      <p className="text-xs text-muted-foreground">{formatAppDateTime(order.createdAt)}</p>
      <Button size="sm" className="mt-3" onClick={onAction} disabled={disabled}>
        <ActionIcon className="h-4 w-4"/>
        {actionLabel}
      </Button>
    </div>);
}
function SummaryTile({ label, value, hint, }) {
    return (<div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold font-mono text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>);
}
function getRegistrationGuidance(statuses) {
    if (statuses.free === "pending" || statuses.permanent === "pending") {
        return "Your delivery application is waiting for admin approval. Refresh later to see when access opens.";
    }
    if (statuses.free === "rejected" || statuses.permanent === "rejected") {
        return "One of your delivery applications was rejected. You can review the plan details and apply again.";
    }
    return "You are not registered as a delivery partner yet. Apply for free or permanent delivery to unlock order access.";
}
