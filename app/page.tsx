import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import ProductStrip from "@/components/landing/ProductStrip";
import Pain from "@/components/landing/Pain";
import HowItWorks from "@/components/landing/HowItWorks";
import Metrics from "@/components/landing/Metrics";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import Press from "@/components/landing/Press";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="grain flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <ProductStrip />
        <Pain />
        <HowItWorks />
        <Metrics />
        <Pricing />
        <Testimonials />
        <Press />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
