import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, AlertCircle, Users, IndianRupee } from 'lucide-react';
import { Balance, Settlement, User } from '@/types';
import { SettlementOptimizer } from '@/utils/settlementOptimizer';

interface SettlementViewProps {
  balances: Balance[];
  members: User[];
  onSettleUp?: (settlement: Settlement) => void;
  formatAmount?: (amountUsd: number) => string;
}

const SettlementView: React.FC<SettlementViewProps> = ({
  balances,
  members,
  onSettleUp,
  formatAmount
}) => {
  const memberMap = new Map(members.map(m => [m.id, m]));
  const settlements = SettlementOptimizer.optimizeSettlements(balances, members);
  const transactionCount = SettlementOptimizer.getTransactionCount(balances);
  
  // Check if all balances are settled
  const isAllSettled = balances.every(balance => Math.abs(balance.amount) < 0.01);

  if (isAllSettled) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-green-600">All Settled Up!</h3>
            <p className="text-muted-foreground">
              Everyone's expenses have been balanced. Great job!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settlement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <IndianRupee className="h-5 w-5" />
            <span>Settlement Summary</span>
          </CardTitle>
          <CardDescription>
            Smart optimization reduces {Math.max(0, balances.filter(b => Math.abs(b.amount) > 0.01).length)} 
            potential transactions to just {transactionCount} efficient transfers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{transactionCount}</div>
              <div className="text-sm text-muted-foreground">Transactions Needed</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatAmount ? formatAmount(Math.abs(balances.reduce((sum, b) => sum + (b.amount > 0 ? b.amount : 0), 0))) : `₹${(Math.abs(balances.reduce((sum, b) => sum + (b.amount > 0 ? b.amount : 0), 0)) * 83.0).toFixed(2)}`}
              </div>
              <div className="text-sm text-muted-foreground">Total to Settle</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{settlements.length}</div>
              <div className="text-sm text-muted-foreground">Optimized Transfers</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Individual Balances</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {balances
              .filter(balance => Math.abs(balance.amount) > 0.01)
              .sort((a, b) => b.amount - a.amount)
              .map((balance) => {
                const member = memberMap.get(balance.userId);
                if (!member) return null;

                const isOwed = balance.amount > 0;
                const amount = Math.abs(balance.amount);

                return (
                  <div
                    key={balance.userId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {isOwed ? 'Should receive' : 'Should pay'}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={isOwed ? 'default' : 'destructive'}
                      className={isOwed ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {isOwed ? '+' : '-'}{formatAmount ? formatAmount(amount) : `₹${(amount * 83.0).toFixed(2)}`}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Optimized Settlements */}
      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Recommended Settlements</span>
            </CardTitle>
            <CardDescription>
              Follow these transfers to settle all balances efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settlements.map((settlement, index) => {
                const fromUser = memberMap.get(settlement.from);
                const toUser = memberMap.get(settlement.to);
                
                if (!fromUser || !toUser) return null;

                return (
                  <div
                    key={`${settlement.from}-${settlement.to}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {/* From User */}
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm bg-red-100 text-red-700">
                            {fromUser.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{fromUser.name}</span>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />

                      {/* To User */}
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm bg-green-100 text-green-700">
                            {toUser.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{toUser.name}</span>
                      </div>

                      {/* Amount */}
                      <Badge variant="outline" className="ml-4 font-mono">
                        {formatAmount ? formatAmount(settlement.amount) : `₹${(settlement.amount * 83.0).toFixed(2)}`}
                      </Badge>
                    </div>

                    {/* Settle Button */}
                    {onSettleUp && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettleUp(settlement)}
                        className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettlementView;