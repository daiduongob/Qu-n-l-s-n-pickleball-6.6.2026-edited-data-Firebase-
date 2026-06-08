import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { AppState, User } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export async function fetchState(): Promise<AppState> {
  const usersSnap = await getDocs(collection(db, "users"));
  const courtsSnap = await getDocs(collection(db, "courts"));
  const matchesSnap = await getDocs(collection(db, "matches"));

  let users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  let courts = courtsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  if (courts.length === 0) {
     const initialCourts = [
       { id: '1', name: 'Sân 1', status: 'empty', players: [], waitingTime: null },
       { id: '2', name: 'Sân 2', status: 'empty', players: [], waitingTime: null },
       { id: '3', name: 'Sân 3', status: 'empty', players: [], waitingTime: null },
       { id: '4', name: 'Sân 4', status: 'empty', players: [], waitingTime: null },
     ];
     const batch = writeBatch(db);
     initialCourts.forEach(c => batch.set(doc(db, "courts", c.id), c));
     
     // Also prepopulate admin and dummy users if empty
     if (users.length === 0) {
        let dummyUsers = [
          { id: 'admin', name: 'Admin', username: 'admin', password: '123', skillRating: 6.0, isReady: false, status: 'free', courtId: null, waitStartTime: null, createdAt: Date.now() },
          ...Array.from({ length: 8 }).map((_, i) => ({
            id: `user${i + 1}`, name: `Người chơi ${i + 1}`, username: `user${i + 1}`, password: '123', skillRating: Number((Math.random() * (3.0 - 2.0) + 2.0).toFixed(1)), isReady: true, status: 'free', courtId: null, waitStartTime: Date.now(), createdAt: Date.now()
          }))
        ];
        dummyUsers.forEach(u => batch.set(doc(db, "users", u.id), u));
        users = dummyUsers;
     }

     await batch.commit();
     courts = initialCourts;
  }

  return { users, courts, matches };
}

// In-browser mock autoMatch with smart matching logic:
// 1. High priority for players who have been waiting the longest (anchor player has earliest waitStartTime).
// 2. Selects companions who have a similar skill rating to the anchor player, balanced with their waiting time limit.
async function autoMatchDB() {
  const { users, courts } = await fetchState();
  const waitingUsers = users
    .filter((u: any) => u.isReady && u.status === 'free' && !u.courtId)
    .sort((a: any, b: any) => (a.waitStartTime || 0) - (b.waitStartTime || 0));

  if (waitingUsers.length >= 4) {
    const emptyCourts = courts.filter((c: any) => c.status === 'empty');
    if (emptyCourts.length > 0) {
      const court = emptyCourts[0];
      
      // Step A: Pick the absolute longest waiting player as the anchor
      const anchor = waitingUsers[0];
      
      // Step B: Filter other potential players
      const now = Date.now();
      const candidates = waitingUsers.filter((u: any) => u.id !== anchor.id);
      
      // Step C: Score candidates based on:
      // - Skill similarity to anchor (lower is better, weight = 20 score points per 1.0 rating diff)
      // - Waiting duration time (longer waiting time lowers the score further, i.e., promoting them)
      const candidatesWithScore = candidates.map((u: any) => {
        const skillDiff = Math.abs(u.skillRating - anchor.skillRating);
        const waitMin = (now - (u.waitStartTime || now)) / 60000;
        // score scale: each 1.0 of skill gap is equivalent to 20 minutes of waiting penalty.
        const score = skillDiff * 20 - waitMin;
        return { u, score };
      });
      
      // Sort candidates ascending by score (best companions first)
      candidatesWithScore.sort((a, b) => a.score - b.score);
      const selectedCompanions = candidatesWithScore.slice(0, 3).map(item => item.u);
      const selectedUsers = [anchor, ...selectedCompanions];
      
      const batch = writeBatch(db);
      batch.update(doc(db, "courts", court.id), {
        status: 'waiting_list',
        players: selectedUsers.map((u: any) => u.id),
        waitingTime: Date.now()
      });
      
      selectedUsers.forEach((u: any) => {
        batch.update(doc(db, "users", u.id), {
          courtId: court.id
        });
      });
      await batch.commit();
      await autoMatchDB(); // recursively schedule next general empty court
    }
  }
}


export async function callApi(endpoint: string, method: string = 'POST', body?: any) {
  try {
    if (endpoint === '/api/login') {
      const { username, password } = body;
      const { users } = await fetchState();
      let user = users.find((u: any) => u.username === username);
      
      if (!user) {
        // Fallback for demo: if user not found, create them to make it easy
        if (username === 'admin') {
           const adminId = `admin_${Date.now()}`;
           user = {
             id: adminId, name: 'Admin', username: 'admin', password: password, skillRating: 6.0,
             isReady: false, status: 'free', courtId: null, waitStartTime: null, createdAt: Date.now()
           };
           await setDoc(doc(db, "users", adminId), user);
        } else {
           return { success: false, message: 'Sai thông tin đăng nhập' };
        }
      } else if (user.password !== password) {
        return { success: false, message: 'Sai thông tin đăng nhập' };
      }
      await autoMatchDB();
      return { success: true, user: { ...user, password: '' } };
    }
    
    if (endpoint === '/api/register') {
      const { name, username, password, skillRating, isReady } = body;
      const { users } = await fetchState();
      if (users.find((u: any) => u.username === username)) {
         return { success: false, message: 'Username đã tồn tại' };
      }
      const newUser = {
        id: Date.now().toString(),
        name, username, password: password || '123', skillRating: Number(skillRating) || 1.0,
        isReady: isReady || false, status: 'free', courtId: null, waitStartTime: isReady ? Date.now() : null,
      };
      await setDoc(doc(db, "users", newUser.id), newUser);
      await autoMatchDB();
      return { success: true, user: { ...newUser, password: '' } };
    }

    if (endpoint.startsWith('/api/users/') && method === 'POST') {
      const id = endpoint.split('/')[3];
      const uRef = doc(db, "users", id);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const u = uSnap.data();
        const updates: any = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.username !== undefined) updates.username = body.username;
        if (body.password !== undefined && body.password !== '') updates.password = body.password;
        if (body.skillRating !== undefined) updates.skillRating = Number(body.skillRating);
        
        if (body.isReady !== undefined && u.isReady !== body.isReady) {
          updates.isReady = body.isReady;
          if (body.isReady) {
            updates.waitStartTime = Date.now();
          } else {
            updates.waitStartTime = null;
            updates.courtId = null;
            // Also clean up court if needed
            if (u.courtId) {
              const cSnap = await getDoc(doc(db, "courts", u.courtId));
              if (cSnap.exists() && cSnap.data().status === 'waiting_list') {
                 const c = cSnap.data();
                 const batch = writeBatch(db);
                 batch.update(doc(db, "courts", u.courtId), { status: 'empty', players: [] });
                 c.players.forEach((pid: string) => {
                    batch.update(doc(db, "users", pid), { courtId: null, status: 'free' });
                 });
                 await batch.commit();
              }
            }
          }
        }
        if (body.status !== undefined && u.status !== body.status) {
          updates.status = body.status;
          if (body.status === 'free') {
            updates.courtId = null;
          }
        }
        await updateDoc(uRef, updates);
        await autoMatchDB();
        return { success: true };
      }
      return { success: false };
    }

    if (endpoint.startsWith('/api/users/') && method === 'DELETE') {
      const id = endpoint.split('/')[3];
      await deleteDoc(doc(db, "users", id));
      return { success: true };
    }

    if (endpoint === '/api/courts' && method === 'POST') {
      const newCourt = { id: Date.now().toString(), name: body.name, status: body.status || 'empty', players: [], waitingTime: null };
      await setDoc(doc(db, "courts", newCourt.id), newCourt);
      await autoMatchDB();
      return { success: true };
    }

    if (endpoint.startsWith('/api/courts/') && method === 'PUT') {
      const id = endpoint.split('/')[3];
      const updates: any = {};
      if (body.name) updates.name = body.name;
      if (body.status) updates.status = body.status;
      await updateDoc(doc(db, "courts", id), updates);
      return { success: true };
    }

    if (endpoint.startsWith('/api/courts/') && method === 'DELETE') {
      const id = endpoint.split('/')[3];
      const snap = await getDoc(doc(db, "courts", id));
      if (snap.exists() && snap.data().status !== 'empty') {
         return { success: false, message: 'Chỉ có thể xóa sân khi sân trống' };
      }
      await deleteDoc(doc(db, "courts", id));
      return { success: true };
    }

    if (endpoint === '/api/courts/reset-random') {
      const { courts, users } = await fetchState();
      const batch = writeBatch(db);
      courts.forEach((c: any) => {
        if (c.status === 'waiting_list') batch.update(doc(db, "courts", c.id), { status: 'empty', players: [], waitingTime: null });
      });
      users.forEach((u: any) => {
        if (u.isReady && u.status === 'free') batch.update(doc(db, "users", u.id), { courtId: null, waitStartTime: Date.now() + Math.random() * 10000 });
      });
      await batch.commit();
      await autoMatchDB();
      return { success: true };
    }

    if (endpoint.match(/\/api\/courts\/.*\/start/)) {
      const id = endpoint.split('/')[3];
      const cRef = doc(db, "courts", id);
      const cSnap = await getDoc(cRef);
      if (cSnap.exists() && cSnap.data().status === 'waiting_list') {
         const batch = writeBatch(db);
         batch.update(cRef, { status: 'playing' });
         cSnap.data().players.forEach((pid: string) => {
             batch.update(doc(db, "users", pid), { status: 'playing' });
         });
         await batch.commit();
         return { success: true };
      }
      return { success: false };
    }

    if (endpoint.match(/\/api\/courts\/.*\/adjust/)) {
      const id = endpoint.split('/')[3];
      const { players } = body;
      const cRef = doc(db, "courts", id);
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        const batch = writeBatch(db);
        const oldPlayers = cSnap.data().players;
        oldPlayers.forEach((pid: string) => {
           if (!players.includes(pid)) batch.update(doc(db, "users", pid), { courtId: null });
        });
        players.forEach((pid: string) => {
           batch.update(doc(db, "users", pid), { courtId: id });
        });
        batch.update(cRef, { players, status: 'waiting_list', waitingTime: Date.now() });
        await batch.commit();
        return { success: true };
      }
      return { success: false };
    }

    if (endpoint.match(/\/api\/courts\/.*\/end/)) {
      const id = endpoint.split('/')[3];
      const cRef = doc(db, "courts", id);
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        const court = cSnap.data();
        const A_win = body.scoreA > body.scoreB;
        const B_win = body.scoreB > body.scoreA;
        const matchDoc = {
          id: Date.now().toString(), courtName: court.name, teamA: body.teamA || court.players.slice(0, 2),
          teamB: body.teamB || court.players.slice(2, 4), scoreA: body.scoreA, scoreB: body.scoreB, date: Date.now()
        };
        const batch = writeBatch(db);
        batch.set(doc(db, "matches", matchDoc.id), matchDoc);
        
        for (const pid of court.players) {
           const uSnap = await getDoc(doc(db, "users", pid));
           if (uSnap.exists()) {
              const u = uSnap.data();
              let ratingChange = 0;
              if (matchDoc.teamA.includes(pid)) ratingChange = A_win ? 0.1 : (A_win === B_win ? 0 : -0.1);
              else if (matchDoc.teamB.includes(pid)) ratingChange = B_win ? 0.1 : (A_win === B_win ? 0 : -0.1);
              const newRating = Math.max(1.0, Math.min(6.0, Number((u.skillRating + ratingChange).toFixed(1))));
              batch.update(doc(db, "users", pid), { 
                status: 'free', 
                courtId: null, 
                skillRating: newRating,
                isReady: true,
                waitStartTime: Date.now() // Reset waiting time to 0 (starts waiting from now)
              });
           }
        }
        batch.update(cRef, { status: 'empty', players: [], waitingTime: null });
        await batch.commit();
        await autoMatchDB();
        return { success: true };
      }
      return { success: false };
    }
    
    return { success: false, message: 'Not Implemented in Mock' };
  } catch (error: any) {
    console.error("Firestore Error:", error);
    return { success: false, message: error.message };
  }
}
