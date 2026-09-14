import { Search, ShoppingCart, Truck } from "lucide-react";
const steps = [
    {
        icon: Search,
        step: "01",
        title: "Browse Food",
        description: "Explore menus from halls, campus kitchens, and student homemade food all in one place.",
    },
    {
        icon: ShoppingCart,
        step: "02",
        title: "Place Order",
        description: "Order with Cash or Points. Choose your favorite meals and checkout in seconds.",
    },
    {
        icon: Truck,
        step: "03",
        title: "Get Delivered",
        description: "A fellow RU student picks up and delivers your food right to your hall or department.",
    },
];
export function HowItWorks() {
    return (<section id="how-it-works" className="py-24 bg-card lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Simple Process
          </p>
          <h2 className="mt-3 text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Getting your campus food delivered is as easy as 1-2-3.
          </p>
        </div>

        <div className="relative mt-20 grid gap-12 md:grid-cols-3 md:gap-8">
          {/* connector line */}
          <div className="pointer-events-none absolute top-14 left-[20%] right-[20%] hidden h-px bg-border md:block"/>

          {steps.map((step, idx) => (<div key={step.step} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-background transition-transform duration-300 hover:scale-105">
                <step.icon className="h-11 w-11 text-primary"/>
              </div>
              <span className="mt-5 inline-block rounded-full bg-secondary/15 px-4 py-1 text-xs font-bold font-mono text-secondary">
                Step {step.step}
              </span>
              <h3 className="mt-4 text-xl font-bold font-mono text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              {idx < steps.length - 1 && (<div className="mt-6 h-8 w-px bg-border md:hidden"/>)}
            </div>))}
        </div>
      </div>
    </section>);
}
