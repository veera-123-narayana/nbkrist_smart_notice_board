import { useEffect, useState } from "react";
import { subscribeNotices } from "../services/notices/noticeService";

export default function useNotices() {
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeNotices(setNotices);

    return () => unsubscribe();
  }, []);

  return notices;
}