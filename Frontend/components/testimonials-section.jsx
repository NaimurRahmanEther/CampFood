import Image from "next/image";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
const testimonials = [
    {
        name: "Rafiq Ahmed",
        department: "CSE, 3rd Year",
        image: "/images/student-1.jpg",
        quote: "CampFood saved me so much time! I can order food from Shahid Shamsuzzoha Hall kitchen and get it delivered to my department during lab hours. The AI chatbot even suggests meals within my budget.",
        rating: 5,
    },
    {
        name: "Fatima Akter",
        department: "English, 2nd Year",
        image: "/images/student-2.jpg",
        quote: "As a delivery partner, I earn points between my classes. Last month I got 3 free meals just from delivering! It's the perfect side hustle for a student.",
        rating: 5,
    },
    {
        name: "Tanvir Hasan",
        department: "EEE, 4th Year",
        image: "/images/student-3.jpg",
        quote: "Ordering is super smooth. I can check updates from checkout, and being able to transfer points to friends makes group ordering much easier.",
        rating: 5,
    },
];
export function TestimonialsSection() {
    return (<section id="testimonials" className="py-24 bg-card lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Loved by Students
          </p>
          <h2 className="mt-3 text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
            What RU Students Say
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Real feedback from Rajshahi University students using CampFood.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (<Card key={testimonial.name} className="group border-border bg-background transition-shadow duration-300 hover:shadow-lg">
              <CardContent className="relative p-6 lg:p-8">
                <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10 lg:top-8 lg:right-8"/>
                <div className="flex gap-0.5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (<Star key={i} className="h-4 w-4 fill-secondary text-secondary"/>))}
                </div>
                <blockquote className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
                  <Image src={testimonial.image} alt={testimonial.name} width={44} height={44} className="rounded-full object-cover"/>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.department}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>))}
        </div>
      </div>
    </section>);
}
