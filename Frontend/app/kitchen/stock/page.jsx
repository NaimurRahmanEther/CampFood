"use client";
import { Minus, Plus, RefreshCw } from "lucide-react";
import { KitchenShell } from "@/components/kitchen/kitchen-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLoadingState, InlineStatusMessage, SectionEmptyState } from "@/components/ui/page-state";
import { Switch } from "@/components/ui/switch";
import { useKitchenMenu } from "@/hooks/use-kitchen-menu";
import { getFoodOptionLabel } from "@/lib/foods";
const FOOD_IMAGE_FALLBACK_URL = "/placeholder.svg";
export default function KitchenStockPage() {
    return (<KitchenShell title="Stock Management" description="Adjust inventory fast and control which items are visible to students.">
      {(session) => <StockContent session={session}/>}
    </KitchenShell>);
}
function StockContent({ session }) {
    const { items, updateItem, ready, loadError } = useKitchenMenu(session);
    if (!ready) {
        return <CardLoadingState message="Loading stock information..."/>;
    }
    const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
    const totalStock = items.reduce((total, item) => total + item.stock, 0);
    const lowStock = items.filter((item) => item.stock > 0 && item.stock <= 5).length;
    const unavailable = items.filter((item) => !item.isAvailable || item.stock === 0).length;
    async function updateItemStock(itemId, delta) {
        const item = items.find((entry) => entry.id === itemId);
        if (!item) {
            return;
        }
        await updateItem(itemId, {
            name: item.name,
            category: item.category,
            mealTime: item.mealTime,
            foodOption: item.foodOption,
            price: item.price,
            stock: Math.max(0, item.stock + delta),
            isAvailable: item.isAvailable,
        });
    }
    async function toggleAvailability(itemId, checked) {
        const item = items.find((entry) => entry.id === itemId);
        if (!item) {
            return;
        }
        await updateItem(itemId, {
            name: item.name,
            category: item.category,
            mealTime: item.mealTime,
            foodOption: item.foodOption,
            price: item.price,
            stock: item.stock,
            isAvailable: checked,
        });
    }
    async function resetOutOfStockItems() {
        const emptyCount = items.filter((item) => item.stock === 0).length;
        if (emptyCount === 0) {
            return;
        }
        const confirmed = window.confirm(`Refill ${emptyCount} out-of-stock item${emptyCount === 1 ? "" : "s"} to 10 portions each?`);
        if (!confirmed) {
            return;
        }
        await Promise.all(items
            .filter((item) => item.stock === 0)
            .map((item) => updateItem(item.id, {
            name: item.name,
            category: item.category,
            mealTime: item.mealTime,
            foodOption: item.foodOption,
            price: item.price,
            stock: 10,
            isAvailable: item.isAvailable,
        })));
    }
    return (<div className="space-y-6">
      <InlineStatusMessage message={loadError} tone="error"/>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Total Portions</CardDescription>
            <CardTitle className="text-2xl font-mono">{totalStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Low Stock Items</CardDescription>
            <CardTitle className="text-2xl font-mono">{lowStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Unavailable Items</CardDescription>
            <CardTitle className="text-2xl font-mono">{unavailable}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Stock Controls</CardTitle>
            <CardDescription>
              Use quick controls for fast updates during rush hours.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetOutOfStockItems}>
            <RefreshCw className="h-4 w-4"/>
            Refill Empty (10)
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedItems.length === 0 ? (<SectionEmptyState title="No menu items yet" description="Add items from Menu Manager first." className="p-8"/>) : (sortedItems.map((item) => {
            const isLow = item.stock > 0 && item.stock <= 5;
            const hidden = !item.isAvailable || item.stock === 0;
            return (<div key={item.id} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                        <h3 className="font-medium text-foreground">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.category} - {item.mealTime} - {getFoodOptionLabel(item.foodOption)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isLow ? "destructive" : "secondary"}>
                        Stock: {item.stock}
                      </Badge>
                      <Badge variant={hidden ? "outline" : "default"}>
                        {hidden ? "Hidden" : "Live"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => void updateItemStock(item.id, -1)}>
                      <Minus className="h-4 w-4"/>
                      1
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void updateItemStock(item.id, -5)}>
                      <Minus className="h-4 w-4"/>
                      5
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void updateItemStock(item.id, 1)}>
                      <Plus className="h-4 w-4"/>
                      1
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void updateItemStock(item.id, 5)}>
                      <Plus className="h-4 w-4"/>
                      5
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Visible</span>
                      <Switch checked={item.isAvailable} onCheckedChange={(checked) => void toggleAvailability(item.id, checked)}/>
                    </div>
                  </div>
                </div>);
        }))}
        </CardContent>
      </Card>
    </div>);
}
