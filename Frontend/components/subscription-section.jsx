import { Store, UtensilsCrossed, ChefHat, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const plans = [
    {
        icon: UtensilsCrossed,
        title: "Campus Kitchens",
        description: "List your kitchen on CampFood and reach hundreds of hungry students across campus.",
    },
    {
        icon: Store,
        title: "Hall Canteens",
        description: "Expand beyond your hall. Accept orders from students across the entire university.",
    },
    {
        icon: ChefHat,
        title: "Student Sellers",
        description: "Turn your homemade food into a business. Sell directly to fellow students on campus.",
    },
];
export function SubscriptionSection() {
    return (<section id="subscription" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            For Sellers
          </p>
          <h2 className="mt-3 text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
            Subscription Model
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Simple and affordable pricing for campus food sellers. Monthly
            subscription plus a small service charge per order.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (<Card key={plan.title} className="group relative overflow-hidden border-border transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
              <CardContent className="p-6 lg:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <plan.icon className="h-6 w-6"/>
                </div>
                <h3 className="mt-5 text-lg font-bold font-mono text-foreground">
                  {plan.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
              </CardContent>
            </Card>))}
        </div>

        <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center lg:p-12">
          <h3 className="font-mono text-xl font-bold text-foreground md:text-2xl">
            How Pricing Works
          </h3>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Pay a low monthly subscription fee to list your food on the
            platform. We take a small service charge per order to keep the
            platform running and growing.
          </p>
          <Button className="mt-8 gap-2 shadow-lg shadow-primary/25" size="lg">
            Start Selling Today
            <ArrowRight className="h-4 w-4"/>
          </Button>
        </div>
      </div>
    </section>);
}
