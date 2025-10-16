import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Brain,
  DollarSign,
  Lightbulb,
  CheckCircle,
  Mail,
  Bell,
  History
} from 'lucide-react';
import { Group, Expense } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface BudgetMonitorProps {
  group: Group;
  expenses: Expense[];
  groupId: string;
  formatAmount?: (amountUsd: number) => string;
}

interface BudgetAlert {
  type: 'warning' | 'danger' | 'info';
  message: string;
  suggestion?: string;
}

interface BudgetAlertLog {
  id: string;
  alert_type: string;
  percentage_used: number;
  sent_at: string;
  user_email: string;
}

const BudgetMonitor: React.FC<BudgetMonitorProps> = ({ group, expenses, groupId, formatAmount }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [budget, setBudget] = useState<number>(0);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [alertLogs, setAlertLogs] = useState<BudgetAlertLog[]>([]);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [sendingAlert, setSendingAlert] = useState(false);

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetProgress = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const remaining = budget - totalSpent;

  // AI-powered cost-cutting suggestions
  const generateCostCuttingSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    // Analyze spending patterns
    const categorySpending = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const highestCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0];

    if (highestCategory && highestCategory[1] > totalSpent * 0.4) {
      suggestions.push(`Consider reducing ${highestCategory[0]} expenses - they're ${Math.round((highestCategory[1] / totalSpent) * 100)}% of your total`);
    }

    if (categorySpending.food > totalSpent * 0.35) {
      suggestions.push('Try local markets and street food to cut dining costs');
    }

    if (categorySpending.transport > totalSpent * 0.25) {
      suggestions.push('Use public transport or group travel for better rates');
    }

    if (categorySpending.accommodation > totalSpent * 0.4) {
      suggestions.push('Consider hostels or shared accommodations to save on lodging');
    }

    suggestions.push('Look for group discounts and early bird offers');
    suggestions.push('Set daily spending limits to stay on track');

    return suggestions.slice(0, 3);
  };

  const updateAlerts = () => {
    const newAlerts: BudgetAlert[] = [];

    if (budget > 0) {
      if (budgetProgress >= 100) {
        newAlerts.push({
          type: 'danger',
          message: `Budget exceeded by ${((totalSpent - budget) / budget * 100).toFixed(1)}%`,
          suggestion: 'Consider reducing upcoming expenses'
        });
      } else if (budgetProgress >= 80) {
        newAlerts.push({
          type: 'warning',
          message: `${budgetProgress.toFixed(1)}% of budget used`,
          suggestion: 'Monitor spending closely for remaining expenses'
        });
      } else if (budgetProgress >= 50) {
        newAlerts.push({
          type: 'info',
          message: `${budgetProgress.toFixed(1)}% of budget used - on track`,
          suggestion: 'Continue monitoring to stay within budget'
        });
      }

      // Daily spending rate analysis
      const daysElapsed = Math.max(1, Math.ceil((new Date().getTime() - group.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      const dailySpendRate = totalSpent / daysElapsed;
      const projectedTotal = dailySpendRate * 7; // Assuming 7-day trip

      if (projectedTotal > budget * 1.2) {
        newAlerts.push({
          type: 'warning',
          message: `Current spending rate projects ${((projectedTotal / budget - 1) * 100).toFixed(1)}% over budget`,
          suggestion: 'Consider reducing daily expenses'
        });
      }
    }

    setAlerts(newAlerts);
  };

  useEffect(() => {
    updateAlerts();
    loadBudgetFromDB();
    loadAlertLogs();
    loadEmailPreference();
  }, [budget, totalSpent, budgetProgress]);

  const loadBudgetFromDB = async () => {
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('group_budgets')
        .select('amount')
        .eq('group_id', groupId)
        .single();

      if (data && !error) {
        setBudget(data.amount);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
    }
  };

  const loadAlertLogs = async () => {
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('budget_alert_logs')
        .select('*')
        .eq('group_id', groupId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (data && !error) {
        setAlertLogs(data);
      }
    } catch (error) {
      console.error('Error loading alert logs:', error);
    }
  };

  const loadEmailPreference = async () => {
    if (!user) return;
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('profiles')
        .select('email_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setEmailNotificationsEnabled(data.email_notifications_enabled ?? true);
      }
    } catch (error) {
      console.error('Error loading email preference:', error);
    }
  };

  const toggleEmailNotifications = async () => {
    if (!user) return;
    try {
      const newValue = !emailNotificationsEnabled;
      // @ts-ignore
      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: newValue })
        .eq('id', user.id);

      if (!error) {
        setEmailNotificationsEnabled(newValue);
        toast({
          title: newValue ? "Email Notifications Enabled" : "Email Notifications Disabled",
          description: newValue 
            ? "You'll receive email alerts when budget thresholds are reached"
            : "You won't receive email alerts for this group",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error updating preference",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sendTestAlert = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive"
      });
      return;
    }

    setSendingAlert(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-budget-alert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            groupId: groupId,
            groupName: group.name,
            userEmail: user.email,
            userName: user.user_metadata?.full_name || 'User',
            budgetAmount: budget,
            currentSpent: totalSpent,
            percentageUsed: budgetProgress,
            currency: 'INR'
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Alert Sent!",
          description: `Budget alert email sent to ${user.email}`,
        });
        loadAlertLogs();
      } else {
        throw new Error(result.error || 'Failed to send alert');
      }
    } catch (error: any) {
      toast({
        title: "Error sending alert",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingAlert(false);
    }
  };

  const handleSetBudget = async () => {
    if (budget <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount",
        variant: "destructive"
      });
      return;
    }

    try {
      // @ts-ignore
      const { error } = await supabase
        .from('group_budgets')
        .upsert({
          group_id: groupId,
          amount: budget,
          currency: 'INR'
        });

      if (error) throw error;

      setShowBudgetForm(false);
      toast({
        title: "Budget Set Successfully",
        description: `Budget of $${budget.toLocaleString()} has been set for ${group.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error setting budget",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    if (formatAmount) return formatAmount(amount);
    // Database stores USD, convert to INR for display
    const inr = amount * 83.0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inr);
  };

  const getProgressColor = () => {
    if (budgetProgress >= 100) return 'bg-destructive';
    if (budgetProgress >= 80) return 'bg-warning';
    return 'bg-success';
  };

  const suggestions = generateCostCuttingSuggestions();

  return (
    <div className="space-y-6">
      {/* Budget Overview Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <span>Budget Monitor</span>
            </div>
            {!budget ? (
              <Button
                onClick={() => setShowBudgetForm(true)}
                size="sm"
                variant="outline"
                className="border-primary/20 hover:bg-primary/10"
              >
                Set Budget
              </Button>
            ) : (
              <Badge variant={budgetProgress >= 100 ? "destructive" : budgetProgress >= 80 ? "default" : "secondary"}>
                {budgetProgress.toFixed(1)}% Used
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative space-y-4">
          {budget > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card rounded-lg border">
                  <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                </div>
                
                <div className="text-center p-4 bg-card rounded-lg border">
                  <TrendingUp className="h-6 w-6 mx-auto text-destructive mb-2" />
                  <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                  <p className="text-sm text-muted-foreground">Spent So Far</p>
                </div>
                
                <div className="text-center p-4 bg-card rounded-lg border">
                  {remaining >= 0 ? (
                    <TrendingDown className="h-6 w-6 mx-auto text-success mb-2" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 mx-auto text-destructive mb-2" />
                  )}
                  <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(Math.abs(remaining))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {remaining >= 0 ? 'Remaining' : 'Over Budget'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Progress</span>
                  <span>{budgetProgress.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={Math.min(budgetProgress, 100)} 
                  className="h-3"
                />
                {budgetProgress > 100 && (
                  <div className="text-xs text-destructive font-medium">
                    Exceeded by {(budgetProgress - 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Target className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No Budget Set</h3>
                <p className="text-muted-foreground mb-4">
                  Set a budget to track your spending and get smart alerts
                </p>
                <Button onClick={() => setShowBudgetForm(true)}>
                  Set Trip Budget
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Form */}
      {showBudgetForm && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Set Trip Budget</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Total Trip Budget</Label>
              <Input
                id="budget"
                type="number"
                placeholder="Enter total budget..."
                value={budget || ''}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBudgetForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetBudget}>
                Set Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert 
              key={index} 
              variant={alert.type === 'danger' ? 'destructive' : 'default'}
              className={
                alert.type === 'warning' ? 'border-warning bg-warning-light' :
                alert.type === 'info' ? 'border-primary bg-primary/5' : ''
              }
            >
              {alert.type === 'danger' && <AlertTriangle className="h-4 w-4" />}
              {alert.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
              {alert.type === 'info' && <CheckCircle className="h-4 w-4" />}
              <AlertDescription>
                <div className="font-medium">{alert.message}</div>
                {alert.suggestion && (
                  <div className="text-sm mt-1 opacity-80">{alert.suggestion}</div>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Email Notifications Card */}
      {budget > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <span>Email Notifications</span>
              </div>
              <Badge variant={emailNotificationsEnabled ? "default" : "secondary"}>
                {emailNotificationsEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Budget Alert Emails</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when spending reaches 90% of budget
                </p>
              </div>
              <Button
                variant={emailNotificationsEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleEmailNotifications}
              >
                <Bell className="h-4 w-4 mr-2" />
                {emailNotificationsEnabled ? "Enabled" : "Enable"}
              </Button>
            </div>

            {emailNotificationsEnabled && budgetProgress >= 80 && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestAlert}
                  disabled={sendingAlert}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendingAlert ? 'Sending...' : 'Send Test Alert'}
                </Button>
              </div>
            )}

            {alertLogs.length > 0 && (
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAlertHistory(!showAlertHistory)}
                  className="w-full"
                >
                  <History className="h-4 w-4 mr-2" />
                  {showAlertHistory ? 'Hide' : 'View'} Alert History
                </Button>

                {showAlertHistory && (
                  <div className="mt-4 space-y-2">
                    {alertLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                      >
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              log.alert_type === 'exceeded'
                                ? 'destructive'
                                : log.alert_type === 'critical'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {log.alert_type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {log.percentage_used.toFixed(1)}% used
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.sent_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Cost-Cutting Suggestions */}
      {budget > 0 && budgetProgress > 70 && suggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-ai-primary/5 to-ai-secondary/5 border-ai-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-ai-primary">
              <Brain className="h-5 w-5" />
              <span>AI Cost-Saving Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-ai-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetMonitor;