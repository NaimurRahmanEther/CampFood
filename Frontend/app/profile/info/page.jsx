"use client";
import { useEffect, useState } from "react";
import { CalendarClock, Mail, Save, ShieldCheck, UserCircle2, } from "lucide-react";
import { StudentProfileShell } from "@/components/profile/student-profile-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAuthSessionName } from "@/lib/auth-session";
import { formatAppDateTime } from "@/lib/date-format";
import { updateStudentProfile } from "@/lib/student-profile";
export default function ProfileInfoPage() {
    return (<StudentProfileShell title="Profile Info" description="Manage your student account details and update the name shown across the app.">
      {(session) => <ProfileInfoContent session={session}/>}
    </StudentProfileShell>);
}
function ProfileInfoContent({ session }) {
    const [nameDraft, setNameDraft] = useState(session.name);
    const [profileMessage, setProfileMessage] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    useEffect(() => {
        setNameDraft(session.name);
    }, [session.name]);
    async function handleSaveName(e) {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const profile = await updateStudentProfile(nameDraft);
            const updated = updateAuthSessionName(profile.name);
            if (!updated) {
                setProfileMessage("Profile updated, but session refresh needs a new login.");
                return;
            }
            setNameDraft(updated.name);
            setProfileMessage("Profile updated.");
        }
        catch (error) {
            setProfileMessage(error instanceof Error ? error.message : "Could not update profile.");
        }
        finally {
            setSavingProfile(false);
        }
    }
    return (<>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Account</CardTitle>
            <CardDescription>Your student profile and login information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={session.email}/>
            <InfoRow icon={UserCircle2} label="Role" value="Student"/>
            <InfoRow icon={ShieldCheck} label="Account Source" value={session.authSource}/>
            <InfoRow icon={CalendarClock} label="Signed In" value={formatAppDateTime(session.signedInAt)}/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Student Profile</CardTitle>
            <CardDescription>Update the display name used in your account and reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveName} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input id="profile-name" value={nameDraft} onChange={(e) => {
            setNameDraft(e.target.value);
            setProfileMessage("");
        }} placeholder="Enter your name"/>
              </div>
              <Button type="submit" className="w-full" disabled={savingProfile}>
                <Save className="h-4 w-4"/>
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
            {profileMessage ? (<p className="text-sm font-medium text-primary">{profileMessage}</p>) : null}
          </CardContent>
        </Card>
      </div>
    </>);
}
function InfoRow({ icon: Icon, label, value, }) {
    return (<div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <Icon className="h-4 w-4 text-primary"/>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>);
}
