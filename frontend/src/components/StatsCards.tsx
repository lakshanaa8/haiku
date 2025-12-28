import { useDashboardStats } from "@/hooks/use-dashboard";
import { Users, Flame, PhoneCall, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function StatsCards() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-100",
    },
    {
      label: "Hot Leads",
      value: stats?.hotLeads || 0,
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-100",
    },
    {
      label: "Completed Calls",
      value: stats?.completedCalls || 0,
      icon: PhoneCall,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`glass-card p-6 rounded-2xl flex items-center justify-between border ${item.border}`}
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <h3 className="text-3xl font-display font-bold mt-1 text-slate-800">
              {item.value}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
            <item.icon className="w-6 h-6" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
