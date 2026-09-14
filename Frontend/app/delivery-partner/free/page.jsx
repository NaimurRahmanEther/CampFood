"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bike, CalendarDays, Gift, Loader2, ShieldCheck, Star, TrendingUp, User, IdCard, Phone, Mail, Clock, Utensils, } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineStatusMessage } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { loadDeliveryRegistrationStatus, submitApprovalRequest, } from "@/lib/admin-approvals";
import { getAuthPagePath, getRoleHomePath } from "@/lib/auth-session";
import { RU_DEPARTMENT_OPTIONS, RU_HALL_OPTIONS } from "@/lib/campus-options";
import { formatDeliveryRegistrationStatusLabel, } from "@/lib/delivery-partner";
import { formatAppDateTime } from "@/lib/date-format";
import { buildPartnerDeliveryStats, } from "@/lib/delivery-partner-stats";
import { loadDeliveryOrders } from "@/lib/delivery-orders";
import { getErrorMessage } from "@/lib/error-message";
import { loadStudentPointState } from "@/lib/student-points";
import { useAuthSessionState } from "@/hooks/use-session-state";
const benefits = [
    { icon: Star, title: "Earn Points", desc: "Get 200 points once per month when you deliver every day." },
    { icon: Utensils, title: "Redeem For Meals", desc: "Use your earned points on meals across the campus menu." },
    { icon: Clock, title: "Flexible Hours", desc: "Pick up delivery requests whenever your class schedule allows." },
    { icon: ShieldCheck, title: "Admin Approved", desc: "Applications are reviewed first so only verified students receive orders." },
    { icon: CalendarDays, title: "Quick Response", desc: "Free partners get first access to new delivery requests." },
    { icon: TrendingUp, title: "Build Experience", desc: "Track delivery history, earnings, and overall contribution in the platform." },
];
const transportModes = ["Walking", "Bicycle", "Motorbike", "Mixed"];
const availabilityOptions = [
    "Morning",
    "Afternoon",
    "Evening",
    "Between Classes",
    "Flexible",
];
export default function FreePartnerPage() {
    const router = useRouter();
    const { session, hydrated } = useAuthSessionState();
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [status, setStatus] = useState("not-submitted");
    const [selectedHall, setSelectedHall] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedTransportMode, setSelectedTransportMode] = useState("");
    const [selectedAvailability, setSelectedAvailability] = useState("");
    const [statusError, setStatusError] = useState("");
    const [formError, setFormError] = useState("");
    const [statsError, setStatsError] = useState("");
    const [loadingStats, setLoadingStats] = useState(false);
    const [freeStats, setFreeStats] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function hydratePage() {
            if (!hydrated || cancelled) {
                return;
            }
            setCheckingStatus(true);
            if (!session || session.role !== "student") {
                setStatus("not-submitted");
                setStatusError("");
                setCheckingStatus(false);
                return;
            }
            try {
                const nextStatus = await loadDeliveryRegistrationStatus(session.email, "free");
                if (!cancelled) {
                    setStatus(nextStatus);
                    setStatusError("");
                }
                if (nextStatus === "approved") {
                    if (!cancelled) {
                        setLoadingStats(true);
                    }
                    try {
                        const [orders, pointState] = await Promise.all([
                            loadDeliveryOrders("queue", session),
                            loadStudentPointState(session),
                        ]);
                        if (!cancelled) {
                            setFreeStats(buildPartnerDeliveryStats(orders, pointState, session.userId, "free"));
                            setStatsError("");
                        }
                    }
                    catch (error) {
                        if (!cancelled) {
                            setFreeStats(null);
                            setStatsError(getErrorMessage(error, "Could not load free delivery performance right now."));
                        }
                    }
                    finally {
                        if (!cancelled) {
                            setLoadingStats(false);
                        }
                    }
                }
                else if (!cancelled) {
                    setLoadingStats(false);
                    setFreeStats(null);
                    setStatsError("");
                }
            }
            catch (error) {
                if (!cancelled) {
                    const message = getErrorMessage(error, "Could not load your delivery application status.");
                    setStatusError(message);
                    toast.error(message);
                }
            }
            finally {
                if (!cancelled) {
                    setCheckingStatus(false);
                }
            }
        }
        void hydratePage();
        return () => {
            cancelled = true;
        };
    }, [hydrated, session]);
    useEffect(() => {
        if (!hydrated || !session) {
            return;
        }
        if (session.role !== "student") {
            router.replace(getRoleHomePath(session.role));
        }
    }, [hydrated, router, session]);
    const requiresStudentLogin = !session || session.role !== "student";
    const freePlanApproved = status === "approved";
    const formLocked = status === "pending";
    async function handleSubmit(e) {
        e.preventDefault();
        setFormError("");
        if (requiresStudentLogin) {
            const message = "Please login with your student account before applying.";
            setFormError(message);
            toast.error(message);
            router.push(getAuthPagePath({ role: "student", mode: "login" }));
            return;
        }
        if (formLocked) {
            const message = "Your current application does not need another submission right now.";
            setFormError(message);
            toast.error(message);
            return;
        }
        const formData = new FormData(e.currentTarget);
        const name = String(formData.get("fp-name") ?? session.name ?? "").trim();
        const studentId = String(formData.get("fp-sid") ?? "").trim();
        const phone = String(formData.get("fp-phone") ?? "").trim();
        const email = String(formData.get("fp-email") ?? session.email ?? "").trim().toLowerCase();
        if (!name ||
            !studentId ||
            !phone ||
            !email ||
            !selectedDepartment ||
            !selectedHall ||
            !selectedTransportMode ||
            !selectedAvailability) {
            const message = "Please complete all required fields before submitting.";
            setFormError(message);
            toast.error(message);
            return;
        }
        setLoading(true);
        try {
            await submitApprovalRequest({
                type: "delivery-registration",
                applicantName: name,
                applicantEmail: email,
                payload: {
                    plan: "free",
                    studentId,
                    department: selectedDepartment,
                    hallName: selectedHall,
                    phone,
                    transportMode: selectedTransportMode,
                    availabilityWindow: selectedAvailability,
                },
            });
            setStatus("pending");
            setFormError("");
            toast.success("Application submitted!", {
                description: "Admin approval is required before free delivery access opens.",
            });
        }
        catch (error) {
            const message = getErrorMessage(error, "Could not submit your application.");
            setFormError(message);
            toast.error(message);
        }
        finally {
            setLoading(false);
        }
    }
    if (hydrated && session && session.role !== "student") {
        return null;
    }
    return (<div className="relative min-h-screen bg-background">
      <Toaster position="top-center" richColors/>

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <Image src="/images/delivery-bg.jpg" alt="" fill className="object-cover opacity-10" priority/>
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-background/92 to-background"/>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-18">
          <Link href="/delivery-partner" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4"/>
            Back to Partner Plans
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm font-medium text-secondary-foreground">
                <Gift className="h-4 w-4"/>
                Free Delivery Partner
              </div>
              <h1 className="mt-5 font-mono text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Flexible delivery with
                <span className="text-secondary"> points-based rewards</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Apply as a verified student courier, receive admin approval, and pick up eligible
                orders through the free delivery service.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <HighlightMetric value="+120 pts" label="Approval bonus"/>
                <HighlightMetric value="Fast" label="Order response"/>
                <HighlightMetric value="Admin reviewed" label="Access model"/>
              </div>
            </div>

            <Card className="border-secondary/20 bg-card shadow-lg">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Application Status
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-foreground">
                    {checkingStatus
            ? "Checking..."
            : formatDeliveryRegistrationStatusLabel(status)}
                  </span>
                  {session?.role === "student" ? (<span className="text-xs text-muted-foreground">Signed in as {session.name}</span>) : (<span className="text-xs text-muted-foreground">Student login required</span>)}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {getFreeApplicationMessage(status, requiresStudentLogin)}
                </p>
                <InlineStatusMessage message={statusError} tone="error" className="mt-4 text-xs"/>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <StatusRow label="Approval" value="Admin must approve first"/>
                  <StatusRow label="Delivery Access" value="Free delivery service"/>
                  <StatusRow label="Reward" value="200 monthly points for full-month daily delivery"/>
                </div>
                {freePlanApproved && !requiresStudentLogin && (<div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href="/profile/delivery">Open Delivery Workspace</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/delivery-partner/permanent">Apply for Permanent Delivery</Link>
                    </Button>
                  </div>)}
                {requiresStudentLogin && (<Button className="mt-6 w-full" asChild>
                    <Link href={getAuthPagePath({ role: "student", mode: "login" })}>Login As Student</Link>
                  </Button>)}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit) => (<div key={benefit.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <benefit.icon className="h-6 w-6 text-secondary"/>
                </div>
                <h2 className="mt-4 font-mono text-lg font-bold text-foreground">
                  {benefit.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {benefit.desc}
                </p>
              </div>))}
          </div>
        </div>
      </section>

      {freePlanApproved ? (<section className="pb-16 lg:pb-20">
          <div className="mx-auto max-w-5xl px-4 lg:px-8">
            <Card className="border-border shadow-lg">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Registered Delivery Partner
                  </p>
                  <h2 className="mt-3 font-mono text-2xl font-bold text-foreground">
                    Your free delivery plan is active
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Registration form is hidden because your free delivery role is already approved
                    by admin. You can receive delivery requests now and still apply for permanent
                    delivery anytime.
                  </p>
                </div>

                <div className="space-y-3">
                  <StatusRow label="Partner Name" value={session?.name ?? "Student Partner"}/>
                  <StatusRow label="Account Email" value={session?.email ?? "N/A"}/>
                  <StatusRow label="Plan" value="Free Delivery Partner"/>
                  <StatusRow label="Delivery Access" value="Free delivery service"/>
                  <StatusRow label="Status" value="Approved and Active"/>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                    <Link href="/profile/delivery">
                      <Bike className="h-4 w-4"/>
                      Open Delivery Workspace
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/delivery-partner/permanent">Apply for Permanent Delivery</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 border-border shadow-lg">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Free Delivery Performance
                  </p>
                  <h3 className="mt-3 font-mono text-xl font-bold text-foreground">
                    Your completed free deliveries and points
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This view shows your free-delivery history and points earned from completed deliveries.
                  </p>
                </div>

                {loadingStats ? (<p className="text-sm text-muted-foreground">Loading free-delivery stats...</p>) : statsError ? (<InlineStatusMessage message={statsError} tone="error" className="text-xs"/>) : freeStats ? (<>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatsTile label="Total Deliveries" value={String(freeStats.totalDeliveries)}/>
                      <StatsTile label="Total Points Earned" value={`${freeStats.totalRewardPoints} pts`}/>
                      <StatsTile label="This Month Deliveries" value={String(freeStats.thisMonthDeliveries)}/>
                      <StatsTile label="This Month Points" value={`${freeStats.thisMonthRewardPoints} pts`}/>
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">Recent Free Deliveries</p>
                        <span className="text-xs text-muted-foreground">
                          Showing {freeStats.recentRows.length}
                        </span>
                      </div>

                      {freeStats.recentRows.length === 0 ? (<p className="mt-3 text-sm text-muted-foreground">
                          No completed free deliveries yet.
                        </p>) : (<div className="mt-3 space-y-2">
                          {freeStats.recentRows.map((row) => (<div key={row.orderId} className="rounded-lg border border-border bg-background px-3 py-3 text-xs">
                              <p className="font-medium text-foreground">Order #{row.orderId}</p>
                              <p className="mt-1 text-muted-foreground">
                                Delivered: {row.deliveredAt ? formatAppDateTime(row.deliveredAt) : "N/A"}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                Items: {row.items} | Cash: BDT {row.cashPayable.toFixed(0)} | Points paid by customer: {row.pointsPayable}
                              </p>
                              <p className="mt-1 font-semibold text-secondary">
                                You earned: {row.rewardPoints} pts
                              </p>
                            </div>))}
                        </div>)}
                    </div>
                  </>) : (<p className="text-sm text-muted-foreground">
                    Free-delivery performance will appear here after your first completed delivery.
                  </p>)}
              </CardContent>
            </Card>
          </div>
        </section>) : (<section className="pb-16 lg:pb-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <Card className="border-border shadow-lg">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Free Partner Application
                  </p>
                  <h2 className="mt-3 font-mono text-2xl font-bold text-foreground">
                    Apply with your student account
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Submit your details once. After admin approval, your account can claim eligible
                    delivery orders directly from the delivery desk.
                  </p>
                </div>

                <form key={session?.email ?? "guest-free"} onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <InlineStatusMessage message={formError} tone="error" className="text-xs"/>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Full Name" icon={User}>
                      <Input id="fp-name" name="fp-name" placeholder="Your full name" className="pl-10 h-10" defaultValue={session?.name ?? ""} disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                    <FormField label="Student ID" icon={IdCard}>
                      <Input id="fp-sid" name="fp-sid" placeholder="Enter 10-digit student ID" className="pl-10 h-10" inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" title="Student ID must be exactly 10 digits (0-9 only)." onInput={(event) => {
                event.currentTarget.value = event.currentTarget.value
                    .replace(/\D/g, "")
                    .slice(0, 10);
            }} disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Department</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={formLocked || requiresStudentLogin}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select your department"/>
                        </SelectTrigger>
                        <SelectContent>
                          {RU_DEPARTMENT_OPTIONS.map((department) => (<SelectItem key={department} value={department}>
                              {department}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Hall Name</Label>
                      <Select value={selectedHall} onValueChange={setSelectedHall} disabled={formLocked || requiresStudentLogin}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select your hall"/>
                        </SelectTrigger>
                        <SelectContent>
                          {RU_HALL_OPTIONS.map((hall) => (<SelectItem key={hall} value={hall}>
                              {hall}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Phone Number" icon={Phone}>
                      <Input id="fp-phone" name="fp-phone" type="tel" placeholder="01XXXXXXXXX" className="pl-10 h-10" disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                    <FormField label="Email" icon={Mail}>
                      <Input id="fp-email" name="fp-email" type="email" placeholder="you@example.com" className="pl-10 h-10" defaultValue={session?.email ?? ""} disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Transport Mode</Label>
                      <Select value={selectedTransportMode} onValueChange={setSelectedTransportMode} disabled={formLocked || requiresStudentLogin}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="How will you deliver?"/>
                        </SelectTrigger>
                        <SelectContent>
                          {transportModes.map((mode) => (<SelectItem key={mode} value={mode}>
                              {mode}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Availability</Label>
                      <Select value={selectedAvailability} onValueChange={setSelectedAvailability} disabled={formLocked || requiresStudentLogin}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="When can you deliver?"/>
                        </SelectTrigger>
                        <SelectContent>
                          {availabilityOptions.map((option) => (<SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <Checkbox id="fp-terms" className="mt-0.5" disabled={formLocked || requiresStudentLogin} required/>
                    <Label htmlFor="fp-terms" className="text-sm font-normal leading-snug text-muted-foreground">
                      I confirm that I am a current student of the University of Rajshahi and I agree
                      to receive delivery assignments only after admin approval.
                    </Label>
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={loading || formLocked || requiresStudentLogin}>
                    {loading ? (<>
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Submitting application...
                      </>) : formLocked ? ("Application In Progress") : (<>
                        <Bike className="h-4 w-4"/>
                        Submit Free Partner Application
                      </>)}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>)}
    </div>);
}
function HighlightMetric({ value, label }) {
    return (<div className="rounded-xl border border-border bg-card/90 px-4 py-4 shadow-sm">
      <p className="text-2xl font-bold font-mono text-secondary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>);
}
function StatsTile({ label, value }) {
    return (<div className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold font-mono text-foreground">{value}</p>
    </div>);
}
function StatusRow({ label, value }) {
    return (<div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>);
}
function FormField({ label, icon: Icon, children, }) {
    return (<div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
        {children}
      </div>
    </div>);
}
function getFreeApplicationMessage(status, requiresStudentLogin) {
    if (requiresStudentLogin) {
        return "Login with your student account first so the application stays connected to your delivery workspace.";
    }
    if (status === "approved") {
        return "Your free delivery plan is approved. You can receive delivery requests now and still apply for permanent delivery anytime.";
    }
    if (status === "pending") {
        return "Your application is under admin review. You will be able to claim delivery orders after approval.";
    }
    if (status === "rejected") {
        return "Your previous application was rejected. You can update the details below and submit again.";
    }
    return "Fill out the form below to request admin approval for the free delivery plan.";
}
