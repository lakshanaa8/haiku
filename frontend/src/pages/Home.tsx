import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppointmentModal } from "@/components/AppointmentModal";
import { ChevronRight, HeartPulse, ShieldCheck, Clock } from "lucide-react";

// Import images from public directory
const slide1 = "/medagg_slide1.jpeg";
const slide2 = "/medagg_slide2.jpeg";
const slide3 = "/medagg_slide3.jpeg";

const slides = [
  {
    id: 1,
    image: slide1,
    title: "Tired of Surgical Worries?",
    subtitle: "Explore Non-Surgical Solutions - Redefining Healthcare, Non-Surgically"
  },
  {
    id: 2,
    image: slide2,
    title: "Experience Gentle Care, Faster Recovery",
    subtitle: "Advanced Non-Surgical Treatments Available - Now in 20+ Cities"
  },
  {
    id: 3,
    image: slide3,
    title: "Are you averse to surgeries?",
    subtitle: "Explore Medagg's Interventional Radiology - Advanced Non-Surgical Solutions"
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // Auto-advance
  useState(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  });

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-b from-teal-50/50 to-white">
      <AppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      {/* Hero Section with Carousel */}
      <section className="relative h-[600px] overflow-hidden group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/80 to-transparent z-10" />
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].title}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 z-20 container mx-auto px-4 flex flex-col justify-center text-white">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl"
              >
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium mb-4 border border-white/30">
                  Welcome to Medico
                </div>
                <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6 text-white drop-shadow-sm">
                  {slides[currentSlide].title}
                </h1>
                <p className="text-xl text-white/90 mb-8 max-w-lg font-light leading-relaxed">
                  {slides[currentSlide].subtitle}
                </p>
                <Button 
                  size="lg" 
                  className="bg-white text-teal-800 hover:bg-white/90 shadow-xl shadow-black/10 text-lg rounded-full px-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                >
                  Book Appointment <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(idx);
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === currentSlide ? "bg-white w-8" : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display text-slate-800 mb-4">
            Why Choose Medico?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We combine advanced medical technology with a compassionate human touch to provide the best care possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: HeartPulse,
              title: "Expert Doctors",
              desc: "Our team consists of highly qualified professionals from top medical institutions."
            },
            {
              icon: ShieldCheck,
              title: "Quality Care",
              desc: "We adhere to the highest standards of medical safety and patient hygiene."
            },
            {
              icon: Clock,
              title: "24/7 Service",
              desc: "Emergency services available round the clock for immediate assistance."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-8 rounded-2xl text-center group hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
