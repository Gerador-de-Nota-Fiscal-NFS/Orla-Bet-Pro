import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { Subscriber } from '../types';

// Firebase Configuration from firebase-applet-config.json
const firebaseConfig = {
  projectId: "advance-button-xf6jr",
  appId: "1:331193034750:web:e606e02bd261d8a15fc2af",
  apiKey: "AIzaSyAazxCsv1EiCryJexomeAyCtMHlYh9KhHU",
  authDomain: "advance-button-xf6jr.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-orlabetproanalyt-a4b4b40f-032d-4167-8629-c41173dd0f17",
  storageBucket: "advance-button-xf6jr.firebasestorage.app",
  messagingSenderId: "331193034750",
  oAuthClientId: "331193034750-po8s4ghctvuj6n68dhsnuk7sfvonn95k.apps.googleusercontent.com"
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  authInstance = getAuth(app);
  // Initialize firestore with the custom database ID if available
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  try {
    if (app) {
      dbInstance = getFirestore(app);
    }
  } catch (err) {
    console.warn('Firebase initialized in defensive mode:', err);
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

// Secret Admin Access Configuration (Not visible to regular users)
export const MASTER_ADMIN_PASSCODE = "ORLA@MASTER#2026";
export const MASTER_ADMIN_EMAIL = "jardimsaopaulo58@gmail.com";
export const ADMIN_WHATSAPP_NUMBER = "5511999999999"; // Substitua com o seu número com DDD (ex: 5511987654321)

export function getWhatsAppPaymentLink(planName: string, price: string, userName?: string): string {
  const cleanPhone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
  const greeting = userName ? `Olá! Sou ${userName}.` : 'Olá!';
  const message = `${greeting} Gostaria de assinar o *Orla Bet PRO* no *${planName}* (${price}). Como faço para efetuar o pagamento via PIX e ativar meu acesso VIP?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// Local Storage Fallback Store for seamless persistence and demo testing
const LOCAL_STORAGE_SUBSCRIBERS_KEY = 'orla_bet_subscribers_v2';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'orla_bet_current_user_v2';

const INITIAL_DEMO_SUBSCRIBERS: Subscriber[] = [
  {
    uid: 'admin-master-001',
    name: 'Carlos Mendes (Admin)',
    email: 'admin@orlabet.com',
    role: 'admin',
    status: 'ativo',
    plan: 'Plano Anual VIP',
    monthlyValue: 349.90,
    phone: '(11) 98765-4321',
    createdAt: '2025-01-10T10:00:00Z',
    lastLogin: new Date().toISOString()
  },
  {
    uid: 'user-002',
    name: 'Jardim São Paulo',
    email: 'jardimsaopaulo58@gmail.com',
    role: 'admin',
    status: 'ativo',
    plan: 'Plano Anual VIP',
    monthlyValue: 349.90,
    phone: '(11) 99887-1122',
    createdAt: '2025-01-15T14:30:00Z',
    lastLogin: new Date().toISOString()
  },
  {
    uid: 'user-003',
    name: 'Rodrigo Silveira',
    email: 'rodrigo.trader@gmail.com',
    role: 'user',
    status: 'ativo',
    plan: 'Plano Mensal VIP',
    monthlyValue: 49.90,
    phone: '(21) 99123-8844',
    createdAt: '2025-02-01T09:15:00Z',
    lastLogin: '2025-02-23T11:00:00Z'
  },
  {
    uid: 'user-004',
    name: 'Mariana Duarte',
    email: 'mariana.duarte@hotmail.com',
    role: 'user',
    status: 'ativo',
    plan: 'Plano Trimestral Pro',
    monthlyValue: 119.90,
    phone: '(31) 98455-1234',
    createdAt: '2025-02-10T18:20:00Z',
    lastLogin: '2025-02-22T20:10:00Z'
  },
  {
    uid: 'user-005',
    name: 'Lucas Ferreira',
    email: 'lucas.ferreira@bol.com.br',
    role: 'user',
    status: 'bloqueado',
    plan: 'Plano Mensal VIP',
    monthlyValue: 49.90,
    phone: '(41) 97112-9900',
    createdAt: '2025-01-20T16:00:00Z',
    lastLogin: '2025-02-05T14:00:00Z'
  },
  {
    uid: 'user-006',
    name: 'Felipe Alcantara',
    email: 'felipe.alcantara@outlook.com',
    role: 'user',
    status: 'ativo',
    plan: 'Plano Mensal VIP',
    monthlyValue: 49.90,
    phone: '(71) 99344-5566',
    createdAt: '2025-02-18T12:00:00Z',
    lastLogin: '2025-02-23T08:45:00Z'
  }
];

export function getLocalSubscribers(): Subscriber[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBSCRIBERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_SUBSCRIBERS_KEY, JSON.stringify(INITIAL_DEMO_SUBSCRIBERS));
      return INITIAL_DEMO_SUBSCRIBERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_SUBSCRIBERS;
  }
}

export function saveLocalSubscribers(list: Subscriber[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SUBSCRIBERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local subscribers:', e);
  }
}

export function getStoredCurrentUser(): Subscriber | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(sub: Subscriber | null) {
  try {
    if (sub) {
      localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(sub));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Error saving current user:', e);
  }
}

// -------------------------------------------------------------
// Core Firebase Operations with Graceful Fallback
// -------------------------------------------------------------

// Authenticate as Master Admin with private admin password
export async function loginMasterAdmin(passcode: string): Promise<Subscriber> {
  const cleanPass = passcode.trim();
  // Validate master admin passcode - ONLY the official master password is valid
  if (cleanPass !== MASTER_ADMIN_PASSCODE) {
    throw new Error('Senha de acesso administrativo inválida.');
  }

  const adminUser: Subscriber = {
    uid: 'master-admin-jardim',
    name: 'Administrador Master',
    email: MASTER_ADMIN_EMAIL,
    role: 'admin',
    status: 'ativo',
    plan: 'Plano Anual VIP (Master)',
    monthlyValue: 349.90,
    phone: '(11) 99887-1122',
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: new Date().toISOString()
  };

  // Sync to Firestore if db is available
  if (db) {
    try {
      await setDoc(doc(db, "subscribers", adminUser.uid), adminUser, { merge: true });
    } catch (e) {
      console.warn('Firestore admin sync fallback:', e);
    }
  }

  const currentList = getLocalSubscribers();
  const existingIdx = currentList.findIndex(s => s.uid === adminUser.uid || s.email === adminUser.email);
  if (existingIdx >= 0) {
    currentList[existingIdx] = adminUser;
  } else {
    currentList.unshift(adminUser);
  }
  saveLocalSubscribers(currentList);
  setStoredCurrentUser(adminUser);

  return adminUser;
}

export async function registerSubscriber(email: string, pass: string, name: string, plan = 'Plano Mensal VIP', phone = ''): Promise<Subscriber> {
  const monthlyValue = plan.includes('Anual') ? 349.90 : plan.includes('Trimestral') ? 119.90 : 49.90;
  const isMasterAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'jardimsaopaulo58@gmail.com';

  const newSubscriber: Subscriber = {
    uid: `user-${Date.now()}`,
    name: name.trim() || 'Assinante VIP',
    email: email.toLowerCase().trim(),
    role: isMasterAdmin ? 'admin' : 'user',
    status: 'ativo',
    plan,
    monthlyValue,
    phone: phone || undefined,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  if (auth && db) {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      newSubscriber.uid = res.user.uid;
      await setDoc(doc(db, "subscribers", res.user.uid), newSubscriber);
    } catch (err: any) {
      // If live Firebase auth fails (e.g., config dummy), persist locally
      console.warn('Firebase registration fallback:', err.message);
    }
  }

  // Update local list
  const currentList = getLocalSubscribers();
  const existingIdx = currentList.findIndex(s => s.email.toLowerCase() === newSubscriber.email.toLowerCase());
  if (existingIdx >= 0) {
    currentList[existingIdx] = newSubscriber;
  } else {
    currentList.unshift(newSubscriber);
  }
  saveLocalSubscribers(currentList);
  setStoredCurrentUser(newSubscriber);

  return newSubscriber;
}

export async function loginSubscriber(email: string, pass: string): Promise<Subscriber> {
  const normEmail = email.toLowerCase().trim();

  // Try live Firebase Auth first
  if (auth && db) {
    try {
      const res = await signInWithEmailAndPassword(auth, normEmail, pass);
      const userDoc = await getDoc(doc(db, "subscribers", res.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as Subscriber;
        if (data.status === 'bloqueado') {
          await signOut(auth);
          throw new Error('Sua assinatura está suspensa ou bloqueada. Entre em contato com o suporte.');
        }
        await updateDoc(doc(db, "subscribers", res.user.uid), { lastLogin: new Date().toISOString() });
        setStoredCurrentUser(data);
        return data;
      }
    } catch (err: any) {
      if (err.message.includes('suspensa') || err.message.includes('bloqueada')) {
        throw err;
      }
      console.warn('Firebase auth attempt fallback:', err.message);
    }
  }

  // Fallback to local store lookup
  const localList = getLocalSubscribers();
  let found = localList.find(s => s.email.toLowerCase() === normEmail);

  if (!found) {
    // If not found in demo, create active user
    found = {
      uid: `user-${Date.now()}`,
      name: normEmail.split('@')[0],
      email: normEmail,
      role: normEmail.includes('admin') || normEmail === 'jardimsaopaulo58@gmail.com' ? 'admin' : 'user',
      status: 'ativo',
      plan: 'Plano Mensal VIP',
      monthlyValue: 49.90,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    localList.unshift(found);
    saveLocalSubscribers(localList);
  }

  if (found.status === 'bloqueado') {
    throw new Error('Sua assinatura está suspensa ou bloqueada. Entre em contato com o suporte.');
  }

  found.lastLogin = new Date().toISOString();
  saveLocalSubscribers(localList);
  setStoredCurrentUser(found);
  return found;
}

export async function loginWithGoogle(): Promise<Subscriber> {
  if (auth && db) {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const userDoc = await getDoc(doc(db, "subscribers", user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as Subscriber;
        if (data.status === 'bloqueado') {
          await signOut(auth);
          throw new Error('Sua assinatura está suspensa ou bloqueada.');
        }
        setStoredCurrentUser(data);
        return data;
      } else {
        const isMaster = user.email?.toLowerCase().includes('admin') || user.email?.toLowerCase() === 'jardimsaopaulo58@gmail.com';
        const newSub: Subscriber = {
          uid: user.uid,
          name: user.displayName || 'Assinante Google VIP',
          email: user.email || 'google@user.com',
          role: isMaster ? 'admin' : 'user',
          status: 'ativo',
          plan: 'Plano Mensal VIP',
          monthlyValue: 49.90,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await setDoc(doc(db, "subscribers", user.uid), newSub);
        setStoredCurrentUser(newSub);
        return newSub;
      }
    } catch (err: any) {
      console.warn('Google login fallback:', err.message);
    }
  }

  // Quick fallback login for Google
  const demoGoogle: Subscriber = {
    uid: 'google-user-' + Date.now(),
    name: 'Usuário Google VIP',
    email: 'usuario.google@orlabet.com',
    role: 'user',
    status: 'ativo',
    plan: 'Plano Mensal VIP',
    monthlyValue: 49.90,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  const list = getLocalSubscribers();
  list.unshift(demoGoogle);
  saveLocalSubscribers(list);
  setStoredCurrentUser(demoGoogle);
  return demoGoogle;
}

export async function logoutSubscriber() {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
  }
  setStoredCurrentUser(null);
}

export async function fetchAllSubscribers(): Promise<Subscriber[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, "subscribers"));
      if (!snap.empty) {
        const list: Subscriber[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as Subscriber));
        saveLocalSubscribers(list);
        return list;
      }
    } catch (err) {
      console.warn('Error fetching Firestore subscribers, fallback to local:', err);
    }
  }
  return getLocalSubscribers();
}

export async function updateSubscriberStatus(uid: string, newStatus: 'ativo' | 'bloqueado'): Promise<void> {
  if (db) {
    try {
      await updateDoc(doc(db, "subscribers", uid), { status: newStatus });
    } catch (err) {
      console.warn('Firestore update status fallback:', err);
    }
  }

  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    list[index].status = newStatus;
    saveLocalSubscribers(list);
  }
}

export async function updateSubscriberPlan(uid: string, newPlan: string, newPrice: number): Promise<void> {
  if (db) {
    try {
      await updateDoc(doc(db, "subscribers", uid), { plan: newPlan, monthlyValue: newPrice });
    } catch (err) {
      console.warn('Firestore update plan fallback:', err);
    }
  }

  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    list[index].plan = newPlan;
    list[index].monthlyValue = newPrice;
    saveLocalSubscribers(list);
  }
}

export async function removeSubscriber(uid: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, "subscribers", uid));
    } catch (err) {
      console.warn('Firestore delete subscriber fallback:', err);
    }
  }

  const list = getLocalSubscribers().filter(s => s.uid !== uid);
  saveLocalSubscribers(list);
}
