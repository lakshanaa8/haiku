import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, LayoutDashboard, CalendarHeart } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-teal-100 h-16">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-teal-300 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/30 transition-all">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-teal-600">
            MEDICO
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/">
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer",
              location === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}>
              <CalendarHeart className="w-4 h-4" />
              Book Now
            </div>
          </Link>
          <Link href="/dashboard">
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer",
              location === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}>
              <LayoutDashboard className="w-4 h-4" />
              Doctor Dashboard
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
