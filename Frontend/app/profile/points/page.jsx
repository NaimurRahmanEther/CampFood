"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, RefreshCcw } from "lucide-react";
import { StudentProfileShell } from "@/components/profile/student-profile-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardErrorState, CardLoadingState, InlineStatusMessage } from "@/components/ui/page-state";
import { formatAppDateTime } from "@/lib/date-format";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { acceptStudentPointTransfer, loadStudentPointState, rejectStudentPointTransfer, transferStudentPoints, } from "@/lib/student-points";
export default function ProfilePointsPage() {
    return (<StudentProfileShell title="Points" description="Check your point balance, transfer points if eligible, and review your recent point activity.">
      {(session) => <PointsContent session={session}/>}
    </StudentProfileShell>);
}
function PointsContent({ session }) {
    const [points, setPoints] = useState(null);
    const [receiverId, setReceiverId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferMessage, setTransferMessage] = useState("");
    const [transferTone, setTransferTone] = useState("success");
    const [pointsMessage, setPointsMessage] = useState("");
    const [pointsTone, setPointsTone] = useState("success");
    const [loadingPoints, setLoadingPoints] = useState(true);
    const [refreshingPoints, setRefreshingPoints] = useState(false);
    const [transferringPoints, setTransferringPoints] = useState(false);
    const [activeRequestId, setActiveRequestId] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function initializePoints() {
            setLoadingPoints(true);
            try {
                const pointState = await loadStudentPointState(session);
                if (cancelled) {
                    return;
                }
                setPoints(pointState);
            }
            catch (error) {
                if (!cancelled) {
                    setPointsMessage(error instanceof Error ? error.message : "Could not load point data.");
                    setPointsTone("error");
                }
            }
            finally {
                if (!cancelled) {
                    setLoadingPoints(false);
                }
            }
        }
        void initializePoints();
        return () => {
            cancelled = true;
        };
    }, [session]);
    useAutoRefresh({
        enabled: Boolean(session),
        intervalMs: 30000,
        onRefresh: () => refreshPointState(true),
    });
    async function refreshPointState(silent = false) {
        if (!silent) {
            setRefreshingPoints(true);
            setPointsMessage("");
        }
        try {
            const pointState = await loadStudentPointState(session);
            setPoints(pointState);
            if (!silent) {
                setPointsMessage("Point summary refreshed.");
                setPointsTone("success");
            }
        }
        catch (error) {
            if (!silent) {
                setPointsMessage(error instanceof Error ? error.message : "Could not refresh points.");
                setPointsTone("error");
            }
        }
        finally {
            if (!silent) {
                setRefreshingPoints(false);
            }
        }
    }
    async function handleTransferPoints(e) {
        e.preventDefault();
        setTransferringPoints(true);
        try {
            const amount = Number(transferAmount);
            const result = await transferStudentPoints(session, receiverId, amount);
            if (!result.ok || !result.state) {
                setTransferMessage(result.error ?? "Transfer failed");
                setTransferTone("error");
                return;
            }
            setPoints(result.state);
            setTransferAmount("");
            setReceiverId("");
            setTransferMessage("Point share request sent. The student must accept it first.");
            setTransferTone("success");
        }
        finally {
            setTransferringPoints(false);
        }
    }
    async function handleAcceptTransfer(requestId) {
        setActiveRequestId(`accept:${requestId}`);
        try {
            const result = await acceptStudentPointTransfer(session, requestId);
            if (!result.ok || !result.state) {
                setTransferMessage(result.error ?? "Could not accept this point request.");
                setTransferTone("error");
                return;
            }
            setPoints(result.state);
            setTransferMessage("Point request accepted. The points were added to your total.");
            setTransferTone("success");
        }
        finally {
            setActiveRequestId(null);
        }
    }
    async function handleRejectTransfer(requestId) {
        setActiveRequestId(`reject:${requestId}`);
        try {
            const result = await rejectStudentPointTransfer(session, requestId);
            if (!result.ok || !result.state) {
                setTransferMessage(result.error ?? "Could not reject this point request.");
                setTransferTone("error");
                return;
            }
            setPoints(result.state);
            setTransferMessage("Point request rejected.");
            setTransferTone("success");
        }
        finally {
            setActiveRequestId(null);
        }
    }
    if (loadingPoints) {
        return <CardLoadingState message="Loading points..."/>;
    }
    if (!points) {
        return (<CardErrorState message={pointsMessage || "Could not load points right now."} actionLabel="Try Again" onAction={() => void refreshPointState()}/>);
    }
    return (<>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary"/>
              Student Points
            </CardTitle>
            <CardDescription>Your points, transfer eligibility, and recent activity.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void refreshPointState()} disabled={refreshingPoints}>
            <RefreshCcw className="h-4 w-4"/>
            {refreshingPoints ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Available Points" value={String(points.points)}/>
            <StatCard label="Total Earned" value={String(points.totalEarned)}/>
            <StatCard label="Total Transferred" value={String(points.totalTransferred)}/>
            <StatCard label="Delivery Access" value={points.isFreeDeliveryPartner ? "Enabled" : "Locked"}/>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Point Rules</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <RuleCard label="Student Registration" value={`+${points.registrationBonusPoints} pts`} hint="Added when your student account is created."/>
              <RuleCard label="Free Delivery Approval" value={`+${points.freeDeliveryBonusPoints} pts`} hint="Added after admin approves your free delivery plan."/>
              <RuleCard label="Point Transfers" value={points.isFreeDeliveryPartner ? "Unlocked" : "Locked"} hint={points.isFreeDeliveryPartner
            ? "You can request point transfers with other students."
            : "Transfer access opens after free delivery approval."}/>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Monthly Rewards</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <RuleCard label={`Order Spend (${points.monthlyReward.currentMonth || "Current Month"})`} value={`BDT ${points.monthlyReward.currentMonthSpend}/${points.monthlyReward.spendThreshold}`} hint={points.monthlyReward.currentMonthSpend >= points.monthlyReward.spendThreshold
            ? "Current month target reached. Reward is applied once for each qualifying month."
            : `Spend BDT ${points.monthlyReward.currentMonthSpendRemaining} more this month to qualify.`}/>
              <RuleCard label="Delivery Consistency" value={points.monthlyReward.deliveryRewardEligible
            ? `${points.monthlyReward.currentMonthDeliveryDays}/${points.monthlyReward.currentMonthTotalDays} days`
            : "Not eligible"} hint={points.monthlyReward.deliveryRewardEligible
            ? "For free delivery partners: at least one delivery every day. Free and paid assignments both count."
            : "Available only for approved free delivery partners."}/>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Last month ({points.monthlyReward.previousMonth || "N/A"}) - spend reward:{" "}
              {points.monthlyReward.previousMonthSpendRewarded
            ? "rewarded"
            : points.monthlyReward.previousMonthSpendQualified
                ? "qualified (pending refresh)"
                : "not qualified"}
              {points.monthlyReward.deliveryRewardEligible
            ? `, delivery reward: ${points.monthlyReward.previousMonthDeliveryRewarded
                ? "rewarded"
                : points.monthlyReward.previousMonthDeliveryQualified
                    ? "qualified (pending refresh)"
                    : "not qualified"}`
            : ""}
              . Timezone: {points.monthlyReward.timezone}.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Points Transfer</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {points.isFreeDeliveryPartner
            ? "You can send point requests to another student by student ID. Their points increase only after they accept."
            : "Point transfer unlocks after student delivery registration. Manage that from the Delivery section."}
            </p>
            {!points.isFreeDeliveryPartner ? (<Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/profile/delivery">Open Delivery Section</Link>
              </Button>) : null}
          </div>

          {points.isFreeDeliveryPartner ? (<div className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground">Send Point Request</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Share points by student ID. The receiver must accept before the points move.
              </p>
              <form onSubmit={handleTransferPoints} className="mt-4 grid gap-3 sm:grid-cols-3">
                <Input placeholder="Receiver Student ID" value={receiverId} onChange={(e) => {
                setReceiverId(e.target.value);
                setTransferMessage("");
            }}/>
                <Input type="number" min={1} placeholder="Points" value={transferAmount} onChange={(e) => {
                setTransferAmount(e.target.value);
                setTransferMessage("");
            }}/>
                <Button type="submit" disabled={transferringPoints}>
                  {transferringPoints ? "Sending..." : "Send Request"}
                </Button>
              </form>
              <InlineStatusMessage message={transferMessage} tone={transferTone === "error" ? "error" : "success"} className="mt-2 text-sm"/>
            </div>) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <RequestCard title="Incoming Point Requests" description="Accept a request to add those points to your total." emptyMessage="No incoming point requests right now.">
              {points.pendingIncomingTransfers.map((request) => (<div key={request.id} className="rounded-lg border border-border bg-background px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {request.senderName} ({request.senderStudentId})
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Wants to share <span className="font-semibold text-foreground">{request.amount} pts</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested: {formatDate(request.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleAcceptTransfer(request.id)} disabled={activeRequestId !== null}>
                      {activeRequestId === `accept:${request.id}` ? "Accepting..." : "Accept"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleRejectTransfer(request.id)} disabled={activeRequestId !== null}>
                      {activeRequestId === `reject:${request.id}` ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                </div>))}
            </RequestCard>

            <RequestCard title="Outgoing Point Requests" description="These requests stay pending until the other student accepts or rejects them." emptyMessage="No outgoing point requests right now.">
              {points.pendingOutgoingTransfers.map((request) => (<div key={request.id} className="rounded-lg border border-border bg-background px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {request.receiverName} ({request.receiverStudentId})
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pending request for{" "}
                    <span className="font-semibold text-foreground">{request.amount} pts</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sent: {formatDate(request.createdAt)}
                  </p>
                </div>))}
            </RequestCard>
          </div>

          <InlineStatusMessage message={pointsMessage} tone={pointsTone === "error" ? "error" : "success"}/>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Point Activity</CardTitle>
          <CardDescription>Your recent point transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {points.transactions.length === 0 ? (<p className="text-sm text-muted-foreground">No point transactions yet.</p>) : (points.transactions.slice(0, 8).map((item) => (<div key={item.id} className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.note}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatAppDateTime(item.createdAt)}
                  </p>
                </div>
                <p className="text-sm font-bold font-mono text-primary">
                  {item.type === "bonus" || item.type === "refund" ? `+${item.amount}` : `-${item.amount}`} pts
                </p>
              </div>)))}
        </CardContent>
      </Card>
    </>);
}
function StatCard({ label, value }) {
    return (<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold font-mono">{value}</p>
    </div>);
}
function RuleCard({ label, value, hint, }) {
    return (<div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>);
}
function RequestCard({ title, description, emptyMessage, children, }) {
    const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
    return (<div className="rounded-lg border border-border bg-muted/20 p-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? items : <p className="text-sm text-muted-foreground">{emptyMessage}</p>}
      </div>
    </div>);
}
function formatDate(value) {
    return formatAppDateTime(value);
}
