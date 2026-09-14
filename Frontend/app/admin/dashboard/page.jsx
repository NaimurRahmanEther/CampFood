"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, RefreshCcw, ShieldCheck, XCircle, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NotificationsMenu } from "@/components/notifications-menu";
import { CardLoadingState, InlineStatusMessage, SectionEmptyState } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { clearAuthSession, } from "@/lib/auth-session";
import { useAuthSessionState } from "@/hooks/use-session-state";
import { formatAppDateTime } from "@/lib/date-format";
import { reviewApprovalRequest, } from "@/lib/admin-approvals";
import { cancelDeliveryOrder, } from "@/lib/delivery-orders";
import { formatDeliveryPlanLabel, getFreeQueueStatusText, } from "@/lib/delivery-partner";
import { loadAdminDashboardData } from "@/lib/admin-dashboard";
import { useLiveNow } from "@/hooks/use-live-now";
const REQUEST_LABELS = {
    "kitchen-registration": "Kitchen Registration",
    "delivery-registration": "Delivery Registration",
    "food-listing": "Food Listing",
};
export default function AdminDashboardPage() {
    const router = useRouter();
    const { session: rawSession, hydrated } = useAuthSessionState();
    const session = rawSession?.role === "admin" ? rawSession : null;
    const [requests, setRequests] = useState([]);
    const [orders, setOrders] = useState([]);
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("pending");
    const [searchQuery, setSearchQuery] = useState("");
    const [reviewNotes, setReviewNotes] = useState({});
    const [cancelReasons, setCancelReasons] = useState({});
    const [statusMessage, setStatusMessage] = useState("");
    const [statusTone, setStatusTone] = useState("success");
    const [orderMessage, setOrderMessage] = useState("");
    const [orderTone, setOrderTone] = useState("success");
    const [checkingSession, setCheckingSession] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reviewingRequestId, setReviewingRequestId] = useState(null);
    const [cancelingOrderId, setCancelingOrderId] = useState(null);
    const now = useLiveNow();
    useEffect(() => {
        let cancelled = false;
        async function initializeDashboard() {
            if (!hydrated) {
                return;
            }
            if (!session) {
                setCheckingSession(false);
                return;
            }
            setCheckingSession(true);
            try {
                const dashboardData = await loadAdminDashboardData(session);
                if (cancelled) {
                    return;
                }
                setRequests(dashboardData.requests);
                setOrders(dashboardData.orders);
            }
            catch (error) {
                if (cancelled) {
                    return;
                }
                const message = error instanceof Error ? error.message : "Could not load the admin dashboard.";
                setStatusMessage(message);
                setStatusTone("error");
                setOrderMessage(message);
                setOrderTone("error");
            }
            finally {
                if (!cancelled) {
                    setCheckingSession(false);
                }
            }
        }
        void initializeDashboard();
        return () => {
            cancelled = true;
        };
    }, [hydrated, session]);
    const filteredRequests = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        return requests.filter((request) => {
            const typeMatch = typeFilter === "all" || request.type === typeFilter;
            const statusMatch = statusFilter === "all" || request.status === statusFilter;
            if (!normalizedQuery) {
                return typeMatch && statusMatch;
            }
            const payloadText = Object.values(request.payload)
                .join(" ")
                .toLowerCase();
            const queryMatch = request.applicantName.toLowerCase().includes(normalizedQuery) ||
                request.applicantEmail.toLowerCase().includes(normalizedQuery) ||
                payloadText.includes(normalizedQuery);
            return typeMatch && statusMatch && queryMatch;
        });
    }, [requests, searchQuery, statusFilter, typeFilter]);
    const stats = useMemo(() => {
        return requests.reduce((acc, request) => {
            acc.total += 1;
            if (request.status === "pending") {
                acc.pending += 1;
            }
            else if (request.status === "approved") {
                acc.approved += 1;
            }
            else {
                acc.rejected += 1;
            }
            return acc;
        }, {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
        });
    }, [requests]);
    const orderStats = useMemo(() => {
        return orders.reduce((acc, order) => {
            acc.total += 1;
            if (order.status === "pending") {
                acc.pending += 1;
            }
            else if (order.status === "accepted") {
                acc.accepted += 1;
            }
            else if (order.status === "canceled") {
                acc.canceled += 1;
            }
            else {
                acc.delivered += 1;
            }
            if (order.status === "pending" && order.routeMode === "free-first") {
                acc.waitingFree += 1;
            }
            if (order.status === "pending" && order.routeMode === "paid-only") {
                acc.waitingPaid += 1;
            }
            return acc;
        }, {
            total: 0,
            pending: 0,
            accepted: 0,
            canceled: 0,
            delivered: 0,
            waitingFree: 0,
            waitingPaid: 0,
        });
    }, [orders]);
    async function refreshDashboard() {
        if (!session) {
            return;
        }
        setRefreshing(true);
        try {
            const dashboardData = await loadAdminDashboardData(session);
            setRequests(dashboardData.requests);
            setOrders(dashboardData.orders);
            setStatusMessage("Requests refreshed.");
            setStatusTone("success");
            setOrderMessage("Order updates refreshed.");
            setOrderTone("success");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Could not refresh dashboard data.";
            setStatusMessage(message);
            setStatusTone("error");
            setOrderMessage(message);
            setOrderTone("error");
        }
        finally {
            setRefreshing(false);
        }
    }
    function logout() {
        clearAuthSession();
        router.push("/");
    }
    async function handleReview(requestId, nextStatus) {
        if (!session) {
            return;
        }
        setReviewingRequestId(requestId);
        try {
            const note = reviewNotes[requestId]?.trim();
            await reviewApprovalRequest(requestId, nextStatus, note, session);
            const dashboardData = await loadAdminDashboardData(session);
            setRequests(dashboardData.requests);
            setOrders(dashboardData.orders);
            setStatusMessage(nextStatus === "approved"
                ? "Request approved successfully."
                : "Request rejected successfully.");
            setStatusTone("success");
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Could not review this request.");
            setStatusTone("error");
        }
        finally {
            setReviewingRequestId(null);
        }
    }
    async function cancelOrder(orderId) {
        if (!session) {
            return;
        }
        const reason = (cancelReasons[orderId] ?? "").trim();
        if (!reason) {
            setOrderMessage("Enter a cancel reason before canceling the order.");
            setOrderTone("error");
            return;
        }
        setCancelingOrderId(orderId);
        try {
            const result = await cancelDeliveryOrder(orderId, session, reason);
            setOrders(result.orders);
            if (result.ok) {
                setCancelReasons((current) => ({ ...current, [orderId]: "" }));
            }
            setOrderMessage(result.ok ? "Order canceled successfully." : result.error ?? "Could not cancel order.");
            setOrderTone(result.ok ? "success" : "error");
        }
        finally {
            setCancelingOrderId(null);
        }
    }
    if (checkingSession || !session) {
        return (<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30">
        <div className="w-full max-w-md">
          <CardLoadingState message="Verifying admin access..."/>
        </div>
      </main>);
    }
    return (<div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 lg:px-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-foreground">Admin Dashboard</h1>
              <Badge>
                <ShieldCheck className="h-3.5 w-3.5"/>
                Approved Admin
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Review registrations, food approvals, and delivery activity from one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
            <NotificationsMenu session={session}/>
            <Button variant="outline" size="sm" onClick={() => void refreshDashboard()} disabled={refreshing}>
              <RefreshCcw className="h-4 w-4"/>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="destructive" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4"/>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Requests" value={stats.total}/>
          <StatCard title="Pending" value={stats.pending} tone="secondary"/>
          <StatCard title="Approved" value={stats.approved} tone="default"/>
          <StatCard title="Rejected" value={stats.rejected} tone="destructive"/>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Requests</CardTitle>
            <CardDescription>Narrow requests by type and status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Request Type</p>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="kitchen-registration">Kitchen Registration</SelectItem>
                  <SelectItem value="delivery-registration">Delivery Registration</SelectItem>
                  <SelectItem value="food-listing">Food Listing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Search</p>
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by applicant or request details"/>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription>
              {filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"} in current view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineStatusMessage message={statusMessage} tone={statusTone === "error" ? "error" : "success"} className="text-xs"/>

            {filteredRequests.length === 0 ? (<SectionEmptyState title="No approval requests" description="Try another filter or refresh to check for new requests." className="p-8"/>) : (filteredRequests.map((request) => {
            const isReviewing = reviewingRequestId === request.id;
            const deliveryPlan = getDeliveryPlanFromRequest(request);
            return (<div key={request.id} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {REQUEST_LABELS[request.type]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.applicantName} ({request.applicantEmail})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {formatDate(request.submittedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {request.type === "delivery-registration" && deliveryPlan && (<Badge variant="outline">
                            {formatDeliveryPlanLabel(deliveryPlan)}
                          </Badge>)}
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(request.payload).map(([key, value]) => (<div key={`${request.id}-${key}`} className="rounded-md border border-border bg-background px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{formatLabel(key)}</p>
                          <p className="text-sm text-foreground">{value || "-"}</p>
                        </div>))}
                    </div>

                    {request.type === "food-listing" && (<div className="mt-3 rounded-md border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Food Review Note
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Approving or rejecting this request updates the submitted food record and the public catalog.
                        </p>
                      </div>)}

                    {request.status === "pending" ? (<div className="mt-3 space-y-2">
                        <Input value={reviewNotes[request.id] ?? ""} onChange={(event) => setReviewNotes((prev) => ({
                        ...prev,
                        [request.id]: event.target.value,
                    }))} placeholder="Optional note for this decision"/>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void handleReview(request.id, "approved")} disabled={isReviewing}>
                            <CheckCircle2 className="h-4 w-4"/>
                            {isReviewing ? "Saving..." : "Approve"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void handleReview(request.id, "rejected")} disabled={isReviewing}>
                            <XCircle className="h-4 w-4"/>
                            Reject
                          </Button>
                        </div>
                      </div>) : (<div className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                        Reviewed: {request.reviewedAt ? formatDate(request.reviewedAt) : "N/A"}
                        {request.reviewNote ? ` | Note: ${request.reviewNote}` : ""}
                      </div>)}
                  </div>);
        }))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Updates</CardTitle>
            <CardDescription>
              Track order progress and admin cancellation actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <OrderStat title="Total Orders" value={orderStats.total}/>
              <OrderStat title="Pending" value={orderStats.pending}/>
              <OrderStat title="Accepted" value={orderStats.accepted}/>
              <OrderStat title="Canceled" value={orderStats.canceled}/>
              <OrderStat title="Delivered" value={orderStats.delivered}/>
              <OrderStat title="Waiting Free Service" value={orderStats.waitingFree}/>
              <OrderStat title="Waiting Paid Service" value={orderStats.waitingPaid}/>
            </div>

            <InlineStatusMessage message={orderMessage} tone={orderTone === "error" ? "error" : "success"} className="text-xs"/>

            {orders.length === 0 ? (<SectionEmptyState title="No orders found" description="Orders will appear here once students start placing them." className="p-8"/>) : (orders.map((order) => {
            const canCancelOrder = order.status === "pending" || order.status === "accepted";
            return (<div key={order.id} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Student: {order.studentName} ({order.studentEmail})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getOrderStatusVariant(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                        <Badge variant={order.routeMode === "free-first" ? "secondary" : "default"}>
                          {order.routeMode === "free-first" ? "Free Delivery Service" : "Paid Delivery Service"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      Items: {order.totals.items} | Cash: {order.totals.cashPayable} BDT | Points: {order.totals.pointsPayable}
                      {order.assignedToName ? ` | Assigned: ${order.assignedToName}` : ""}
                    </div>

                    <div className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      {getFreeQueueStatusText(order, now)}
                    </div>

                    {canCancelOrder ? (<div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Admin Cancel
                        </p>
                        <Input value={cancelReasons[order.id] ?? ""} onChange={(event) => setCancelReasons((current) => ({
                        ...current,
                        [order.id]: event.target.value,
                    }))} placeholder="Reason for cancellation"/>
                        <Button size="sm" variant="destructive" onClick={() => void cancelOrder(order.id)} disabled={cancelingOrderId === order.id}>
                          {cancelingOrderId === order.id ? "Canceling..." : "Cancel Order"}
                        </Button>
                      </div>) : null}

                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Order Timeline
                      </p>
                      {order.incidents.length === 0 ? (<p className="text-xs text-muted-foreground">No updates yet.</p>) : (order.incidents
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((incident) => (<div key={incident.id} className="rounded-md border border-border bg-background px-3 py-2">
                              <p className="text-xs font-medium text-foreground">{incident.message}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {formatIncidentType(incident.type)} | {incident.actorName} ({incident.actorRole}) | {formatDate(incident.createdAt)}
                              </p>
                            </div>)))}
                    </div>
                  </div>);
        }))}
          </CardContent>
        </Card>
      </main>
    </div>);
}
function StatCard({ title, value, tone = "outline", }) {
    return (<Card>
      <CardHeader className="gap-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-mono">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant={tone}>{title}</Badge>
      </CardContent>
    </Card>);
}
function getStatusBadgeVariant(status) {
    if (status === "approved") {
        return "default";
    }
    if (status === "rejected") {
        return "destructive";
    }
    return "secondary";
}
function formatDate(value) {
    return formatAppDateTime(value);
}
function OrderStat({ title, value }) {
    return (<div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold font-mono text-foreground">{value}</p>
    </div>);
}
function getOrderStatusVariant(status) {
    if (status === "canceled") {
        return "destructive";
    }
    if (status === "delivered") {
        return "default";
    }
    if (status === "accepted") {
        return "secondary";
    }
    return "outline";
}
function formatIncidentType(type) {
    if (type === "canceled") {
        return "Canceled";
    }
    if (type === "forwarded-to-paid") {
        return "Moved To Paid Service";
    }
    if (type === "chat") {
        return "Chat Message";
    }
    if (type === "accepted") {
        return "Accepted";
    }
    if (type === "delivered") {
        return "Delivered";
    }
    return "Created";
}
function getDeliveryPlanFromRequest(request) {
    const plan = request.payload.plan;
    if (plan === "free" || plan === "permanent") {
        return plan;
    }
    return null;
}
function formatLabel(input) {
    return input
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/-/g, " ")
        .trim();
}
