"use client";
import Link from "next/link";
import { Gift, Briefcase, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthSessionState } from "@/hooks/use-session-state";
const freeFeatures = [
    "Earn points for every delivery",
    "Redeem points for free food",
    "Flexible schedule around classes",
    "No commitments or contracts",
];
const permanentFeatures = [
    "Monthly fixed salary",
    "Performance-based bonuses",
    "Priority order assignments",
    "Official CampFood ID",
];
export function DeliveryPartner() {
    const { session } = useAuthSessionState();
    if (session && session.role !== "student") {
        return null;
    }
    return (<section id="delivery-partner" className="py-24 bg-card lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Earn While You Learn
          </p>
          <h2 className="mt-3 text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
            Become a Delivery Partner
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Choose a plan that fits your campus life. Deliver food, earn money
            or points.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Free Partner */}
          <Card className="relative overflow-hidden border-border transition-shadow duration-300 hover:shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"/>
            <CardContent className="p-8 lg:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20">
                <Gift className="h-7 w-7 text-secondary"/>
              </div>
              <h3 className="mt-6 text-2xl font-bold font-mono text-foreground">
                Free Delivery Partner
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Earn points for every delivery. Redeem points for food.
              </p>
              <ul className="mt-8 flex flex-col gap-3.5">
                {freeFeatures.map((feature) => (<li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                      <Check className="h-3 w-3 text-secondary"/>
                    </div>
                    {feature}
                  </li>))}
              </ul>
              <Button className="mt-8 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" size="lg" asChild>
                <Link href="/delivery-partner/free">Join as Free Partner</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Permanent Partner */}
          <Card className="relative overflow-hidden border-primary/30 bg-primary/5 transition-shadow duration-300 hover:shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary"/>
            <div className="absolute top-4 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
              Recommended
            </div>
            <CardContent className="p-8 lg:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
                <Briefcase className="h-7 w-7 text-primary"/>
              </div>
              <h3 className="mt-6 text-2xl font-bold font-mono text-foreground">
                Permanent Delivery Partner
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Monthly salary. Performance tracking.
              </p>
              <ul className="mt-8 flex flex-col gap-3.5">
                {permanentFeatures.map((feature) => (<li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Check className="h-3 w-3 text-primary"/>
                    </div>
                    {feature}
                  </li>))}
              </ul>
              <Button className="mt-8 w-full shadow-lg shadow-primary/25" size="lg" asChild>
                <Link href="/delivery-partner/permanent">Apply for Permanent Role</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>);
}
