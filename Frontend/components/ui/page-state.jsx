import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
export function CardLoadingState({ message }) {
    return (<Card>
      <CardContent className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4"/>
        {message}
      </CardContent>
    </Card>);
}
export function CardErrorState({ message, actionLabel, onAction, }) {
    return (<Card>
      <CardContent className="py-10">
        <Empty className="border-none p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="h-5 w-5 text-destructive"/>
            </EmptyMedia>
            <EmptyTitle>Could not load this section</EmptyTitle>
            <EmptyDescription>{message}</EmptyDescription>
          </EmptyHeader>
          {actionLabel && onAction ? (<EmptyContent>
              <Button size="sm" variant="outline" onClick={onAction}>
                {actionLabel}
              </Button>
            </EmptyContent>) : null}
        </Empty>
      </CardContent>
    </Card>);
}
export function CardEmptyState({ title, description, action }) {
    return (<Card>
      <CardContent className="py-10">
        <Empty className="border-none p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="h-5 w-5 text-muted-foreground"/>
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          {action ? <EmptyContent>{action}</EmptyContent> : null}
        </Empty>
      </CardContent>
    </Card>);
}
export function SectionEmptyState({ title, description, action, className, }) {
    return (<Empty className={cn("border border-dashed", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox className="h-5 w-5 text-muted-foreground"/>
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>);
}
export function InlineStatusMessage({ message, tone = "info", className, }) {
    if (!message) {
        return null;
    }
    return (<p className={cn("rounded-lg border px-3 py-2 text-sm font-medium", tone === "error"
            ? "border-destructive/25 bg-destructive/5 text-destructive"
            : tone === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                : "border-primary/20 bg-primary/5 text-primary", className)}>
      {message}
    </p>);
}
