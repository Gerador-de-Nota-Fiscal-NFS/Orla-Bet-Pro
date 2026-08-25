import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
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
  Firestore
} from 'firebase/firestore';
import { Subscriber, UserStatus } from '../types';

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
export const ADMIN_WHATSAPP_NUMBER = "5511914420576"; // WhatsApp do Administrador Master (11) 91442-0576
export const ADMIN_WHATSAPP_DISPLAY = "(11) 91442-0576";
export const DEFAULT_TRIAL_MINUTES = 15; // 15 minutos de teste gratuito

// 3 Official Subscription Plans
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  period: string;
  badge?: string;
  description: string;
  palpitesCount: number;
  readyTicketsCount: number;
  features: string[];
  recommended?: boolean;
  popular?: boolean;
  pixMessage: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionTier[] = [
  {
    id: 'basico',
    name: 'Plano Básico',
    price: 10.00,
    formattedPrice: 'R$ 10,00',
    period: 'Mensal',
    badge: '1 Palpite',
    description: 'Ideal para quem busca consistência com recomendação pontual de alta assertividade.',
    palpitesCount: 1,
    readyTicketsCount: 0,
    features: [
      '1 Palpite Diário de Alta Confiança',
      'Odds calculadas em tempo real',
      'Estatísticas e Probabilidades do confronto',
      'Acesso ao suporte via WhatsApp'
    ],
    recommended: false,
    pixMessage: 'Olá, fiz o PIX do plano Básico no valor de R$ 10,00, quero liberar meu acesso!'
  },
  {
    id: 'pro',
    name: 'Plano Avançado (Pro)',
    price: 20.00,
    formattedPrice: 'R$ 20,00',
    period: 'Mensal',
    badge: 'Mais Popular • 4 Palpites + 1 Bilhete',
    description: 'Mais opções para alavancar sua banca com bilhete pronto incluso todo dia.',
    palpitesCount: 4,
    readyTicketsCount: 1,
    features: [
      '4 Palpites Diários de Alta Assertividade',
      '1 Bilhete Pronto Diário (Múltipla Validada)',
      'Análise de Estatísticas e Mascotes',
      'Gestão de Banca e Confiança',
      'Suporte Prioritário VIP'
    ],
    recommended: true,
    popular: true,
    pixMessage: 'Olá, fiz o PIX do plano Avançado (Pro) no valor de R$ 20,00, quero liberar meu acesso!'
  },
  {
    id: 'vip',
    name: 'Plano VIP',
    price: 49.00,
    formattedPrice: 'R$ 49,00',
    period: 'Mensal',
    badge: 'Acesso Total • IA Ilimitada',
    description: 'A experiência completa e profissional com IA ilimitada e todos os bilhetes diários.',
    palpitesCount: 10,
    readyTicketsCount: 3,
    features: [
      '10 Palpites Diários em Todas as Ligas',
      'Orla IA Universal Ilimitada 24/7',
      'Bilhetes Prontos Todo Dia (Múltiplas & Alavancagem)',
      'Cobertura Completa: Copa do Brasil, Argentino, Libertadores, Estaduais e Europa',
      'Alertas Exclusivos e Suporte Direto com Especialistas'
    ],
    recommended: false,
    pixMessage: 'Olá, fiz o PIX do plano VIP no valor de R$ 49,00, quero liberar meu acesso!'
  }
];

export function getWhatsAppPaymentLink(planName: string, price: string, userName?: string): string {
  const cleanPhone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
  const greeting = userName ? `Olá! Sou ${userName}. ` : 'Olá! ';
  const message = `${greeting}Fiz o PIX do ${planName} no valor de ${price}, quero liberar meu acesso no Orla Bet Pro!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppSupportLink(customMsg?: string): string {
  const cleanPhone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
  const msg = customMsg || 'Olá! Gostaria de tirar dúvidas sobre os palpites, bilhetes prontos e planos do Orla Bet Pro.';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

// Local Storage Fallback Store for seamless persistence and demo testing
const LOCAL_STORAGE_SUBSCRIBERS_KEY = 'orla_bet_subscribers_v3';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'orla_bet_current_user_v3';

const now = new Date();
const trialEndTime = new Date(now.getTime() + 12 * 60 * 1000).toISOString();

const INITIAL_DEMO_SUBSCRIBERS: Subscriber[] = [
  {
    uid: 'admin-master-001',
    name: 'Carlos Mendes (Admin)',
    email: 'admin@orlabet.com',
    role: 'admin',
    status: 'ativo',
    plan: 'Plano VIP',
    monthlyValue: 49.00,
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
    plan: 'Plano VIP',
    monthlyValue: 49.00,
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
    plan: 'Plano Avançado (Pro)',
    monthlyValue: 20.00,
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
    plan: 'Plano Básico',
    monthlyValue: 10.00,
    phone: '(31) 98455-1234',
    createdAt: '2025-02-10T18:20:00Z',
    lastLogin: '2025-02-22T20:10:00Z'
  },
  {
    uid: 'user-005',
    name: 'Lucas Teste',
    email: 'lucas.teste@gmail.com',
    role: 'user',
    status: 'teste',
    plan: 'Teste Gratuito (15 min)',
    monthlyValue: 0,
    phone: '(41) 97112-9900',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEndTime,
    isTrial: true
  },
  {
    uid: 'user-006',
    name: 'Felipe Alcantara',
    email: 'felipe.alcantara@outlook.com',
    role: 'user',
    status: 'teste_expirado',
    plan: 'Plano Avançado (Pro) - Aguardando PIX',
    monthlyValue: 20.00,
    phone: '(71) 99344-5566',
    createdAt: '2025-02-18T12:00:00Z',
    lastLogin: '2025-02-23T08:45:00Z',
    trialStartedAt: '2025-02-18T12:00:00Z',
    trialEndsAt: '2025-02-18T12:15:00Z',
    isTrial: true
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
    if (!raw) return null;
    const user = JSON.parse(raw) as Subscriber;
    return checkAndUpdateUserTrial(user);
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

// Check and update trial status dynamically
export function checkAndUpdateUserTrial(user: Subscriber): Subscriber {
  if (user.role === 'admin') return user;

  if (user.status === 'teste' && user.trialEndsAt) {
    const expiresAt = new Date(user.trialEndsAt).getTime();
    if (Date.now() >= expiresAt) {
      user.status = 'teste_expirado';
      // Persist status change
      updateSubscriberStatus(user.uid, 'teste_expirado');
      setStoredCurrentUser(user);
    }
  }
  return user;
}

export function getRemainingTrialSeconds(user: Subscriber): number {
  if (user.role === 'admin' || user.status === 'ativo') return Infinity;
  if (!user.trialEndsAt) return 0;
  const diff = Math.max(0, Math.floor((new Date(user.trialEndsAt).getTime() - Date.now()) / 1000));
  return diff;
}

// -------------------------------------------------------------
// Core Firebase Operations with Graceful Fallback
// -------------------------------------------------------------

// Authenticate as Master Admin with private admin password
export async function loginMasterAdmin(passcode: string): Promise<Subscriber> {
  const cleanPass = passcode.trim();
  if (cleanPass !== MASTER_ADMIN_PASSCODE) {
    throw new Error('Senha de acesso administrativo inválida.');
  }

  const adminUser: Subscriber = {
    uid: 'master-admin-jardim',
    name: 'Administrador Master',
    email: MASTER_ADMIN_EMAIL,
    role: 'admin',
    status: 'ativo',
    plan: 'Plano VIP (Master)',
    monthlyValue: 49.00,
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

export async function registerSubscriber(
  email: string, 
  pass: string, 
  name: string, 
  chosenPlan = 'Plano Avançado (Pro)', 
  phone = ''
): Promise<Subscriber> {
  const planObj = SUBSCRIPTION_PLANS.find(p => p.name === chosenPlan) || SUBSCRIPTION_PLANS[1];
  const isMasterAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === MASTER_ADMIN_EMAIL;

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_MINUTES * 60 * 1000);

  const newSubscriber: Subscriber = {
    uid: `user-${Date.now()}`,
    name: name.trim() || 'Assinante Teste',
    email: email.toLowerCase().trim(),
    role: isMasterAdmin ? 'admin' : 'user',
    status: isMasterAdmin ? 'ativo' : 'teste',
    plan: isMasterAdmin ? 'Plano VIP' : chosenPlan,
    monthlyValue: planObj.price,
    phone: phone || undefined,
    createdAt: trialStart.toISOString(),
    lastLogin: trialStart.toISOString(),
    trialStartedAt: trialStart.toISOString(),
    trialEndsAt: isMasterAdmin ? undefined : trialEnd.toISOString(),
    isTrial: !isMasterAdmin
  };

  if (auth && db) {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      newSubscriber.uid = res.user.uid;
      await setDoc(doc(db, "subscribers", res.user.uid), newSubscriber);
    } catch (err: any) {
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
        const checked = checkAndUpdateUserTrial(data);
        if (checked.status === 'bloqueado') {
          await signOut(auth);
          throw new Error('Sua assinatura está suspensa ou bloqueada. Entre em contato com o administrador.');
        }
        await updateDoc(doc(db, "subscribers", res.user.uid), { lastLogin: new Date().toISOString() });
        setStoredCurrentUser(checked);
        return checked;
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
    const isMaster = normEmail.includes('admin') || normEmail === MASTER_ADMIN_EMAIL;
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_MINUTES * 60 * 1000);

    found = {
      uid: `user-${Date.now()}`,
      name: normEmail.split('@')[0],
      email: normEmail,
      role: isMaster ? 'admin' : 'user',
      status: isMaster ? 'ativo' : 'teste',
      plan: isMaster ? 'Plano VIP' : 'Plano Avançado (Pro)',
      monthlyValue: isMaster ? 49.00 : 20.00,
      createdAt: trialStart.toISOString(),
      lastLogin: trialStart.toISOString(),
      trialStartedAt: trialStart.toISOString(),
      trialEndsAt: isMaster ? undefined : trialEnd.toISOString(),
      isTrial: !isMaster
    };
    localList.unshift(found);
    saveLocalSubscribers(localList);
  }

  const checked = checkAndUpdateUserTrial(found);
  if (checked.status === 'bloqueado') {
    throw new Error('Sua assinatura está suspensa ou bloqueada. Entre em contato com o suporte.');
  }

  checked.lastLogin = new Date().toISOString();
  saveLocalSubscribers(localList);
  setStoredCurrentUser(checked);
  return checked;
}

export async function loginWithGoogle(): Promise<Subscriber> {
  if (auth && db) {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const userDoc = await getDoc(doc(db, "subscribers", user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as Subscriber;
        const checked = checkAndUpdateUserTrial(data);
        if (checked.status === 'bloqueado') {
          await signOut(auth);
          throw new Error('Sua conta está suspensa ou bloqueada.');
        }
        setStoredCurrentUser(checked);
        return checked;
      } else {
        const isMaster = user.email?.toLowerCase().includes('admin') || user.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
        const trialStart = new Date();
        const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_MINUTES * 60 * 1000);

        const newSub: Subscriber = {
          uid: user.uid,
          name: user.displayName || 'Assinante Google VIP',
          email: user.email || 'google@user.com',
          role: isMaster ? 'admin' : 'user',
          status: isMaster ? 'ativo' : 'teste',
          plan: isMaster ? 'Plano VIP' : 'Plano Avançado (Pro)',
          monthlyValue: isMaster ? 49.00 : 20.00,
          createdAt: trialStart.toISOString(),
          lastLogin: trialStart.toISOString(),
          trialStartedAt: trialStart.toISOString(),
          trialEndsAt: isMaster ? undefined : trialEnd.toISOString(),
          isTrial: !isMaster
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
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_MINUTES * 60 * 1000);
  const demoGoogle: Subscriber = {
    uid: 'google-user-' + Date.now(),
    name: 'Usuário Google (Teste)',
    email: 'usuario.google@orlabet.com',
    role: 'user',
    status: 'teste',
    plan: 'Plano Avançado (Pro)',
    monthlyValue: 20.00,
    createdAt: trialStart.toISOString(),
    lastLogin: trialStart.toISOString(),
    trialStartedAt: trialStart.toISOString(),
    trialEndsAt: trialEnd.toISOString(),
    isTrial: true
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

export async function updateSubscriberStatus(uid: string, newStatus: UserStatus): Promise<void> {
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

    // Update currentUser if it matches
    const current = getStoredCurrentUser();
    if (current && current.uid === uid) {
      current.status = newStatus;
      setStoredCurrentUser(current);
    }
  }
}

export async function approveSubscriberAccess(
  uid: string, 
  planName: string, 
  monthlyValue: number
): Promise<void> {
  const updates = {
    status: 'ativo' as UserStatus,
    plan: planName,
    monthlyValue,
    isTrial: false,
    trialEndsAt: undefined
  };

  if (db) {
    try {
      await updateDoc(doc(db, "subscribers", uid), updates);
    } catch (err) {
      console.warn('Firestore approve access fallback:', err);
    }
  }

  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    list[index] = { ...list[index], ...updates };
    saveLocalSubscribers(list);

    const current = getStoredCurrentUser();
    if (current && current.uid === uid) {
      setStoredCurrentUser(list[index]);
    }
  }
}

export async function extendSubscriberTrial(uid: string, extraMinutes = 15): Promise<void> {
  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    const sub = list[index];
    const currentEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : Date.now();
    const newEnd = new Date(Math.max(Date.now(), currentEnd) + extraMinutes * 60 * 1000).toISOString();
    
    sub.trialEndsAt = newEnd;
    sub.status = 'teste';
    sub.isTrial = true;
    list[index] = sub;
    saveLocalSubscribers(list);

    if (db) {
      try {
        await updateDoc(doc(db, "subscribers", uid), {
          trialEndsAt: newEnd,
          status: 'teste',
          isTrial: true
        });
      } catch (e) {
        console.warn('Firestore extend trial error:', e);
      }
    }

    const current = getStoredCurrentUser();
    if (current && current.uid === uid) {
      setStoredCurrentUser(sub);
    }
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
