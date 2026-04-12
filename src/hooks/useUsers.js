import { useState, useEffect } from 'react';
import { 
  collection, query, where, getDocs, 
  updateDoc, doc, increment, getDoc, setDoc 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

export function useUsers() {
  const [loading, setLoading] = useState(false);

  // Awards points to a user based on their phone (userId in orders)
  const awardPoints = async (phone, pointsToAward) => {
    if (!phone || phone === 'guest') return;
    if (!isFirebaseConfigured()) {
       console.log('Demo Mode: Awarding', pointsToAward, 'points to user with phone', phone);
       // In demo mode we could update a local storage "users" but for now just log
       return;
    }

    setLoading(true);
    try {
      // 1. Update customers collection (Phone-based ID)
      const customerRef = doc(db, 'customers', phone);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        await updateDoc(customerRef, {
          savitPoints: increment(pointsToAward),
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Update users collection (Auth-based ID)
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          savitPoints: increment(pointsToAward),
          updatedAt: new Date().toISOString()
        });
      } else {
        const q2 = query(collection(db, 'users'), where('whatsapp', '==', phone));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
            const userDoc = snap2.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
              savitPoints: increment(pointsToAward),
              updatedAt: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    } finally {
      setLoading(false);
    }
  };

  const redeemAward = async (phone, pointsCost, awardName) => {
    if (!phone || phone === 'guest') throw new Error('Debes estar identificado para canjear premios');
    if (!isFirebaseConfigured()) return;

    setLoading(true);
    try {
      const customerRef = doc(db, 'customers', phone);
      const customerSnap = await getDoc(customerRef);
      
      if (!customerSnap.exists()) throw new Error('Cliente no encontrado');
      
      const currentPoints = customerSnap.data().savitPoints || 0;
      if (currentPoints < pointsCost) throw new Error('No tienes puntos suficientes');

      // Subtract from customers
      await updateDoc(customerRef, {
        savitPoints: increment(-pointsCost),
        updatedAt: new Date().toISOString()
      });

      // Also from users if exists
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'users', snap.docs[0].id), {
          savitPoints: increment(-pointsCost),
          updatedAt: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error redeeming award:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { awardPoints, redeemAward, loading };
}
