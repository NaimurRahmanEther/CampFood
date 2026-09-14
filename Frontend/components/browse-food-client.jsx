"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Filter, MessageCircle, Minus, Plus, Search, ShoppingCart, Sparkles, Star, Trash2, X, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FoodDetailDialog, } from "@/components/food-detail-dialog";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { formatAppNumber } from "@/lib/date-format";
import { getAuthPagePath } from "@/lib/auth-session";
import { requestAIChat } from "@/lib/ai-chat";
import { loadStudentPointState, } from "@/lib/student-points";
import { addToOrderCart, loadOrderCart, saveOrderCart, } from "@/lib/order-cart";
import { getFoodOptionLabel, loadFoodCatalog, loadFoodsByIds, } from "@/lib/foods";
import { cn } from "@/lib/utils";
import { useAuthSessionState } from "@/hooks/use-session-state";
const MIN_PRICE = 50;
const MAX_PRICE = 450;
const ITEMS_PER_PAGE = 8;
const POINTS_REFRESH_INTERVAL_MS = 30_000;
const CATALOG_REFRESH_INTERVAL_MS = 20_000;
const STANDARD_FREE_FIRST_SERVICE_CHARGE_RATE = 0.03;
const STUDENT_KITCHEN_FREE_FIRST_SERVICE_CHARGE_RATE = 0.07;
const KITCHEN_FILTER_ALL = "All";
const CHAT_RECOMMENDATION_LIMIT = 5;
const FOOD_IMAGE_FALLBACK_URL = "/placeholder.svg";
const CHAT_TASTE_KEYWORDS = [
    "spicy",
    "sweet",
    "savory",
    "light",
    "healthy",
    "fried",
    "grilled",
    "beef",
    "chicken",
    "fish",
    "rice",
    "biryani",
    "vegetable",
    "dessert",
];
const WANTS_FOOD_PATTERNS = [
    "food",
    "meal",
    "eat",
    "hungry",
    "recommend",
    "suggest",
    "show",
    "find",
    "want",
];
const KITCHEN_LABELS = {
    Hall: "Hall Kitchen",
    "Campus Kitchen": "Campus Kitchen",
    "Student Homemade": "Student Kitchen",
};
function clampPriceRange(currentRange, bounds) {
    const clampedMin = Math.max(bounds[0], Math.min(currentRange[0], bounds[1]));
    const clampedMax = Math.max(bounds[0], Math.min(currentRange[1], bounds[1]));
    if (clampedMin <= clampedMax) {
        return [clampedMin, clampedMax];
    }
    return bounds;
}
function buildKitchenFilterValue(providerType, providerName, hallName) {
    return `${providerType}::${providerName.trim()}::${hallName?.trim() ?? ""}`;
}
function nextChatMessageId() {
    return Date.now() + Math.floor(Math.random() * 10_000);
}
function parseBudgetFromPrompt(prompt) {
    const underMatch = prompt.match(/(?:under|below|max|within)\s*(?:bdt|tk)?\s*(\d{2,4})/i);
    if (underMatch) {
        return { max: Number(underMatch[1]) };
    }
    const betweenMatch = prompt.match(/(?:between|from)\s*(\d{2,4})\s*(?:and|to|-)\s*(\d{2,4})/i);
    if (betweenMatch) {
        const first = Number(betweenMatch[1]);
        const second = Number(betweenMatch[2]);
        return {
            min: Math.min(first, second),
            max: Math.max(first, second),
        };
    }
    return {};
}
function detectKitchenTypeFromPrompt(prompt) {
    if (prompt.includes("hall")) {
        return "Hall";
    }
    if (prompt.includes("campus")) {
        return "Campus Kitchen";
    }
    if (prompt.includes("student") || prompt.includes("homemade") || prompt.includes("home made")) {
        return "Student Homemade";
    }
    return undefined;
}
function extractTasteKeywords(prompt) {
    return CHAT_TASTE_KEYWORDS.filter((keyword) => prompt.includes(keyword));
}
function parseIndexedCommand(prompt, verbs) {
    const pattern = new RegExp(`\\b(?:${verbs.join("|")})\\s*(?:item\\s*)?#?(\\d{1,2})\\b`, "i");
    const match = prompt.match(pattern);
    if (!match) {
        return null;
    }
    const value = Number(match[1]);
    if (!Number.isInteger(value) || value <= 0) {
        return null;
    }
    return value;
}
function parseFoodIdFromPrompt(prompt) {
    const idMatch = prompt.match(/(?:food\s*)?id\s*#?\s*(\d{1,6})|#(\d{1,6})/i);
    if (!idMatch) {
        return null;
    }
    const raw = idMatch[1] || idMatch[2];
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }
    return id;
}
function parseQuantityFromPrompt(prompt) {
    const patterns = [
        /^\s*(\d{1,2})\s*$/i,
        /(?:quantity|qty|qnty)\s*[:=]?\s*(\d{1,2})/i,
        /\bx\s*(\d{1,2})\b/i,
        /\b(\d{1,2})\s*x\b/i,
        /\b(\d{1,2})\s*(?:pcs?|pieces?|plates?|items?|servings?)\b/i,
    ];
    for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (!match) {
            continue;
        }
        const value = Number(match[1]);
        if (Number.isInteger(value) && value > 0) {
            return Math.min(value, 20);
        }
    }
    return null;
}
function parsePaymentModeFromPrompt(prompt) {
    if (/\b(points?|pts?)\b/i.test(prompt)) {
        return "points";
    }
    if (/\bcash\b/i.test(prompt)) {
        return "cash";
    }
    return null;
}
function isConfirmPrompt(prompt) {
    return /\b(confirm|yes|ok|place order|go ahead|continue)\b/i.test(prompt);
}
function isCancelPrompt(prompt) {
    return /\b(cancel|stop|abort|no)\b/i.test(prompt);
}
function hasOrderIntent(prompt) {
    return /\b(order|buy|checkout|place order)\b/i.test(prompt);
}
function wantsFoodRecommendation(prompt) {
    return WANTS_FOOD_PATTERNS.some((pattern) => prompt.includes(pattern));
}
function suggestKitchenType(preferences) {
    if (preferences.budgetMax && preferences.budgetMax <= 130) {
        return "Hall";
    }
    if (preferences.tastes.includes("healthy") || preferences.tastes.includes("light")) {
        return "Student Homemade";
    }
    if (preferences.budgetMax && preferences.budgetMax >= 250) {
        return "Campus Kitchen";
    }
    return "Hall";
}
function scoreFoodForChat(item, preferences) {
    let score = item.rating * 30 + Math.min(item.reviewCount, 60);
    const searchBase = `${item.name} ${item.category}`.toLowerCase();
    if (preferences.budgetMax !== undefined) {
        score += item.price <= preferences.budgetMax ? 20 : -20;
    }
    if (preferences.budgetMin !== undefined) {
        score += item.price >= preferences.budgetMin ? 5 : -10;
    }
    if (preferences.freeDeliveryOnly && item.freeDelivery) {
        score += 10;
    }
    if (preferences.pointsOnly) {
        score += item.pointsCost > 0 ? 12 : -18;
    }
    preferences.tastes.forEach((taste) => {
        if (searchBase.includes(taste)) {
            score += 14;
        }
    });
    return score;
}
function parseKitchenFilterValue(value) {
    const [providerTypeRaw, providerNameRaw, hallNameRaw = ""] = value.split("::");
    if (providerTypeRaw !== "Hall" &&
        providerTypeRaw !== "Campus Kitchen" &&
        providerTypeRaw !== "Student Homemade") {
        return null;
    }
    const providerName = providerNameRaw.trim();
    if (!providerName) {
        return null;
    }
    const hallName = hallNameRaw.trim();
    return {
        providerType: providerTypeRaw,
        providerName,
        hallName: hallName || undefined,
    };
}
export function BrowseFoodClient() {
    const router = useRouter();
    const [foods, setFoods] = useState([]);
    const [catalogFilters, setCatalogFilters] = useState({
        mealTimes: [],
        foodOptions: [],
        halls: [],
        hallKitchens: [],
        campusKitchens: [],
        studentKitchens: [],
    });
    const [totalFoods, setTotalFoods] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingFoods, setLoadingFoods] = useState(true);
    const [catalogError, setCatalogError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [foodType, setFoodType] = useState("All");
    const [providerFilter, setProviderFilter] = useState("All");
    const [selectedKitchenHallName, setSelectedKitchenHallName] = useState(undefined);
    const [mealTimeFilter, setMealTimeFilter] = useState("All");
    const [foodOptionFilter, setFoodOptionFilter] = useState("All");
    const [priceRange, setPriceRange] = useState([
        MIN_PRICE,
        MAX_PRICE,
    ]);
    const [availablePriceBounds, setAvailablePriceBounds] = useState([
        MIN_PRICE,
        MAX_PRICE,
    ]);
    const [hasCustomPriceRange, setHasCustomPriceRange] = useState(false);
    const [sortBy, setSortBy] = useState("popularity");
    const [pointsOnly, setPointsOnly] = useState(false);
    const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
    const [cartOpen, setCartOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState([
        {
            id: 1,
            role: "bot",
            content: "Welcome. Ask for food suggestions in your own words, for example: `show all food`, `I want spicy food under 120`, or `show budget-friendly options`. To place an order, type: `order food id 12`. I will then ask quantity, payment method (cash or points), and confirmation before sending you to checkout to complete delivery details.",
        },
    ]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatRecommendations, setChatRecommendations] = useState([]);
    const [chatPendingOrder, setChatPendingOrder] = useState(null);
    const [chatPreferences, setChatPreferences] = useState({
        tastes: [],
        freeDeliveryOnly: false,
        pointsOnly: false,
    });
    const { session } = useAuthSessionState();
    const [studentPointState, setStudentPointState] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [cartFoodMap, setCartFoodMap] = useState(new Map());
    const [cartStatus, setCartStatus] = useState(null);
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const isStudentSession = session?.role === "student";
    const loginRedirectPath = getAuthPagePath({
        role: "student",
        mode: "login",
        next: "/browse-food",
    });
    const redirectGuestToLogin = (message) => {
        setCartStatus({
            ok: false,
            message,
        });
        router.push(loginRedirectPath);
    };
    useEffect(() => {
        let cancelled = false;
        async function hydrateSessionState() {
            if (!isStudentSession) {
                setStudentPointState(null);
                setCartItems([]);
                setCartFoodMap(new Map());
                return;
            }
            const initialCart = loadOrderCart(session);
            setCartItems(initialCart);
            try {
                const pointState = await loadStudentPointState(session);
                if (!cancelled) {
                    setStudentPointState(pointState);
                }
            }
            catch {
                if (!cancelled) {
                    setStudentPointState(null);
                }
            }
        }
        void hydrateSessionState();
        return () => {
            cancelled = true;
        };
    }, [isStudentSession, session]);
    useEffect(() => {
        let cancelled = false;
        async function loadCatalog() {
            setLoadingFoods(true);
            setCatalogError("");
            try {
                const catalog = await loadFoodCatalog({
                    search: deferredSearchQuery,
                    providerType: foodType === "All" ? undefined : foodType,
                    hallName: selectedKitchenHallName,
                    providerName: providerFilter === "All" ? undefined : providerFilter,
                    mealTime: mealTimeFilter === "All" ? undefined : mealTimeFilter,
                    foodOption: foodOptionFilter === "All" ? undefined : foodOptionFilter,
                    minPrice: hasCustomPriceRange ? priceRange[0] : undefined,
                    maxPrice: hasCustomPriceRange ? priceRange[1] : undefined,
                    sortBy,
                    freeDelivery: freeDeliveryOnly,
                    pointsOnly,
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                });
                if (!cancelled) {
                    setFoods(catalog.items);
                    setCatalogFilters(catalog.filters);
                    setTotalFoods(catalog.total);
                    setTotalPages(catalog.totalPages);
                    const nextMinPrice = catalog.availableMinPrice > 0 || catalog.availableMaxPrice > 0
                        ? catalog.availableMinPrice
                        : availablePriceBounds[0];
                    const nextMaxPrice = catalog.availableMaxPrice > 0
                        ? catalog.availableMaxPrice
                        : availablePriceBounds[1];
                    const nextBounds = [
                        nextMinPrice,
                        Math.max(nextMinPrice, nextMaxPrice),
                    ];
                    setAvailablePriceBounds(nextBounds);
                    if (!hasCustomPriceRange) {
                        setPriceRange(nextBounds);
                    }
                    else {
                        setPriceRange((currentRange) => clampPriceRange(currentRange, nextBounds));
                    }
                }
            }
            catch (error) {
                if (!cancelled) {
                    setFoods([]);
                    setCatalogFilters({
                        mealTimes: [],
                        foodOptions: [],
                        halls: [],
                        hallKitchens: [],
                        campusKitchens: [],
                        studentKitchens: [],
                    });
                    setTotalFoods(0);
                    setTotalPages(1);
                    setCatalogError(error instanceof Error ? error.message : "Could not load meals.");
                }
            }
            finally {
                if (!cancelled) {
                    setLoadingFoods(false);
                }
            }
        }
        void loadCatalog();
        return () => {
            cancelled = true;
        };
    }, [
        catalogRefreshKey,
        currentPage,
        deferredSearchQuery,
        foodType,
        freeDeliveryOnly,
        hasCustomPriceRange,
        foodOptionFilter,
        mealTimeFilter,
        pointsOnly,
        priceRange,
        providerFilter,
        selectedKitchenHallName,
        sortBy,
    ]);
    useEffect(() => {
        const refreshCatalog = () => {
            setCatalogRefreshKey((current) => current + 1);
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshCatalog();
            }
        };
        window.addEventListener("focus", refreshCatalog);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        const intervalId = window.setInterval(refreshCatalog, CATALOG_REFRESH_INTERVAL_MS);
        return () => {
            window.removeEventListener("focus", refreshCatalog);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, []);
    useEffect(() => {
        if (session?.role !== "student") {
            return;
        }
        const activeSession = session;
        let cancelled = false;
        async function refreshPoints() {
            try {
                const pointState = await loadStudentPointState(activeSession);
                if (!cancelled) {
                    setStudentPointState(pointState);
                }
            }
            catch {
                if (!cancelled) {
                    setStudentPointState(null);
                }
            }
        }
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void refreshPoints();
            }
        };
        void refreshPoints();
        window.addEventListener("focus", refreshPoints);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        const intervalId = window.setInterval(() => {
            void refreshPoints();
        }, POINTS_REFRESH_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.removeEventListener("focus", refreshPoints);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [session]);
    useEffect(() => {
        let cancelled = false;
        async function syncCartFoods() {
            const ids = Array.from(new Set(cartItems.map((item) => item.foodId)));
            if (ids.length === 0) {
                setCartFoodMap(new Map());
                return;
            }
            try {
                const items = await loadFoodsByIds(ids);
                if (!cancelled) {
                    setCartFoodMap(new Map(items.map((item) => [item.id, item])));
                }
            }
            catch {
                if (!cancelled) {
                    setCartFoodMap(new Map());
                }
            }
        }
        void syncCartFoods();
        return () => {
            cancelled = true;
        };
    }, [cartItems]);
    const cartLineItems = useMemo(() => cartItems
        .map((line) => {
        const food = cartFoodMap.get(line.foodId);
        if (!food) {
            return null;
        }
        const subtotal = food.price * line.quantity;
        const serviceCharge = line.paymentMode === "points"
            ? 0
            : Math.round(subtotal * getCashServiceChargeRate(food.providerType));
        const pointsRequired = line.paymentMode === "points" && food.pointsCost > 0
            ? food.pointsCost * line.quantity
            : 0;
        return {
            ...line,
            food,
            subtotal,
            serviceCharge,
            payableCash: line.paymentMode === "cash" ? subtotal + serviceCharge : 0,
            pointsRequired,
        };
    })
        .filter((line) => Boolean(line)), [cartFoodMap, cartItems]);
    const missingCartItems = useMemo(() => cartItems.filter((line) => !cartFoodMap.has(line.foodId)), [cartFoodMap, cartItems]);
    const cartTotals = useMemo(() => cartLineItems.reduce((totals, line) => {
        totals.cashSubtotal += line.paymentMode === "cash" ? line.subtotal : 0;
        totals.serviceCharge += line.serviceCharge;
        totals.cashPayable += line.payableCash;
        totals.pointsPayable += line.pointsRequired;
        return totals;
    }, {
        cashSubtotal: 0,
        serviceCharge: 0,
        cashPayable: 0,
        pointsPayable: 0,
    }), [cartLineItems]);
    const reservedCartPoints = useMemo(() => cartLineItems.reduce((total, line) => total + line.pointsRequired, 0), [cartLineItems]);
    const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems]);
    const allKitchenOptions = useMemo(() => {
        const options = [];
        const seen = new Set();
        const appendOptions = (providerType, providers) => {
            providers.forEach((provider) => {
                const providerName = provider.name.trim();
                const hallName = provider.hallName?.trim();
                if (!providerName) {
                    return;
                }
                const value = buildKitchenFilterValue(providerType, providerName, hallName);
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
                const label = providerType === "Hall"
                    ? `${providerName}${hallName ? ` - ${hallName}` : ""} (Hall)`
                    : providerType === "Campus Kitchen"
                        ? `${providerName} (Campus)`
                        : `${providerName} (Student)`;
                options.push({
                    value,
                    label,
                    providerType,
                    providerName,
                    hallName,
                });
            });
        };
        appendOptions("Hall", catalogFilters.hallKitchens);
        appendOptions("Campus Kitchen", catalogFilters.campusKitchens);
        appendOptions("Student Homemade", catalogFilters.studentKitchens);
        return options.sort((left, right) => left.label.localeCompare(right.label));
    }, [
        catalogFilters.campusKitchens,
        catalogFilters.hallKitchens,
        catalogFilters.studentKitchens,
    ]);
    const availableKitchenOptions = useMemo(() => {
        if (foodType === "Hall") {
            return allKitchenOptions.filter((option) => option.providerType === "Hall");
        }
        if (foodType === "Campus Kitchen") {
            return allKitchenOptions.filter((option) => option.providerType === "Campus Kitchen");
        }
        if (foodType === "Student Homemade") {
            return allKitchenOptions.filter((option) => option.providerType === "Student Homemade");
        }
        return [];
    }, [allKitchenOptions, foodType]);
    const selectedKitchenValue = useMemo(() => {
        if (providerFilter === "All") {
            return KITCHEN_FILTER_ALL;
        }
        const selectedKitchen = availableKitchenOptions.find((option) => {
            if (option.providerName !== providerFilter) {
                return false;
            }
            if (option.providerType !== "Hall") {
                return true;
            }
            if (!selectedKitchenHallName) {
                return true;
            }
            return option.hallName === selectedKitchenHallName;
        });
        return selectedKitchen?.value ?? KITCHEN_FILTER_ALL;
    }, [availableKitchenOptions, providerFilter, selectedKitchenHallName]);
    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchQuery,
        foodType,
        mealTimeFilter,
        foodOptionFilter,
        providerFilter,
        selectedKitchenHallName,
        priceRange,
        sortBy,
        pointsOnly,
        freeDeliveryOnly,
    ]);
    useEffect(() => {
        if (providerFilter === "All") {
            return;
        }
        const providerExists = availableKitchenOptions.some((option) => {
            if (option.providerName !== providerFilter) {
                return false;
            }
            if (option.providerType === "Hall" && selectedKitchenHallName) {
                return option.hallName === selectedKitchenHallName;
            }
            return true;
        });
        if (!providerExists) {
            setProviderFilter("All");
            setSelectedKitchenHallName(undefined);
        }
    }, [availableKitchenOptions, providerFilter, selectedKitchenHallName]);
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);
    const goToPage = (page) => {
        if (page < 1 || page > totalPages) {
            return;
        }
        setCurrentPage(page);
    };
    const handleFoodTypeChange = (value) => {
        setFoodType(value);
        setProviderFilter("All");
        setSelectedKitchenHallName(undefined);
    };
    const handleKitchenFilterChange = (value) => {
        if (value === KITCHEN_FILTER_ALL) {
            setProviderFilter("All");
            setSelectedKitchenHallName(undefined);
            return;
        }
        const selectedKitchen = parseKitchenFilterValue(value);
        if (!selectedKitchen) {
            setProviderFilter("All");
            setSelectedKitchenHallName(undefined);
            return;
        }
        setProviderFilter(selectedKitchen.providerName);
        setSelectedKitchenHallName(selectedKitchen.providerType === "Hall" ? selectedKitchen.hallName : undefined);
    };
    const handleMealTimeFilterChange = (value) => {
        setMealTimeFilter(value);
    };
    const handleFoodOptionFilterChange = (value) => {
        setFoodOptionFilter(value);
    };
    const resetFilters = () => {
        setSearchQuery("");
        setFoodType("All");
        setProviderFilter("All");
        setSelectedKitchenHallName(undefined);
        setMealTimeFilter("All");
        setFoodOptionFilter("All");
        setHasCustomPriceRange(false);
        setPriceRange(availablePriceBounds);
        setSortBy("popularity");
        setPointsOnly(false);
        setFreeDeliveryOnly(false);
        setCurrentPage(1);
    };
    const sendChatBotMessage = (content) => {
        setChatMessages((prev) => [
            ...prev,
            { id: nextChatMessageId(), role: "bot", content },
        ]);
    };
    const resolveFoodForOrderRequest = async (prompt) => {
        const foodId = parseFoodIdFromPrompt(prompt);
        if (foodId) {
            const byId = await loadFoodsByIds([foodId]);
            if (byId.length > 0) {
                return byId[0];
            }
        }
        const orderIndex = parseIndexedCommand(prompt, ["order", "buy", "item"]);
        if (orderIndex !== null && chatRecommendations.length > 0) {
            return chatRecommendations[orderIndex - 1] ?? null;
        }
        const normalizedPrompt = prompt.toLowerCase();
        const nameMatched = chatRecommendations.find((item) => normalizedPrompt.includes(item.name.toLowerCase()));
        if (nameMatched) {
            return nameMatched;
        }
        if (chatRecommendations.length === 1 && hasOrderIntent(prompt)) {
            return chatRecommendations[0];
        }
        return null;
    };
    const handlePendingOrderFlow = async (prompt) => {
        if (!chatPendingOrder || !session || session.role !== "student") {
            return false;
        }
        const normalizedPrompt = prompt.toLowerCase();
        if (isCancelPrompt(normalizedPrompt)) {
            setChatPendingOrder(null);
            sendChatBotMessage("Order flow cancelled. You can request a new suggestion any time.");
            return true;
        }
        if (chatPendingOrder.step === "quantity") {
            const quantity = parseQuantityFromPrompt(normalizedPrompt);
            if (!quantity) {
                sendChatBotMessage("Please provide quantity, for example: `qty 2` or `x3`.");
                return true;
            }
            if (quantity > chatPendingOrder.food.stock) {
                sendChatBotMessage(`Only ${chatPendingOrder.food.stock} item(s) are available for ${chatPendingOrder.food.name}. Please choose a lower quantity.`);
                return true;
            }
            setChatPendingOrder({
                ...chatPendingOrder,
                quantity,
                step: "payment",
            });
            sendChatBotMessage(`Quantity set to ${quantity}. Please choose payment method: \`cash\` or \`points\`.`);
            return true;
        }
        if (chatPendingOrder.step === "payment") {
            const paymentMode = parsePaymentModeFromPrompt(normalizedPrompt);
            if (!paymentMode) {
                sendChatBotMessage("Please choose payment method by typing `cash` or `points`.");
                return true;
            }
            if (paymentMode === "points") {
                const requiredPoints = chatPendingOrder.food.pointsCost * chatPendingOrder.quantity;
                if (chatPendingOrder.food.pointsCost <= 0) {
                    sendChatBotMessage("Points payment is not available for this item. Please choose `cash`.");
                    return true;
                }
                const availablePoints = studentPointState?.points ?? 0;
                const projectedPoints = reservedCartPoints + requiredPoints;
                if (availablePoints < projectedPoints) {
                    sendChatBotMessage(`Insufficient points. Required after this item: ${projectedPoints}, Available: ${availablePoints}. Please choose \`cash\` or reduce quantity.`);
                    return true;
                }
            }
            setChatPendingOrder({
                ...chatPendingOrder,
                paymentMode,
                step: "confirm",
            });
            const paymentSummary = paymentMode === "points"
                ? `${chatPendingOrder.food.pointsCost * chatPendingOrder.quantity} points`
                : "cash";
            sendChatBotMessage(`Please confirm your order:\nFood: ${chatPendingOrder.food.name} (ID ${chatPendingOrder.food.id})\nQuantity: ${chatPendingOrder.quantity}\nPayment: ${paymentSummary}\nReply with \`confirm\` to continue checkout or \`cancel\`.`);
            return true;
        }
        if (chatPendingOrder.step === "confirm") {
            const revisedQuantity = parseQuantityFromPrompt(normalizedPrompt);
            if (revisedQuantity && revisedQuantity !== chatPendingOrder.quantity) {
                if (revisedQuantity > chatPendingOrder.food.stock) {
                    sendChatBotMessage(`Only ${chatPendingOrder.food.stock} item(s) are available for ${chatPendingOrder.food.name}.`);
                    return true;
                }
                setChatPendingOrder({
                    ...chatPendingOrder,
                    quantity: revisedQuantity,
                    step: "payment",
                });
                sendChatBotMessage(`Quantity updated to ${revisedQuantity}. Please choose payment method again: \`cash\` or \`points\`.`);
                return true;
            }
            const revisedPayment = parsePaymentModeFromPrompt(normalizedPrompt);
            if (revisedPayment && revisedPayment !== chatPendingOrder.paymentMode) {
                setChatPendingOrder({
                    ...chatPendingOrder,
                    paymentMode: undefined,
                    step: "payment",
                });
                sendChatBotMessage("Payment method updated. Please choose payment method: `cash` or `points`.");
                return true;
            }
            if (!isConfirmPrompt(normalizedPrompt)) {
                sendChatBotMessage("Please reply with `confirm` to continue checkout or `cancel`.");
                return true;
            }
            const paymentMode = chatPendingOrder.paymentMode ?? "cash";
            const quantity = chatPendingOrder.quantity > 0 ? chatPendingOrder.quantity : 1;
            if (paymentMode === "points") {
                try {
                    const refreshedPoints = await loadStudentPointState(session);
                    setStudentPointState(refreshedPoints);
                    const requiredPoints = chatPendingOrder.food.pointsCost * quantity;
                    const projectedPoints = reservedCartPoints + requiredPoints;
                    if (refreshedPoints.points < projectedPoints) {
                        setChatPendingOrder({
                            ...chatPendingOrder,
                            step: "payment",
                        });
                        sendChatBotMessage(`Your current points are ${refreshedPoints.points}, but ${projectedPoints} points are required after adding this item. Please choose \`cash\` or adjust quantity.`);
                        return true;
                    }
                }
                catch {
                    setChatPendingOrder({
                        ...chatPendingOrder,
                        step: "payment",
                    });
                    sendChatBotMessage("Could not verify points right now. Please try again or use cash payment.");
                    return true;
                }
            }
            const updatedCart = addToOrderCart(session, chatPendingOrder.food.id, paymentMode, quantity);
            setCartItems(updatedCart);
            setChatPendingOrder(null);
            setCartStatus({
                ok: true,
                message: `${chatPendingOrder.food.name} added to cart for checkout.`,
            });
            sendChatBotMessage(`Added to your cart: ${chatPendingOrder.food.name} x${quantity} (${paymentMode}). Opening checkout now so you can submit delivery details.`);
            router.push("/checkout");
            return true;
        }
        return false;
    };
    const sendChatMessage = async (message) => {
        const trimmed = message.trim();
        if (!trimmed) {
            return;
        }
        const nextHistory = [
            ...chatMessages.map((chatMessage) => ({
                role: chatMessage.role,
                content: chatMessage.content,
            })),
            {
                role: "student",
                content: trimmed,
            },
        ].slice(-12);
        setChatMessages((prev) => [
            ...prev,
            { id: nextChatMessageId(), role: "student", content: trimmed },
        ]);
        setChatInput("");
        setChatOpen(true);
        if (!isStudentSession) {
            sendChatBotMessage("Please sign in as a student account first to use AI chat.");
            router.push(loginRedirectPath);
            return;
        }
        const handledPendingOrder = await handlePendingOrderFlow(trimmed);
        if (handledPendingOrder) {
            return;
        }
        if (isCancelPrompt(trimmed)) {
            setChatPendingOrder(null);
            sendChatBotMessage("No active order flow to cancel. You can continue with a new request.");
            return;
        }
        if (hasOrderIntent(trimmed)) {
            try {
                const selectedFood = await resolveFoodForOrderRequest(trimmed);
                if (selectedFood) {
                    if (selectedFood.stock <= 0) {
                        sendChatBotMessage(`${selectedFood.name} is currently unavailable.`);
                        return;
                    }
                    setChatPendingOrder({
                        food: selectedFood,
                        quantity: 1,
                        step: "quantity",
                    });
                    sendChatBotMessage(`Selected: ${selectedFood.name} (ID ${selectedFood.id}). Please provide quantity (for example: \`qty 2\`).`);
                    return;
                }
                if (chatRecommendations.length > 0) {
                    sendChatBotMessage("Please specify the food ID you want to order from the matched list (for example: `order food id 12`).");
                    return;
                }
            }
            catch {
                sendChatBotMessage("Could not process order request right now. Please try again.");
                return;
            }
        }
        setChatLoading(true);
        try {
            const aiResponse = await requestAIChat({
                session,
                message: trimmed,
                history: nextHistory,
            });
            const recommendationIds = aiResponse.recommendations.map((item) => item.foodId);
            if (recommendationIds.length > 0) {
                try {
                    const mappedFoods = await loadFoodsByIds(recommendationIds);
                    setChatRecommendations(mappedFoods);
                }
                catch {
                    setChatRecommendations([]);
                }
            }
            else {
                setChatRecommendations([]);
            }
            const recommendationLines = aiResponse.recommendations.map((item, index) => `${index + 1}. ${item.name} (ID ${item.foodId}) - BDT ${item.price} | rating ${item.rating.toFixed(1)} (${item.reviewCount}) | ${item.providerName}`);
            const combinedReply = recommendationLines.length > 0
                ? `${aiResponse.reply}\n\nMatched foods:\n${recommendationLines.join("\n")}\n\nTo order, type: \`order food id <id>\`.`
                : aiResponse.reply;
            sendChatBotMessage(combinedReply);
        }
        catch (error) {
            sendChatBotMessage(error instanceof Error ? error.message : "I could not process your request right now.");
        }
        finally {
            setChatLoading(false);
        }
    };
    const addToCart = (item, paymentMode) => {
        setCartStatus(null);
        if (!isStudentSession || !session) {
            const message = "Please sign in as a student to add items.";
            redirectGuestToLogin(message);
            return { ok: false, message };
        }
        if (item.stock <= 0) {
            const feedback = {
                ok: false,
                message: `${item.name} is currently sold out.`,
            };
            setCartStatus(feedback);
            return feedback;
        }
        if (paymentMode === "points") {
            if (!item.pointsCost || !studentPointState) {
                const feedback = {
                    ok: false,
                    message: "This item cannot be ordered with points.",
                };
                setCartStatus(feedback);
                return feedback;
            }
            const pointsAfterAdd = reservedCartPoints + item.pointsCost;
            if (pointsAfterAdd > studentPointState.points) {
                const feedback = {
                    ok: false,
                    message: "Not enough points to add this item to cart.",
                };
                setCartStatus(feedback);
                return feedback;
            }
        }
        const updatedCart = addToOrderCart(session, item.id, paymentMode, 1);
        setCartItems(updatedCart);
        const feedback = {
            ok: true,
            message: `${item.name} added to cart (${paymentMode === "points" ? "points" : "cash"}).`,
        };
        setCartStatus(feedback);
        return feedback;
    };
    const orderNow = (item) => {
        if (!isStudentSession || !session) {
            const message = "Please sign in as a student to place an order.";
            redirectGuestToLogin(message);
            return { ok: false, message };
        }
        if (item.stock <= 0) {
            const feedback = {
                ok: false,
                message: `${item.name} is currently sold out.`,
            };
            setCartStatus(feedback);
            return feedback;
        }
        const updatedCart = addToOrderCart(session, item.id, "cash", 1);
        setCartItems(updatedCart);
        const feedback = {
            ok: true,
            message: `${item.name} added for checkout with cash.`,
        };
        setCartStatus(feedback);
        router.push("/checkout");
        return feedback;
    };
    const openCartDrawer = () => {
        if (!isStudentSession || !session) {
            redirectGuestToLogin("Please sign in as a student to manage your cart.");
            return;
        }
        setCartOpen(true);
    };
    const goToCheckout = () => {
        if (!isStudentSession || !session) {
            redirectGuestToLogin("Please sign in as a student to continue checkout.");
            return;
        }
        router.push("/checkout");
    };
    const persistCart = (nextCart) => {
        if (!session || session.role !== "student") {
            return;
        }
        saveOrderCart(session, nextCart);
        setCartItems(nextCart);
    };
    const removeUnavailableCartItems = () => {
        setCartStatus(null);
        persistCart(cartItems.filter((line) => cartFoodMap.has(line.foodId)));
    };
    const updateCartLineQuantity = (line, quantity) => {
        if (!isStudentSession || !session) {
            redirectGuestToLogin("Please sign in as a student to update your cart.");
            return;
        }
        setCartStatus(null);
        const nextCart = quantity <= 0
            ? cartItems.filter((item) => !(item.foodId === line.foodId && item.paymentMode === line.paymentMode))
            : cartItems.map((item) => item.foodId === line.foodId && item.paymentMode === line.paymentMode
                ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
                : item);
        if (quantity > line.food.stock) {
            setCartStatus({
                ok: false,
                message: `Only ${line.food.stock} item(s) are currently available for ${line.food.name}.`,
            });
            return;
        }
        if (line.paymentMode === "points") {
            const pointsNeed = getCartPointRequirement(nextCart, cartFoodMap);
            if ((studentPointState?.points ?? 0) < pointsNeed) {
                setCartStatus({
                    ok: false,
                    message: "Not enough points for this quantity.",
                });
                return;
            }
        }
        persistCart(nextCart);
    };
    const switchCartLinePaymentMode = (line, targetMode) => {
        if (!isStudentSession || !session) {
            redirectGuestToLogin("Please sign in as a student to update your cart.");
            return;
        }
        if (line.paymentMode === targetMode) {
            return;
        }
        setCartStatus(null);
        if (targetMode === "points" && line.food.pointsCost <= 0) {
            setCartStatus({
                ok: false,
                message: "Points payment is not available for this item.",
            });
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
            const pointsNeed = getCartPointRequirement(mergedCart, cartFoodMap);
            if ((studentPointState?.points ?? 0) < pointsNeed) {
                setCartStatus({
                    ok: false,
                    message: "Not enough points to switch this item to point payment.",
                });
                return;
            }
        }
        persistCart(mergedCart);
    };
    const handleFoodReviewUpdated = (foodId, summary) => {
        setFoods((currentFoods) => currentFoods.map((item) => item.id === foodId
            ? {
                ...item,
                rating: summary.averageRating,
                reviewCount: summary.reviewCount,
            }
            : item));
        setCartFoodMap((currentMap) => {
            const nextMap = new Map(currentMap);
            const currentFood = nextMap.get(foodId);
            if (currentFood) {
                nextMap.set(foodId, {
                    ...currentFood,
                    rating: summary.averageRating,
                    reviewCount: summary.reviewCount,
                });
            }
            return nextMap;
        });
        // Re-sync the visible catalog from the backend so rating-driven ordering
        // and counts stay aligned with the database after each review save.
        setCatalogRefreshKey((current) => current + 1);
    };
    const hasAvailableKitchens = availableKitchenOptions.length > 0;
    const hasMealSlotOptions = catalogFilters.mealTimes.length > 0;
    const hasFoodOptionOptions = catalogFilters.foodOptions.length > 0;
    return (<>
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm backdrop-blur sm:p-7">
        <div className="pointer-events-none absolute -top-14 right-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl"/>
        <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-secondary/20 blur-2xl"/>

        <div className="relative space-y-6">
          <div className="space-y-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Find Your Favorite Campus Meals
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Browse food from halls, campus kitchens, and student chefs across
              Rajshahi University.
            </p>
          </div>

          {!isStudentSession && (<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-sm text-foreground">
                You are browsing as a guest. Sign in with a student account to place orders,
                use points, and chat with the delivery assistant.
              </p>
              <Button size="sm" className="rounded-full" asChild>
                <Link href={getAuthPagePath({ role: "student", mode: "login", next: "/browse-food" })}>
                  Student Login
                </Link>
              </Button>
            </div>)}

          {studentPointState && (<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Sparkles className="h-4 w-4 text-primary"/>
                <span className="font-medium">Live Points</span>
              </div>
              <p className="text-sm font-semibold text-primary">
                {formatAppNumber(studentPointState.points)} points available
              </p>
            </div>)}

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by food name or provider" aria-label="Search by food name or provider" className="h-11 rounded-full border-border/70 bg-background/95 pl-11 pr-4 shadow-sm"/>
          </div>

          <div className="flex items-center justify-between gap-3 md:hidden">
            <p className="text-sm font-medium text-foreground">Filters</p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowFilters((open) => !open)}>
              <Filter className="h-4 w-4"/>
              {showFilters ? "Hide" : "Show"}
            </Button>
          </div>

          <div className={cn("space-y-4 overflow-hidden transition-all duration-300", showFilters
            ? "max-h-[56rem] opacity-100"
            : "max-h-0 opacity-0 md:max-h-none md:opacity-100")}>
            <div className="grid gap-4 pt-1 md:grid-cols-2 md:gap-5 md:pt-0 xl:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="food-type">
                  Food Type
                </label>
                <Select value={foodType} onValueChange={(value) => handleFoodTypeChange(value)}>
                  <SelectTrigger id="food-type" className="h-11 w-full rounded-2xl bg-background/95">
                    <SelectValue placeholder="Select food type"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Food Types</SelectItem>
                    <SelectItem value="Hall">Hall Kitchen</SelectItem>
                    <SelectItem value="Campus Kitchen">Campus Kitchen</SelectItem>
                    <SelectItem value="Student Homemade">Student Kitchen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="kitchen-filter">
                  Registered Kitchen
                </label>
                <Select value={selectedKitchenValue} onValueChange={handleKitchenFilterChange} disabled={foodType === "All" || !hasAvailableKitchens}>
                  <SelectTrigger id="kitchen-filter" className="h-11 w-full rounded-2xl bg-background/95">
                    <SelectValue placeholder="Select kitchen"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KITCHEN_FILTER_ALL}>All Registered Kitchens</SelectItem>
                    {availableKitchenOptions.map((kitchen) => (<SelectItem key={kitchen.value} value={kitchen.value}>
                        {kitchen.label}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {foodType === "All"
            ? "Select a food type to view registered kitchens."
            : hasAvailableKitchens
                ? `${availableKitchenOptions.length} registered kitchen${availableKitchenOptions.length === 1 ? "" : "s"} available`
                : "No registered kitchen available for this food type."}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="meal-slot">
                  Meal Slot
                </label>
                <Select value={mealTimeFilter} onValueChange={(value) => handleMealTimeFilterChange(value)}>
                  <SelectTrigger id="meal-slot" className="h-11 w-full rounded-2xl bg-background/95">
                    <SelectValue placeholder="All meal slots"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Meal Slots</SelectItem>
                    {hasMealSlotOptions &&
            catalogFilters.mealTimes.map((mealTime) => (<SelectItem key={mealTime} value={mealTime}>
                          {mealTime}
                        </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="food-option-filter">
                  Menu Type
                </label>
                <Select value={foodOptionFilter} onValueChange={(value) => handleFoodOptionFilterChange(value)}>
                  <SelectTrigger id="food-option-filter" className="h-11 w-full rounded-2xl bg-background/95">
                    <SelectValue placeholder="All menu types"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Menu Types</SelectItem>
                    {hasFoodOptionOptions &&
            catalogFilters.foodOptions.map((foodOption) => (<SelectItem key={foodOption} value={foodOption}>
                          {getFoodOptionLabel(foodOption)}
                        </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="sort-by">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                  <SelectTrigger id="sort-by" className="h-11 w-full rounded-2xl bg-background/95">
                    <SelectValue placeholder="Sort by"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="popularity">Popularity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground" htmlFor="price-range">
                Price Range
              </label>
              <div className="rounded-2xl border border-border/70 bg-background/95 px-4 py-4">
                <Slider id="price-range" min={availablePriceBounds[0]} max={Math.max(availablePriceBounds[1], availablePriceBounds[0] + 1)} step={1} value={priceRange} onValueChange={(values) => {
            if (values.length === 2) {
                setHasCustomPriceRange(true);
                setPriceRange([values[0], values[1]]);
            }
        }}/>
                <div className="mt-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>BDT {priceRange[0]}</span>
                  <span>BDT {priceRange[1]}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant={pointsOnly ? "secondary" : "outline"} className="rounded-full" onClick={() => setPointsOnly((enabled) => !enabled)}>
              {pointsOnly ? "Showing Point Orders" : "Order with Points"}
            </Button>
            <Button variant={freeDeliveryOnly ? "secondary" : "outline"} className="rounded-full" onClick={() => setFreeDeliveryOnly((enabled) => !enabled)}>
              Free Delivery
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="outline" className="rounded-full" onClick={openCartDrawer}>
              <ShoppingCart className="h-4 w-4"/>
              Cart
              <Badge variant="secondary" className="ml-1">
                {cartCount}
              </Badge>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">Available Meals</h2>
          <p className="text-sm text-muted-foreground">
            {totalFoods} item{totalFoods === 1 ? "" : "s"} found
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ShoppingCart className="h-4 w-4 text-primary"/>
                Cart
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Add items, edit quantity in cart, then continue to checkout.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {cartCount} item{cartCount === 1 ? "" : "s"}
              </Badge>
              <Button variant="outline" size="sm" className="rounded-full" onClick={openCartDrawer}>
                Open Cart
              </Button>
              <Button size="sm" className="rounded-full" onClick={goToCheckout}>
                Checkout
              </Button>
            </div>
          </div>
          {cartStatus ? (<p className={cn("mt-3 text-sm font-medium", cartStatus.ok ? "text-primary" : "text-destructive")}>
              {cartStatus.message}
            </p>) : null}
        </div>

        {foods.length === 0 ? (<div className="rounded-2xl border border-dashed border-border bg-card/80 px-6 py-12 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">
              {loadingFoods ? "Loading meals..." : "No meals match your filters."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {loadingFoods
                ? "Fetching the latest menu."
                : catalogError || "Try widening price range, changing food type, or clearing your search."}
            </p>
            {!loadingFoods && (<Button className="mt-5 rounded-full" onClick={resetFilters}>
                Clear Filters
              </Button>)}
          </div>) : (<div id="food-grid" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {foods.map((item) => {
                const canUsePoints = item.pointsCost > 0 && (studentPointState?.points ?? 0) >= item.pointsCost;
                const canAddPointsToCart = item.pointsCost > 0 &&
                    (studentPointState?.points ?? 0) >= reservedCartPoints + item.pointsCost;
                const isOutOfStock = item.stock <= 0;
                return (<Card key={item.id} className="group overflow-hidden rounded-2xl border-border/70 bg-card py-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-44 overflow-hidden">
                    <img src={item.image} alt={`${item.name} from ${item.providerName}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => {
                        const target = event.currentTarget;
                        if (target.dataset.fallbackApplied === "true") {
                            return;
                        }
                        target.dataset.fallbackApplied = "true";
                        target.src = FOOD_IMAGE_FALLBACK_URL;
                    }}/>
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-background/90">
                        {item.providerType}
                      </Badge>
                      <Badge variant="outline" className="bg-background/90">
                        {item.mealTime}
                      </Badge>
                      <Badge variant="outline" className="bg-background/90">
                        {getFoodOptionLabel(item.foodOption)}
                      </Badge>
                      {item.freeDelivery && (<Badge className="bg-secondary text-secondary-foreground">
                          Free Delivery
                        </Badge>)}
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant={isOutOfStock ? "destructive" : "outline"} className="bg-background/90">
                        {isOutOfStock ? "Sold Out" : item.stock <= 5 ? `${item.stock} Left` : "In Stock"}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="space-y-3 px-5 pt-5 pb-4">
                    <div>
                      <h3 className="line-clamp-1 text-base font-semibold text-foreground">
                        {item.name}
                      </h3>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {item.providerName}
                        {item.hallName ? ` - ${item.hallName}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-primary">BDT {item.price}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (<Star key={`${item.id}-${index}`} className={cn("h-3.5 w-3.5", index < Math.round(item.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-amber-200")} aria-hidden="true"/>))}
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.reviewCount > 0
                        ? `(${item.reviewCount})`
                        : "(No reviews)"}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 border-t border-border/70 px-5 py-4">
                    <Button className="h-10 w-full rounded-full" disabled={isOutOfStock} onClick={() => orderNow(item)}>
                      Order Now
                    </Button>
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button variant="outline" className="h-10 rounded-full" disabled={isOutOfStock} onClick={() => addToCart(item, "cash")}>
                        <ShoppingCart className="h-4 w-4"/>
                        Add to Cart
                      </Button>
                      <Button variant="secondary" className="h-10 rounded-full" disabled={isOutOfStock ||
                        item.pointsCost <= 0 ||
                        (isStudentSession && (!canUsePoints || !canAddPointsToCart))} onClick={() => addToCart(item, "points")}>
                        {item.pointsCost > 0 ? `Add ${item.pointsCost} pts` : "No Points"}
                      </Button>
                    </div>
                    <FoodDetailDialog food={item} session={session} availablePoints={studentPointState?.points ?? 0} reservedPoints={reservedCartPoints} onAddToCart={addToCart} onOrderNow={orderNow} onReviewUpdated={handleFoodReviewUpdated}/>
                  </CardFooter>
                </Card>);
            })}
          </div>)}

        {totalFoods > 0 && totalPages > 1 && (<Pagination className="mt-10">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#food-grid" className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} onClick={(event) => {
                event.preventDefault();
                goToPage(currentPage - 1);
            }}/>
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (<PaginationItem key={page}>
                  <PaginationLink href="#food-grid" isActive={currentPage === page} onClick={(event) => {
                    event.preventDefault();
                    goToPage(page);
                }}>
                    {page}
                  </PaginationLink>
                </PaginationItem>))}

              <PaginationItem>
                <PaginationNext href="#food-grid" className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} onClick={(event) => {
                event.preventDefault();
                goToPage(currentPage + 1);
            }}/>
              </PaginationItem>
            </PaginationContent>
          </Pagination>)}
      </section>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-[92vw] sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary"/>
              Cart
            </SheetTitle>
            <SheetDescription>
              Edit quantity and payment mode before checkout.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-1 flex h-[calc(100vh-8.5rem)] flex-col px-4 pb-4">
            <div className="space-y-3 overflow-y-auto pr-1">
              {missingCartItems.length > 0 ? (<div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3">
                  <p className="text-xs font-medium text-destructive">
                    {missingCartItems.length} cart item{missingCartItems.length === 1 ? "" : "s"} are no longer available.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={removeUnavailableCartItems}>
                    Remove Unavailable Items
                  </Button>
                </div>) : null}

              {cartLineItems.length === 0 ? (<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">Your cart is empty.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add meals from the menu to continue.
                  </p>
                </div>) : (cartLineItems.map((line) => (<div key={`${line.foodId}-${line.paymentMode}`} className="rounded-xl border border-border/70 bg-muted/25 px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {line.food.name}
                        </p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {line.food.providerName}
                        </p>
                      </div>
                      <Badge variant={line.paymentMode === "points" ? "secondary" : "outline"}>
                        {line.paymentMode === "points" ? "Points" : "Cash"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => updateCartLineQuantity(line, line.quantity - 1)}>
                        <Minus className="h-3.5 w-3.5"/>
                      </Button>
                      <span className="text-sm font-medium">{line.quantity}</span>
                      <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0" disabled={line.quantity >= line.food.stock} onClick={() => updateCartLineQuantity(line, line.quantity + 1)}>
                        <Plus className="h-3.5 w-3.5"/>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-full px-2 text-destructive" onClick={() => updateCartLineQuantity(line, 0)}>
                        <Trash2 className="h-3.5 w-3.5"/>
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        Stock: {line.food.stock}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button variant={line.paymentMode === "cash" ? "default" : "outline"} size="sm" onClick={() => switchCartLinePaymentMode(line, "cash")}>
                        Cash
                      </Button>
                      <Button variant={line.paymentMode === "points" ? "secondary" : "outline"} size="sm" disabled={line.food.pointsCost <= 0} onClick={() => switchCartLinePaymentMode(line, "points")}>
                        Points
                      </Button>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      {line.paymentMode === "cash" ? (<>
                          <p>Subtotal: BDT {line.subtotal.toFixed(0)}</p>
                          <p>Service: BDT {line.serviceCharge.toFixed(0)}</p>
                          <p className="font-semibold text-foreground">
                            Pay: BDT {line.payableCash.toFixed(0)}
                          </p>
                        </>) : (<p className="font-semibold text-foreground">
                          Pay: {line.pointsRequired} pts
                        </p>)}
                    </div>
                  </div>)))}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Items</span>
                  <span>{cartCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cash Payable</span>
                  <span>BDT {cartTotals.cashPayable.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Points Payable</span>
                  <span>{cartTotals.pointsPayable} pts</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Preview uses Free Delivery First service charge. Checkout lets you switch
                to Paid Delivery Service.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setCartOpen(false)}>
                  Keep Browsing
                </Button>
                <Button className="rounded-full" onClick={goToCheckout}>
                  Go to Checkout
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn("fixed right-3 bottom-24 left-3 z-40 w-auto overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all duration-300 sm:right-4 sm:left-auto sm:w-[min(92vw,360px)]", chatOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0")}>
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4"/>
            <p className="text-sm font-semibold">AI Meal Suggestions</p>
          </div>
          <button type="button" onClick={() => setChatOpen(false)} className="rounded-full p-1 transition-colors hover:bg-primary-foreground/15" aria-label="Close meal suggestion chat">
            <X className="h-4 w-4"/>
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
          {chatMessages.map((message) => (<div key={message.id} className={cn("max-w-[90%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm", message.role === "student"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground")}>
              {message.content}
            </div>))}
          {chatLoading && (<div className="max-w-[90%] rounded-2xl bg-muted px-3 py-2 text-sm text-foreground">
              Thinking...
            </div>)}
        </div>

        <div className="space-y-2 border-t border-border/80 px-3 py-3">
          <form className="flex items-center gap-2" onSubmit={(event) => {
            event.preventDefault();
            void sendChatMessage(chatInput);
        }}>
            <Input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Type anything about food or order..." aria-label="Food chatbot input" className="h-9 rounded-full"/>
            <Button type="submit" size="sm" className="rounded-full px-4">
              Send
            </Button>
          </form>
        </div>
      </div>

      <button type="button" onClick={openCartDrawer} className="fixed right-4 bottom-20 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-card text-foreground shadow-xl transition-all duration-300 hover:scale-105 hover:bg-muted sm:bottom-24" aria-label="Open cart">
        <ShoppingCart className="h-5 w-5"/>
        {cartCount > 0 ? (<span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {cartCount}
          </span>) : null}
      </button>

      <button type="button" onClick={() => setChatOpen((open) => !open)} className="fixed right-4 bottom-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-105 hover:bg-primary/90 sm:bottom-6" aria-label="Open AI meal suggestion chatbot">
        <MessageCircle className="h-6 w-6"/>
      </button>
    </>);
}
function getCashServiceChargeRate(providerType) {
    if (providerType === "Student Homemade") {
        return STUDENT_KITCHEN_FREE_FIRST_SERVICE_CHARGE_RATE;
    }
    return STANDARD_FREE_FIRST_SERVICE_CHARGE_RATE;
}
function getCartPointRequirement(cartItems, foodMap) {
    return cartItems.reduce((total, line) => {
        if (line.paymentMode !== "points") {
            return total;
        }
        const food = foodMap.get(line.foodId);
        if (!food || food.pointsCost <= 0) {
            return total;
        }
        return total + food.pointsCost * line.quantity;
    }, 0);
}
