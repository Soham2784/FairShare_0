
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, IndianRupee, Calendar, MoreHorizontal, Trash2, Copy } from 'lucide-react';
import { Group } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface GroupCardProps {
  group: Group;
  balance: number;
  onSelect: (group: Group) => void;
  onDelete?: (groupId: string) => void;
  currentUserId?: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, balance, onSelect, onDelete, currentUserId }) => {
  const { toast } = useToast();
  const formatCurrency = (amountUsd: number) => {
    // Database stores USD, convert to INR for display
    const amountInr = amountUsd * 83.0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amountInr);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'money-positive';
    if (balance < 0) return 'money-negative';
    return 'money-neutral';
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `You are owed ${formatCurrency(Math.abs(balance))}`;
    if (balance < 0) return `You owe ${formatCurrency(Math.abs(balance))}`;
    return 'All settled up!';
  };

  const handleCopyInviteCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (group.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      toast({
        title: "Invite code copied!",
        description: `Invite code ${group.inviteCode} has been copied to clipboard`,
      });
    }
  };

  const handleDeleteGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(group.id);
    }
  };

  const isGroupCreator = currentUserId && group.createdBy === currentUserId;

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-scale-in"
      onClick={() => onSelect(group)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {group.name}
            </CardTitle>
            {group.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {group.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {group.inviteCode && (
                <DropdownMenuItem onClick={handleCopyInviteCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invite Code ({group.inviteCode})
                </DropdownMenuItem>
              )}
              {isGroupCreator && onDelete && (
                <DropdownMenuItem onClick={handleDeleteGroup} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{group.members.length} members</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(group.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
              <span>Total expenses</span>
            </div>
            <span className="font-semibold">{formatCurrency(group.totalExpenses)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your balance</span>
            <Badge 
              variant={balance === 0 ? "secondary" : balance > 0 ? "default" : "destructive"}
              className="font-medium"
            >
              {getBalanceText(balance)}
            </Badge>
          </div>
        </div>
        
        <div className="flex -space-x-2 overflow-hidden">
          {group.members.slice(0, 5).map((member, index) => (
            <div
              key={member.id}
              className="inline-block h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
              title={member.name}
            >
              {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          ))}
          {group.members.length > 5 && (
            <div className="inline-block h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-background">
              +{group.members.length - 5}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupCard;
