import { useState, useEffect, useRef } from 'react';
import { db } from '../utils/firebaseClient';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export function useFirestore(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [isReady, setIsReady] = useState(false);

  const latestValue = useRef(value);
  latestValue.current = value;

  useEffect(() => {
    let unsubscribe;
    let didFinish = false;

    // Fallback: always unblock UI after 8 seconds even if Firestore hangs
    const timeout = setTimeout(() => {
      if (!didFinish) {
        console.warn(`[useFirestore] Timeout waiting for key="${key}". Using initial value.`);
        setIsReady(true);
      }
    }, 8000);

    const init = async () => {
      try {
        const docRef = doc(db, 'app_state', key);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setValue(docSnap.data().data);
        } else {
          // First time: seed the document with the initial value
          await setDoc(docRef, { data: initialValue });
        }

        // Real-time listener so all devices sync instantly
        unsubscribe = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const incoming = snap.data().data;
            if (JSON.stringify(incoming) !== JSON.stringify(latestValue.current)) {
              setValue(incoming);
            }
          }
        });
      } catch (err) {
        console.error(`[useFirestore] Failed to load key="${key}":`, err);
      } finally {
        didFinish = true;
        clearTimeout(timeout);
        setIsReady(true);
      }
    };

    init();

    return () => {
      didFinish = true;
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [key]);

  const setFirestoreValue = (newValueOrUpdater) => {
    let nextValueToPush;
    setValue(prev => {
      const nextValue = typeof newValueOrUpdater === 'function'
        ? newValueOrUpdater(prev)
        : newValueOrUpdater;
      nextValueToPush = nextValue;
      return nextValue;
    });

    setTimeout(() => {
      if (isReady && nextValueToPush !== undefined) {
        const docRef = doc(db, 'app_state', key);
        setDoc(docRef, { data: nextValueToPush }).catch(err => {
          console.error('[useFirestore] Error saving to Firestore:', err);
        });
      }
    }, 0);
  };

  return [value, setFirestoreValue, isReady];
}
