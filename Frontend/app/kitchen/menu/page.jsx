"use client";
import { Edit3, ImagePlus, PlusCircle, Trash2, X } from "lucide-react";
import { useState } from "react";
import { KitchenShell } from "@/components/kitchen/kitchen-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardLoadingState, InlineStatusMessage, SectionEmptyState } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useKitchenMenu } from "@/hooks/use-kitchen-menu";
import { formatAppDateTime } from "@/lib/date-format";
import { getFoodOptionHelperText, getFoodOptionLabel, } from "@/lib/foods";
const DEFAULT_FOOD_IMAGE = "/placeholder.svg";
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;
const initialDraft = {
    name: "",
    category: "",
    mealTime: "Any Time",
    foodOption: "Single",
    price: "",
    stock: "",
    isAvailable: true,
    imagePreviewUrl: DEFAULT_FOOD_IMAGE,
    imageFile: null,
};
const MEAL_TIME_OPTIONS = ["Any Time", "Lunch", "Dinner"];
const FOOD_OPTION_OPTIONS = ["Single", "System"];
export default function KitchenMenuPage() {
    return (<KitchenShell title="Menu Manager" description="Create, edit, and delete your own food items from one place.">
      {(session) => <MenuContent session={session}/>}
    </KitchenShell>);
}
function MenuContent({ session }) {
    const { items, createItem, updateItem, removeItem, ready, saving, loadError } = useKitchenMenu(session);
    const [draft, setDraft] = useState(initialDraft);
    const [editingId, setEditingId] = useState(null);
    const [requestNotice, setRequestNotice] = useState("");
    const [requestNoticeTone, setRequestNoticeTone] = useState("success");
    const [imageNotice, setImageNotice] = useState("");
    if (!ready) {
        return <CardLoadingState message="Loading menu data..."/>;
    }
    function resetDraft() {
        setDraft(initialDraft);
        setEditingId(null);
        setImageNotice("");
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setRequestNotice("");
        setRequestNoticeTone("success");
        const price = Number(draft.price);
        const stock = Number(draft.stock);
        const normalizedName = draft.name.trim();
        const normalizedCategory = draft.category.trim();
        if (!normalizedName || !normalizedCategory || Number.isNaN(price) || Number.isNaN(stock)) {
            return;
        }
        const safePrice = Math.max(0, price);
        const safeStock = Math.max(0, Math.floor(stock));
        try {
            await (editingId
                ? updateItem(editingId, {
                    name: normalizedName,
                    category: normalizedCategory,
                    mealTime: draft.mealTime,
                    foodOption: draft.foodOption,
                    price: safePrice,
                    stock: safeStock,
                    isAvailable: draft.isAvailable,
                    imageFile: draft.imageFile,
                })
                : createItem({
                    name: normalizedName,
                    category: normalizedCategory,
                    mealTime: draft.mealTime,
                    foodOption: draft.foodOption,
                    price: safePrice,
                    stock: safeStock,
                    isAvailable: draft.isAvailable,
                    imageFile: draft.imageFile,
                }));
            setRequestNotice(editingId
                ? "Food updated and resubmitted to admin for review."
                : "Food created and sent to admin for review.");
            setRequestNoticeTone("success");
            resetDraft();
        }
        catch (error) {
            setRequestNotice(error instanceof Error ? error.message : "Could not save this food item.");
            setRequestNoticeTone("error");
        }
    }
    async function handleImageUpload(event) {
        setImageNotice("");
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (!file.type.startsWith("image/")) {
            setImageNotice("Please upload a valid image file.");
            event.target.value = "";
            return;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            setImageNotice("Image is too large. Please keep it under 1 MB.");
            event.target.value = "";
            return;
        }
        try {
            const dataUrl = await readFileAsDataUrl(file);
            setDraft((current) => ({
                ...current,
                imagePreviewUrl: dataUrl,
                imageFile: file,
            }));
            setImageNotice("Image uploaded successfully.");
        }
        catch {
            setImageNotice("Could not read this file. Please try another image.");
        }
        finally {
            event.target.value = "";
        }
    }
    function clearDraftImage() {
        setDraft((current) => ({
            ...current,
            imagePreviewUrl: DEFAULT_FOOD_IMAGE,
            imageFile: null,
        }));
        setImageNotice("Food image reset to default.");
    }
    function startEditing(itemId) {
        const selected = items.find((item) => item.id === itemId);
        if (!selected) {
            return;
        }
        setEditingId(itemId);
        setDraft({
            name: selected.name,
            category: selected.category,
            mealTime: selected.mealTime,
            foodOption: selected.foodOption,
            price: String(selected.price),
            stock: String(selected.stock),
            isAvailable: selected.isAvailable,
            imagePreviewUrl: selected.imageUrl || DEFAULT_FOOD_IMAGE,
            imageFile: null,
        });
        setImageNotice("");
    }
    async function handleRemoveItem(itemId) {
        const confirmed = window.confirm("Delete this menu item?");
        if (!confirmed) {
            return;
        }
        try {
            await removeItem(itemId);
            if (editingId === itemId) {
                resetDraft();
            }
            setRequestNotice("Food item deleted.");
            setRequestNoticeTone("success");
        }
        catch (error) {
            setRequestNotice(error instanceof Error ? error.message : "Could not delete this food item.");
            setRequestNoticeTone("error");
        }
    }
    return (<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{editingId ? "Update Item" : "Create New Item"}</CardTitle>
          <CardDescription>
            {editingId
            ? "Edit details then save changes."
            : "Add a new dish for your kitchen menu."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InlineStatusMessage message={loadError} tone="error" className="mb-3 text-xs"/>
          <InlineStatusMessage message={requestNotice} tone={requestNoticeTone === "error" ? "error" : "success"} className="mb-3 text-xs"/>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-name">Food Name</Label>
              <Input id="menu-name" value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. Chicken Curry" required/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-category">Category</Label>
              <Input id="menu-category" value={draft.category} onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value }))} placeholder="e.g. Rice, Dal, Vegetable, Ruti, Chicken, Beef" required/>
              <p className="text-xs text-muted-foreground">
                Single item examples: rice, vegetable, dal, ruti, chicken, beef.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-meal-time">Meal Time</Label>
              <Select value={draft.mealTime} onValueChange={(value) => setDraft((current) => ({ ...current, mealTime: value }))}>
                <SelectTrigger id="menu-meal-time">
                  <SelectValue placeholder="Select meal time"/>
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TIME_OPTIONS.map((option) => (<SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-food-option">Menu Type</Label>
              <Select value={draft.foodOption} onValueChange={(value) => setDraft((current) => ({ ...current, foodOption: value }))}>
                <SelectTrigger id="menu-food-option">
                  <SelectValue placeholder="Select menu type"/>
                </SelectTrigger>
                <SelectContent>
                  {FOOD_OPTION_OPTIONS.map((option) => (<SelectItem key={option} value={option}>
                      {getFoodOptionLabel(option)}
                    </SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getFoodOptionHelperText(draft.foodOption)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-image">Food Image</Label>
              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 overflow-hidden rounded-md border border-border bg-muted/30">
                  <img src={draft.imagePreviewUrl || DEFAULT_FOOD_IMAGE} alt="Food preview" className="h-40 w-full object-cover" onError={(event) => {
            const target = event.currentTarget;
            if (target.dataset.fallbackApplied === "true") {
                return;
            }
            target.dataset.fallbackApplied = "true";
            target.src = DEFAULT_FOOD_IMAGE;
        }}/>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input id="menu-image" type="file" accept="image/*" onChange={handleImageUpload} className="max-w-full"/>
                  <Button type="button" size="sm" variant="outline" onClick={clearDraftImage} disabled={draft.imagePreviewUrl === DEFAULT_FOOD_IMAGE}>
                    <X className="h-4 w-4"/>
                    Remove
                  </Button>
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ImagePlus className="h-3.5 w-3.5"/>
                  Upload JPG/PNG/WebP. Max size 1 MB.
                </p>
                {imageNotice && (<p className="mt-2 text-xs font-medium text-primary">{imageNotice}</p>)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="menu-price">Price (BDT)</Label>
                <Input id="menu-price" type="number" min={0} step="1" value={draft.price} onChange={(e) => setDraft((current) => ({ ...current, price: e.target.value }))} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="menu-stock">Stock Qty</Label>
                <Input id="menu-stock" type="number" min={0} step="1" value={draft.stock} onChange={(e) => setDraft((current) => ({ ...current, stock: e.target.value }))} required/>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Visible for orders</p>
                <p className="text-xs text-muted-foreground">
                  Turn off to hide this item from students.
                </p>
              </div>
              <Switch checked={draft.isAvailable} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isAvailable: checked }))}/>
            </div>
            <p className="text-xs text-muted-foreground">
              Menu changes can require admin review before they appear live in student browsing.
            </p>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <PlusCircle className="h-4 w-4"/>
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Item"}
              </Button>
              {editingId && (<Button type="button" variant="outline" onClick={resetDraft}>
                  Cancel
                </Button>)}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Menu Items</CardTitle>
          <CardDescription>
            You can update or delete only your own kitchen items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (<SectionEmptyState title="No menu items yet" description="Use the form to create your first menu item." className="p-8"/>) : (items.map((item) => (<div key={item.id} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-md border border-border bg-muted/30">
                      <img src={item.imageUrl || DEFAULT_FOOD_IMAGE} alt={item.name} className="h-full w-full object-cover" onError={(event) => {
                const target = event.currentTarget;
                if (target.dataset.fallbackApplied === "true") {
                    return;
                }
                target.dataset.fallbackApplied = "true";
                target.src = DEFAULT_FOOD_IMAGE;
            }}/>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {item.category} - {item.mealTime} - {getFoodOptionLabel(item.foodOption)} - Updated{" "}
                        {formatAppDateTime(item.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.price} BDT</Badge>
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
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEditing(item.id)}>
                    <Edit3 className="h-4 w-4"/>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void handleRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4"/>
                    Delete
                  </Button>
                </div>
              </div>)))}
        </CardContent>
      </Card>
    </div>);
}
function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
    });
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
