"use client";
import { Suspense, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RoleSelector } from "@/components/auth/role-selector";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { CardLoadingState } from "@/components/ui/page-state";
import { Toaster } from "@/components/ui/sonner";
import { getAuthPagePath } from "@/lib/auth-session";
export default function AuthPage() {
    return (<Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>);
}
function AuthPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawRole = searchParams.get("role");
    const rawMode = searchParams.get("mode");
    const role = getSelectedRole(searchParams.get("role"));
    const activeTab = getSelectedMode(rawMode);
    const nextPath = searchParams.get("next");
    function updateAuthUrl(nextRole, nextMode) {
        router.replace(getAuthPagePath({
            role: nextRole,
            mode: nextMode,
            next: nextPath,
        }), { scroll: false });
    }
    function handleRoleSelect(nextRole) {
        updateAuthUrl(nextRole, activeTab);
    }
    function handleTabChange(nextValue) {
        const normalizedMode = nextValue === "register" ? "register" : "login";
        updateAuthUrl(role, normalizedMode);
    }
    useEffect(() => {
        const hasStaleRole = rawRole !== null && !isAuthRole(rawRole);
        const hasStaleMode = rawMode !== null && rawMode !== "login" && rawMode !== "register";
        if (!hasStaleRole && !hasStaleMode) {
            return;
        }
        router.replace(getAuthPagePath({
            role,
            mode: activeTab,
            next: nextPath,
        }), { scroll: false });
    }, [activeTab, nextPath, rawMode, rawRole, role, router]);
    return (<div className="relative flex min-h-screen">
      <Toaster position="top-center" richColors/>

      {/* Left Panel - Desktop Only */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <Image src="/images/auth-bg.jpg" alt="Rajshahi University campus illustration" fill className="object-cover" priority/>
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-foreground/20"/>
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">R</span>
            </div>
            <div>
              <p className="text-xl font-bold font-mono text-card">RU Food Express</p>
              <p className="text-sm text-card/70">Campus Food, Smarter & Faster</p>
            </div>
          </div>
          <div className="mt-8 max-w-md">
            <h2 className="text-3xl font-bold font-mono text-card leading-tight">
              Your Campus. <br />
              Your Food. <br />
              <span className="text-secondary">Your Way.</span>
            </h2>
            <p className="mt-4 text-card/70 leading-relaxed">
              Order from hall kitchens, campus restaurants, and student-made food
              delivered right to your door by fellow RU students.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-3 rounded-xl bg-card/10 p-4 backdrop-blur-md">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary"/>
            <p className="text-sm text-card/80">
              Exclusively for University of Rajshahi students and verified campus food providers.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 lg:border-b-0 lg:px-10 lg:pt-8 lg:pb-0">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4"/>
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">R</span>
            </div>
            <span className="text-sm font-bold font-mono text-foreground">RU Food Express</span>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 lg:items-center lg:px-10">
          <div className="w-full max-w-lg">
            {/* Trust Badge */}
            <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-4 w-4 text-primary"/>
              <span>Only for University of Rajshahi Students</span>
            </div>

            {/* Mobile Heading */}
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-2xl font-bold font-mono text-foreground">
                Welcome to <span className="text-primary">RU Food Express</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Select your role and get started
              </p>
            </div>

            {/* Role Selector */}
            <Card className="mb-6 border-border shadow-sm">
              <CardContent className="pt-1">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Choose your role
                </p>
                <RoleSelector selected={role} onSelect={handleRoleSelect}/>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Student kitchens are created from the student profile after signup. Admin-enabled
                  student accounts also sign in through the student option.
                </p>
              </CardContent>
            </Card>

            {/* Login / Register Tabs */}
            <Card className="border-border shadow-sm">
              <CardContent className="pt-1">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="mb-5 w-full">
                    <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
                    <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <LoginForm role={role}/>
                  </TabsContent>
                  <TabsContent value="register">
                    <RegisterForm role={role}/>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>Built for students of University of Rajshahi</p>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
function AuthPageFallback() {
    return (<main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <CardLoadingState message="Loading authentication..."/>
      </div>
    </main>);
}
function getSelectedRole(value) {
    if (isAuthRole(value)) {
        return value;
    }
    return "student";
}
function getSelectedMode(value) {
    return value === "register" ? "register" : "login";
}
function isAuthRole(value) {
    return value === "student" || value === "hall-kitchen" || value === "campus-kitchen";
}
