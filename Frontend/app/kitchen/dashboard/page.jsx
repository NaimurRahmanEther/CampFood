"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, PackageCheck, PackageX, PartyPopper, Pencil, ShieldCheck, Trash2, Wallet, XCircle, } from "lucide-react";
import { KitchenShell } from "@/components/kitchen/kitchen-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardLoadingState, InlineStatusMessage, SectionEmptyState } from "@/components/ui/page-state";
import { Switch } from "@/components/ui/switch";
import { useKitchenMenu } from "@/hooks/use-kitchen-menu";
import { formatAppCompactDate, formatAppDateTime } from "@/lib/date-format";
import { getFoodOptionLabel } from "@/lib/foods";
import { loadHallFestItems, removeHallFestItem, upsertHallFestItem, } from "@/lib/hall-fest";
const initialHallFestDraft = {
    title: "",
    festDate: "",
    specialMenu: "",
    notes: "",
    isActive: true,
};
const FOOD_IMAGE_FALLBACK_URL = "/placeholder.svg";
export default function KitchenDashboardPage() {
    return (<KitchenShell title="Kitchen Dashboard" description="Track approvals, stock health, and daily kitchen operations from one dashboard.">
      {(session) => <DashboardContent session={session}/>}
    </KitchenShell>);
}
function DashboardContent({ session }) {
    const { items, ready, loadError } = useKitchenMenu(session);
    const [hallFestItems, setHallFestItems] = useState([]);
    const [hallFestDraft, setHallFestDraft] = useState(initialHallFestDraft);
    const [editingFestId, setEditingFestId] = useState(null);
    const [hallFestMessage, setHallFestMessage] = useState("");
    const totalItems = items.length;
    const liveItems = items.filter((item) => item.isAvailable && item.stock > 0).length;
    const outOfStock = items.filter((item) => item.stock === 0).length;
    const lowStock = items.filter((item) => item.stock > 0 && item.stock <= 5).length;
    const approvedItems = items.filter((item) => item.approvalStatus === "approved").length;
    const pendingApproval = items.filter((item) => item.approvalStatus === "pending").length;
    const rejectedItems = items.filter((item) => item.approvalStatus === "rejected").length;
    const stockValue = items.reduce((total, item) => total + item.price * item.stock, 0);
    const kitchenRoleLabel = session.role === "hall-kitchen" ? "Hall Kitchen" : "Campus Kitchen";
    const pendingActionCount = lowStock + pendingApproval + rejectedItems;
    const recentItems = [...items]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6);
    useEffect(() => {
        let cancelled = false;
        if (session.role !== "hall-kitchen") {
            setHallFestItems([]);
            return;
        }
        async function syncHallFests() {
            try {
                const items = await loadHallFestItems(session);
                if (!cancelled) {
                    setHallFestItems(items);
                }
            }
            catch {
                if (!cancelled) {
                    setHallFestItems([]);
                }
            }
        }
        void syncHallFests();
        return () => {
            cancelled = true;
        };
    }, [session]);
    function resetHallFestDraft() {
        setHallFestDraft(initialHallFestDraft);
        setEditingFestId(null);
    }
    async function handleHallFestSubmit(e) {
        e.preventDefault();
        if (session.role !== "hall-kitchen") {
            return;
        }
        const title = hallFestDraft.title.trim();
        const specialMenu = hallFestDraft.specialMenu.trim();
        const notes = hallFestDraft.notes.trim();
        if (!title || !hallFestDraft.festDate || !specialMenu) {
            return;
        }
        try {
            const next = await upsertHallFestItem(session, {
                id: editingFestId ?? undefined,
                title,
                festDate: hallFestDraft.festDate,
                specialMenu,
                notes,
                isActive: hallFestDraft.isActive,
            });
            setHallFestItems(next);
            setHallFestMessage(editingFestId ? "Hall fest updated successfully." : "Hall fest added successfully.");
            resetHallFestDraft();
        }
        catch (error) {
            setHallFestMessage(error instanceof Error ? error.message : "Could not save hall fest.");
        }
    }
    function editHallFest(itemId) {
        const selected = hallFestItems.find((item) => item.id === itemId);
        if (!selected) {
            return;
        }
        setEditingFestId(itemId);
        setHallFestDraft({
            title: selected.title,
            festDate: selected.festDate,
            specialMenu: selected.specialMenu,
            notes: selected.notes,
            isActive: selected.isActive,
        });
        setHallFestMessage("");
    }
    async function deleteHallFest(itemId) {
        if (session.role !== "hall-kitchen") {
            return;
        }
        const confirmed = window.confirm("Delete this hall fest entry?");
        if (!confirmed) {
            return;
        }
        try {
            const next = await removeHallFestItem(session, itemId);
            setHallFestItems(next);
            setHallFestMessage("Hall fest removed.");
            if (editingFestId === itemId) {
                resetHallFestDraft();
            }
        }
        catch (error) {
            setHallFestMessage(error instanceof Error ? error.message : "Could not delete hall fest.");
        }
    }
    if (!ready) {
        return <CardLoadingState message="Loading your kitchen data..."/>;
    }
    return (<div className="space-y-6">
      <InlineStatusMessage message={loadError} tone="error"/>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">{kitchenRoleLabel} Dashboard</CardTitle>
          <CardDescription>
            Similar workflow style to the student dashboard: clear status cards, quick actions, and
            recent updates in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{kitchenRoleLabel} Workspace</Badge>
            <Badge variant="secondary">Live Items: {liveItems}</Badge>
            <Badge variant="outline">Pending Actions: {pendingActionCount}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/kitchen/menu">Open Menu Manager</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/kitchen/stock">Open Stock Control</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Total Menu Items</CardDescription>
            <CardTitle className="text-2xl font-mono">{totalItems}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageCheck className="h-4 w-4 text-primary"/>
            {liveItems} currently available
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Out of Stock</CardDescription>
            <CardTitle className="text-2xl font-mono">{outOfStock}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageX className="h-4 w-4 text-destructive"/>
            Update stock from the stock page
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Pending Admin Review</CardDescription>
            <CardTitle className="text-2xl font-mono">{pendingApproval}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4 text-amber-500"/>
            Waiting for approval from admin
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Rejected Items</CardDescription>
            <CardTitle className="text-2xl font-mono">{rejectedItems}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4 text-destructive"/>
            Update and resubmit from Menu Manager
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary"/>
              Admin Approval Sync
            </CardTitle>
            <CardDescription>
              Track which items are live, waiting on admin, or need edits before resubmission.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved</p>
              <p className="mt-2 text-2xl font-mono text-foreground">{approvedItems}</p>
              <p className="mt-1 text-xs text-muted-foreground">Visible to students when stock is available.</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
              <p className="mt-2 text-2xl font-mono text-foreground">{pendingApproval}</p>
              <p className="mt-1 text-xs text-muted-foreground">Recently created or edited items under review.</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs Attention</p>
              <p className="mt-2 text-2xl font-mono text-foreground">{lowStock + rejectedItems}</p>
              <p className="mt-1 text-xs text-muted-foreground">Low stock and rejected items that may block sales.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kitchen Snapshot</CardTitle>
            <CardDescription>Quick actions for operational issues and admin feedback.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500"/>
                <div>
                  <p className="text-sm font-medium text-foreground">Low Stock Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    {lowStock} item{lowStock === 1 ? "" : "s"} have 1-5 portions left.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-4 w-4 text-secondary"/>
                <div>
                  <p className="text-sm font-medium text-foreground">Estimated Stock Value</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(stockValue)} BDT across your current inventory.
                  </p>
                </div>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/kitchen/menu">Open Menu Manager</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Updated Items</CardTitle>
          <CardDescription>
            Latest changes in your menu and inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentItems.length === 0 ? (<SectionEmptyState title="No menu items yet" description="Create your first item in Menu Manager to start tracking updates here." className="p-8"/>) : (recentItems.map((item) => (<div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-md border border-border bg-muted/30">
                    <img src={item.imageUrl || FOOD_IMAGE_FALLBACK_URL} alt={item.name} className="h-full w-full object-cover" onError={(event) => {
                const target = event.currentTarget;
                if (target.dataset.fallbackApplied === "true") {
                    return;
                }
                target.dataset.fallbackApplied = "true";
                target.src = FOOD_IMAGE_FALLBACK_URL;
            }}/>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} - {item.mealTime} - {getFoodOptionLabel(item.foodOption)} - Updated{" "}
                      {formatAppDateTime(item.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getApprovalBadgeVariant(item.approvalStatus)}>
                    {formatApprovalLabel(item.approvalStatus)}
                  </Badge>
                  <Badge variant={item.stock > 0 ? "secondary" : "destructive"}>
                    Stock: {item.stock}
                  </Badge>
                  <Badge variant={item.isAvailable && item.stock > 0 ? "default" : "outline"}>
                    {item.isAvailable && item.stock > 0 ? "Live" : "Hidden"}
                  </Badge>
                </div>
              </div>)))}
        </CardContent>
      </Card>

      {session.role === "hall-kitchen" && (<Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary"/>
              Hall Fest Section
            </CardTitle>
            <CardDescription>
              Publish upcoming hall festivals, special menus, and event status for students.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <form onSubmit={handleHallFestSubmit} className="space-y-3 rounded-lg border border-border p-4">
              <InlineStatusMessage message={hallFestMessage}/>

              <div className="space-y-2">
                <Label htmlFor="hall-fest-title">Fest Title</Label>
                <Input id="hall-fest-title" value={hallFestDraft.title} onChange={(e) => setHallFestDraft((current) => ({
                ...current,
                title: e.target.value,
            }))} placeholder="e.g. Hall Pitha Utsob" required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hall-fest-date">Fest Date</Label>
                <Input id="hall-fest-date" type="date" value={hallFestDraft.festDate} onChange={(e) => setHallFestDraft((current) => ({
                ...current,
                festDate: e.target.value,
            }))} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hall-fest-menu">Special Menu</Label>
                <Input id="hall-fest-menu" value={hallFestDraft.specialMenu} onChange={(e) => setHallFestDraft((current) => ({
                ...current,
                specialMenu: e.target.value,
            }))} placeholder="e.g. Pitha Combo, Special Chicken Roast" required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hall-fest-notes">Notes</Label>
                <Input id="hall-fest-notes" value={hallFestDraft.notes} onChange={(e) => setHallFestDraft((current) => ({
                ...current,
                notes: e.target.value,
            }))} placeholder="Entry fee, serving time, venue details"/>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Fest Active</p>
                  <p className="text-xs text-muted-foreground">Show this fest to students when active.</p>
                </div>
                <Switch checked={hallFestDraft.isActive} onCheckedChange={(checked) => setHallFestDraft((current) => ({
                ...current,
                isActive: checked,
            }))}/>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingFestId ? "Update Fest" : "Add Fest"}
                </Button>
                {editingFestId && (<Button type="button" variant="outline" onClick={resetHallFestDraft}>
                    Cancel
                  </Button>)}
              </div>
            </form>

            <div className="space-y-3">
              {hallFestItems.length === 0 ? (<SectionEmptyState title="No hall fest announced yet" description="Add your first fest using the form to publish it for students." className="p-8"/>) : (hallFestItems
                .sort((a, b) => new Date(a.festDate).getTime() - new Date(b.festDate).getTime())
                .map((fest) => (<div key={fest.id} className="rounded-lg border border-border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{fest.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatHallFestDate(fest.festDate)}
                          </p>
                        </div>
                        <Badge variant={fest.isActive ? "default" : "outline"}>
                          {fest.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        <span className="font-medium">Special Menu:</span> {fest.specialMenu}
                      </p>
                      {fest.notes && (<p className="mt-1 text-xs text-muted-foreground">{fest.notes}</p>)}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => editHallFest(fest.id)}>
                          <Pencil className="h-4 w-4"/>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteHallFest(fest.id)}>
                          <Trash2 className="h-4 w-4"/>
                          Delete
                        </Button>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5"/>
                          Updated {formatAppDateTime(fest.updatedAt)}
                        </span>
                      </div>
                    </div>)))}
            </div>
          </CardContent>
        </Card>)}
    </div>);
}
function formatHallFestDate(value) {
    if (!value) {
        return "Date not set";
    }
    return formatAppCompactDate(value);
}
function formatApprovalLabel(status) {
    if (status === "approved") {
        return "Approved";
    }
    if (status === "rejected") {
        return "Rejected";
    }
    return "Pending Admin";
}
function getApprovalBadgeVariant(status) {
    if (status === "approved") {
        return "default";
    }
    if (status === "rejected") {
        return "destructive";
    }
    return "secondary";
}
