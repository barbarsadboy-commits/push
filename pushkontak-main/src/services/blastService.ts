import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, increment, getCountFromServer, orderBy, limit } from "firebase/firestore";
import { db } from "../config/firebase-server.ts";

// Collections
const BLAST_COLLECTION = "blast_numbers";
const USERS_COLLECTION = "users"; // Adjust this based on how users are stored.
const BLAST_QUEUE_COLLECTION = "blast_queue";
const PUSHKONTAK_DB_COLLECTION = "pushkontak_numbers";

export async function addNumberToPushKontakDb(number: string): Promise<boolean> {
  const cleanNumber = number.replace(/\D/g, ''); // Ensure digits only
  if (!cleanNumber) return false;
  
  const docRef = doc(db, PUSHKONTAK_DB_COLLECTION, cleanNumber);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      number: cleanNumber,
      addedAt: serverTimestamp()
    });
    return true; // Added
  }
  return false; // Duplikat
}

export async function addNumberToBlastDb(number: string): Promise<boolean> {
  const cleanNumber = number.replace(/\D/g, ''); // Ensure digits only
  if (!cleanNumber) return false;
  
  // check if in main blast db
  const docRef = doc(db, BLAST_COLLECTION, cleanNumber);
  const snap = await getDoc(docRef);
  if (snap.exists()) return false;
  
  // check if in queue
  const queueRef = doc(db, BLAST_QUEUE_COLLECTION, cleanNumber);
  const queueSnap = await getDoc(queueRef);
  if (queueSnap.exists()) return false;
  
  // store in queue immediately to avoid expensive counts
  // replenish logic will move it later.
  await setDoc(queueRef, {
      number: cleanNumber,
      addedAt: serverTimestamp()
  });
  return true;
}

export async function replenishBlastDb() {
    const collRef = collection(db, BLAST_COLLECTION);
    const countSnap = await getCountFromServer(collRef);
    const currentCount = countSnap.data().count;
    
    if (currentCount < 100) {
        const needed = 100 - currentCount;
        const q = query(collection(db, BLAST_QUEUE_COLLECTION), orderBy("addedAt", "asc"), limit(needed));
        const queueSnap = await getDocs(q);
        
        for (const queueDoc of queueSnap.docs) {
            const data = queueDoc.data();
            await setDoc(doc(db, BLAST_COLLECTION, data.number), {
                number: data.number,
                addedAt: serverTimestamp(),
                used: false
            });
            await deleteDoc(queueDoc.ref);
        }
    }
}

export async function getBlastSaldo(userId: string): Promise<number> {
  const docRef = doc(db, "bot_users", String(userId));
  const snap = await getDoc(docRef);
  if (snap.exists() && typeof snap.data().saldo === 'number') {
    return snap.data().saldo;
  }
  return 0;
}

export async function addBlastReward(userId: string, amount: number = 200) {
    const docRef = doc(db, "bot_users", String(userId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        await setDoc(docRef, { saldo: amount, role: 'free' }, { merge: true });
    } else {
        await updateDoc(docRef, {
            saldo: increment(amount)
        });
    }
}

export async function removeNumberFromBlastDb(number: string) {
  const cleanNumber = number.replace(/\D/g, '');
  if (!cleanNumber) return;
  const docRef = doc(db, BLAST_COLLECTION, cleanNumber);
  await deleteDoc(docRef);
}

export async function getBlastNumbers(limitCount: number = 100): Promise<string[]> {
    await replenishBlastDb();
    const q = query(collection(db, BLAST_COLLECTION), limit(limitCount));
    const querySnapshot = await getDocs(q);
    const numbers: string[] = [];
    querySnapshot.forEach((doc) => {
        numbers.push(doc.id);
    });
    return numbers; 
}

export async function getBlastReadyCount(): Promise<number> {
    const collRef = collection(db, BLAST_COLLECTION);
    const countSnap = await getCountFromServer(collRef);
    return countSnap.data().count;
}

export async function getBlastQueueCount(): Promise<number> {
    const collRef = collection(db, BLAST_QUEUE_COLLECTION);
    const countSnap = await getCountFromServer(collRef);
    return countSnap.data().count;
}

export async function isBlastConnected(userId: string): Promise<boolean> {
    const docRef = doc(db, "bot_users", String(userId));
    const snap = await getDoc(docRef);
    return snap.exists() ? !!snap.data().blast_connected : false;
}

export async function setBlastConnected(userId: string, state: boolean) {
    const docRef = doc(db, "bot_users", String(userId));
    await setDoc(docRef, { blast_connected: state }, { merge: true });
}
