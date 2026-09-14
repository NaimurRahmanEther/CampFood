"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bike, CheckCircle2, RefreshCcw } from "lucide-react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardLoadingState, InlineStatusMessage, SectionEmptyState } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { getRoleHomePath, } from "@/lib/auth-session";
import { formatAppDateTime } from "@/lib/date-format";
import { DELIVERY_PARTNER_MAX_ACTIVE_ORDERS, formatDeliveryPlanLabel, formatDeliveryRegistrationStatusLabel, getFreeQueueStatusText, isFreeQueueWindowOpen, } from "@/lib/delivery-partner";
import { acceptDeliveryOrder, completeDeliveryOrder, sendDeliveryOrderMessage, } from "@/lib/delivery-orders";
import { getAcceptedOrdersForUser, getDeliveredOrdersForUser, getExpiredFreeQueueOrders, getPendingOrdersForPlan, loadDeliveryWorkspace, resolveActiveDeliveryPlan, } from "@/lib/delivery-workspace";
import { useLiveNow } from "@/hooks/use-live-now";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useAuthSessionState } from "@/hooks/use-session-state";
const REALTIME_ORDER_SYNC_MS = 4000;
export default function DeliveryOrdersPage() {
    const router = useRouter();
    const { session: authSession, hydrated } = useAuthSessionState();
    const session = authSession?.role === "student" ? authSession : null;
    const [workspace, setWorkspace] = useState(null);
    const [activePlan, setActivePlan] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusTone, setStatusTone] = useState("success");
    const [orderChatInputs, setOrderChatInputs] = useState({});
    const [sendingOrderChatId, setSendingOrderChatId] = useState(null);
    const [checkingSession, setCheckingSession] = useState(true);
    const [loadingOrderId, setLoadingOrderId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const now = useLiveNow();
    const studentPoints = workspace?.pointState ?? null;
    const orders = workspace?.orders ?? [];
    const registrationStatuses = workspace?.registrationStatuses ?? {
        free: "not-submitted",
        permanent: "not-submitted",
    };
    const allowedPlans = workspace?.allowedPlans ?? [];
    useEffect(() => {
        let cancelled = false;
        async function initializeOrdersPage() {
            if (!hydrated) {
                return;
            }
            if (!session) {
                setCheckingSession(false);
                return;
            }
            setCheckingSession(true);
            try {
                const nextWorkspace = await loadDeliveryWorkspace(session);
                if (cancelled) {
                    return;
                }
                setWorkspace(nextWorkspace);
                setActivePlan((currentPlan) => resolveActiveDeliveryPlan(nextWorkspace.allowedPlans, currentPlan));
            }
            catch (error) {
                if (!cancelled) {
                    setStatusMessage(error instanceof Error ? error.message : "Could not load delivery partner data.");
                    setStatusTone("error");
                }
            }
            finally {
                if (!cancelled) {
                    setCheckingSession(false);
                }
            }
        }
        void initializeOrdersPage();
        return () => {
            cancelled = true;
        };
    }, [hydrated, session]);
    useEffect(() => {
        if (!hydrated || !authSession) {
            return;
        }
        if (authSession.role !== "student") {
            router.replace(getRoleHomePath(authSession.role));
        }
    }, [authSession, hydrated, router]);
    if (hydrated && authSession && authSession.role !== "student") {
        return null;
    }
    useAutoRefresh({
        enabled: Boolean(session),
        intervalMs: REALTIME_ORDER_SYNC_MS,
        onRefresh: () => refreshOrders(true),
    });
    const pendingOrders = useMemo(() => {
        const planOrders = getPendingOrdersForPlan(orders, activePlan).filter((order) => !session || order.studentUserId !== session.userId);
        if (activePlan !== "free") {
            return planOrders;
        }
        return planOrders.filter((order) => isFreeQueueWindowOpen(order, now));
    }, [activePlan, now, orders, session]);
    const expiredFreeQueueOrders = useMemo(() => (session ? getExpiredFreeQueueOrders(orders, now, session.userId) : []), [now, orders, session]);
    const myAcceptedOrders = useMemo(() => (session ? getAcceptedOrdersForUser(orders, session.userId) : []), [orders, session]);
    const myAcceptedFreeOrders = useMemo(() => myAcceptedOrders.filter((order) => order.assignedPlan === "free"), [myAcceptedOrders]);
    const myDeliveredOrders = useMemo(() => (session ? getDeliveredOrdersForUser(orders, session.userId) : []), [orders, session]);
    const hasReachedFreeOrderLimit = activePlan === "free" && myAcceptedFreeOrders.length >= DELIVERY_PARTNER_MAX_ACTIVE_ORDERS;
    async function refreshOrders(silent = false) {
        if (!session) {
            return;
        }
        if (!silent) {
            setRefreshing(true);
        }
        try {
            const nextWorkspace = await loadDeliveryWorkspace(session);
            setWorkspace(nextWorkspace);
            setActivePlan((currentPlan) => resolveActiveDeliveryPlan(nextWorkspace.allowedPlans, currentPlan));
            if (!silent) {
                setStatusMessage("Orders refreshed.");
                setStatusTone("success");
            }
        }
        catch (error) {
            if (!silent) {
                setStatusMessage(error instanceof Error ? error.message : "Could not refresh delivery orders.");
                setStatusTone("error");
            }
        }
        finally {
            if (!silent) {
                setRefreshing(false);
            }
        }
    }
    async function receiveOrder(orderId) {
        if (!session || !activePlan) {
            return;
        }
        if (activePlan === "free" && hasReachedFreeOrderLimit) {
            setStatusMessage(`Free delivery partners can manage up to ${DELIVERY_PARTNER_MAX_ACTIVE_ORDERS} active orders at a time. Mark one delivered first.`);
            setStatusTone("error");
            return;
        }
        setLoadingOrderId(orderId);
        try {
            const result = await acceptDeliveryOrder(orderId, session, activePlan);
            setWorkspace((currentWorkspace) => currentWorkspace ? { ...currentWorkspace, orders: result.orders } : currentWorkspace);
            setStatusMessage(result.ok ? "Order received successfully." : result.error || "Cannot receive order.");
            setStatusTone(result.ok ? "success" : "error");
        }
        finally {
            setLoadingOrderId(null);
        }
    }
    async function markDelivered(orderId) {
        if (!session) {
            return;
        }
        setLoadingOrderId(orderId);
        try {
            const result = await completeDeliveryOrder(orderId, session);
            setWorkspace((currentWorkspace) => currentWorkspace ? { ...currentWorkspace, orders: result.orders } : currentWorkspace);
            if (result.ok) {
                if (result.rewardPoints && result.rewardPoints > 0) {
                    const nextWorkspace = await loadDeliveryWorkspace(session);
                    setWorkspace(nextWorkspace);
                    setActivePlan((currentPlan) => resolveActiveDeliveryPlan(nextWorkspace.allowedPlans, currentPlan));
                    setStatusMessage(`Delivery completed. +${result.rewardPoints} points added to your profile.`);
                    setStatusTone("success");
                }
                else {
                    setStatusMessage("Delivery completed.");
                    setStatusTone("success");
                }
                return;
            }
            setStatusMessage(result.error || "Cannot complete this order.");
            setStatusTone("error");
        }
        finally {
            setLoadingOrderId(null);
        }
    }
    async function sendOrderChat(orderId) {
        if (!session) {
            return;
        }
        const message = (orderChatInputs[orderId] ?? "").trim();
        if (!message) {
            setStatusMessage("Write a message before sending.");
            setStatusTone("error");
            return;
        }
        setSendingOrderChatId(orderId);
        try {
            const updatedOrder = await sendDeliveryOrderMessage(orderId, session, message);
            setWorkspace((currentWorkspace) => currentWorkspace
                ? { ...currentWorkspace, orders: replaceDeliveryOrder(currentWorkspace.orders, updatedOrder) }
                : currentWorkspace);
            setOrderChatInputs((current) => ({ ...current, [orderId]: "" }));
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Could not send message.");
            setStatusTone("error");
        }
        finally {
            setSendingOrderChatId(null);
        }
    }
    if (checkingSession) {
        return (<>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/35 pt-24">
          <div className="w-full max-w-md">
            <CardLoadingState message="Checking delivery partner access..."/>
          </div>
        </main>
      </>);
    }
    if (!session) {
        return null;
    }
    if (allowedPlans.length === 0) {
        return (<>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/35 pt-24">
          <div className="mx-auto max-w-3xl px-4 pb-16 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Access Not Enabled</CardTitle>
                <CardDescription>
                  Only approved free or permanent delivery partners can receive orders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Free Plan: {formatDeliveryRegistrationStatusLabel(registrationStatuses.free)}
                  </Badge>
                  <Badge variant="secondary">
                    Permanent Plan: {formatDeliveryRegistrationStatusLabel(registrationStatuses.permanent)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Applications must be approved by admin before order access opens.
                </p>
                <Button asChild>
                  <Link href="/delivery-partner/free">Apply as Free Partner</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/delivery-partner/permanent">Apply as Permanent Partner</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>);
    }
    return (<>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/35 pt-24">
        <div className="mx-auto max-w-6xl px-4 pb-16 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link href="/delivery-partner" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4"/>
              Back to Delivery Partner
            </Link>
            <Button variant="outline" size="sm" onClick={() => void refreshOrders()} disabled={refreshing}>
              <RefreshCcw className="h-4 w-4"/>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-primary"/>
                Delivery Order Desk
              </CardTitle>
              <CardDescription>
                Receive and manage delivery requests from one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  Active Plans: {allowedPlans.map((plan) => formatDeliveryPlanLabel(plan)).join(", ")}
                </Badge>
                {studentPoints && (<>
                    <Badge variant="outline">Available Points: {studentPoints.points}</Badge>
                    <Badge variant="outline">Earned: {studentPoints.totalEarned}</Badge>
                  </>)}
              </div>

              {allowedPlans.length > 1 && (<div className="max-w-xs space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Delivering As</p>
                    <Select value={activePlan ?? undefined} onValueChange={(value) => setActivePlan(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose partner mode"/>
                    </SelectTrigger>
                    <SelectContent>
                      {allowedPlans.map((plan) => (<SelectItem key={plan} value={plan}>
                          {formatDeliveryPlanLabel(plan)}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>)}

              {activePlan === "free" && (<p className="rounded-lg border border-secondary/25 bg-secondary/5 px-3 py-2 text-xs text-muted-foreground">
                  Free delivery requests appear here first.
                </p>)}

              {activePlan === "free" && expiredFreeQueueOrders.length > 0 && (<p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                  {expiredFreeQueueOrders.length} order{expiredFreeQueueOrders.length === 1 ? "" : "s"} moved to paid delivery service.
                </p>)}

              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Free delivery cap: maximum {DELIVERY_PARTNER_MAX_ACTIVE_ORDERS} active orders. Paid delivery has no limit.
              </p>

              <InlineStatusMessage message={statusMessage} tone={statusTone === "error" ? "error" : "success"} className="text-xs"/>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders</CardTitle>
                <CardDescription>{pendingOrders.length} waiting for delivery partner.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasReachedFreeOrderLimit && (<p className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                    Free delivery limit reached. Complete one free-delivery order to receive another.
                  </p>)}
                {pendingOrders.length === 0 ? (<SectionEmptyState title="No pending orders" description="New orders will appear here when they are available for your selected plan." className="p-6"/>) : (pendingOrders.map((order) => (<OrderCard key={order.id} order={order} showPrivateDetails={false} queueStatus={getFreeQueueStatusText(order, now)} actionLabel={hasReachedFreeOrderLimit
                ? "Limit Reached"
                : loadingOrderId === order.id
                    ? "Receiving..."
                    : "Receive Order"} onAction={() => void receiveOrder(order.id)} actionDisabled={loadingOrderId === order.id
                || hasReachedFreeOrderLimit}/>)))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Accepted Orders</CardTitle>
                <CardDescription>
                  {myAcceptedOrders.length} currently in delivery. Free plan max {DELIVERY_PARTNER_MAX_ACTIVE_ORDERS}, paid plan unlimited.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myAcceptedOrders.length === 0 ? (<SectionEmptyState title="No accepted orders" description="Receive an order first to start delivery chat and completion actions." className="p-6"/>) : (myAcceptedOrders.map((order) => (<OrderCard key={order.id} order={order} showPrivateDetails queueStatus={order.assignedPlan
                ? `Accepted as ${formatDeliveryPlanLabel(order.assignedPlan)}`
                : "Accepted for delivery"} actionLabel={loadingOrderId === order.id ? "Saving..." : "Mark Delivered"} actionVariant="default" onAction={() => void markDelivered(order.id)} actionDisabled={loadingOrderId === order.id} chatSection={<div className="rounded-md border border-border bg-background px-3 py-3">
                          <p className="text-xs font-medium text-foreground">
                            Chat with {order.studentName}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Messages update every {Math.floor(REALTIME_ORDER_SYNC_MS / 1000)}s
                          </p>
                          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                            {getOrderChatIncidents(order).length === 0 ? (<p className="text-xs text-muted-foreground">No messages yet.</p>) : (getOrderChatIncidents(order).map((incident) => {
                    const isCourierMessage = incident.actorRole !== "student";
                    return (<div key={incident.id} className={`rounded-md border px-2 py-2 ${isCourierMessage
                            ? "border-primary/25 bg-primary/5"
                            : "border-border bg-muted/20"}`}>
                                    <p className="text-xs text-foreground">{incident.message}</p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                      {incident.actorName} | {formatAppDateTime(incident.createdAt)}
                                    </p>
                                  </div>);
                }))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Input value={orderChatInputs[order.id] ?? ""} onChange={(event) => setOrderChatInputs((current) => ({
                    ...current,
                    [order.id]: event.target.value,
                }))} placeholder="Write a message to the customer" onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        void sendOrderChat(order.id);
                    }
                }}/>
                            <Button size="sm" onClick={() => void sendOrderChat(order.id)} disabled={sendingOrderChatId === order.id}>
                              {sendingOrderChatId === order.id ? "Sending..." : "Send"}
                            </Button>
                          </div>
                        </div>}/>)))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>My Delivered Orders</CardTitle>
              <CardDescription>Latest completed deliveries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myDeliveredOrders.length === 0 ? (<SectionEmptyState title="No completed deliveries yet" description="Delivered orders will be listed here." className="p-6"/>) : (myDeliveredOrders.map((order) => (<div key={order.id} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      #{order.id.slice(0, 8)} - {order.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Delivered {order.deliveredAt ? formatAppDateTime(order.deliveredAt) : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cash: {formatCurrency(order.totals.cashPayable)} | Points: {order.totals.pointsPayable}
                    </p>
                  </div>)))}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>);
}
function OrderCard({ order, showPrivateDetails, queueStatus, actionLabel, onAction, actionVariant = "secondary", actionDisabled = false, chatSection, }) {
    return (<div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">#{order.id.slice(0, 8)}</p>
          {showPrivateDetails ? (<p className="text-xs text-muted-foreground">
              {order.studentName || "Customer"}
              {order.studentEmail ? ` (${order.studentEmail})` : ""}
            </p>) : (<p className="text-xs text-muted-foreground">
              Customer details unlock after acceptance.
            </p>)}
          <p className="text-xs text-muted-foreground">
            {formatAppDateTime(order.createdAt)}
          </p>
        </div>
        <Badge variant="outline">{order.status.toUpperCase()}</Badge>
      </div>
      <div className="mt-2">
        <Badge variant={order.routeMode === "free-first" ? "secondary" : "default"}>
          {order.routeMode === "free-first" ? "Free Delivery Service" : "Paid Delivery Service"}
        </Badge>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{queueStatus}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Destination zone: {order.deliveryDetails.hallName || "Not provided"}
      </p>
      {showPrivateDetails ? (<div className="mt-2 space-y-1 rounded-md border border-border/70 bg-background/60 px-2 py-2 text-xs text-muted-foreground">
          <p>Recipient: {order.deliveryDetails.recipientName || "N/A"}</p>
          <p>Phone: {order.deliveryDetails.phone || "N/A"}</p>
          <p>Address: {order.deliveryDetails.addressLine || "N/A"}</p>
          {order.deliveryDetails.landmark ? <p>Landmark: {order.deliveryDetails.landmark}</p> : null}
          {order.deliveryDetails.note ? <p>Note: {order.deliveryDetails.note}</p> : null}
        </div>) : (<p className="mt-1 text-xs text-muted-foreground">
          Exact address, phone, and note are visible after you receive this order.
        </p>)}
      <p className="mt-2 text-xs text-muted-foreground">
        Items: {order.totals.items}
      </p>
      <p className="mt-2 text-xs font-medium text-foreground">
        Cash: {formatCurrency(order.totals.cashPayable)} | Points: {order.totals.pointsPayable}
      </p>
      <Button className="mt-3 w-full" variant={actionVariant} onClick={onAction} disabled={actionDisabled}>
        <CheckCircle2 className="h-4 w-4"/>
        {actionLabel}
      </Button>
      {chatSection ? <div className="mt-3">{chatSection}</div> : null}
    </div>);
}
function formatCurrency(amount) {
    return `BDT ${amount.toFixed(0)}`;
}
function replaceDeliveryOrder(currentOrders, updatedOrder) {
    const existingIndex = currentOrders.findIndex((order) => order.id === updatedOrder.id);
    if (existingIndex === -1) {
        return [updatedOrder, ...currentOrders];
    }
    return currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
}
function getOrderChatIncidents(order) {
    return order.incidents
        .filter((incident) => incident.type === "chat")
        .slice()
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}
