"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { BrowseFoodClient } from "@/components/browse-food-client";
export default function BrowseFoodPage() {
    return (<>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/35 pt-24">
        <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="transition-colors hover:text-primary">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4"/>
              </li>
              <li className="font-medium text-foreground">Browse Food</li>
            </ol>
          </nav>
          <BrowseFoodClient />
        </div>
      </main>
      <Footer />
    </>);
}
