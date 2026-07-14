import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  color = "bg-blue-600",
}: StatsCardProps) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex justify-between items-center">
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <h2 className="text-3xl font-bold text-white mt-2">{value}</h2>
      </div>

      <div className={`${color} p-4 rounded-xl text-white`}>
        {icon}
      </div>
    </div>
  );
}