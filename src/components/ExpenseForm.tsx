import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Receipt, IndianRupee, Users, Calendar, Tag } from 'lucide-react';
import { Expense, ExpenseCategory, User } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  groupId: string;
  members: User[];
  currentUserId?: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupId,
  members,
  currentUserId
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'other' as ExpenseCategory,
    paidBy: currentUserId || members[0]?.id || '',
    splitBetween: members.map(m => m.id),
    date: new Date().toISOString().split('T')[0]
  });

  const categories: { value: ExpenseCategory; label: string; icon: string }[] = [
    { value: 'food', label: 'Food & Dining', icon: '🍽️' },
    { value: 'transport', label: 'Transportation', icon: '🚗' },
    { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description for the expense",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.splitBetween.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one member to split the expense",
        variant: "destructive"
      });
      return;
    }

    // Convert INR to USD for database storage (database stores USD)
    const INR_TO_USD = 1 / 83.0;
    const amountInINR = parseFloat(formData.amount);
    const amountInUSD = amountInINR * INR_TO_USD;

    const expense: Omit<Expense, 'id' | 'createdAt'> = {
      groupId,
      description: formData.description.trim(),
      amount: amountInUSD,
      currency: 'USD',
      category: formData.category,
      paidBy: formData.paidBy,
      splitBetween: formData.splitBetween,
      date: new Date(formData.date)
    };

    onSubmit(expense);
    
    // Reset form
    setFormData({
      description: '',
      amount: '',
      category: 'other',
      paidBy: currentUserId || members[0]?.id || '',
      splitBetween: members.map(m => m.id),
      date: new Date().toISOString().split('T')[0]
    });
    
    onClose();
    
    toast({
      title: "Expense added!",
      description: `"${expense.description}" has been added successfully`,
    });
  };

  const handleMemberToggle = (memberId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      splitBetween: checked 
        ? [...prev.splitBetween, memberId]
        : prev.splitBetween.filter(id => id !== memberId)
    }));
  };

  const selectedCategory = categories.find(cat => cat.value === formData.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Add New Expense</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Description</span>
            </Label>
            <Input
              id="description"
              placeholder="e.g., Dinner at restaurant"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center space-x-2">
                <IndianRupee className="h-4 w-4" />
                <span>Amount (₹)</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <span className="text-lg">{selectedCategory?.icon}</span>
              <span>Category</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value: ExpenseCategory) => 
                setFormData(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Paid By</span>
            </Label>
            <Select
              value={formData.paidBy}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Between */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Split Between</span>
            </Label>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={formData.splitBetween.includes(member.id)}
                        onCheckedChange={(checked) => 
                          handleMemberToggle(member.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`member-${member.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {member.name}
                      </Label>
                      {formData.splitBetween.includes(member.id) && (
                        <span className="text-sm text-muted-foreground">
                          ₹{(parseFloat(formData.amount || '0') / formData.splitBetween.length).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-primary-gradient hover:opacity-90"
            >
              Add Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseForm;