"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resolveGetStartedPath } from "@/lib/auth-session";
export function GetStartedButton() {
    const router = useRouter();
    const [routing, setRouting] = useState(false);
    function handleClick() {
        if (routing) {
            return;
        }
        setRouting(true);
        const nextPath = resolveGetStartedPath();
        router.push(nextPath);
    }
    return (<Button size="lg" className="gap-2 px-8 text-base shadow-lg shadow-primary/25" onClick={handleClick} disabled={routing}>
      Get Started
      <ArrowRight className="h-4 w-4"/>
    </Button>);
}
