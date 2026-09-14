"use client";
import { GraduationCap, Building, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
const roles = [
    {
        id: "student",
        label: "Student",
        description: "Order food and manage your profile",
        icon: GraduationCap,
    },
    {
        id: "hall-kitchen",
        label: "Hall Kitchen",
        description: "Official hall canteen provider",
        icon: Building,
    },
    {
        id: "campus-kitchen",
        label: "Campus Kitchen",
        description: "University-based food shop",
        icon: UtensilsCrossed,
    },
];
export function RoleSelector({ selected, onSelect }) {
    return (<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {roles.map((role) => {
            const isActive = selected === role.id;
            return (<button key={role.id} type="button" onClick={() => onSelect(role.id)} className={cn("group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 hover:border-primary/40 hover:shadow-md", isActive
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card")}>
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-colors", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>
              <role.icon className="h-5 w-5"/>
            </div>
            <div>
              <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>
                {role.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{role.description}</p>
            </div>
            {isActive && (<div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>)}
          </button>);
        })}
    </div>);
}
