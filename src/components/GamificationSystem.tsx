import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Award, 
  Medal,
  Crown,
  Zap,
  DollarSign,
  Users,
  Calendar,
  Gift
} from 'lucide-react';
import { Group, Expense, User } from '@/types';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  completed: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface UserStats {
  totalExpenses: number;
  totalSpent: number;
  groupsJoined: number;
  achievementsUnlocked: number;
  level: number;
  xp: number;
  xpToNext: number;
  badges: string[];
}

interface GamificationSystemProps {
  user: User;
  groups: Group[];
  expenses: Expense[];
}

const GamificationSystem: React.FC<GamificationSystemProps> = ({ user, groups, expenses }) => {
  const [userStats, setUserStats] = useState<UserStats>({
    totalExpenses: 0,
    totalSpent: 0,
    groupsJoined: 0,
    achievementsUnlocked: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    badges: []
  });
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentlyUnlocked, setRecentlyUnlocked] = useState<Achievement[]>([]);

  // Calculate user statistics
  useEffect(() => {
    const userExpenses = expenses.filter(exp => exp.paidBy === user.id);
    const totalSpent = userExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const stats: UserStats = {
      totalExpenses: userExpenses.length,
      totalSpent,
      groupsJoined: groups.length,
      achievementsUnlocked: achievements.filter(a => a.completed).length,
      level: Math.floor(totalSpent / 500) + 1, // Level up every $500 spent
      xp: Math.floor(totalSpent % 500),
      xpToNext: 500 - (totalSpent % 500),
      badges: []
    };
    
    setUserStats(stats);
  }, [user, groups, expenses, achievements]);

  // Define achievements
  useEffect(() => {
    const userExpenses = expenses.filter(exp => exp.paidBy === user.id);
    const totalSpent = userExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const achievementList: Achievement[] = [
      // Spending milestones
      {
        id: 'first_expense',
        title: 'Getting Started',
        description: 'Add your first expense',
        icon: <DollarSign className="h-5 w-5" />,
        progress: Math.min(userExpenses.length, 1),
        maxProgress: 1,
        completed: userExpenses.length >= 1,
        rarity: 'common',
        points: 50
      },
      {
        id: 'big_spender',
        title: 'Big Spender',
        description: 'Spend over $1000 total',
        icon: <Trophy className="h-5 w-5" />,
        progress: Math.min(totalSpent, 1000),
        maxProgress: 1000,
        completed: totalSpent >= 1000,
        rarity: 'rare',
        points: 200
      },
      {
        id: 'whale',
        title: 'High Roller',
        description: 'Spend over $5000 total',
        icon: <Crown className="h-5 w-5" />,
        progress: Math.min(totalSpent, 5000),
        maxProgress: 5000,
        completed: totalSpent >= 5000,
        rarity: 'legendary',
        points: 1000
      },
      
      // Group achievements
      {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Join 5 different groups',
        icon: <Users className="h-5 w-5" />,
        progress: Math.min(groups.length, 5),
        maxProgress: 5,
        completed: groups.length >= 5,
        rarity: 'rare',
        points: 300
      },
      
      // Activity achievements
      {
        id: 'consistent_tracker',
        title: 'Consistent Tracker',
        description: 'Add expenses for 7 consecutive days',
        icon: <Calendar className="h-5 w-5" />,
        progress: 3, // Mock progress
        maxProgress: 7,
        completed: false,
        rarity: 'epic',
        points: 500
      },
      
      // Category achievements
      {
        id: 'foodie',
        title: 'Foodie Explorer',
        description: 'Spend $500 on food',
        icon: <Gift className="h-5 w-5" />,
        progress: Math.min(
          userExpenses.filter(e => e.category === 'food').reduce((sum, e) => sum + e.amount, 0),
          500
        ),
        maxProgress: 500,
        completed: userExpenses.filter(e => e.category === 'food').reduce((sum, e) => sum + e.amount, 0) >= 500,
        rarity: 'common',
        points: 150
      },
      
      // Budget achievements
      {
        id: 'budget_master',
        title: 'Budget Master',
        description: 'Stay under budget for 3 trips',
        icon: <Target className="h-5 w-5" />,
        progress: 1, // Mock progress
        maxProgress: 3,
        completed: false,
        rarity: 'epic',
        points: 750
      },
      
      // Efficiency achievements
      {
        id: 'settlement_pro',
        title: 'Settlement Pro',
        description: 'Complete 10 settlements',
        icon: <Medal className="h-5 w-5" />,
        progress: 4, // Mock progress
        maxProgress: 10,
        completed: false,
        rarity: 'rare',
        points: 400
      }
    ];
    
    setAchievements(achievementList);
  }, [user, groups, expenses]);

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRarityBorder = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-gray-200';
      case 'rare': return 'border-blue-200';
      case 'epic': return 'border-purple-200';
      case 'legendary': return 'border-yellow-200';
      default: return 'border-gray-200';
    }
  };

  const completedAchievements = achievements.filter(a => a.completed);
  const inProgressAchievements = achievements.filter(a => !a.completed && a.progress > 0);
  const lockedAchievements = achievements.filter(a => !a.completed && a.progress === 0);

  return (
    <div className="space-y-6">
      {/* User Level & XP */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl font-bold">{user.name}</div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-primary-gradient text-white">
                    Level {userStats.level}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {userStats.xp} / {userStats.xp + userStats.xpToNext} XP
                  </span>
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Level {userStats.level + 1}</span>
                <span>{Math.round((userStats.xp / (userStats.xp + userStats.xpToNext)) * 100)}%</span>
              </div>
              <Progress 
                value={(userStats.xp / (userStats.xp + userStats.xpToNext)) * 100} 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{userStats.totalExpenses}</div>
                <div className="text-xs text-muted-foreground">Expenses</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">${userStats.totalSpent.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Total Spent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{userStats.groupsJoined}</div>
                <div className="text-xs text-muted-foreground">Groups</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{userStats.achievementsUnlocked}</div>
                <div className="text-xs text-muted-foreground">Achievements</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Achievements */}
      {completedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span>Completed Achievements</span>
              <Badge variant="secondary">{completedAchievements.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedAchievements.map(achievement => (
                <div 
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">+{achievement.points} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In Progress Achievements */}
      {inProgressAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>In Progress</span>
              <Badge variant="outline">{inProgressAchievements.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inProgressAchievements.map(achievement => (
                <div 
                  key={achievement.id}
                  className={`p-4 rounded-lg border ${getRarityBorder(achievement.rarity)} bg-card`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {achievement.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{achievement.progress} / {achievement.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-muted-foreground" />
              <span>Locked Achievements</span>
              <Badge variant="outline">{lockedAchievements.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lockedAchievements.map(achievement => (
                <div 
                  key={achievement.id}
                  className="p-4 rounded-lg border border-muted bg-muted/30 opacity-60"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-muted-foreground">{achievement.title}</h4>
                        <Badge variant="outline" className="text-muted-foreground">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GamificationSystem;