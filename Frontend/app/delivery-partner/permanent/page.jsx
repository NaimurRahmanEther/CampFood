"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Bike, Briefcase, Clock, IdCard, Loader2, Mail, MapPin, Phone, ShieldCheck, Star, User, Wallet, } from "lucide-react";
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
import { DELIVERY_SHIFT_OPTIONS, RU_DEPARTMENT_OPTIONS, RU_HALL_OPTIONS, } from "@/lib/campus-options";
import { formatDeliveryRegistrationStatusLabel, } from "@/lib/delivery-partner";
import { formatAppDateTime } from "@/lib/date-format";
import { buildPartnerDeliveryStats, } from "@/lib/delivery-partner-stats";
import { loadDeliveryOrders } from "@/lib/delivery-orders";
import { getErrorMessage } from "@/lib/error-message";
import { loadStudentPointState } from "@/lib/student-points";
import { useAuthSessionState } from "@/hooks/use-session-state";
const benefits = [
    { icon: Wallet, title: "Monthly Salary", desc: "Receive a structured payment arrangement for regular delivery coverage." },
    { icon: Star, title: "Priority Access", desc: "Permanent partners receive paid delivery requests consistently." },
    { icon: Clock, title: "Planned Shifts", desc: "Choose the shift pattern that best fits your study schedule." },
    { icon: BadgeCheck, title: "Verified Role", desc: "Admin review ensures only approved students can operate this role." },
    { icon: ShieldCheck, title: "Reliable Coverage", desc: "Help maintain steady delivery coverage across campus." },
    { icon: Bike, title: "Operations Access", desc: "Work from the same delivery desk with paid delivery requests." },
];
const salaryHighlights = [
    { label: "Approval", value: "Admin reviewed" },
    { label: "Delivery Access", value: "Paid delivery service" },
    { label: "Shift Model", value: "Planned schedule" },
];
export default function PermanentPartnerPage() {
    const router = useRouter();
    const { session, hydrated } = useAuthSessionState();
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [status, setStatus] = useState("not-submitted");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedHall, setSelectedHall] = useState("");
    const [selectedShift, setSelectedShift] = useState("");
    const [statusError, setStatusError] = useState("");
    const [formError, setFormError] = useState("");
    const [statsError, setStatsError] = useState("");
    const [loadingStats, setLoadingStats] = useState(false);
    const [permanentStats, setPermanentStats] = useState(null);
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
                const nextStatus = await loadDeliveryRegistrationStatus(session.email, "permanent");
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
                            setPermanentStats(buildPartnerDeliveryStats(orders, pointState, session.userId, "permanent"));
                            setStatsError("");
                        }
                    }
                    catch (error) {
                        if (!cancelled) {
                            setPermanentStats(null);
                            setStatsError(getErrorMessage(error, "Could not load permanent-delivery performance right now."));
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
                    setPermanentStats(null);
                    setStatsError("");
                }
            }
            catch (error) {
                if (!cancelled) {
                    const message = getErrorMessage(error, "Could not load your permanent partner status.");
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
    const permanentPlanApproved = status === "approved";
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
        const name = String(formData.get("pp-name") ?? session.name ?? "").trim();
        const studentId = String(formData.get("pp-sid") ?? "").trim();
        const phone = String(formData.get("pp-phone") ?? "").trim();
        const email = String(formData.get("pp-email") ?? session.email ?? "").trim().toLowerCase();
        const campusAddress = String(formData.get("pp-address") ?? "").trim();
        const paymentNumber = String(formData.get("pp-payment") ?? "").trim();
        if (!name ||
            !studentId ||
            !phone ||
            !email ||
            !campusAddress ||
            !paymentNumber ||
            !selectedDepartment ||
            !selectedHall ||
            !selectedShift) {
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
                    plan: "permanent",
                    studentId,
                    department: selectedDepartment,
                    hallName: selectedHall,
                    phone,
                    campusAddress,
                    preferredShift: selectedShift,
                    paymentNumber,
                },
            });
            setStatus("pending");
            setFormError("");
            toast.success("Application submitted!", {
                description: "Admin approval is required before permanent delivery access opens.",
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
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background/92 to-background"/>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-18">
          <Link href="/delivery-partner" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4"/>
            Back to Partner Plans
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Briefcase className="h-4 w-4"/>
                Permanent Delivery Partner
              </div>
              <h1 className="mt-5 font-mono text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Stable delivery coverage with
                <span className="text-primary"> planned paid delivery work</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Apply for the permanent delivery plan if you want consistent paid delivery work
                with planned shifts.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {salaryHighlights.map((item) => (<HighlightMetric key={item.label} value={item.value} label={item.label}/>))}
              </div>
            </div>

            <Card className="border-primary/20 bg-card shadow-lg">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Application Status
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-foreground">
                    {checkingStatus
            ? "Checking..."
            : formatDeliveryRegistrationStatusLabel(status)}
                  </span>
                  {session?.role === "student" ? (<span className="text-xs text-muted-foreground">Signed in as {session.name}</span>) : (<span className="text-xs text-muted-foreground">Student login required</span>)}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {getPermanentApplicationMessage(status, requiresStudentLogin)}
                </p>
                <InlineStatusMessage message={statusError} tone="error" className="mt-4 text-xs"/>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <StatusRow label="Approval" value="Admin must approve first"/>
                  <StatusRow label="Delivery Access" value="Paid delivery service"/>
                  <StatusRow label="Shift" value="Preferred shift is reviewed with your application"/>
                </div>
                {permanentPlanApproved && !requiresStudentLogin && (<div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href="/profile/delivery">Open Delivery Workspace</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/delivery-partner/free">Apply for Free Delivery</Link>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <benefit.icon className="h-6 w-6 text-primary"/>
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

      {permanentPlanApproved ? (<section className="pb-16 lg:pb-20">
          <div className="mx-auto max-w-5xl px-4 lg:px-8">
            <Card className="border-border shadow-lg">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Registered Delivery Partner
                  </p>
                  <h2 className="mt-3 font-mono text-2xl font-bold text-foreground">
                    Your permanent delivery plan is active
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Registration form is hidden because your permanent delivery role is already approved
                    by admin. You can now receive paid delivery requests.
                  </p>
                </div>

                <div className="space-y-3">
                  <StatusRow label="Partner Name" value={session?.name ?? "Student Partner"}/>
                  <StatusRow label="Account Email" value={session?.email ?? "N/A"}/>
                  <StatusRow label="Plan" value="Permanent Delivery Partner"/>
                  <StatusRow label="Delivery Access" value="Paid delivery service"/>
                  <StatusRow label="Status" value="Approved and Active"/>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button className="gap-2" asChild>
                    <Link href="/profile/delivery">
                      <Bike className="h-4 w-4"/>
                      Open Delivery Workspace
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/delivery-partner/free">Apply for Free Delivery</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 border-border shadow-lg">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Permanent Delivery Performance
                  </p>
                  <h3 className="mt-3 font-mono text-xl font-bold text-foreground">
                    Your completed paid deliveries
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Track how many paid-delivery orders you completed and the delivered order value.
                  </p>
                </div>

                {loadingStats ? (<p className="text-sm text-muted-foreground">Loading permanent-delivery stats...</p>) : statsError ? (<InlineStatusMessage message={statsError} tone="error" className="text-xs"/>) : permanentStats ? (<>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatsTile label="Total Deliveries" value={String(permanentStats.totalDeliveries)}/>
                      <StatsTile label="Total Cash Delivered" value={`BDT ${permanentStats.totalCashDelivered.toFixed(0)}`}/>
                      <StatsTile label="This Month Deliveries" value={String(permanentStats.thisMonthDeliveries)}/>
                      <StatsTile label="This Month Cash Delivered" value={`BDT ${permanentStats.thisMonthCashDelivered.toFixed(0)}`}/>
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">Recent Paid Deliveries</p>
                        <span className="text-xs text-muted-foreground">
                          Showing {permanentStats.recentRows.length}
                        </span>
                      </div>

                      {permanentStats.recentRows.length === 0 ? (<p className="mt-3 text-sm text-muted-foreground">
                          No completed paid deliveries yet.
                        </p>) : (<div className="mt-3 space-y-2">
                          {permanentStats.recentRows.map((row) => (<div key={row.orderId} className="rounded-lg border border-border bg-background px-3 py-3 text-xs">
                              <p className="font-medium text-foreground">Order #{row.orderId}</p>
                              <p className="mt-1 text-muted-foreground">
                                Delivered: {row.deliveredAt ? formatAppDateTime(row.deliveredAt) : "N/A"}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                Items: {row.items} | Cash: BDT {row.cashPayable.toFixed(0)} | Points paid by customer: {row.pointsPayable}
                              </p>
                            </div>))}
                        </div>)}
                    </div>
                  </>) : (<p className="text-sm text-muted-foreground">
                    Paid-delivery performance will appear here after your first completed delivery.
                  </p>)}
              </CardContent>
            </Card>
          </div>
        </section>) : (<section className="pb-16 lg:pb-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <Card className="border-border shadow-lg">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Permanent Partner Application
                  </p>
                  <h2 className="mt-3 font-mono text-2xl font-bold text-foreground">
                    Apply for the permanent delivery role
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Submit the details admin needs to review your operating location, preferred shift,
                    and payment setup for permanent delivery coverage.
                  </p>
                </div>

                <form key={session?.email ?? "guest-permanent"} onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <InlineStatusMessage message={formError} tone="error" className="text-xs"/>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Full Name" icon={User}>
                      <Input id="pp-name" name="pp-name" placeholder="Your full name" className="pl-10 h-10" defaultValue={session?.name ?? ""} disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                    <FormField label="Student ID" icon={IdCard}>
                      <Input id="pp-sid" name="pp-sid" placeholder="Enter 10-digit student ID" className="pl-10 h-10" inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" title="Student ID must be exactly 10 digits (0-9 only)." onInput={(event) => {
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
                      <Input id="pp-phone" name="pp-phone" type="tel" placeholder="01XXXXXXXXX" className="pl-10 h-10" disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                    <FormField label="Email" icon={Mail}>
                      <Input id="pp-email" name="pp-email" type="email" placeholder="you@example.com" className="pl-10 h-10" defaultValue={session?.email ?? ""} disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Current Campus Address" icon={MapPin}>
                      <Input id="pp-address" name="pp-address" placeholder="Room no, hall or nearby landmark" className="pl-10 h-10" disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                    <FormField label="Payment Number" icon={Wallet}>
                      <Input id="pp-payment" name="pp-payment" placeholder="bKash / bank-linked number" className="pl-10 h-10" disabled={formLocked || requiresStudentLogin} required/>
                    </FormField>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Preferred Shift</Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift} disabled={formLocked || requiresStudentLogin}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select preferred shift"/>
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_SHIFT_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-3">
                    <Checkbox id="pp-terms" className="mt-0.5" disabled={formLocked || requiresStudentLogin} required/>
                    <Label htmlFor="pp-terms" className="text-sm font-normal leading-snug text-muted-foreground">
                      I confirm that I am a current student of the University of Rajshahi and I can
                      cover the shift preference I selected if admin approves this permanent delivery role.
                    </Label>
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2" disabled={loading || formLocked || requiresStudentLogin}>
                    {loading ? (<>
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Submitting application...
                      </>) : formLocked ? ("Application In Progress") : (<>
                        <Briefcase className="h-4 w-4"/>
                        Submit Permanent Partner Application
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
      <p className="text-2xl font-bold font-mono text-primary">{value}</p>
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
function getPermanentApplicationMessage(status, requiresStudentLogin) {
    if (requiresStudentLogin) {
        return "Login with your student account first so the permanent delivery application stays attached to the right workspace.";
    }
    if (status === "approved") {
        return "Your permanent delivery plan is already approved. Open the delivery desk to receive paid delivery requests.";
    }
    if (status === "pending") {
        return "Your permanent delivery application is under admin review. Access opens after approval.";
    }
    if (status === "rejected") {
        return "Your previous permanent delivery application was rejected. You can update the details below and submit again.";
    }
    return "Fill out the form below to request admin approval for the permanent delivery plan.";
}
