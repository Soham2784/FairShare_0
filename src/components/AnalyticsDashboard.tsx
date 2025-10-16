import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Award,
  Target,
  PieChartIcon,
  BarChart3
} from 'lucide-react';
import { Group, Expense, User } from '@/types';

interface AnalyticsDashboardProps {
  group: Group;
  expenses: Expense[];
  formatAmount?: (amountUsd: number) => string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ group, expenses, formatAmount }) => {
  const analytics = useMemo(() => {
    // Category spending analysis
    const categoryData = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryChartData = Object.entries(categoryData).map(([category, amount]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: amount,
      percentage: ((amount / group.totalExpenses) * 100).toFixed(1)
    })) as Array<{ name: string; value: number; percentage: string }>;

    // Member spending analysis
    const memberSpending = expenses.reduce((acc, expense) => {
      const payer = group.members.find(m => m.id === expense.paidBy);
      if (payer) {
        acc[payer.name] = (acc[payer.name] || 0) + expense.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const memberChartData = Object.entries(memberSpending).map(([name, amount]) => ({
      name,
      amount,
      percentage: ((amount / group.totalExpenses) * 100).toFixed(1)
    })) as Array<{ name: string; amount: number; percentage: string }>;

    // Daily spending trend
    const dailySpending = expenses.reduce((acc, expense) => {
      const date = expense.date.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(dailySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
        cumulative: 0
      }));

    // Calculate cumulative spending
    let cumulative = 0;
    trendData.forEach(item => {
      cumulative += item.amount;
      item.cumulative = cumulative;
    });

    // Top spender and other insights
    const topSpender = memberChartData.reduce((max, member) => 
      member.amount > max.amount ? member : max, 
      memberChartData[0] || { name: '', amount: 0, percentage: '0' });

    const averageExpenseAmount = expenses.length > 0 
      ? group.totalExpenses / expenses.length 
      : 0;

    const mostExpensiveCategory = categoryChartData.reduce((max, cat) => 
      cat.value > max.value ? cat : max, 
      categoryChartData[0] || { name: '', value: 0, percentage: '0' });

    return {
      categoryChartData,
      memberChartData,
      trendData,
      topSpender,
      averageExpenseAmount,
      mostExpensiveCategory,
      totalExpenses: expenses.length,
      daysActive: Math.max(1, Math.ceil((new Date().getTime() - group.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    };
  }, [group, expenses]);

  const COLORS = [
    'hsl(var(--category-food))',
    'hsl(var(--category-transport))',
    'hsl(var(--category-accommodation))',
    'hsl(var(--category-entertainment))',
    'hsl(var(--category-shopping))',
    'hsl(var(--category-other))'
  ];

  const formatCurrency = (amount: number) => {
    if (formatAmount) return formatAmount(amount);
    // Database stores USD, convert to INR for display
    const inr = amount * 83.0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inr);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(group.totalExpenses)}
            </div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold text-success">
              {analytics.totalExpenses}
            </div>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(analytics.averageExpenseAmount)}
            </div>
            <p className="text-sm text-muted-foreground">Avg. per Expense</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto text-secondary mb-2" />
            <div className="text-2xl font-bold text-secondary">
              {analytics.daysActive}
            </div>
            <p className="text-sm text-muted-foreground">Days Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <span>Spending by Category</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.categoryChartData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                    >
                      {analytics.categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="grid grid-cols-2 gap-2">
                  {analytics.categoryChartData.map((category, index) => (
                    <div key={category.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {category.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No expenses to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Spending Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Spending by Member</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.memberChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.memberChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No member spending data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Spending Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
                <Bar dataKey="amount" fill="hsl(var(--secondary))" opacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-success/5 to-success/10 border-success/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-success">
              <Award className="h-5 w-5" />
              <span>Top Spender</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topSpender.name ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-success">
                  {analytics.topSpender.name}
                </div>
                <div className="text-lg">{formatCurrency(analytics.topSpender.amount)}</div>
                <Badge variant="secondary">
                  {analytics.topSpender.percentage}% of total spending
                </Badge>
              </div>
            ) : (
              <div className="text-muted-foreground">No spending data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-warning/5 to-warning/10 border-warning/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-warning">
              <PieChartIcon className="h-5 w-5" />
              <span>Biggest Category</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.mostExpensiveCategory.name ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-warning">
                  {analytics.mostExpensiveCategory.name}
                </div>
                <div className="text-lg">{formatCurrency(analytics.mostExpensiveCategory.value)}</div>
                <Badge variant="secondary">
                  {analytics.mostExpensiveCategory.percentage}% of total
                </Badge>
              </div>
            ) : (
              <div className="text-muted-foreground">No category data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;