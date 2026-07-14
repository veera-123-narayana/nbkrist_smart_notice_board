import { useEffect, useState } from "react";
import { subscribeThemes } from "../services/themes/themeService";

export default function useThemes() {
  const [themes, setThemes] = useState<any[]>([]);

  useEffect(() => {
    return subscribeThemes(setThemes);
  }, []);

  return themes;
}