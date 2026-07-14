import { useEffect, useState } from "react";
import { onSnapshot, Query } from "firebase/firestore";

export default function useRealtime(queryRef: Query) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(queryRef, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setData(docs);
    });

    return unsubscribe;
  }, [queryRef]);

  return data;
}