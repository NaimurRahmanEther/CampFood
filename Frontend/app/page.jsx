import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { FeaturesSection } from "@/components/features-section";
import { DeliveryPartner } from "@/components/delivery-partner";
import { SubscriptionSection } from "@/components/subscription-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { Footer } from "@/components/footer";
export default function Home() {
    return (<>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <FeaturesSection />
        <DeliveryPartner />
        <SubscriptionSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </>);
}
