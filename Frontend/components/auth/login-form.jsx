"use client";
import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff, IdCard, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineStatusMessage } from "@/components/ui/page-state";
import { toast } from "sonner";
import { getPostAuthPath, setAuthSession } from "@/lib/auth-session";
import { loginKitchen, loginStudent } from "@/lib/auth-api";
import { getErrorMessage } from "@/lib/error-message";
import { clearRememberedStudentLogin, getRememberedStudentLogin, setRememberedStudentLogin, } from "@/lib/remembered-student-login";
const STUDENT_ID_PATTERN = /^\d{10}$/;
export function LoginForm({ role }) {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [studentIdInput, setStudentIdInput] = useState("");
    const [emailInput, setEmailInput] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [formError, setFormError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const isKitchen = role !== "student";
    useEffect(() => {
        if (role !== "student") {
            setStudentIdInput("");
            setEmailInput("");
            setRememberMe(false);
            return;
        }
        const rememberedLogin = getRememberedStudentLogin();
        if (!rememberedLogin) {
            setStudentIdInput("");
            setEmailInput("");
            setRememberMe(false);
            return;
        }
        setStudentIdInput(rememberedLogin.studentId);
        setEmailInput(rememberedLogin.email);
        setRememberMe(true);
    }, [role]);
    async function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = emailInput.trim().toLowerCase();
        setFormError("");
        if (!email) {
            const message = "Please enter a valid email";
            setFormError(message);
            toast.error(message);
            return;
        }
        if (role === "student") {
            const studentId = studentIdInput.trim();
            const password = String(formData.get("login-password") ?? "");
            if (!studentId || !password) {
                const message = "Student ID and password are required";
                setFormError(message);
                toast.error(message);
                return;
            }
            if (!STUDENT_ID_PATTERN.test(studentId)) {
                const message = "Student ID must be exactly 10 digits (0-9 only).";
                setFormError(message);
                toast.error(message);
                return;
            }
            setLoading(true);
            try {
                const authenticatedUser = await loginStudent({
                    studentId,
                    email,
                    password,
                });
                setAuthSession({
                    userId: authenticatedUser.userId,
                    role: authenticatedUser.role,
                    email: authenticatedUser.email,
                    name: authenticatedUser.name,
                    token: authenticatedUser.token,
                    authSource: "login",
                });
                if (rememberMe) {
                    setRememberedStudentLogin({
                        studentId,
                        email: authenticatedUser.email,
                    });
                }
                else {
                    clearRememberedStudentLogin();
                }
                toast.success("Login successful!", {
                    description: getPostLoginDescription(authenticatedUser.role),
                });
                setLoading(false);
                router.replace(getPostAuthPath(authenticatedUser.role, searchParams.get("next")));
                return;
            }
            catch (error) {
                const message = getErrorMessage(error, "Could not connect right now.");
                setFormError(message);
                toast.error(message);
                setLoading(false);
                return;
            }
        }
        setLoading(true);
        try {
            const authenticatedUser = await loginKitchen(role, {
                email,
                password: String(formData.get("login-password") ?? ""),
            });
            setAuthSession({
                userId: authenticatedUser.userId,
                role: authenticatedUser.role,
                email: authenticatedUser.email,
                name: authenticatedUser.name,
                token: authenticatedUser.token,
                authSource: "login",
            });
            toast.success("Login successful!", {
                description: getPostLoginDescription(authenticatedUser.role),
            });
            setLoading(false);
            router.replace(getPostAuthPath(authenticatedUser.role, searchParams.get("next")));
        }
        catch (error) {
            const message = getErrorMessage(error, "Could not connect right now.");
            setFormError(message);
            toast.error(message);
            setLoading(false);
        }
    }
    return (<form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {role === "student" && (<div className="flex flex-col gap-2">
          <Label htmlFor="login-uid">University ID</Label>
          <div className="relative">
            <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input id="login-uid" name="login-uid" placeholder="Enter 10-digit student ID" className="pl-10 h-10" value={studentIdInput} onChange={(event) => {
                setStudentIdInput(event.target.value.replace(/\D/g, "").slice(0, 10));
                setFormError("");
            }} inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" title="Student ID must be exactly 10 digits (0-9 only)." required/>
          </div>
          <p className="text-xs text-muted-foreground">
            Use your registered 10-digit student ID to continue. If this account has admin access,
            you will be redirected automatically.
          </p>
        </div>)}

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">{isKitchen ? "Kitchen Email" : "Email"}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <Input id="login-email" name="login-email" type="email" placeholder={isKitchen ? "kitchen@rufoodexpress.com" : "you@example.com"} className="pl-10 h-10" value={emailInput} onChange={(event) => {
            setEmailInput(event.target.value);
            setFormError("");
        }} required/>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <Input id="login-password" name="login-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="pl-10 pr-10 h-10" onChange={() => setFormError("")} required/>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </button>
        </div>
      </div>

      {role === "student" && (<div className="flex items-center gap-2">
          <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)}/>
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
            Remember my email and student ID on this device
          </Label>
        </div>)}

      <InlineStatusMessage message={formError} tone="error" className="text-xs"/>

      <Button type="submit" size="lg" className="w-full shadow-lg shadow-primary/20" disabled={loading}>
        {loading ? (<>
            <Loader2 className="h-4 w-4 animate-spin"/>
            Signing in...
          </>) : ("Sign In")}
      </Button>
    </form>);
}
function getPostLoginDescription(role) {
    if (role === "student") {
        return "Redirecting to landing page...";
    }
    if (role === "admin") {
        return "Redirecting to landing page...";
    }
    return "Redirecting to landing page...";
}
