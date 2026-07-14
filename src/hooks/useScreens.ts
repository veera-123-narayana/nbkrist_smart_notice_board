import { useEffect, useState } from "react";
import { subscribeScreens } from "../services/devices/deviceService";

export default function useScreens() {
  const [screens, setScreens] = useState<any[]>([]);

  useEffect(() => {
    return subscribeScreens(setScreens);
  }, []);

  return screens;
}