import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label as UiLabel } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Plus, Users, Receipt, BarChart3, Calendar, Target, TrendingUp, Brain, Globe, Camera, Trophy, Loader2 } from 'lucide-react';
import { Group, Expense, Balance, User } from '@/types';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import SettlementView from './SettlementView';
import BudgetMonitor from './BudgetMonitor';
import AnalyticsDashboard from './AnalyticsDashboard';
import AITripPredictor from './AITripPredictor';
import CurrencyConverter from './CurrencyConverter';
import ReceiptScanner from './ReceiptScanner';
import GamificationSystem from './GamificationSystem';
import { SettlementOptimizer } from '@/utils/settlementOptimizer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface GroupDetailPageProps {
  group: Group;
  onBack: () => void;
  currentUserId?: string;
}

const GroupDetailPage: React.FC<GroupDetailPageProps> = ({
  group,
  onBack,
  currentUserId
}) => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAIPredictor, setShowAIPredictor] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [showINR, setShowINR] = useState(true);
  const usdToInrRate = 83.0;

  const formatAmount = (amountUsd: number) => {
    if (!showINR) return `$${amountUsd.toFixed(2)}`;
    const inr = amountUsd * usdToInrRate;
    return `₹${inr.toFixed(2)}`;
  };

  useEffect(() => {
    fetchExpenses();
  }, [group.id]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // @ts-ignore
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', group.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Fetch expense splits for each expense
      const transformedExpenses: Expense[] = await Promise.all((data || []).map(async (exp: any) => {
        // @ts-ignore
        const { data: splitsData } = await supabase
          .from('expense_splits')
          .select('user_id')
          .eq('expense_id', exp.id);

        return {
          id: exp.id,
          groupId: exp.group_id,
          description: exp.description,
          amount: Number(exp.amount),
          currency: exp.currency,
          category: exp.category,
          paidBy: exp.paid_by,
          splitBetween: splitsData?.map((split: any) => split.user_id) || [],
          date: new Date(exp.date),
          createdAt: new Date(exp.created_at),
          receipt: exp.receipt
        };
      }));

      setExpenses(transformedExpenses);
    } catch (error: any) {
      toast({
        title: "Error loading expenses",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const calculatedBalances = SettlementOptimizer.calculateBalances(
      expenses,
      group.members.map(m => m.id)
    );
    setBalances(calculatedBalances);
  }, [expenses, group.members]);

  const handleAddExpense = async (newExpense: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          group_id: newExpense.groupId,
          description: newExpense.description,
          amount: newExpense.amount,
          currency: newExpense.currency,
          category: newExpense.category,
          paid_by: newExpense.paidBy,
          date: newExpense.date.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      // Add expense splits
      const splitAmount = newExpense.amount / newExpense.splitBetween.length;
      // @ts-ignore
      await supabase
        .from('expense_splits')
        .insert(
          newExpense.splitBetween.map(userId => ({
            expense_id: data.id,
            user_id: userId,
            amount: splitAmount
          }))
        );

      fetchExpenses();
      toast({
        title: "Expense added",
        description: "The expense has been added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      fetchExpenses();
      toast({
        title: "Expense deleted",
        description: "The expense has been removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSettleUp = (settlement: any) => {
    toast({
      title: "Settlement recorded",
      description: `Payment has been marked as completed`,
    });
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const myBalance = balances.find(b => b.userId === currentUserId)?.amount || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="bg-card border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <p className="text-muted-foreground">{group.description}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowExpenseForm(true)}
                className="bg-primary-gradient hover:opacity-90 shadow-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold">{formatAmount(totalExpenses)}</p>
                </div>
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your Balance</p>
                  <p className={`text-2xl font-bold ${myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {myBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(myBalance))}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{group.members.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm font-bold">{format(group.createdAt, 'MMM d, yyyy')}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <UiLabel htmlFor="group-toggle-inr" className="text-sm text-muted-foreground">Show in INR</UiLabel>
            <Switch id="group-toggle-inr" checked={showINR} onCheckedChange={setShowINR} />
          </div>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="achievements">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <ExpenseList
              expenses={expenses}
              members={group.members}
              onDeleteExpense={handleDeleteExpense}
              currentUserId={currentUserId}
              // Use group-level currency formatting
              formatAmount={formatAmount}
              hideLocalCurrencyToggle
            />
          </TabsContent>

          <TabsContent value="settlements">
            <SettlementView
              balances={balances}
              members={group.members}
              onSettleUp={handleSettleUp}
              formatAmount={formatAmount}
            />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetMonitor group={group} expenses={expenses} groupId={group.id} formatAmount={formatAmount} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard group={group} expenses={expenses} formatAmount={formatAmount} />
          </TabsContent>

          <TabsContent value="currency">
            <CurrencyConverter />
          </TabsContent>

          <TabsContent value="achievements">
            <GamificationSystem 
              user={group.members.find(m => m.id === currentUserId) || group.members[0]}
              groups={[group]}
              expenses={expenses}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        onSubmit={handleAddExpense}
        groupId={group.id}
        members={group.members}
        currentUserId={currentUserId}
      />

      {showAIPredictor && (
        <AITripPredictor onClose={() => setShowAIPredictor(false)} />
      )}
    </div>
  );
};

export default GroupDetailPage;
