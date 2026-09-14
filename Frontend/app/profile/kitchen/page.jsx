"use client";
import Link from "next/link";
import { ChefHat, ExternalLink, Loader2, RefreshCcw } from "lucide-react";
import { StudentProfileShell } from "@/components/profile/student-profile-shell";
import { formatStudentKitchenStatusLabel, getStudentKitchenBadgeVariant, getStudentKitchenStatusMessage, } from "@/components/profile/student-profile-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardLoadingState } from "@/components/ui/page-state";
import { formatAppDateTime } from "@/lib/date-format";
import { useStudentKitchenWorkspace } from "@/hooks/use-student-kitchen-workspace";
export default function ProfileKitchenPage() {
    return (<StudentProfileShell title="Kitchen" description="See your student kitchen status here. If you do not have one yet, register it from this page.">
      {(session) => <KitchenContent session={session}/>}
    </StudentProfileShell>);
}
function KitchenContent({ session }) {
    const { studentKitchen, studentKitchenNameDraft, studentKitchenMessage, loadingKitchen, creatingStudentKitchen, refreshingStudentKitchen, openingStudentKitchen, updateStudentKitchenNameDraft, createStudentKitchen, refreshStudentKitchenStatus, openStudentKitchen, } = useStudentKitchenWorkspace(session);
    if (loadingKitchen) {
        return <CardLoadingState message="Loading kitchen details..."/>;
    }
    return (<Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary"/>
          Student Kitchen
        </CardTitle>
        <CardDescription>
          If you already registered a kitchen, its status and workspace access show here. Otherwise
          you can register from this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {studentKitchenMessage ? (<p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
            {studentKitchenMessage}
          </p>) : null}

        {!studentKitchen ? (<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <form onSubmit={(event) => {
                event.preventDefault();
                void createStudentKitchen();
            }} className="space-y-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label htmlFor="student-kitchen-name">Seller Name</Label>
                <Input id="student-kitchen-name" value={studentKitchenNameDraft} onChange={(event) => updateStudentKitchenNameDraft(event.target.value)} placeholder="Name to show on your kitchen" required/>
              </div>
              <p className="text-sm text-muted-foreground">
                We reuse your student account details behind the scenes, so there is no separate
                kitchen registration login to manage.
              </p>
              <Button type="submit" className="w-full" disabled={creatingStudentKitchen}>
                {creatingStudentKitchen ? (<>
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Creating Kitchen...
                  </>) : (<>
                    <ChefHat className="h-4 w-4"/>
                    Register Kitchen
                  </>)}
              </Button>
            </form>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold text-foreground">What happens next</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                After registration, admin approval is still required before menu and stock management
                open for you.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Once approved, this page becomes the launch point for your kitchen workspace.
              </p>
            </div>
          </div>) : (<div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <KitchenInfoCard label="Seller Name" value={studentKitchen.sellerName}/>
              <KitchenInfoCard label="Student ID" value={studentKitchen.studentId}/>
              <KitchenInfoCard label="Kitchen Email" value={studentKitchen.email}/>
              <KitchenInfoCard label="Hall" value={studentKitchen.hallName}/>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getStudentKitchenBadgeVariant(studentKitchen.status)}>
                  {formatStudentKitchenStatusLabel(studentKitchen.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Submitted {formatAppDateTime(studentKitchen.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {getStudentKitchenStatusMessage(studentKitchen.status)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void refreshStudentKitchenStatus()} disabled={refreshingStudentKitchen}>
                  <RefreshCcw className="h-4 w-4"/>
                  {refreshingStudentKitchen ? "Refreshing..." : "Refresh Status"}
                </Button>
                {studentKitchen.status === "approved" ? (<Button size="sm" onClick={() => void openStudentKitchen()} disabled={openingStudentKitchen}>
                    {openingStudentKitchen ? (<>
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Opening...
                      </>) : (<>
                        <ExternalLink className="h-4 w-4"/>
                        Open Kitchen Workspace
                      </>)}
                  </Button>) : null}
              </div>
            </div>
          </div>)}

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Want to explore current meals first?{" "}
          <Link href="/browse-food" className="font-medium text-primary underline-offset-4 hover:underline">
            Go back to browse food
          </Link>
          .
        </div>
      </CardContent>
    </Card>);
}
function KitchenInfoCard({ label, value }) {
    return (<div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>);
}
