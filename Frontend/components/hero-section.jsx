"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bike, Search } from "lucide-react";
import { GetStartedButton } from "@/components/get-started-button";
import { useAuthSessionState } from "@/hooks/use-session-state";
export function HeroSection() {
    const { session } = useAuthSessionState();
    const showDeliveryPartnerCta = !session || session.role === "student";
    return (<section id="hero" className="relative overflow-hidden pt-16">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/hero-bg.jpg" alt="" fill className="object-cover opacity-12" priority/>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background"/>
      </div>

      {/* Decorative blurred shapes */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-20 -left-40 h-72 w-72 rounded-full bg-secondary/10 blur-3xl"/>

      <div className="mx-auto max-w-7xl px-4 py-28 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"/>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"/>
            </span>
            Only for Rajshahi University Students
          </div>

          <h1 className="text-balance font-mono text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Campus Food{" "}
            <span className="text-primary">Smarter</span> &{" "}
            <span className="text-secondary">Faster</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Order from halls, campus kitchens, and student homemade food &ndash; Delivered by RU students.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <GetStartedButton />
            <Button size="lg" variant="secondary" className="gap-2 px-8 text-base" asChild>
              <Link href="/browse-food">
                <Search className="h-4 w-4"/>
                Browse Food
              </Link>
            </Button>
            {showDeliveryPartnerCta ? (<Button size="lg" variant="outline" className="gap-2 px-8 text-base" asChild>
                <Link href="/delivery-partner">
                  <Bike className="h-4 w-4"/>
                  Become a Delivery Partner
                </Link>
              </Button>) : null}
          </div>

          <div className="mx-auto mt-20 grid max-w-lg grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold font-mono text-primary lg:text-4xl">Student</p>
              <p className="mt-1 text-sm text-muted-foreground">Only Access</p>
            </div>
            <div className="border-x border-border px-4">
              <p className="text-3xl font-bold font-mono text-secondary lg:text-4xl">Campus</p>
              <p className="mt-1 text-sm text-muted-foreground">Kitchen Network</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-primary lg:text-4xl">Live</p>
              <p className="mt-1 text-sm text-muted-foreground">Peer Delivery</p>
            </div>
          </div>
        </div>
      </div>
    </section>);
}
