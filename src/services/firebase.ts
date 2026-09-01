import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { Subscriber, UserStatus } from '../types';

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
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  if (app) {
    try { dbInstance = getFirestore(app); } catch (err) { console.warn('Firebase init fallback:', err); }
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

export const MASTER_ADMIN_PASSCODE = "ORLA@MASTER#2026";
export const MASTER_ADMIN_EMAIL = "jardimsaopaulo58@gmail.com";
export const ADMIN_WHATSAPP_NUMBER = "5511914420576";
export const ADMIN_WHATSAPP_DISPLAY = "(11) 91442-0576";
export const DEFAULT_TRIAL_HOURS = 24; // 24 horas de teste gratuito

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  pixMessage: string;
}

// PLANO ÚNICO
export const SUBSCRIPTION_PLANS: SubscriptionTier[] = [
  {
    id: 'avancado',
    name: 'Plano Avançado',
    price: 9.90,
    formattedPrice: 'R$ 9,90',
    period: 'Mensal',
    description: 'Acesso completo à inteligência da ZAP BET IA para análises, relatórios e comparações.',
    features: [
      'Análises táticas e comparação de times',
      'Interpretação de odds e estatísticas',
      'Relatórios profissionais organizados',
      'Perguntas gerais para a IA',
      'Todos os recursos atuais e futuras melhorias'
    ],
    popular: true,
    pixMessage: 'Olá! Fiz o PIX do Plano Avançado da ZAP BET IA no valor de R$ 9,90 e quero liberar meu acesso!'
  }
];

export function getWhatsAppPaymentLink(planName: string, price: string, userName?: string): string {
  const cleanPhone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
  const greeting = userName ? `Olá! Sou ${userName}. ` : 'Olá! ';
  const message = `${greeting}Fiz o PIX do ${planName} no valor de ${price}, quero liberar meu acesso na ZAP BET IA!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppSupportLink(customMsg?: string): string {
  const cleanPhone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
  const msg = customMsg || 'Olá! Gostaria de tirar dúvidas sobre os planos e funcionalidades da ZAP BET IA.';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

const LOCAL_STORAGE_SUBSCRIBERS_KEY = 'zapbet_subscribers_v1';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'zapbet_current_user_v1';

const now = new Date();
const trialEndTime = new Date(now.getTime() + DEFAULT_TRIAL_HOURS * 60 * 60 * 1000).toISOString();

const INITIAL_DEMO_SUBSCRIBERS: Subscriber[] = [
  {
    uid: 'admin-master-001',
    name: 'Administrador Master',
    email: MASTER_ADMIN_EMAIL,
    role: 'admin',
    status: 'ativo',
    plan: 'Plano Avançado',
    monthlyValue: 9.90,
    phone: '(11) 99887-1122',
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: new Date().toISOString()
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
  try { localStorage.setItem(LOCAL_STORAGE_SUBSCRIBERS_KEY, JSON.stringify(list)); } catch (e) {}
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
    if (sub) localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(sub));
    else localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  } catch (e) {}
}

export function checkAndUpdateUserTrial(user: Subscriber): Subscriber {
  if (user.role === 'admin') return user;
  if (user.status === 'teste' && user.trialEndsAt) {
    const expiresAt = new Date(user.trialEndsAt).getTime();
    if (Date.now() >= expiresAt) {
      user.status = 'teste_expirado';
      updateSubscriberStatus(user.uid, 'teste_expirado');
      setStoredCurrentUser(user);
    }
  }
  return user;
}

export function getRemainingTrialHours(user: Subscriber): number {
  if (user.role === 'admin' || user.status === 'ativo') return Infinity;
  if (!user.trialEndsAt) return 0;
  const diff = Math.max(0, Math.floor((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60)));
  return diff;
}

export async function loginMasterAdmin(passcode: string): Promise<Subscriber> {
  if (passcode.trim() !== MASTER_ADMIN_PASSCODE) throw new Error('Senha administrativa inválida.');
  const adminUser: Subscriber = {
    uid: 'master-admin-jardim', name: 'Administrador Master', email: MASTER_ADMIN_EMAIL, role: 'admin',
    status: 'ativo', plan: 'Plano Avançado', monthlyValue: 9.90, phone: '(11) 99887-1122',
    createdAt: '2025-01-01T00:00:00Z', lastLogin: new Date().toISOString()
  };
  if (db) { try { await setDoc(doc(db, "subscribers", adminUser.uid), adminUser, { merge: true }); } catch (e) {} }
  const currentList = getLocalSubscribers();
  const existingIdx = currentList.findIndex(s => s.uid === adminUser.uid || s.email === adminUser.email);
  if (existingIdx >= 0) currentList[existingIdx] = adminUser; else currentList.unshift(adminUser);
  saveLocalSubscribers(currentList);
  setStoredCurrentUser(adminUser);
  return adminUser;
}

export async function registerSubscriber(email: string, pass: string, name: string, phone = ''): Promise<Subscriber> {
  const planObj = SUBSCRIPTION_PLANS[0];
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_HOURS * 60 * 60 * 1000);
  const cleanEmailId = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  let finalUid = `user_${cleanEmailId}_${Date.now().toString(36)}`;

  if (auth) {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res?.user?.uid) finalUid = res.user.uid;
    } catch (err: any) { console.warn('Firebase Auth fallback:', err.message); }
  }

  const newSubscriber: Subscriber = {
    uid: finalUid, name: name.trim() || 'Assinante', email: email.toLowerCase().trim(), role: 'user',
    status: 'teste', plan: planObj.name, monthlyValue: planObj.price, phone: phone || undefined,
    createdAt: trialStart.toISOString(), lastLogin: trialStart.toISOString(),
    trialStartedAt: trialStart.toISOString(), trialEndsAt: trialEnd.toISOString(), isTrial: true
  };

  if (db) { try { await setDoc(doc(db, "subscribers", finalUid), newSubscriber, { merge: true }); } catch (e) {} }
  const currentList = getLocalSubscribers();
  const existingIdx = currentList.findIndex(s => s.email.toLowerCase() === newSubscriber.email.toLowerCase() || s.uid === newSubscriber.uid);
  if (existingIdx >= 0) currentList[existingIdx] = newSubscriber; else currentList.unshift(newSubscriber);
  saveLocalSubscribers(currentList);
  setStoredCurrentUser(newSubscriber);
  return newSubscriber;
}

export async function loginSubscriber(email: string, pass: string): Promise<Subscriber> {
  const normEmail = email.toLowerCase().trim();
  if (db) {
    try {
      const snap = await getDocs(collection(db, "subscribers"));
      let matchedDoc: Subscriber | null = null;
      snap.forEach(d => {
        const data = d.data() as Subscriber;
        if (data.email && data.email.toLowerCase().trim() === normEmail) matchedDoc = data;
      });
      if (matchedDoc) {
        const checked = checkAndUpdateUserTrial(matchedDoc);
        if (checked.status === 'bloqueado') throw new Error('Conta bloqueada. Fale com o admin no WhatsApp.');
        checked.lastLogin = new Date().toISOString();
        try { await updateDoc(doc(db, "subscribers", checked.uid), { lastLogin: checked.lastLogin }); } catch (e) {}
        setStoredCurrentUser(checked);
        return checked;
      }
    } catch (err: any) { if (err.message.includes('bloqueada')) throw err; }
  }

  const localList = getLocalSubscribers();
  let found = localList.find(s => s.email.toLowerCase() === normEmail);
  if (!found) {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_HOURS * 60 * 60 * 1000);
    const planObj = SUBSCRIPTION_PLANS[0];
    found = {
      uid: `user_${Date.now().toString(36)}`, name: normEmail.split('@')[0], email: normEmail, role: 'user',
      status: 'teste', plan: planObj.name, monthlyValue: planObj.price,
      createdAt: trialStart.toISOString(), lastLogin: trialStart.toISOString(),
      trialStartedAt: trialStart.toISOString(), trialEndsAt: trialEnd.toISOString(), isTrial: true
    };
    localList.unshift(found);
    saveLocalSubscribers(localList);
    if (db) { try { await setDoc(doc(db, "subscribers", found.uid), found, { merge: true }); } catch (e) {} }
  }

  const checked = checkAndUpdateUserTrial(found);
  if (checked.status === 'bloqueado') throw new Error('Conta bloqueada. Entre em contato com o suporte.');
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
      const normEmail = (user.email || '').toLowerCase().trim();
      let userDoc = await getDoc(doc(db, "subscribers", user.uid));
      let data: Subscriber | null = userDoc.exists() ? (userDoc.data() as Subscriber) : null;

      if (!data && normEmail) {
        const snap = await getDocs(collection(db, "subscribers"));
        snap.forEach(d => {
          const item = d.data() as Subscriber;
          if (item.email && item.email.toLowerCase().trim() === normEmail) data = item;
        });
      }

      if (data) {
        const checked = checkAndUpdateUserTrial(data);
        if (checked.status === 'bloqueado') { await signOut(auth); throw new Error('Conta bloqueada.'); }
        checked.lastLogin = new Date().toISOString();
        try { await updateDoc(doc(db, "subscribers", checked.uid), { lastLogin: checked.lastLogin }); } catch (e) {}
        setStoredCurrentUser(checked);
        return checked;
      } else {
        const trialStart = new Date();
        const trialEnd = new Date(trialStart.getTime() + DEFAULT_TRIAL_HOURS * 60 * 60 * 1000);
        const planObj = SUBSCRIPTION_PLANS[0];
        const newSub: Subscriber = {
          uid: user.uid, name: user.displayName || 'Usuário Google', email: normEmail || 'google@user.com', role: 'user',
          status: 'teste', plan: planObj.name, monthlyValue: planObj.price,
          createdAt: trialStart.toISOString(), lastLogin: trialStart.toISOString(),
          trialStartedAt: trialStart.toISOString(), trialEndsAt: trialEnd.toISOString(), isTrial: true
        };
        await setDoc(doc(db, "subscribers", user.uid), newSub, { merge: true });
        const localList = getLocalSubscribers();
        const idx = localList.findIndex(s => s.email.toLowerCase() === normEmail);
        if (idx >= 0) localList[idx] = newSub; else localList.unshift(newSub);
        saveLocalSubscribers(localList);
        setStoredCurrentUser(newSub);
        return newSub;
      }
    } catch (err: any) { if (err.message.includes('bloqueada')) throw err; }
  }
  throw new Error('Falha na autenticação Google.');
}

export async function logoutSubscriber() {
  if (auth) { try { await signOut(auth); } catch (e) {} }
  setStoredCurrentUser(null);
}

export function subscribeToSubscribers(onUpdate: (list: Subscriber[]) => void): () => void {
  if (db) {
    try {
      const unsub = onSnapshot(collection(db, "subscribers"), (snapshot) => {
        if (!snapshot.empty) {
          const list: Subscriber[] = [];
          snapshot.forEach(docSnap => list.push(checkAndUpdateUserTrial(docSnap.data() as Subscriber)));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          saveLocalSubscribers(list);
          onUpdate(list);
        } else {
          const local = getLocalSubscribers();
          local.forEach(async (sub) => { try { if (db) await setDoc(doc(db, "subscribers", sub.uid), sub, { merge: true }); } catch (e) {} });
          onUpdate(local);
        }
      }, () => onUpdate(getLocalSubscribers()));
      return unsub;
    } catch (err) {}
  }
  onUpdate(getLocalSubscribers());
  return () => {};
}

export async function fetchAllSubscribers(): Promise<Subscriber[]> {
  if (db) {
    try {
      const snap = await getDocs(collection(db, "subscribers"));
      if (!snap.empty) {
        const list: Subscriber[] = [];
        snap.forEach(docSnap => list.push(checkAndUpdateUserTrial(docSnap.data() as Subscriber)));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        saveLocalSubscribers(list);
        return list;
      }
    } catch (err) {}
  }
  return getLocalSubscribers();
}

export async function updateSubscriberStatus(uid: string, newStatus: UserStatus): Promise<void> {
  if (db) { try { await updateDoc(doc(db, "subscribers", uid), { status: newStatus }); } catch (err) {} }
  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    list[index].status = newStatus;
    saveLocalSubscribers(list);
    const current = getStoredCurrentUser();
    if (current && current.uid === uid) { current.status = newStatus; setStoredCurrentUser(current); }
  }
}

export async function blockSubscriberNoPayment(uid: string): Promise<void> {
  const updates = { status: 'bloqueado' as UserStatus, isTrial: false };
  if (db) { try { await updateDoc(doc(db, "subscribers", uid), updates); } catch (err) {} }
  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    list[index] = { ...list[index], ...updates };
    saveLocalSubscribers(list);
    const current = getStoredCurrentUser();
    if (current && current.uid === uid) setStoredCurrentUser(list[index]);
  }
}

export async function activateSubscriberPayment(uid: string, planName = 'Plano Avançado', monthlyValue = 9.90): Promise<void> {
  const updates = { status: 'ativo' as UserStatus, plan: planName, monthlyValue, isTrial: false, trialEndsAt: undefined };
  if (db) { try { await updateDoc(doc(db, "subscribers", uid), updates); } catch (err) {} }
  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    list[index] = { ...list[index], ...updates };
    saveLocalSubscribers(list);
    const current = getStoredCurrentUser();
    if (current && current.uid === uid) setStoredCurrentUser(list[index]);
  }
}

export async function extendSubscriberTrial(uid: string, extraHours = 24): Promise<void> {
  const list = getLocalSubscribers();
  const index = list.findIndex(s => s.uid === uid);
  if (index >= 0) {
    const sub = list[index];
    const currentEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : Date.now();
    const newEnd = new Date(Math.max(Date.now(), currentEnd) + extraHours * 60 * 60 * 1000).toISOString();
    sub.trialEndsAt = newEnd; sub.status = 'teste'; sub.isTrial = true;
    list[index] = sub;
    saveLocalSubscribers(list);
    if (db) { try { await updateDoc(doc(db, "subscribers", uid), { trialEndsAt: newEnd, status: 'teste', isTrial: true }); } catch (e) {} }
    const current = getStoredCurrentUser();
    if (current && current.uid === uid) setStoredCurrentUser(sub);
  }
}

export async function removeSubscriber(uid: string): Promise<void> {
  if (db) { try { await deleteDoc(doc(db, "subscribers", uid)); } catch (err) {} }
  const list = getLocalSubscribers().filter(s => s.uid !== uid);
  saveLocalSubscribers(list);
}

export function getClientWhatsAppDirectLink(phone: string, clientName: string, planName: string, price: number, type: 'cobrar' | 'liberado' = 'cobrar'): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const message = type === 'liberado' 
    ? `Olá ${clientName}! Seu acesso ao ${planName} na ZAP BET IA foi liberado com sucesso!`
    : `Olá ${clientName}! Seu teste na ZAP BET IA foi finalizado. Para continuar com o ${planName} (R$ ${price.toFixed(2)}/mês), faça o PIX e envie o comprovante.`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}