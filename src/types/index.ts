
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: User[];
  createdAt: Date;
  updatedAt: Date;
  totalExpenses: number;
  currency: string;
  createdBy?: string;
  inviteCode?: string;
  inviteEnabled?: boolean;
  inviteExpiresAt?: Date;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  paidBy: string; // User ID
  splitBetween: string[]; // User IDs
  date: Date;
  createdAt: Date;
  receipt?: string; // Image URL
}

export type ExpenseCategory = 
  | 'food' 
  | 'transport' 
  | 'accommodation' 
  | 'entertainment' 
  | 'shopping' 
  | 'other';

export interface Balance {
  userId: string;
  amount: number; // Positive = owed to them, Negative = they owe
}

export interface Settlement {
  from: string; // User ID
  to: string; // User ID
  amount: number;
}

export interface AITripPrediction {
  totalCost: number;
  perPersonCost: number;
  breakdown: {
    food: number;
    accommodation: number;
    transport: number;
    entertainment: number;
    shopping: number;
    other: number;
  };
  confidence: number;
  recommendations: string[];
}

export interface TripPredictionInput {
  numberOfPeople: number;
  destination: string;
  duration: number; // days
  activities: string[];
  budget?: number;
  demographics: {
    averageAge: number;
    genderMix: 'mixed' | 'male' | 'female';
  };
}
