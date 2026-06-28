import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, increment, 
    collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyBYMPCEf748NrT1kvtiPGFPXrB09STQvEY",
    authDomain: "followxchange-89a36.firebaseapp.com",
    projectId: "followxchange-89a36",
    storageBucket: "followxchange-89a36.firebasestorage.app",
    messagingSenderId: "1075063736798",
    appId: "1:1075063736798:web:fbd2c1ed4193a36efe754f"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


export function getCurrentUser() {
    return auth.currentUser;
}


export async function getUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}


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


export async function deductPoints(uid, amount, reason) {
    const batch = writeBatch(db);
    const userRef = doc(db, "users", uid);
    const historyRef = doc(collection(db, "points_history"));


    batch.update(userRef, { points: increment(-amount) });
    batch.set(historyRef, {
        uid: uid,
        points_change: -amount,
        reason: reason,
        created_at: serverTimestamp()
    });

    await batch.commit();
}


export async function watchTodayAdCount(uid) {
    const adRef = doc(db, "ads_watched", uid);
    const adSnap = await getDoc(adRef);
    const todayStr = new Date().toLocaleDateString('en-CA');

    if (adSnap.exists()) {
        const data = adSnap.data();
        if (data.last_watched_date === todayStr) {
            await updateDoc(adRef, { today_count: increment(1) });
        } else {

            await updateDoc(adRef, { today_count: 1, last_watched_date: todayStr });
        }
    } else {

        await setDoc(adRef, { uid: uid, today_count: 1, last_watched_date: todayStr });
    }
}


export async function placeFollowOrder(buyerUid, followerCount, pointsCost) {

    const userData = await getUserData(buyerUid);
    if (!userData || userData.points < pointsCost) {
        throw new Error("Insufficient points or user not found.");
    }

    const batch = writeBatch(db);
    

    const userRef = doc(db, "users", buyerUid);
    batch.update(userRef, { points: increment(-pointsCost) });


    const historyRef = doc(collection(db, "points_history"));
    batch.set(historyRef, {
        uid: buyerUid,
        points_change: -pointsCost,
        reason: `Ordered ${followerCount} followers`,
        created_at: serverTimestamp()
    });


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


export async function getAvailableFollowTasks(currentUid) {
    const ordersRef = collection(db, "follow_orders");
    const q = query(ordersRef, where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    
    let tasks = [];
    snapshot.forEach(doc => {
        const data = doc.data();

        if (data.buyer_uid !== currentUid) {
            tasks.push({ id: doc.id, ...data });
        }
    });
    
    return tasks;
}


export { auth, db };
