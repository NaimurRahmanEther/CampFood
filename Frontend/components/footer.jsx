"use client";
import Link from "next/link";
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from "lucide-react";
import { formatAppYear } from "@/lib/date-format";
import { getAuthPagePath } from "@/lib/auth-session";
import { useAuthSessionState } from "@/hooks/use-session-state";
const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
];
const legalLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Refund Policy", href: "#" },
];
export function Footer() {
    const { session } = useAuthSessionState();
    const showDeliveryPartnerLink = !session || session.role === "student";
    const quickLinks = [
        { label: "How It Works", href: "/#how-it-works" },
        { label: "Features", href: "/#features" },
        { label: "Browse Food", href: "/browse-food" },
        ...(showDeliveryPartnerLink
            ? [{ label: "Delivery Partner", href: "/delivery-partner" }]
            : []),
        ...(!session
            ? [{ label: "Login / Register", href: getAuthPagePath({ role: "student", mode: "login" }) }]
            : []),
    ];
    const availableSocialLinks = socialLinks.filter((social) => social.href !== "#");
    const availableLegalLinks = legalLinks.filter((link) => link.href !== "#");
    return (<footer className="border-t border-foreground/10 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:pr-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">
                  C
                </span>
              </div>
              <span className="text-lg font-bold font-mono">
                CampFood
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed opacity-60">
              CampFood is the smart food delivery platform built exclusively for Rajshahi
              University students.
            </p>
            {availableSocialLinks.length > 0 ? (<div className="mt-6 flex gap-3">
                {availableSocialLinks.map((social) => (<a key={social.label} href={social.href} aria-label={social.label} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/10 transition-colors hover:bg-primary hover:text-primary-foreground">
                    <social.icon className="h-4 w-4"/>
                  </a>))}
              </div>) : (<p className="mt-6 text-xs opacity-60">Official social links will be added soon.</p>)}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-mono font-bold text-sm uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="mt-5 flex flex-col gap-3">
              {quickLinks.map((link) => (<li key={link.label}>
                  <Link href={link.href} className="text-sm opacity-60 transition-opacity hover:opacity-100">
                    {link.label}
                  </Link>
                </li>))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-mono font-bold text-sm uppercase tracking-wider">
              Legal
            </h4>
            {availableLegalLinks.length > 0 ? (<ul className="mt-5 flex flex-col gap-3">
                {availableLegalLinks.map((link) => (<li key={link.label}>
                    <a href={link.href} className="text-sm opacity-60 transition-opacity hover:opacity-100">
                      {link.label}
                    </a>
                  </li>))}
              </ul>) : (<p className="mt-5 text-sm opacity-60">Policy pages will be published soon.</p>)}
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-mono font-bold text-sm uppercase tracking-wider">
              Contact
            </h4>
            <ul className="mt-5 flex flex-col gap-4">
              <li className="flex items-start gap-3 text-sm opacity-60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0"/>
                <span>
                  Rajshahi University Campus, Rajshahi 6205, Bangladesh
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm opacity-60">
                <Mail className="h-4 w-4 shrink-0"/>
                <span>contact@rufoodexpress.com</span>
              </li>
              <li className="flex items-center gap-3 text-sm opacity-60">
                <Phone className="h-4 w-4 shrink-0"/>
                <span>+880 1XXX-XXXXXX</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-background/10 pt-8 text-center text-sm opacity-50">
          <p>
            &copy; <span suppressHydrationWarning>{formatAppYear(new Date())}</span> CampFood. Built for
            students of University of Rajshahi.
          </p>
        </div>
      </div>
    </footer>);
}
