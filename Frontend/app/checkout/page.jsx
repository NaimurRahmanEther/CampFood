"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardLoadingState, InlineStatusMessage, SectionEmptyState } from "@/components/ui/page-state";
import { RU_HALL_OPTIONS } from "@/lib/campus-options";
import { formatAppDateTime, formatAppNumber } from "@/lib/date-format";
import { clearOrderCart, loadOrderCart, saveOrderCart, } from "@/lib/order-cart";
import { loadStudentPointState, } from "@/lib/student-points";
import { createDeliveryOrder, loadDeliveryOrders, sendDeliveryOrderMessage, } from "@/lib/delivery-orders";
import { loadFoodsByIds } from "@/lib/foods";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useAuthSessionState } from "@/hooks/use-session-state";
const STANDARD_FREE_FIRST_SERVICE_CHARGE_RATE = 0.03;
const STANDARD_PAID_SERVICE_CHARGE_RATE = 0.05;
const STUDENT_KITCHEN_FREE_FIRST_SERVICE_CHARGE_RATE = 0.05;
const STUDENT_KITCHEN_PAID_SERVICE_CHARGE_RATE = 0.1;
const REALTIME_ORDER_SYNC_MS = 4000;
export default function CheckoutPage() {
    const { session: authSession, hydrated } = useAuthSessionState();
    const session = authSession?.role === "student" ? authSession : null;
    const [studentPoints, setStudentPoints] = useState(() => createFallbackStudentPointState());
    const [cartItems, setCartItems] = useState([]);
    const [foods, setFoods] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [orderChatInputs, setOrderChatInputs] = useState({});
    const [sendingOrderChatId, setSendingOrderChatId] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusTone, setStatusTone] = useState("success");
    const [deliveryAcknowledgement, setDeliveryAcknowledgement] = useState("");
    const [selectedRouteMode, setSelectedRouteMode] = useState("free-first");
    const [deliveryTypeDialogOpen, setDeliveryTypeDialogOpen] = useState(false);
    const [deliveryRecipientName, setDeliveryRecipientName] = useState("");
    const [deliveryPhone, setDeliveryPhone] = useState("");
    const [deliveryHallName, setDeliveryHallName] = useState("");
    const [deliveryAddressLine, setDeliveryAddressLine] = useState("");
    const [deliveryLandmark, setDeliveryLandmark] = useState("");
    const [deliveryNote, setDeliveryNote] = useState("");
    const [placingOrder, setPlacingOrder] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const deliveredOrderIdsRef = useRef(new Set());
    const clearCheckoutStatus = () => {
        setStatusMessage("");
    };
    const setCheckoutStatus = (message, tone) => {
        setStatusMessage(message);
        setStatusTone(tone);
    };
    const foodMap = useMemo(() => new Map(foods.map((item) => [item.id, item])), [foods]);
    useEffect(() => {
        let cancelled = false;
        async function hydrateCheckout() {
            if (!hydrated) {
                return;
            }
            if (!session) {
                setCheckingSession(false);
                return;
            }
            setCheckingSession(true);
            try {
                const initialCart = loadOrderCart(session);
                const [catalogResult, pointsResult, ordersResult] = await Promise.allSettled([
                    loadFoodsByIds(initialCart.map((item) => item.foodId)),
                    loadStudentPointState(session),
                    loadDeliveryOrders("mine", session),
                ]);
                if (!cancelled) {
                    const nextMessages = [];
                    if (catalogResult.status === "fulfilled") {
                        setFoods(catalogResult.value);
                    }
                    else {
                        setFoods([]);
                        nextMessages.push("Could not refresh live food details for checkout.");
                    }
                    if (pointsResult.status === "fulfilled") {
                        setStudentPoints(pointsResult.value);
                    }
                    else {
                        setStudentPoints(createFallbackStudentPointState());
                        nextMessages.push("Point balance is temporarily unavailable. Cash checkout and delivery chat are still active.");
                    }
                    if (ordersResult.status === "fulfilled") {
                        setRecentOrders(ordersResult.value);
                        deliveredOrderIdsRef.current = new Set(ordersResult.value
                            .filter((order) => order.status === "delivered")
                            .map((order) => order.id));
                    }
                    else {
                        setRecentOrders([]);
                        deliveredOrderIdsRef.current = new Set();
                        nextMessages.push("Could not refresh delivery updates right now.");
                    }
                    setCartItems(initialCart);
                    if (nextMessages.length > 0) {
                        setCheckoutStatus(nextMessages.join(" "), "error");
                    }
                    setCheckingSession(false);
                }
            }
            catch (error) {
                if (!cancelled) {
                    setCheckoutStatus(error instanceof Error ? error.message : "Could not load checkout data.", "error");
                    setCheckingSession(false);
                }
            }
        }
        void hydrateCheckout();
        return () => {
            cancelled = true;
        };
    }, [hydrated, session]);
    useEffect(() => {
        if (!session) {
            return;
        }
        setDeliveryRecipientName((current) => current || session.name);
    }, [session]);
    useAutoRefresh({
        enabled: Boolean(session),
        intervalMs: REALTIME_ORDER_SYNC_MS,
        onRefresh: async () => {
            if (!session) {
                return;
            }
            try {
                const orders = await loadDeliveryOrders("mine", session);
                setRecentOrders(orders);
            }
            catch {
                // Silent refresh to avoid interrupting checkout.
            }
        },
    });
    useEffect(() => {
        const knownDeliveredOrderIds = deliveredOrderIdsRef.current;
        const newDeliveredOrder = recentOrders.find((order) => order.status === "delivered" && !knownDeliveredOrderIds.has(order.id));
        if (newDeliveredOrder) {
            setDeliveryAcknowledgement(`Delivery complete acknowledged for order #${newDeliveredOrder.id.slice(0, 8)}. Thank you for ordering with CampFood.`);
        }
        deliveredOrderIdsRef.current = new Set(recentOrders.filter((order) => order.status === "delivered").map((order) => order.id));
    }, [recentOrders]);
    const lineItems = useMemo(() => {
        return cartItems
            .map((line) => {
            const food = foodMap.get(line.foodId);
            if (!food) {
                return null;
            }
            const subtotal = food.price * line.quantity;
            const serviceCharge = line.paymentMode === "points"
                ? 0
                : Math.round(subtotal * getCashServiceChargeRate(selectedRouteMode, food.providerType));
            const pointsRequired = line.paymentMode === "points" && food.pointsCost
                ? food.pointsCost * line.quantity
                : 0;
            return {
                ...line,
                food,
                subtotal,
                serviceCharge,
                pointsRequired,
                payableCash: line.paymentMode === "cash" ? subtotal + serviceCharge : 0,
            };
        })
            .filter((line) => Boolean(line));
    }, [cartItems, foodMap, selectedRouteMode]);
    const totals = useMemo(() => {
        return lineItems.reduce((acc, line) => {
            acc.cashSubtotal += line.paymentMode === "cash" ? line.subtotal : 0;
            acc.serviceCharge += line.serviceCharge;
            acc.cashPayable += line.payableCash;
            acc.pointsPayable += line.pointsRequired;
            acc.items += line.quantity;
            return acc;
        }, {
            cashSubtotal: 0,
            serviceCharge: 0,
            cashPayable: 0,
            pointsPayable: 0,
            items: 0,
        });
    }, [lineItems]);
    const reservedPoints = useMemo(() => lineItems.reduce((total, line) => total + line.pointsRequired, 0), [lineItems]);
    const availablePointBalance = studentPoints.points;
    const missingCartItems = useMemo(() => cartItems.filter((line) => !foodMap.has(line.foodId)), [cartItems, foodMap]);
    const persistCart = (nextCart) => {
        if (!session) {
            return;
        }
        saveOrderCart(session, nextCart);
        setCartItems(nextCart);
    };
    const removeUnavailableItems = () => {
        clearCheckoutStatus();
        persistCart(cartItems.filter((line) => foodMap.has(line.foodId)));
    };
    const clearCartLines = () => {
        clearCheckoutStatus();
        persistCart([]);
    };
    const updateLineQuantity = (line, quantity) => {
        clearCheckoutStatus();
        const nextCart = quantity <= 0
            ? cartItems.filter((item) => !(item.foodId === line.foodId && item.paymentMode === line.paymentMode))
            : cartItems.map((item) => item.foodId === line.foodId && item.paymentMode === line.paymentMode
                ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
                : item);
        if (line.paymentMode === "points") {
            const nextPointsNeed = getCartPointRequirement(nextCart, foodMap);
            if (nextPointsNeed > availablePointBalance) {
                setCheckoutStatus("Not enough points for this quantity.", "error");
                return;
            }
        }
        persistCart(nextCart);
    };
    const switchPaymentMode = (line, targetMode) => {
        if (line.paymentMode === targetMode) {
            return;
        }
        clearCheckoutStatus();
        const food = foodMap.get(line.foodId);
        if (!food) {
            return;
        }
        if (targetMode === "points" && !food.pointsCost) {
            setCheckoutStatus("This item cannot be purchased with points.", "error");
            return;
        }
        const withoutSource = cartItems.filter((item) => !(item.foodId === line.foodId && item.paymentMode === line.paymentMode));
        const targetIndex = withoutSource.findIndex((item) => item.foodId === line.foodId && item.paymentMode === targetMode);
        const mergedCart = targetIndex === -1
            ? [...withoutSource, { ...line, paymentMode: targetMode }]
            : withoutSource.map((item, index) => index === targetIndex
                ? { ...item, quantity: item.quantity + line.quantity }
                : item);
        if (targetMode === "points") {
            const pointsNeed = getCartPointRequirement(mergedCart, foodMap);
            if (pointsNeed > availablePointBalance) {
                setCheckoutStatus("Not enough points to switch this item to point payment.", "error");
                return;
            }
        }
        persistCart(mergedCart);
    };
    const validateCheckoutBeforePlace = () => {
        if (lineItems.length === 0) {
            setCheckoutStatus("Your cart is empty.", "error");
            return false;
        }
        if (missingCartItems.length > 0) {
            setCheckoutStatus("Some cart items are no longer available. Remove them before checkout.", "error");
            return false;
        }
        if (totals.pointsPayable > availablePointBalance) {
            setCheckoutStatus("Not enough points to complete this checkout.", "error");
            return false;
        }
        return true;
    };
    const validateDeliveryDetails = () => {
        const recipientName = deliveryRecipientName.trim();
        const phone = deliveryPhone.trim();
        const hallName = deliveryHallName.trim();
        const addressLine = deliveryAddressLine.trim();
        if (!recipientName) {
            setCheckoutStatus("Recipient name is required for delivery.", "error");
            return false;
        }
        if (!phone) {
            setCheckoutStatus("Phone number is required for delivery.", "error");
            return false;
        }
        if (!/^[0-9+()\-\s]{7,32}$/.test(phone)) {
            setCheckoutStatus("Please enter a valid phone number.", "error");
            return false;
        }
        if (!hallName) {
            setCheckoutStatus("Delivery hall or zone is required.", "error");
            return false;
        }
        if (!addressLine) {
            setCheckoutStatus("Detailed delivery address is required.", "error");
            return false;
        }
        return true;
    };
    const openDeliveryTypeDialog = () => {
        if (!session) {
            return;
        }
        clearCheckoutStatus();
        if (!validateCheckoutBeforePlace()) {
            return;
        }
        setDeliveryTypeDialogOpen(true);
    };
    const placeOrder = async () => {
        if (!session) {
            return;
        }
        clearCheckoutStatus();
        if (!validateCheckoutBeforePlace()) {
            return;
        }
        if (!validateDeliveryDetails()) {
            return;
        }
        setPlacingOrder(true);
        try {
            const createdOrder = await createDeliveryOrder({
                session,
                routeMode: selectedRouteMode,
                deliveryDetails: {
                    recipientName: deliveryRecipientName.trim(),
                    phone: deliveryPhone.trim(),
                    hallName: deliveryHallName.trim(),
                    addressLine: deliveryAddressLine.trim(),
                    landmark: deliveryLandmark.trim(),
                    note: deliveryNote.trim(),
                },
                items: lineItems.map((line) => ({
                    foodId: line.foodId,
                    quantity: line.quantity,
                    paymentMode: line.paymentMode,
                })),
            });
            clearOrderCart(session);
            setCartItems([]);
            setFoods([]);
            setDeliveryTypeDialogOpen(false);
            try {
                setStudentPoints(await loadStudentPointState(session));
            }
            catch {
                setStudentPoints(createFallbackStudentPointState());
            }
            setRecentOrders(await loadDeliveryOrders("mine", session));
            setCheckoutStatus(`Order placed successfully. Order #${createdOrder.id.slice(0, 8)} confirmed. Delivery assignment is in progress.`, "success");
        }
        catch (error) {
            setCheckoutStatus(error instanceof Error ? error.message : "Could not place order.", "error");
        }
        finally {
            setPlacingOrder(false);
        }
    };
    const sendOrderChat = async (orderId) => {
        if (!session) {
            return;
        }
        const message = (orderChatInputs[orderId] ?? "").trim();
        if (!message) {
            setCheckoutStatus("Write a message before sending.", "error");
            return;
        }
        setSendingOrderChatId(orderId);
        try {
            const updatedOrder = await sendDeliveryOrderMessage(orderId, session, message);
            setRecentOrders((current) => replaceDeliveryOrder(current, updatedOrder));
            setOrderChatInputs((current) => ({ ...current, [orderId]: "" }));
        }
        catch (error) {
            setCheckoutStatus(error instanceof Error ? error.message : "Could not send message.", "error");
        }
        finally {
            setSendingOrderChatId(null);
        }
    };
    if (checkingSession) {
        return (<>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/35 pt-24">
          <div className="w-full max-w-md">
            <CardLoadingState message="Checking student account..."/>
          </div>
        </main>
      </>);
    }
    if (!session) {
        return null;
    }
    return (<>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/35 pt-24">
        <div className="mx-auto max-w-6xl px-4 pb-16 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link href="/browse-food" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4"/>
              Back to Browse Food
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <ShoppingCart className="h-3.5 w-3.5"/>
                {totals.items} item{totals.items === 1 ? "" : "s"} in cart
              </Badge>
              <Badge variant="secondary">
                Points Balance: {formatAppNumber(availablePointBalance)} pts
              </Badge>
            </div>
          </div>

          {deliveryAcknowledgement && (<div className="mb-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">
              {deliveryAcknowledgement}
            </div>)}

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary"/>
                  Checkout Cart
                </CardTitle>
                <CardDescription>
                  Edit quantity, remove lines, and switch payment mode before placing your final order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {missingCartItems.length > 0 && (<div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                    <p className="text-sm font-medium text-destructive">
                      {missingCartItems.length} cart item{missingCartItems.length === 1 ? "" : "s"} no longer exist in the live menu.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={removeUnavailableItems}>
                      Remove Unavailable Items
                    </Button>
                  </div>)}

                {lineItems.length === 0 ? (<SectionEmptyState title="Your cart is empty" description="Browse food and add items to continue checkout." action={<Button asChild>
                        <Link href="/browse-food">Add Food Items</Link>
                      </Button>} className="p-8"/>) : (lineItems.map((line) => (<div key={`${line.foodId}-${line.paymentMode}`} className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{line.food.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.food.providerName} ({line.food.providerType})
                          </p>
                        </div>
                        <Badge variant={line.paymentMode === "points" ? "secondary" : "outline"}>
                          {line.paymentMode === "points" ? "Points" : "Cash"}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => updateLineQuantity(line, line.quantity - 1)}>
                          <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <span className="text-sm font-medium">{line.quantity}</span>
                        <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => updateLineQuantity(line, line.quantity + 1)}>
                          <Plus className="h-3.5 w-3.5"/>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-full px-2 text-destructive" onClick={() => updateLineQuantity(line, 0)}>
                          <Trash2 className="h-3.5 w-3.5"/>
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant={line.paymentMode === "cash" ? "default" : "outline"} size="sm" onClick={() => switchPaymentMode(line, "cash")}>
                          Pay Cash
                        </Button>
                        <Button variant={line.paymentMode === "points" ? "secondary" : "outline"} size="sm" disabled={!line.food.pointsCost} onClick={() => switchPaymentMode(line, "points")}>
                          Pay Points
                        </Button>
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground">
                        {line.paymentMode === "cash" ? (<>
                            <p>Subtotal: BDT {line.subtotal.toFixed(0)}</p>
                            <p>Service charge: BDT {line.serviceCharge.toFixed(0)}</p>
                            <p className="font-semibold text-foreground">
                              Pay: BDT {line.payableCash.toFixed(0)}
                            </p>
                          </>) : (<>
                            <p>Service charge: BDT 0</p>
                            <p className="font-semibold text-foreground">
                              Pay: {line.pointsRequired} pts
                            </p>
                          </>)}
                      </div>
                    </div>)))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{totals.items}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cash Subtotal</span>
                  <span>BDT {totals.cashSubtotal.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span>BDT {totals.serviceCharge.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Points Needed</span>
                  <span>{totals.pointsPayable} pts</span>
                </div>
                <div className="border-t border-border pt-2 text-base font-semibold">
                  <div className="flex items-center justify-between">
                    <span>Total Payable</span>
                    <span>
                      BDT {totals.cashPayable.toFixed(0)}
                      {totals.pointsPayable > 0 ? ` + ${totals.pointsPayable} pts` : ""}
                    </span>
                  </div>
                </div>

                {reservedPoints > availablePointBalance && (<p className="text-xs font-medium text-destructive">
                    You need more points to complete point-based cart lines.
                  </p>)}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/browse-food">Continue Shopping</Link>
                  </Button>
                  <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={lineItems.length === 0} onClick={clearCartLines}>
                    Clear Cart
                  </Button>
                </div>

                <Button className="w-full" onClick={openDeliveryTypeDialog} disabled={lineItems.length === 0 || missingCartItems.length > 0 || placingOrder}>
                  Place Order
                </Button>

                <InlineStatusMessage message={statusMessage} tone={statusTone === "error" ? "error" : "success"} className="text-xs"/>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>My Delivery Orders</CardTitle>
              <CardDescription>
                Follow order updates from checkout to delivery completion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentOrders.length === 0 ? (<SectionEmptyState title="No orders yet" description="Once you place an order, live updates and delivery chat will appear here." className="p-8"/>) : (recentOrders.slice(0, 6).map((order) => (<div key={order.id} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    {(() => {
                const chatMessages = getOrderChatIncidents(order);
                return (<>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Order #{order.id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Placed: {formatAppDateTime(order.createdAt)}
                              </p>
                            </div>
                            <Badge variant={resolveOrderStatusBadgeVariant(order.status)}>
                              {formatOrderStatus(order.status)}
                            </Badge>
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">
                            Items: {order.totals.items} | Cash: BDT {order.totals.cashPayable.toFixed(0)}
                            {" | "}Points: {order.totals.pointsPayable}
                          </p>

                          <p className="mt-1 text-xs font-medium text-foreground">
                            {resolveOrderProgressText(order)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Delivery: {order.deliveryDetails.recipientName}
                            {" | "}
                            {order.deliveryDetails.phone}
                            {" | "}
                            {order.deliveryDetails.hallName}
                            {" | "}
                            {order.deliveryDetails.addressLine}
                          </p>

                          {order.assignedToUserId ? (<div className="mt-3 rounded-md border border-border bg-background px-3 py-3">
                              <p className="text-xs font-medium text-foreground">
                                Chat with {order.assignedToName || "delivery partner"}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Messages update every {Math.floor(REALTIME_ORDER_SYNC_MS / 1000)}s
                              </p>
                              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                                {chatMessages.length === 0 ? (<p className="text-xs text-muted-foreground">
                                    No messages yet.
                                  </p>) : (chatMessages.map((incident) => {
                            const isStudentMessage = incident.actorRole === "student";
                            return (<div key={incident.id} className={`rounded-md border px-2 py-2 ${isStudentMessage
                                    ? "border-primary/25 bg-primary/5"
                                    : "border-border bg-muted/20"}`}>
                                        <p className="text-xs text-foreground">{incident.message}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {incident.actorName} | {formatAppDateTime(incident.createdAt)}
                                        </p>
                                      </div>);
                        }))}
                              </div>

                              {order.status === "delivered" || order.status === "canceled" ? (<p className="mt-2 text-xs text-muted-foreground">
                                  {order.status === "canceled"
                                ? "Order was canceled. Chat is now read-only."
                                : "Order is delivered. Chat is now read-only."}
                                </p>) : (<div className="mt-2 flex gap-2">
                                  <Input value={orderChatInputs[order.id] ?? ""} onChange={(event) => setOrderChatInputs((current) => ({
                                ...current,
                                [order.id]: event.target.value,
                            }))} placeholder="Write a message to your delivery partner" onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    void sendOrderChat(order.id);
                                }
                            }}/>
                                  <Button size="sm" onClick={() => void sendOrderChat(order.id)} disabled={sendingOrderChatId === order.id}>
                                    {sendingOrderChatId === order.id ? "Sending..." : "Send"}
                                  </Button>
                                </div>)}
                            </div>) : (<p className="mt-2 text-xs text-muted-foreground">
                              {order.status === "canceled"
                            ? "Order was canceled by admin."
                            : "Chat opens when a delivery partner accepts this order."}
                            </p>)}
                        </>);
            })()}
                  </div>)))}
            </CardContent>
          </Card>
        </div>
      </main>
      <Dialog open={deliveryTypeDialogOpen} onOpenChange={(open) => {
            if (!placingOrder) {
                setDeliveryTypeDialogOpen(open);
            }
        }}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 pt-4 pb-3">
            <DialogTitle>Choose Delivery Service</DialogTitle>
            <DialogDescription>
              Choose your delivery service before final checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Delivery Details
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={deliveryRecipientName} onChange={(event) => setDeliveryRecipientName(event.target.value)} placeholder="Recipient full name" className="h-9"/>
                <Input value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} placeholder="Phone number (e.g. 01XXXXXXXXX)" className="h-9"/>
              </div>

              <Input value={deliveryHallName} onChange={(event) => setDeliveryHallName(event.target.value)} placeholder="Hall or delivery zone" list="checkout-hall-options" className="h-9"/>
              <datalist id="checkout-hall-options">
                {RU_HALL_OPTIONS.map((hall) => (<option key={hall} value={hall}/>))}
              </datalist>
              <Textarea value={deliveryAddressLine} onChange={(event) => setDeliveryAddressLine(event.target.value)} placeholder="Detailed address (building, block, floor, room, gate)" className="min-h-16"/>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={deliveryLandmark} onChange={(event) => setDeliveryLandmark(event.target.value)} placeholder="Landmark (optional)" className="h-9"/>
                <Textarea value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} placeholder="Delivery note (optional)" className="min-h-14"/>
              </div>
            </div>

            <Button type="button" variant={selectedRouteMode === "free-first" ? "default" : "outline"} className="h-9 w-full justify-start" onClick={() => setSelectedRouteMode("free-first")}>
              Free Delivery First
            </Button>
            <Button type="button" variant={selectedRouteMode === "paid-only" ? "default" : "outline"} className="h-9 w-full justify-start" onClick={() => setSelectedRouteMode("paid-only")}>
              Paid Delivery Service Direct
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Free Delivery First waits up to 5 minutes in the free queue, then switches to paid delivery automatically.
            </p>

            <div className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Cash subtotal</span>
                <span>BDT {totals.cashSubtotal.toFixed(0)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Service charge</span>
                <span>BDT {totals.serviceCharge.toFixed(0)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between font-semibold text-foreground">
                <span>Total payable</span>
                <span>
                  BDT {totals.cashPayable.toFixed(0)}
                  {totals.pointsPayable > 0 ? ` + ${totals.pointsPayable} pts` : ""}
                </span>
              </div>
              <p className="mt-2 text-[11px]">
                Points orders have no service charge.
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="outline" disabled={placingOrder} onClick={() => setDeliveryTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void placeOrder()} disabled={placingOrder}>
              {placingOrder ? "Placing Order..." : "Confirm & Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </>);
}
function createFallbackStudentPointState() {
    return {
        points: 0,
        totalEarned: 0,
        totalTransferred: 0,
        isFreeDeliveryPartner: false,
        registrationBonusPoints: 0,
        freeDeliveryBonusPoints: 0,
        pointsExpireInDays: 0,
        expiringPoints: 0,
        nextExpiryAt: null,
        monthlyReward: {
            timezone: "Asia/Dhaka",
            rewardPoints: 200,
            spendThreshold: 10000,
            currentMonth: "",
            previousMonth: "",
            currentMonthSpend: 0,
            currentMonthSpendRemaining: 0,
            previousMonthSpend: 0,
            previousMonthSpendQualified: false,
            previousMonthSpendRewarded: false,
            deliveryRewardEligible: false,
            currentMonthDeliveryDays: 0,
            currentMonthTotalDays: 0,
            previousMonthDeliveryDays: 0,
            previousMonthTotalDays: 0,
            previousMonthDeliveryQualified: false,
            previousMonthDeliveryRewarded: false,
        },
        transactions: [],
        pendingIncomingTransfers: [],
        pendingOutgoingTransfers: [],
    };
}
function getCashServiceChargeRate(routeMode, providerType) {
    if (providerType === "Student Homemade") {
        if (routeMode === "paid-only") {
            return STUDENT_KITCHEN_PAID_SERVICE_CHARGE_RATE;
        }
        return STUDENT_KITCHEN_FREE_FIRST_SERVICE_CHARGE_RATE;
    }
    if (routeMode === "paid-only") {
        return STANDARD_PAID_SERVICE_CHARGE_RATE;
    }
    return STANDARD_FREE_FIRST_SERVICE_CHARGE_RATE;
}
function getCartPointRequirement(cartItems, foodMap) {
    return cartItems.reduce((total, line) => {
        if (line.paymentMode !== "points") {
            return total;
        }
        const food = foodMap.get(line.foodId);
        if (!food?.pointsCost) {
            return total;
        }
        return total + food.pointsCost * line.quantity;
    }, 0);
}
function formatOrderStatus(status) {
    if (status === "canceled") {
        return "Canceled";
    }
    if (status === "accepted") {
        return "Accepted";
    }
    if (status === "delivered") {
        return "Delivered";
    }
    return "Pending";
}
function resolveOrderStatusBadgeVariant(status) {
    if (status === "delivered") {
        return "default";
    }
    if (status === "accepted") {
        return "secondary";
    }
    return "outline";
}
function resolveOrderProgressText(order) {
    if (order.status === "canceled") {
        return "Order canceled by admin.";
    }
    if (order.status === "delivered") {
        return `Delivery completed${order.deliveredAt ? ` at ${formatAppDateTime(order.deliveredAt)}` : ""}.`;
    }
    if (order.status === "accepted") {
        return order.assignedToName
            ? `Accepted by ${order.assignedToName}. Delivery is in progress.`
            : "Accepted by a delivery partner. Delivery is in progress.";
    }
    return "Order confirmed. Delivery assignment is in progress.";
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
