"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bike, Briefcase, Check, ClipboardList, Clock, Gift, Loader2, LogOut, ShieldCheck, Star, UserCircle2, Users, Zap, } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineStatusMessage } from "@/components/ui/page-state";
import { clearAuthSession, getAuthPagePath, getRoleHomePath, } from "@/lib/auth-session";
import { formatDeliveryRegistrationStatusLabel, getAllowedDeliveryPlans, } from "@/lib/delivery-partner";
import { loadDeliveryRegistrationStatuses, } from "@/lib/admin-approvals";
import { loadStudentPointState } from "@/lib/student-points";
import { useAuthSessionState } from "@/hooks/use-session-state";
const freePerks = [
    { icon: Star, text: "Earn points for every delivery" },
    { icon: Gift, text: "Redeem points for free food" },
    { icon: Clock, text: "Flexible schedule around classes" },
    { icon: ShieldCheck, text: "No commitments or contracts" },
];
const permanentPerks = [
    { icon: Star, text: "Monthly fixed salary" },
    { icon: Gift, text: "Performance-based bonuses" },
    { icon: Clock, text: "Priority order assignments" },
    { icon: ShieldCheck, text: "Official RU Food Express ID" },
];
const onboardingSteps = [
    { icon: Users, title: "Choose Your Plan", desc: "Select Free or Permanent based on your preference." },
    { icon: Bike, title: "Apply & Get Verified", desc: "Submit your student application and wait for admin approval." },
    {
        icon: Zap,
        title: "Start Delivering",
        desc: "Once approved, you can start receiving and completing delivery requests from your workspace.",
    },
];
const activeRules = [
    {
        icon: Bike,
        title: "Standard Service First",
        desc: "New orders are shown to free delivery partners first.",
    },
    {
        icon: Users,
        title: "Paid Service Backup",
        desc: "If not accepted in time, orders become available to paid delivery partners.",
    },
    {
        icon: Zap,
        title: "Use Delivery Workspace",
        desc: "Accept orders, chat with customer, and complete delivery from the order desk.",
    },
];
export default function DeliveryPartnerPage() {
    const router = useRouter();
    const { session, hydrated } = useAuthSessionState();
    const [checkingPartnerState, setCheckingPartnerState] = useState(true);
    const [statusError, setStatusError] = useState("");
    const [registrationStatuses, setRegistrationStatuses] = useState({
        free: "not-submitted",
        permanent: "not-submitted",
    });
    const [isFreeDeliveryPartner, setIsFreeDeliveryPartner] = useState(false);
    const [pointBalance, setPointBalance] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function hydratePartnerState() {
            if (!hydrated || cancelled) {
                return;
            }
            setCheckingPartnerState(true);
            if (!session || session.role !== "student") {
                setRegistrationStatuses({
                    free: "not-submitted",
                    permanent: "not-submitted",
                });
                setIsFreeDeliveryPartner(false);
                setPointBalance(null);
                setStatusError("");
                setCheckingPartnerState(false);
                return;
            }
            try {
                const [statuses, pointState] = await Promise.all([
                    loadDeliveryRegistrationStatuses(session.email),
                    loadStudentPointState(session),
                ]);
                if (cancelled) {
                    return;
                }
                setRegistrationStatuses(statuses);
                setIsFreeDeliveryPartner(pointState.isFreeDeliveryPartner);
                setPointBalance(pointState.points);
            }
            catch (error) {
                if (!cancelled) {
                    setStatusError(error instanceof Error
                        ? error.message
                        : "Could not load delivery partner status right now.");
                }
            }
            finally {
                if (!cancelled) {
                    setCheckingPartnerState(false);
                }
            }
        }
        void hydratePartnerState();
        return () => {
            cancelled = true;
        };
    }, [hydrated, session]);
    const allowedPlans = useMemo(() => {
        if (!session || session.role !== "student") {
            return [];
        }
        return getAllowedDeliveryPlans(registrationStatuses, isFreeDeliveryPartner);
    }, [isFreeDeliveryPartner, registrationStatuses, session]);
    const freePlanActive = allowedPlans.includes("free");
    const permanentPlanActive = allowedPlans.includes("permanent");
    const hasApprovedPlan = allowedPlans.length > 0;
    const bothPlansActive = freePlanActive && permanentPlanActive;
    const freeStatus = registrationStatuses.free;
    const permanentStatus = registrationStatuses.permanent;
    const heroStats = useMemo(() => {
        return buildHeroStats({
            checking: checkingPartnerState,
            isStudent: session?.role === "student",
            allowedPlanCount: allowedPlans.length,
            freePlanActive,
            permanentPlanActive,
            freeStatus,
            permanentStatus,
            points: pointBalance,
        });
    }, [
        allowedPlans.length,
        checkingPartnerState,
        freePlanActive,
        freeStatus,
        permanentPlanActive,
        permanentStatus,
        pointBalance,
        session?.role,
    ]);
    useEffect(() => {
        if (!hydrated || !session) {
            return;
        }
        if (session.role !== "student") {
            router.replace(getRoleHomePath(session.role));
        }
    }, [hydrated, router, session]);
    if (hydrated && session && session.role !== "student") {
        return null;
    }
    function handleLogout() {
        clearAuthSession();
        router.push("/delivery-partner");
    }
    return (<div className="relative min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src="/images/delivery-bg.jpg" alt="" fill className="object-cover opacity-10" priority/>
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background"/>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-20">
          <div className="mb-8 flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4"/>
              Back to Home
            </Link>
            {session && (<div className="flex items-center gap-2">
                {session.role === "student" && (<>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/profile">
                        <UserCircle2 className="h-4 w-4"/>
                        Profile
                      </Link>
                    </Button>
                    {hasApprovedPlan ? (<Button variant="outline" size="sm" asChild>
                        <Link href="/delivery-partner/orders">
                          <ClipboardList className="h-4 w-4"/>
                          Receive Orders
                        </Link>
                      </Button>) : (<Button variant="outline" size="sm" disabled>
                        <ClipboardList className="h-4 w-4"/>
                        Approval Required
                      </Button>)}
                  </>)}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4"/>
                  Logout
                </Button>
              </div>)}
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Bike className="h-4 w-4"/>
              {resolveHeroBadge(checkingPartnerState, hasApprovedPlan, bothPlansActive, freePlanActive, permanentPlanActive, freeStatus, permanentStatus)}
            </div>
            <h1 className="text-balance font-mono text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              {resolveHeroTitle(checkingPartnerState, hasApprovedPlan, bothPlansActive, freePlanActive, permanentPlanActive)}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground leading-relaxed">
              {resolveHeroDescription(checkingPartnerState, hasApprovedPlan, bothPlansActive, freePlanActive, permanentPlanActive)}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Badge variant={resolveStatusBadgeVariant(freeStatus, freePlanActive)}>
                Free Plan: {freePlanActive ? "Active" : formatDeliveryRegistrationStatusLabel(freeStatus)}
              </Badge>
              <Badge variant={resolveStatusBadgeVariant(permanentStatus, permanentPlanActive)}>
                Permanent Plan: {permanentPlanActive ? "Active" : formatDeliveryRegistrationStatusLabel(permanentStatus)}
              </Badge>
              <Badge variant={hasApprovedPlan ? "default" : "outline"}>
                Access: {checkingPartnerState ? "Checking..." : hasApprovedPlan ? "Active" : "Not Active"}
              </Badge>
            </div>

            <InlineStatusMessage message={statusError} tone="error" className="mx-auto mt-2 max-w-xl text-xs"/>

            <div className="mt-10 flex items-center justify-center gap-8">
              {heroStats.map((stat) => (<div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold font-mono text-primary lg:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary">
            {hasApprovedPlan ? "Current Delivery Rules" : "How It Works"}
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {(hasApprovedPlan ? activeRules : onboardingSteps).map((step, i) => (<div key={step.title} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary"/>
                </div>
                <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-mono text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>))}
          </div>
        </div>
      </section>

      {/* Two Plan Cards */}
      <section className="pb-20 lg:pb-28">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary">Choose Your Plan</p>
          <h2 className="mt-3 text-center font-mono text-2xl font-bold text-foreground md:text-3xl">
            {bothPlansActive ? "Your delivery access is fully active" : "Two ways to partner with us"}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            {resolvePlansDescription(checkingPartnerState, freePlanActive, permanentPlanActive)}
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {/* Free Partner Card */}
            <Card className="group relative overflow-hidden border-border transition-all duration-300 hover:shadow-xl hover:border-secondary/40">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary"/>
              <CardContent className="flex flex-col p-8 lg:p-10">
                <div className="mb-2 flex items-center justify-end">
                  <Badge variant={resolveStatusBadgeVariant(freeStatus, freePlanActive)}>
                    {freePlanActive ? "Active" : formatDeliveryRegistrationStatusLabel(freeStatus)}
                  </Badge>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/15">
                  <Gift className="h-7 w-7 text-secondary"/>
                </div>
                <h3 className="mt-6 font-mono text-2xl font-bold text-foreground">Free Delivery Partner</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {resolveFreePlanDescription(freePlanActive, freeStatus)}
                </p>

                <ul className="mt-8 flex flex-col gap-3.5">
                  {freePerks.map((perk) => (<li key={perk.text} className="flex items-center gap-3 text-sm text-foreground">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                        <Check className="h-3.5 w-3.5 text-secondary"/>
                      </div>
                      {perk.text}
                    </li>))}
                </ul>

                <div className="mt-auto pt-8">
                  {freePlanActive ? (<Button className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" size="lg" asChild>
                      <Link href="/profile/delivery">
                        Open Delivery Workspace
                        <ArrowRight className="h-4 w-4"/>
                      </Link>
                    </Button>) : requiresStudentLogin(session) ? (<Button className="w-full gap-2" size="lg" asChild>
                      <Link href={getAuthPagePath({ role: "student", mode: "login" })}>
                        Login to Apply
                        <ArrowRight className="h-4 w-4"/>
                      </Link>
                    </Button>) : freeStatus === "pending" ? (<Button className="w-full gap-2" size="lg" disabled>
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      Application Pending
                    </Button>) : (<Button className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" size="lg" asChild>
                      <Link href="/delivery-partner/free">
                        {freeStatus === "rejected" ? "Apply Again" : "Apply as Free Partner"}
                        <ArrowRight className="h-4 w-4"/>
                      </Link>
                    </Button>)}
                </div>
              </CardContent>
            </Card>

            {/* Permanent Partner Card */}
            <Card className="group relative overflow-hidden border-primary/30 bg-primary/[0.03] transition-all duration-300 hover:shadow-xl hover:border-primary/50">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary"/>
              <div className="absolute top-4 right-4">
                <Badge variant={resolveStatusBadgeVariant(permanentStatus, permanentPlanActive)}>
                  {permanentPlanActive
            ? "Active"
            : formatDeliveryRegistrationStatusLabel(permanentStatus)}
                </Badge>
              </div>
              <CardContent className="flex flex-col p-8 lg:p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15">
                  <Briefcase className="h-7 w-7 text-primary"/>
                </div>
                <h3 className="mt-6 font-mono text-2xl font-bold text-foreground">Permanent Delivery Partner</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {resolvePermanentPlanDescription(permanentPlanActive, permanentStatus)}
                </p>

                <ul className="mt-8 flex flex-col gap-3.5">
                  {permanentPerks.map((perk) => (<li key={perk.text} className="flex items-center gap-3 text-sm text-foreground">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="h-3.5 w-3.5 text-primary"/>
                      </div>
                      {perk.text}
                    </li>))}
                </ul>

                <div className="mt-auto pt-8">
                  {permanentPlanActive ? (<Button className="w-full gap-2 shadow-lg shadow-primary/25" size="lg" asChild>
                      <Link href="/delivery-partner/orders">
                        Open Order Desk
                        <ArrowRight className="h-4 w-4"/>
                      </Link>
                    </Button>) : requiresStudentLogin(session) ? (<Button className="w-full gap-2" size="lg" asChild>
                      <Link href={getAuthPagePath({ role: "student", mode: "login" })}>
                        Login to Apply
                        <ArrowRight className="h-4 w-4"/>
                      </Link>
                    </Button>) : permanentStatus === "pending" ? (<Button className="w-full gap-2" size="lg" disabled>
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      Application Pending
                    </Button>) : (<Button className="w-full gap-2 shadow-lg shadow-primary/25" size="lg" asChild>
                      <Link href="/delivery-partner/permanent">
                        {permanentStatus === "rejected"
                ? "Apply Again"
                : "Apply for Permanent Role"}
                        <ArrowRight className="h-4 w-4"/>
                      </Link>
                    </Button>)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>Built for students of University of Rajshahi</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>);
}
function requiresStudentLogin(session) {
    return !session || session.role !== "student";
}
function resolveHeroBadge(checking, hasApprovedPlan, bothPlansActive, freePlanActive, permanentPlanActive, freeStatus, permanentStatus) {
    if (checking) {
        return "Checking Delivery Access";
    }
    if (bothPlansActive) {
        return "Free + Permanent Access Active";
    }
    if (freePlanActive) {
        return "Free Delivery Partner Active";
    }
    if (permanentPlanActive) {
        return "Permanent Delivery Partner Active";
    }
    if (freeStatus === "pending" || permanentStatus === "pending") {
        return "Application Under Review";
    }
    if (!hasApprovedPlan) {
        return "Earn While You Learn";
    }
    return "Delivery Partner Access";
}
function resolveHeroTitle(checking, hasApprovedPlan, bothPlansActive, freePlanActive, permanentPlanActive) {
    if (checking) {
        return "Checking your delivery partner access";
    }
    if (bothPlansActive) {
        return "Your Delivery Partner Access is Fully Active";
    }
    if (freePlanActive) {
        return "You are an Active Free Delivery Partner";
    }
    if (permanentPlanActive) {
        return "You are an Active Permanent Delivery Partner";
    }
    if (!hasApprovedPlan) {
        return "Become a Delivery Partner";
    }
    return "Delivery Partner";
}
function resolveHeroDescription(checking, hasApprovedPlan, bothPlansActive, freePlanActive, permanentPlanActive) {
    if (checking) {
        return "We are loading your free and permanent delivery partner status.";
    }
    if (bothPlansActive) {
        return "Use your workspace to receive and complete both free and paid delivery requests.";
    }
    if (freePlanActive) {
        return "Your free delivery access is active. You can still apply for permanent delivery if you want.";
    }
    if (permanentPlanActive) {
        return "Your paid delivery access is active. You can still apply for the free plan if you want.";
    }
    if (!hasApprovedPlan) {
        return "Join the RU Food Express delivery team. Choose the plan that fits your campus life and apply for admin approval.";
    }
    return "Manage your delivery journey from one place.";
}
function resolvePlansDescription(checking, freePlanActive, permanentPlanActive) {
    if (checking) {
        return "Loading your plan status...";
    }
    if (freePlanActive && permanentPlanActive) {
        return "Both plans are active. Use workspace-first actions instead of onboarding.";
    }
    if (freePlanActive) {
        return "Free plan is active. Permanent plan remains optional if you want more delivery opportunities.";
    }
    if (permanentPlanActive) {
        return "Permanent plan is active. Free plan remains optional.";
    }
    return "Apply to one or both plans based on your schedule and goals.";
}
function resolveStatusBadgeVariant(status, active) {
    if (active || status === "approved") {
        return "default";
    }
    if (status === "pending") {
        return "secondary";
    }
    if (status === "rejected") {
        return "destructive";
    }
    return "outline";
}
function resolveFreePlanDescription(active, status) {
    if (active) {
        return "Your free delivery partner access is active. Receive eligible orders in your workspace.";
    }
    if (status === "pending") {
        return "Your free plan request is under admin review. Access opens after approval.";
    }
    if (status === "rejected") {
        return "Your previous free plan request was rejected. Update details and re-apply.";
    }
    return "Perfect for students who want flexibility. Receive orders around your class schedule, earn points, and redeem them for free food.";
}
function resolvePermanentPlanDescription(active, status) {
    if (active) {
        return "Your permanent delivery partner access is active. Receive paid delivery requests in your workspace.";
    }
    if (status === "pending") {
        return "Your permanent plan request is under admin review. Access opens after approval.";
    }
    if (status === "rejected") {
        return "Your previous permanent plan request was rejected. Update details and re-apply.";
    }
    return "Commit to a shift schedule and receive consistent paid delivery requests.";
}
function buildHeroStats(input) {
    if (input.checking) {
        return [
            { label: "Approved Plans", value: "..." },
            { label: "Free Plan", value: "Checking..." },
            { label: "Permanent Plan", value: "Checking..." },
        ];
    }
    if (!input.isStudent) {
        return [
            { label: "Student Access", value: "Required" },
            { label: "Free Plan", value: "Login" },
            { label: "Permanent Plan", value: "Login" },
        ];
    }
    return [
        { label: "Approved Plans", value: `${input.allowedPlanCount}/2` },
        {
            label: "Free Plan",
            value: input.freePlanActive ? "Active" : formatDeliveryRegistrationStatusLabel(input.freeStatus),
        },
        {
            label: "Points",
            value: typeof input.points === "number" ? `${input.points}` : "--",
        },
    ];
}
