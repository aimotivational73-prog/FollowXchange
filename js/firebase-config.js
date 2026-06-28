// Import Firebase core and services from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, increment, 
    collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyBYMPCEf748NrT1kvtiPGFPXrB09STQvEY",
    authDomain: "followxchange-89a36.firebaseapp.com",
    projectId: "followxchange-89a36",
    storageBucket: "followxchange-89a36.firebasestorage.app",
    messagingSenderId: "1075063736798",
    appId: "1:1075063736798:web:fbd2c1ed4193a36efe754f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/** Returns the currently authenticated user object or null */
export function getCurrentUser() {
    return auth.currentUser;
}

/** Fetches a specific user's document data */
export async function getUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

/** Adds points to a user and logs the transaction */
export async function addPoints(uid, amount, reason) {
    const batch = writeBatch(db);
    const userRef = doc(db, "users", uid);
    const historyRef = doc(collection(db, "points_history"));

    batch.update(userRef, { points: increment(amount) });
    batch.set(historyRef, {
        uid: uid,
        points_change: amount,
        reason: reason,
        created_at: serverTimestamp()
    });

    await batch.commit();
}

/** Deducts points from a user and logs the transaction */
export async function deductPoints(uid, amount, reason) {
    const batch = writeBatch(db);
    const userRef = doc(db, "users", uid);
    const historyRef = doc(collection(db, "points_history"));

    // We pass negative amount to deduct
    batch.update(userRef, { points: increment(-amount) });
    batch.set(historyRef, {
        uid: uid,
        points_change: -amount,
        reason: reason,
        created_at: serverTimestamp()
    });

    await batch.commit();
}

/** Increments today's ad count for a user. Resets if a new day. */
export async function watchTodayAdCount(uid) {
    const adRef = doc(db, "ads_watched", uid);
    const adSnap = await getDoc(adRef);
    const todayStr = new Date().toLocaleDateString('en-CA');

    if (adSnap.exists()) {
        const data = adSnap.data();
        if (data.last_watched_date === todayStr) {
            await updateDoc(adRef, { today_count: increment(1) });
        } else {
            // New day reset
            await updateDoc(adRef, { today_count: 1, last_watched_date: todayStr });
        }
    } else {
        // First time watching
        await setDoc(adRef, { uid: uid, today_count: 1, last_watched_date: todayStr });
    }
}

/** Creates a follow order and deducts points simultaneously */
export async function placeFollowOrder(buyerUid, followerCount, pointsCost) {
    // 1. Fetch user to get their IG username and check balance
    const userData = await getUserData(buyerUid);
    if (!userData || userData.points < pointsCost) {
        throw new Error("Insufficient points or user not found.");
    }

    const batch = writeBatch(db);
    
    // Deduct Points
    const userRef = doc(db, "users", buyerUid);
    batch.update(userRef, { points: increment(-pointsCost) });

    // Log Transaction
    const historyRef = doc(collection(db, "points_history"));
    batch.set(historyRef, {
        uid: buyerUid,
        points_change: -pointsCost,
        reason: `Ordered ${followerCount} followers`,
        created_at: serverTimestamp()
    });

    // Create Order
    const orderRef = doc(collection(db, "follow_orders"));
    batch.set(orderRef, {
        buyer_uid: buyerUid,
        buyer_instagram: userData.instagram_username,
        follower_count: followerCount,
        points_cost: pointsCost,
        status: "pending",
        created_at: serverTimestamp()
    });

    await batch.commit();
    return orderRef.id;
}

/** Retrieves pending tasks that do not belong to the current user */
export async function getAvailableFollowTasks(currentUid) {
    const ordersRef = collection(db, "follow_orders");
    const q = query(ordersRef, where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    
    let tasks = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        // Don't show users their own orders
        if (data.buyer_uid !== currentUid) {
            tasks.push({ id: doc.id, ...data });
        }
    });
    
    return tasks;
}

// Export auth and db for use in other files
export { auth, db };
