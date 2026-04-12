import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

export function useAwards() {
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'awards'), orderBy('pointsCost', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAwards(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching awards:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { awards, loading };
}
