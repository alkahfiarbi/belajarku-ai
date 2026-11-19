// store.js
//
// Study-set persistence for BelajarKu AI.
//
// Two backends behind one async interface:
//   - Firestore (when the app is configured AND the user is signed in):
//     collection "studySets", one document per saved set, scoped by the
//     anonymous user id. Firestore security rules are in README.md.
//   - Local storage (fallback): the browser's localStorage, or an
//     in-memory map when localStorage is unavailable (private mode, and
//     the Node test runner). Same shape, same methods.
//
// A study set is: { id, title, material, lang, createdAt, results? }
// `results` holds the last generated outputs so a saved set reopens with
// its summary / flashcards / quiz intact.

export function createMemoryStore() {
  const map = new Map();
  return {
    kind: 'memory',
    async saveSet(set) {
      const id = set.id || `set-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const saved = { ...set, id };
      map.set(id, saved);
      return saved;
    },
    async listSets() {
      return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    async getSet(id) {
      return map.get(id) || null;
    },
    async deleteSet(id) {
      map.delete(id);
      return true;
    },
  };
}

export function createLocalStore(storage, key) {
  const loadAll = () => {
    try {
      const raw = storage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };
  const saveAll = (arr) => {
    try {
      storage.setItem(key, JSON.stringify(arr));
    } catch {
      // Storage full or blocked (private mode): fail silently; the
      // in-memory copy still works for this session.
    }
  };
  return {
    kind: 'local',
    async saveSet(set) {
      const all = loadAll();
      const id = set.id || `set-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const saved = { ...set, id };
      const idx = all.findIndex((s) => s.id === id);
      if (idx >= 0) all[idx] = saved;
      else all.unshift(saved);
      saveAll(all);
      return saved;
    },
    async listSets() {
      return loadAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    async getSet(id) {
      return loadAll().find((s) => s.id === id) || null;
    },
    async deleteSet(id) {
      saveAll(loadAll().filter((s) => s.id !== id));
      return true;
    },
  };
}

// Firestore backend. `db` is the Firestore instance from firebase/firestore
// and `uid` is the signed-in user's id. The collection path is
// studySets/{uid}/sets/{setId} so each user only ever sees their own sets.
export function createFirestoreStore(db, firestoreFns, uid) {
  const { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy } = firestoreFns;
  const colRef = collection(db, 'studySets', uid, 'sets');
  const toPlain = (snap) => ({ id: snap.id, ...snap.data() });
  return {
    kind: 'firestore',
    async saveSet(set) {
      const id = set.id || doc(colRef).id;
      const { id: _ignored, ...data } = { ...set, id };
      await setDoc(doc(colRef, id), data);
      return { ...data, id };
    },
    async listSets() {
      const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc')));
      return snap.docs.map(toPlain);
    },
    async getSet(id) {
      const snap = await getDoc(doc(colRef, id));
      return snap.exists() ? toPlain(snap) : null;
    },
    async deleteSet(id) {
      await deleteDoc(doc(colRef, id));
      return true;
    },
  };
}
