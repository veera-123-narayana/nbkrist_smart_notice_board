import {
  FileText,
  Bell,
  Image,
  MonitorSmartphone,
} from "lucide-react";

import StatsCard from "./StatsCard";

export default function Dashboard() {
  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold text-white">
        Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-5">

        <StatsCard
          title="Total Notices"
          value="0"
          color="bg-blue-600"
          icon={<FileText />}
        />

        <StatsCard
          title="Alerts"
          value="0"
          color="bg-red-600"
          icon={<Bell />}
        />

        <StatsCard
          title="Posters"
          value="0"
          color="bg-purple-600"
          icon={<Image />}
        />

        <StatsCard
          title="Online Displays"
          value="0"
          color="bg-green-600"
          icon={<MonitorSmartphone />}
        />

      </div>

    </div>
  );
}