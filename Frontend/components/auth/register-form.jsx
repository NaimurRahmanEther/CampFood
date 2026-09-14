"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Phone, IdCard, Loader2, Building, MapPin, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineStatusMessage } from "@/components/ui/page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { toast } from "sonner";
import { getAuthPagePath } from "@/lib/auth-session";
import { getErrorMessage } from "@/lib/error-message";
import { registerCampusKitchen, registerHallKitchen, registerStudent, } from "@/lib/auth-api";
import { RU_DEPARTMENT_OPTIONS, RU_HALL_OPTIONS } from "@/lib/campus-options";
const STUDENT_ID_PATTERN = /^\d{10}$/;
export function RegisterForm({ role }) {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [studentDepartment, setStudentDepartment] = useState("");
    const [studentHall, setStudentHall] = useState("");
    const [hallKitchenHall, setHallKitchenHall] = useState("");
    const [hallKitchenSubscription, setHallKitchenSubscription] = useState("monthly");
    const [formError, setFormError] = useState("");
    const router = useRouter();
    async function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = String(formData.get("reg-email") ?? "").trim().toLowerCase();
        setFormError("");
        if (!email) {
            const message = "Please enter a valid email";
            setFormError(message);
            toast.error(message);
            return;
        }
        setLoading(true);
        if (role === "student") {
            const studentPayload = {
                full_name: String(formData.get("reg-name") ?? "").trim(),
                student_id: String(formData.get("reg-uid") ?? "").trim(),
                email,
                password: String(formData.get("reg-password") ?? ""),
                phone_number: String(formData.get("reg-phone") ?? "").trim(),
                hall_name: studentHall.trim(),
                department: studentDepartment.trim(),
            };
            if (Object.values(studentPayload).some((value) => !value)) {
                const message = "Please fill in all required student fields";
                setFormError(message);
                toast.error(message);
                setLoading(false);
                return;
            }
            if (!STUDENT_ID_PATTERN.test(studentPayload.student_id)) {
                const message = "Student ID must be exactly 10 digits (0-9 only).";
                setFormError(message);
                toast.error(message);
                setLoading(false);
                return;
            }
            try {
                await registerStudent({
                    fullName: studentPayload.full_name,
                    studentId: studentPayload.student_id,
                    email: studentPayload.email,
                    password: studentPayload.password,
                    phoneNumber: studentPayload.phone_number,
                    hallName: studentPayload.hall_name,
                    department: studentPayload.department,
                });
            }
            catch (error) {
                const message = getErrorMessage(error, "Could not connect right now.");
                setFormError(message);
                toast.error(message);
                setLoading(false);
                return;
            }
            toast.success("Registration successful!", {
                description: "Account created. You received 60 points. Please login to continue.",
            });
            setLoading(false);
            router.push(getAuthPagePath({ role: "student", mode: "login" }));
            return;
        }
        try {
            if (role === "hall-kitchen") {
                await registerHallKitchen({
                    kitchenName: String(formData.get("reg-kitchen-name") ?? ""),
                    managerPhone: String(formData.get("reg-phone") ?? ""),
                    email,
                    password: String(formData.get("reg-password") ?? ""),
                    phoneNumber: String(formData.get("reg-phone") ?? ""),
                    hallName: hallKitchenHall,
                    subscriptionFee: hallKitchenSubscription === "yearly" ? 5000 : 500,
                });
            }
            else if (role === "campus-kitchen") {
                const tradeLicense = formData.get("reg-ck-license");
                const licenseName = tradeLicense instanceof File && tradeLicense.name ? tradeLicense.name : `${email}-trade-license`;
                await registerCampusKitchen({
                    kitchenName: String(formData.get("reg-ck-name") ?? ""),
                    location: String(formData.get("reg-ck-location") ?? ""),
                    managerPhone: String(formData.get("reg-phone") ?? ""),
                    email,
                    password: String(formData.get("reg-password") ?? ""),
                    phoneNumber: String(formData.get("reg-phone") ?? ""),
                    tradeLicense: licenseName,
                    subscriptionFee: 0,
                });
            }
            toast.success("Registration submitted!", {
                description: "Admin approval is required before kitchen login is enabled.",
            });
            setLoading(false);
            router.push(getAuthPagePath({ role, mode: "login" }));
        }
        catch (error) {
            const message = getErrorMessage(error, "Could not connect right now.");
            setFormError(message);
            toast.error(message);
            setLoading(false);
        }
    }
    return (<form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Student Fields */}
      {role === "student" && (<>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input id="reg-name" name="reg-name" placeholder="Enter your full name" className="pl-10 h-10" required/>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-uid">University ID</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input id="reg-uid" name="reg-uid" placeholder="Enter 10-digit student ID" className="pl-10 h-10" onChange={() => setFormError("")} inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" title="Student ID must be exactly 10 digits (0-9 only)." required/>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-dept">Department</Label>
              <Select value={studentDepartment} onValueChange={(value) => {
                setStudentDepartment(value);
                setFormError("");
            }} required>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select your department"/>
                </SelectTrigger>
                <SelectContent>
                  {RU_DEPARTMENT_OPTIONS.map((department) => (<SelectItem key={department} value={department}>{department}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Hall Name</Label>
            <Select value={studentHall} onValueChange={(value) => {
                setStudentHall(value);
                setFormError("");
            }} required>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select your hall"/>
              </SelectTrigger>
              <SelectContent>
                {RU_HALL_OPTIONS.map((hall) => (<SelectItem key={hall} value={hall}>{hall}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </>)}

      {/* Hall Kitchen Fields */}
      {role === "hall-kitchen" && (<>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-kitchen-name">Kitchen Name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input id="reg-kitchen-name" name="reg-kitchen-name" placeholder="Official kitchen name" className="pl-10 h-10" required/>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Hall Name</Label>
            <Select value={hallKitchenHall} onValueChange={(value) => {
                setHallKitchenHall(value);
                setFormError("");
            }} required>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select the hall"/>
              </SelectTrigger>
              <SelectContent>
                {RU_HALL_OPTIONS.map((hall) => (<SelectItem key={hall} value={hall}>{hall}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Subscription Plan</Label>
            <Select value={hallKitchenSubscription} onValueChange={(value) => {
                setHallKitchenSubscription(value);
                setFormError("");
            }}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly - 500 BDT/month</SelectItem>
                <SelectItem value="yearly">Yearly - 5,000 BDT/year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>)}

      {/* Campus Kitchen Fields */}
      {role === "campus-kitchen" && (<>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reg-ck-name">Kitchen Name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input id="reg-ck-name" name="reg-ck-name" placeholder="Your kitchen / shop name" className="pl-10 h-10" required/>
            </div>
          </div>
          <div className="flex flex-col gap-2">
              <Label htmlFor="reg-ck-location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input id="reg-ck-location" name="reg-ck-location" placeholder="e.g. Near Science Building" className="pl-10 h-10" required/>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-ck-license">Trade License (Optional)</Label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                <Input id="reg-ck-license" name="reg-ck-license" type="file" className="pl-10 h-10 pt-2" accept=".pdf,.jpg,.png"/>
              </div>
            </div>
        </>)}

      {/* Common Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input id="reg-phone" name="reg-phone" type="tel" placeholder="01XXXXXXXXX" className="pl-10 h-10" onChange={() => setFormError("")} required/>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reg-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input id="reg-email" name="reg-email" type="email" placeholder="you@example.com" className="pl-10 h-10" onChange={() => setFormError("")} required/>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <Input id="reg-password" name="reg-password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" className="pl-10 pr-10 h-10" onChange={() => setFormError("")} required/>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </button>
        </div>
      </div>

      {role === "student" ? (<p className="text-sm leading-relaxed text-muted-foreground">
          Want to sell as a student kitchen? Create your student account first, then register your
          kitchen from the student profile dashboard.
        </p>) : null}

      <InlineStatusMessage message={formError} tone="error" className="text-xs"/>

      <Button type="submit" size="lg" className="mt-2 w-full shadow-lg shadow-primary/20" disabled={loading}>
        {loading ? (<>
            <Loader2 className="h-4 w-4 animate-spin"/>
            Creating account...
          </>) : ("Create Account")}
      </Button>
    </form>);
}
