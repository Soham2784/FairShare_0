import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trash2, Receipt, Calendar, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label as UiLabel } from '@/components/ui/label';
import { Expense, User } from '@/types';
import { format } from 'date-fns';

interface ExpenseListProps {
  expenses: Expense[];
  members: User[];
  onDeleteExpense?: (expenseId: string) => void;
  currentUserId?: string;
  formatAmount?: (amountUsd: number) => string;
  hideLocalCurrencyToggle?: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  members,
  onDeleteExpense,
  currentUserId,
  formatAmount,
  hideLocalCurrencyToggle
}) => {
  const memberMap = new Map(members.map(m => [m.id, m]));

  const getCategoryIcon = (category: string) => {
    const icons = {
      food: '🍽️',
      transport: '🚗',
      accommodation: '🏨',
      entertainment: '🎭',
      shopping: '🛍️',
      other: '📝'
    };
    return icons[category as keyof typeof icons] || '📝';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      food: 'bg-orange-100 text-orange-800 border-orange-200',
      transport: 'bg-blue-100 text-blue-800 border-blue-200',
      accommodation: 'bg-purple-100 text-purple-800 border-purple-200',
      entertainment: 'bg-pink-100 text-pink-800 border-pink-200',
      shopping: 'bg-green-100 text-green-800 border-green-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const [showINR, setShowINR] = useState(false);
  const internalFormatAmount = (amountUsd: number) => {
    // Database stores USD, convert to INR for display
    const inr = amountUsd * 83.0;
    return `₹${inr.toFixed(2)}`;
  };
  const effectiveFormat = formatAmount || internalFormatAmount;

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
            <p className="text-muted-foreground">
              Add your first expense to start tracking group spending
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!hideLocalCurrencyToggle && (
        <div className="flex items-center justify-end gap-2">
          <UiLabel htmlFor="toggle-inr" className="text-sm text-muted-foreground">Show in INR</UiLabel>
          <Switch id="toggle-inr" checked={showINR} onCheckedChange={setShowINR} />
        </div>
      )}
      {expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((expense) => {
          const paidByUser = memberMap.get(expense.paidBy);
          const splitPerPerson = expense.splitBetween.length > 0 
            ? expense.amount / expense.splitBetween.length 
            : 0;

          return (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{expense.description}</CardTitle>
                      <CardDescription className="flex items-center space-x-4 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                        </span>
                        <Badge 
                          variant="outline" 
                          className={getCategoryColor(expense.category)}
                        >
                          {expense.category}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {effectiveFormat(expense.amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {expense.splitBetween.length > 0 
                        ? `${effectiveFormat(splitPerPerson)} per person` 
                        : 'Not split'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Paid By */}
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary/10">
                          {paidByUser?.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        Paid by <span className="font-medium">{paidByUser?.name}</span>
                      </span>
                    </div>

                    {/* Split Info */}
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Split {expense.splitBetween.length} ways</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {onDeleteExpense && (currentUserId === expense.paidBy || !currentUserId) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteExpense(expense.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Split Between Details */}
                {expense.splitBetween.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-2">
                      {expense.splitBetween.map((memberId) => {
                        const member = memberMap.get(memberId);
                        if (!member) return null;
                        
                        return (
                          <Badge key={memberId} variant="secondary" className="text-xs">
                            {member.name}: {effectiveFormat(splitPerPerson)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
};

export default ExpenseList;