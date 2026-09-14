import { Bot, Gift, Briefcase, ArrowRightLeft, Coins, } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
const features = [
    {
        icon: Bot,
        title: "AI Food Suggestion Chatbot",
        description: "Get personalized food recommendations based on your taste, budget, and dietary preferences.",
        highlight: true,
    },
    {
        icon: Gift,
        title: "Earn Points as Free Delivery Partner",
        description: "Deliver food between classes and earn points redeemable for meals and more.",
        highlight: false,
    },
    {
        icon: Briefcase,
        title: "Permanent Delivery Job",
        description: "Apply for a permanent delivery partner role with a monthly salary and benefits.",
        highlight: false,
    },
    {
        icon: ArrowRightLeft,
        title: "Transfer Points to Friends",
        description: "Share your earned points with classmates and friends for their next meal.",
        highlight: false,
    },
    {
        icon: Coins,
        title: "Order with Points",
        description: "Use your accumulated points to order food with zero delivery charge.",
        highlight: false,
    },
];
export function FeaturesSection() {
    return (<section id="features" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            What Makes Us Special
          </p>
          <h2 className="mt-3 text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
            Unique Features
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Built exclusively for Rajshahi University with smart features you
            won&apos;t find anywhere else.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (<Card key={feature.title} className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${feature.highlight
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"}`}>
              {feature.highlight && (<div className="absolute top-3 right-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  AI Powered
                </div>)}
              <CardContent className="p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300 ${feature.highlight
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"}`}>
                  <feature.icon className="h-6 w-6"/>
                </div>
                <h3 className="mt-5 text-lg font-bold font-mono text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>))}
        </div>
      </div>
    </section>);
}
