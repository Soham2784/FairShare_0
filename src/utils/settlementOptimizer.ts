import { Balance, Settlement, User } from '@/types';

/**
 * Smart settlement algorithm that minimizes the number of transactions
 * Uses a graph-based approach to optimize debt settlements
 */
export class SettlementOptimizer {
  /**
   * Calculate optimized settlements from balances
   * @param balances Array of user balances (positive = owed, negative = owes)
   * @param users Array of users for reference
   * @returns Array of optimized settlements
   */
  static optimizeSettlements(balances: Balance[], users: User[]): Settlement[] {
    const settlements: Settlement[] = [];
    
    // Filter out zero balances and sort
    const activeBalances = balances
      .filter(balance => Math.abs(balance.amount) > 0.01)
      .sort((a, b) => b.amount - a.amount);
    
    if (activeBalances.length <= 1) return settlements;
    
    // Create debtors (negative balance) and creditors (positive balance)
    const creditors = activeBalances.filter(b => b.amount > 0);
    const debtors = activeBalances.filter(b => b.amount < 0);
    
    // Create working copies
    const workingCreditors = creditors.map(c => ({ ...c }));
    const workingDebtors = debtors.map(d => ({ ...d, amount: Math.abs(d.amount) }));
    
    // Optimize settlements using greedy approach
    while (workingCreditors.length > 0 && workingDebtors.length > 0) {
      // Sort by amount (largest first)
      workingCreditors.sort((a, b) => b.amount - a.amount);
      workingDebtors.sort((a, b) => b.amount - a.amount);
      
      const creditor = workingCreditors[0];
      const debtor = workingDebtors[0];
      
      // Calculate settlement amount
      const settlementAmount = Math.min(creditor.amount, debtor.amount);
      
      // Create settlement
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(settlementAmount * 100) / 100 // Round to 2 decimal places
      });
      
      // Update balances
      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;
      
      // Remove settled parties
      if (creditor.amount <= 0.01) {
        workingCreditors.shift();
      }
      if (debtor.amount <= 0.01) {
        workingDebtors.shift();
      }
    }
    
    return settlements;
  }
  
  /**
   * Calculate balances from expenses
   * @param expenses Array of expenses
   * @param userIds Array of user IDs in the group
   * @returns Array of calculated balances
   */
  static calculateBalances(expenses: any[], userIds: string[]): Balance[] {
    const balanceMap: { [userId: string]: number } = {};
    
    // Initialize all users with zero balance
    userIds.forEach(userId => {
      balanceMap[userId] = 0;
    });
    
    // Process each expense
    expenses.forEach(expense => {
      // Skip expenses with no splits or invalid data
      if (!expense.splitBetween || expense.splitBetween.length === 0) {
        console.warn(`Expense ${expense.id} has no splits, skipping`);
        return;
      }
      
      if (!expense.amount || expense.amount <= 0) {
        console.warn(`Expense ${expense.id} has invalid amount, skipping`);
        return;
      }
      
      const splitAmount = expense.amount / expense.splitBetween.length;
      
      // Add to payer's balance (they are owed the full amount)
      balanceMap[expense.paidBy] += expense.amount;
      
      // Subtract from each participant's balance (they owe their share)
      expense.splitBetween.forEach((userId: string) => {
        if (balanceMap.hasOwnProperty(userId)) {
          balanceMap[userId] -= splitAmount;
        }
      });
    });
    
    // Convert to Balance array
    return Object.entries(balanceMap).map(([userId, amount]) => ({
      userId,
      amount: Math.round(amount * 100) / 100
    }));
  }
  
  /**
   * Get settlement summary for display
   * @param settlements Array of settlements
   * @param users Array of users for name lookup
   * @returns Formatted settlement descriptions
   */
  static getSettlementSummary(settlements: Settlement[], users: User[]): string[] {
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    return settlements.map(settlement => {
      const fromName = userMap.get(settlement.from) || 'Unknown';
      const toName = userMap.get(settlement.to) || 'Unknown';
      return `${fromName} pays ${toName} $${settlement.amount.toFixed(2)}`;
    });
  }
  
  /**
   * Calculate total number of transactions needed
   * @param balances Array of balances
   * @returns Number of transactions required for settlement
   */
  static getTransactionCount(balances: Balance[]): number {
    const activeBalances = balances.filter(b => Math.abs(b.amount) > 0.01);
    return Math.max(0, activeBalances.length - 1);
  }
}