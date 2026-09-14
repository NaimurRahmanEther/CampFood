"use client";
import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatAppDate, formatAppNumber } from "@/lib/date-format";
import { getFoodOptionHelperText, getFoodOptionLabel, loadFoodReviews, loadFoodsByIds, submitFoodReview, } from "@/lib/foods";
import { cn } from "@/lib/utils";
const DEFAULT_RATING = 5;
const DETAIL_REFRESH_INTERVAL_MS = 15_000;
const STANDARD_FREE_FIRST_SERVICE_CHARGE_RATE = 0.03;
const STUDENT_KITCHEN_FREE_FIRST_SERVICE_CHARGE_RATE = 0.07;
const FOOD_IMAGE_FALLBACK_URL = "/placeholder.svg";
export function FoodDetailDialog({ food, session, availablePoints, reservedPoints, onAddToCart, onOrderNow, onReviewUpdated, }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionFeedback, setActionFeedback] = useState(null);
    const [summary, setSummary] = useState(null);
    const [liveFood, setLiveFood] = useState(food);
    const [selectedRating, setSelectedRating] = useState(DEFAULT_RATING);
    const [comment, setComment] = useState("");
    const trimmedComment = comment.trim();
    useEffect(() => {
        setLiveFood(food);
    }, [food]);
    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        async function hydrateDialog(prefillDraft) {
            setLoading(true);
            if (prefillDraft) {
                setActionFeedback(null);
                setErrorMessage("");
                setSuccessMessage("");
            }
            const [foodResult, reviewResult] = await Promise.allSettled([
                loadFoodsByIds([food.id]),
                loadFoodReviews(food.id),
            ]);
            if (cancelled) {
                return;
            }
            if (foodResult.status === "fulfilled" && foodResult.value[0]) {
                setLiveFood(foodResult.value[0]);
            }
            if (reviewResult.status === "fulfilled") {
                const nextSummary = reviewResult.value;
                setSummary(nextSummary);
                if (prefillDraft) {
                    const existingReview = findSessionReview(nextSummary, session);
                    setSelectedRating(existingReview?.rating ?? DEFAULT_RATING);
                    setComment(existingReview?.comment ?? "");
                }
            }
            else {
                if (prefillDraft) {
                    setSummary(null);
                    setSelectedRating(DEFAULT_RATING);
                    setComment("");
                }
                setErrorMessage(reviewResult.reason instanceof Error
                    ? reviewResult.reason.message
                    : "Could not load live reviews.");
            }
            setLoading(false);
        }
        const refreshDialog = () => {
            if (document.visibilityState === "visible") {
                void hydrateDialog(false);
            }
        };
        void hydrateDialog(true);
        window.addEventListener("focus", refreshDialog);
        document.addEventListener("visibilitychange", refreshDialog);
        const intervalId = window.setInterval(refreshDialog, DETAIL_REFRESH_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.removeEventListener("focus", refreshDialog);
            document.removeEventListener("visibilitychange", refreshDialog);
            window.clearInterval(intervalId);
        };
    }, [food.id, open, session]);
    const currentFood = liveFood;
    const currentUserReview = findSessionReview(summary, session);
    const ratingValue = summary?.averageRating ?? currentFood.rating;
    const reviewCount = summary?.reviewCount ?? currentFood.reviewCount;
    const isOutOfStock = currentFood.stock <= 0;
    const cashServiceCharge = Math.round(currentFood.price * getCashServiceChargeRate(currentFood.providerType));
    const estimatedCashTotal = currentFood.price + cashServiceCharge;
    const canUsePoints = currentFood.pointsCost > 0 && availablePoints >= currentFood.pointsCost;
    const canAddPointsToCart = currentFood.pointsCost > 0 &&
        availablePoints >= reservedPoints + currentFood.pointsCost;
    const handleSubmit = async () => {
        if (!session || session.role !== "student") {
            setErrorMessage("Please sign in as a student to leave a rating and comment.");
            setSuccessMessage("");
            return;
        }
        if (!trimmedComment) {
            setErrorMessage("Please add a short comment with your rating.");
            setSuccessMessage("");
            return;
        }
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const nextSummary = await submitFoodReview(food.id, selectedRating, trimmedComment);
            setSummary(nextSummary);
            onReviewUpdated?.(food.id, nextSummary);
            setLiveFood((current) => ({
                ...current,
                rating: nextSummary.averageRating,
                reviewCount: nextSummary.reviewCount,
            }));
            const savedReview = findSessionReview(nextSummary, session);
            setComment(savedReview?.comment ?? trimmedComment);
            setSelectedRating(savedReview?.rating ?? selectedRating);
            setSuccessMessage("Your rating and comment are now live for other students.");
        }
        catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not submit review.");
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleOrderNow = () => {
        setActionFeedback(onOrderNow(currentFood));
    };
    const handleAddToCart = (paymentMode) => {
        setActionFeedback(onAddToCart(currentFood, paymentMode));
    };
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 w-full rounded-full">
          View Details
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-4xl">
        <ScrollArea className="max-h-[88vh]">
          <div className="relative h-56 overflow-hidden sm:h-64">
            <img src={currentFood.image} alt={`${currentFood.name} from ${currentFood.providerName}`} className="h-full w-full object-cover" onError={(event) => {
            const target = event.currentTarget;
            if (target.dataset.fallbackApplied === "true") {
                return;
            }
            target.dataset.fallbackApplied = "true";
            target.src = FOOD_IMAGE_FALLBACK_URL;
        }}/>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"/>
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{currentFood.providerType}</Badge>
              <Badge variant="outline" className="bg-background/90">
                {currentFood.category}
              </Badge>
              <Badge variant="outline" className="bg-background/90">
                {currentFood.mealTime}
              </Badge>
              <Badge variant="outline" className="bg-background/90">
                {getFoodOptionLabel(currentFood.foodOption)}
              </Badge>
            </div>
            <div className="absolute top-4 right-4">
              <Badge variant={isOutOfStock ? "destructive" : "outline"} className="bg-background/90">
                {getStockBadgeLabel(currentFood.stock)}
              </Badge>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="space-y-1">
                <DialogTitle className="text-2xl">{currentFood.name}</DialogTitle>
                <DialogDescription className="max-w-2xl">
                  Everything needed to order this meal, plus live student ratings and comments in one
                  place.
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{currentFood.providerName}</span>
                {currentFood.hallName ? <span>{currentFood.hallName}</span> : null}
                <span>BDT {currentFood.price}</span>
                <span>{reviewCount} review{reviewCount === 1 ? "" : "s"}</span>
              </div>
            </DialogHeader>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailCard label="Provider" value={currentFood.providerName} hint={currentFood.hallName || currentFood.providerType}/>
                  <DetailCard label="Category" value={currentFood.category} hint={currentFood.mealTime}/>
                  <DetailCard label="Menu Type" value={getFoodOptionLabel(currentFood.foodOption)} hint={getFoodOptionHelperText(currentFood.foodOption)}/>
                  <DetailCard label="Availability" value={getStockDetailHint(currentFood.stock)} hint={currentFood.hallName || "Campus-wide ordering"}/>
                  <DetailCard label="Delivery" value={currentFood.freeDelivery ? "Free delivery" : "Delivery available"} hint="Cash service depends on selected delivery service"/>
                  <DetailCard label="Points Order" value={currentFood.pointsCost > 0 ? `${currentFood.pointsCost} pts` : "Cash only"} hint={session?.role === "student"
            ? `${formatAppNumber(availablePoints)} pts available`
            : "Student sign-in required for points"}/>
                </div>

                <section className="rounded-2xl border border-border/70 bg-muted/25 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Current student rating</h3>
                      <p className="text-xs text-muted-foreground">
                        Reviews update while this panel is open.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, index) => (<Star key={`${currentFood.id}-summary-${index}`} className={cn("h-4 w-4", index < Math.round(ratingValue)
                ? "fill-amber-400 text-amber-400"
                : "text-amber-200")} aria-hidden="true"/>))}
                      <span className="text-base font-semibold text-foreground">
                        {ratingValue.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <DetailCard label="Reviews" value={`${reviewCount}`} hint="Students can read every comment" compact/>
                    <DetailCard label="Cash Checkout" value={`BDT ${estimatedCashTotal}`} hint={`Includes BDT ${cashServiceCharge} service`} compact/>
                    <DetailCard label="Points Checkout" value={currentFood.pointsCost > 0 ? `${currentFood.pointsCost} pts` : "Unavailable"} hint="Zero service charge on points" compact/>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border/70 bg-background px-5 py-5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Rate and comment</h3>
                    <p className="text-xs text-muted-foreground">
                      Share taste, value, portion size, or delivery feedback for other students.
                    </p>
                    {currentUserReview ? (<p className="text-xs font-medium text-primary">
                        Editing and posting again updates your existing review.
                      </p>) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
            const rating = index + 1;
            return (<button key={`${currentFood.id}-input-${rating}`} type="button" onClick={() => setSelectedRating(rating)} className="rounded-full p-1 transition-transform hover:scale-105" aria-label={`Rate ${rating} star${rating === 1 ? "" : "s"}`}>
                          <Star className={cn("h-6 w-6", rating <= selectedRating
                    ? "fill-amber-400 text-amber-400"
                    : "text-amber-200")}/>
                        </button>);
        })}
                    <span className="text-sm font-medium text-muted-foreground">
                      {selectedRating}/5
                    </span>
                  </div>

                  <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should other students know before ordering this meal?" className="min-h-28 rounded-2xl bg-muted/20" maxLength={500}/>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">{comment.length}/500</p>
                    <Button className="rounded-full" onClick={handleSubmit} disabled={submitting ||
            !session ||
            session.role !== "student" ||
            !trimmedComment}>
                      {submitting ? (<>
                          <Loader2 className="h-4 w-4 animate-spin"/>
                          Saving Review
                        </>) : ("Save Rating")}
                    </Button>
                  </div>

                  {!session || session.role !== "student" ? (<p className="text-sm text-muted-foreground">
                      Sign in as a student to rate and comment. Everyone can still read reviews.
                    </p>) : null}

                  {errorMessage ? (<p className="text-sm font-medium text-destructive">{errorMessage}</p>) : null}

                  {successMessage ? (<p className="text-sm font-medium text-primary">{successMessage}</p>) : null}
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary"/>
                    <h3 className="text-sm font-semibold text-foreground">Order this meal</h3>
                  </div>

                  <div className="mt-4 rounded-2xl bg-muted/25 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Base Price
                        </p>
                        <p className="mt-1 text-3xl font-semibold text-primary">
                          BDT {currentFood.price}
                        </p>
                      </div>
                      {currentFood.freeDelivery ? (<Badge className="bg-secondary text-secondary-foreground">
                          Free Delivery
                        </Badge>) : (<Badge variant="outline">Delivery Available</Badge>)}
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3 text-muted-foreground">
                        <span>Cash service charge</span>
                        <span>BDT {cashServiceCharge}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 font-medium text-foreground">
                        <span>Estimated cash total</span>
                        <span>BDT {estimatedCashTotal}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-muted-foreground">
                        <span>Points payment</span>
                        <span>
                          {currentFood.pointsCost > 0 ? `${currentFood.pointsCost} pts` : "Not available"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-muted-foreground">
                        <span>Stock</span>
                        <span>{getStockDetailHint(currentFood.stock)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Button className="h-10 w-full rounded-full" onClick={handleOrderNow} disabled={isOutOfStock}>
                      Order Now
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-10 rounded-full" onClick={() => handleAddToCart("cash")} disabled={isOutOfStock}>
                        <ShoppingCart className="h-4 w-4"/>
                        Add Cash
                      </Button>
                      <Button variant="secondary" className="h-10 rounded-full" onClick={() => handleAddToCart("points")} disabled={isOutOfStock ||
            currentFood.pointsCost <= 0 ||
            (session?.role === "student" && (!canUsePoints || !canAddPointsToCart))}>
                        {currentFood.pointsCost > 0 ? `Add ${currentFood.pointsCost} pts` : "No Points"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {isOutOfStock ? (<p className="font-medium text-destructive">
                        This meal is sold out right now. Details and reviews stay live.
                      </p>) : null}
                    {session?.role === "student" && currentFood.pointsCost > 0 && !canAddPointsToCart ? (<p>
                        Your current point balance or reserved cart points are not enough to add this meal
                        with points right now.
                      </p>) : null}
                    {session?.role !== "student" ? (<p>
                        Sign in as a student to place an order or use points.
                      </p>) : null}
                  </div>

                  {actionFeedback ? (<p className={cn("mt-4 text-sm font-medium", actionFeedback.ok ? "text-primary" : "text-destructive")}>
                      {actionFeedback.message}
                    </p>) : null}
                </section>

                <section className="space-y-3 rounded-2xl border border-border/70 bg-muted/15 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Student comments</h3>
                      <p className="text-xs text-muted-foreground">
                        Everyone can read live feedback before ordering.
                      </p>
                    </div>
                    {loading ? (<div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        Refreshing
                      </div>) : (<div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5"/>
                        Live
                      </div>)}
                  </div>

                  <Separator />

                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {!loading && (summary?.reviews.length ?? 0) === 0 ? (<div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
                        <p className="text-sm font-medium text-foreground">No comments yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Be the first student to rate and comment on this meal.
                        </p>
                      </div>) : null}

                    {summary?.reviews.map((review) => (<article key={review.id} className={cn("rounded-2xl border border-border/70 bg-background px-4 py-3", isSessionReview(review, session) && "border-primary/35 bg-primary/5")}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {review.studentName}
                              </p>
                              {isSessionReview(review, session) ? (<span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  Your review
                                </span>) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatReviewDate(review.updatedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (<Star key={`${review.id}-${index}`} className={cn("h-3.5 w-3.5", index < review.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-amber-200")}/>))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {review.comment.trim() || "No written comment provided yet."}
                        </p>
                      </article>))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={submitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
function DetailCard({ label, value, hint, compact = false }) {
    return (<div className={cn("rounded-2xl border border-border/70 bg-background/80 px-4 py-4", compact && "bg-background/60 px-3 py-3")}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 text-base font-semibold text-foreground", compact && "text-sm")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>);
}
function getCashServiceChargeRate(providerType) {
    if (providerType === "Student Homemade") {
        return STUDENT_KITCHEN_FREE_FIRST_SERVICE_CHARGE_RATE;
    }
    return STANDARD_FREE_FIRST_SERVICE_CHARGE_RATE;
}
function getStockBadgeLabel(stock) {
    if (stock <= 0) {
        return "Sold Out";
    }
    if (stock <= 5) {
        return `${stock} Left`;
    }
    return "In Stock";
}
function getStockDetailHint(stock) {
    if (stock <= 0) {
        return "Sold out";
    }
    if (stock <= 5) {
        return `${stock} portions left`;
    }
    return `${stock} portions available`;
}
function formatReviewDate(value) {
    return formatAppDate(value) || "Recently";
}
function findSessionReview(summary, session) {
    if (!summary || !session || session.role !== "student") {
        return null;
    }
    if (summary.currentUserReview) {
        return summary.currentUserReview;
    }
    const sessionUserId = normalizeReviewIdentity(session.userId);
    if (sessionUserId) {
        const byUserId = summary.reviews.find((review) => normalizeReviewIdentity(review.userId ?? "") === sessionUserId);
        if (byUserId) {
            return byUserId;
        }
    }
    const normalizedSessionName = normalizeReviewIdentity(session.name);
    if (!normalizedSessionName) {
        return null;
    }
    return (summary.reviews.find((review) => normalizeReviewIdentity(review.studentName) === normalizedSessionName) ?? null);
}
function isSessionReview(review, session) {
    if (!session || session.role !== "student") {
        return false;
    }
    const sessionUserId = normalizeReviewIdentity(session.userId);
    const reviewUserId = normalizeReviewIdentity(review.userId ?? "");
    if (sessionUserId && reviewUserId) {
        return sessionUserId === reviewUserId;
    }
    if (review.isOwn) {
        return true;
    }
    return normalizeReviewIdentity(review.studentName) === normalizeReviewIdentity(session.name);
}
function normalizeReviewIdentity(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}
