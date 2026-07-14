import { useEffect, useState } from "react";
import { subscribeAlerts } from "../services/alerts/alertService";

export default function useAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    return subscribeAlerts(setAlerts);
  }, []);

  return alerts;
}