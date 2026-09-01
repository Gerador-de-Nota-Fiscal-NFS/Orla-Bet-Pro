export type UserStatus = 'ativo' | 'bloqueado' | 'teste' | 'teste_expirado';

export interface Subscriber {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: UserStatus;
  plan: string;
  monthlyValue: number;
  phone?: string;
  createdAt: string;
  lastLogin?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isTrial?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}