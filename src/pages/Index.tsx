import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, User } from '@/types';
import Header from '@/components/Header';
import GroupCard from '@/components/GroupCard';
import GroupDetailPage from '@/components/GroupDetailPage';
import AITripPredictor from '@/components/AITripPredictor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Search, Brain, TrendingUp, Users, DollarSign, Star, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIPredictor, setShowAIPredictor] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    members: ['']
  });
  const [inviteCode, setInviteCode] = useState('');
  const [joinGroupName, setJoinGroupName] = useState('');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch groups from database
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // First get groups where user is a member
      // @ts-ignore - Types will be generated after migration
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      if (membershipsError) throw membershipsError;

      const groupIds = membershipsData?.map(m => m.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      // Now fetch only the groups the user is a member of
      // @ts-ignore - Types will be generated after migration
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Transform database data to app format
      const transformedGroups: Group[] = await Promise.all((groupsData || []).map(async (group: any) => {
        // Get all members for this group - fetch group_members first, then get profile data
        // @ts-ignore - Types will be generated after migration
        const { data: membersData } = await supabase
          .from('group_members')
          .select('user_id, name, email')
          .eq('group_id', group.id);

        // Get profile data for each member
        const members: User[] = await Promise.all((membersData || []).map(async (member: any) => {
          // @ts-ignore - Types will be generated after migration
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, email, avatar_url')
            .eq('user_id', member.user_id)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles

          // If profile doesn't exist, create one
          if (profileError || !profileData) {
            console.log('No profile found for user:', member.user_id, 'creating one...');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                user_id: member.user_id,
                name: member.name || member.email?.split('@')[0] || 'User',
                email: member.email
              });
            
            if (insertError) {
              console.error('Failed to create profile:', insertError);
            }
          }

          return {
            id: member.user_id,
            name: profileData?.name || member.name || 'Unknown User',
            email: profileData?.email || member.email || '',
            avatar: profileData?.avatar_url || undefined
          };
        }));

        // Get total expenses for this group
        // @ts-ignore - Types will be generated after migration
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('group_id', group.id);

        const totalExpenses = (expensesData || []).reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          members,
          createdAt: new Date(group.created_at),
          updatedAt: new Date(group.created_at),
          totalExpenses,
          currency: 'USD',
          createdBy: group.created_by,
          inviteCode: group.invite_code,
          inviteEnabled: group.invite_enabled,
          inviteExpiresAt: group.invite_expires_at ? new Date(group.invite_expires_at) : undefined
        };
      }));

      setGroups(transformedGroups);
    } catch (error: any) {
      toast({
        title: "Error loading groups",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name || !user) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group",
        variant: "destructive"
      });
      return;
    }

    console.log('Creating group with:', { name: newGroup.name, description: newGroup.description, userId: user.id });

    try {
      // Create group
      console.log('Step 1: Creating group...');
      // @ts-ignore - Types will be generated after migration
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          created_by: user.id
        })
        .select()
        .single();

      console.log('Group creation result:', { groupData, groupError });

      if (groupError || !groupData) throw groupError || new Error('Failed to create group');

      // Add current user as a member
      console.log('Step 2: Adding user as member...');
      // @ts-ignore - Types will be generated after migration
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          name: user.email?.split('@')[0] || 'User',
          email: user.email
        });

      console.log('Member creation result:', { memberError });

      if (memberError) throw memberError;

      // Generate invite code for the group
      console.log('Step 3: Generating invite code...');
      // @ts-ignore - Types will be generated after migration
      const { data: inviteData, error: inviteError } = await supabase
        .rpc('generate_group_invite_code', { group_id_param: groupData.id });

      if (inviteError) {
        console.warn('Failed to generate invite code:', inviteError);
      }

      console.log('Group creation successful!');
      setNewGroup({ name: '', description: '', members: [''] });
      setShowCreateGroup(false);
      
      toast({
        title: "Group created!",
        description: `"${groupData.name}" has been created successfully${inviteData ? ` with invite code: ${inviteData}` : ''}`,
      });

      // Refresh groups list
      fetchGroups();
    } catch (error: any) {
      console.error('Group creation error:', error);
      toast({
        title: "Error creating group",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addMemberField = () => {
    setNewGroup(prev => ({
      ...prev,
      members: [...prev.members, '']
    }));
  };

  const updateMember = (index: number, value: string) => {
    setNewGroup(prev => ({
      ...prev,
      members: prev.members.map((member, i) => i === index ? value : member)
    }));
  };

  const removeMember = (index: number) => {
    if (newGroup.members.length > 1) {
      setNewGroup(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index)
      }));
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim() || !joinGroupName.trim() || !user) {
      toast({
        title: "Missing information",
        description: "Please enter both invite code and your name",
        variant: "destructive"
      });
      return;
    }

    try {
      // @ts-ignore - Types will be generated after migration
      const { data, error } = await supabase
        .rpc('join_group_by_invite_code', {
          invite_code_param: inviteCode.trim().toUpperCase(),
          user_name: joinGroupName.trim(),
          user_email: user.email
        });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Successfully joined group",
          description: `You've joined ${data.group_name}`,
        });
        setInviteCode('');
        setJoinGroupName('');
        setShowJoinGroup(false);
        fetchGroups();
      } else {
        toast({
          title: "Failed to join group",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error joining group",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;

    try {
      // @ts-ignore - Types will be generated after migration
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('created_by', user.id); // Only allow deletion by creator

      if (error) throw error;

      toast({
        title: "Group deleted",
        description: "The group has been successfully deleted",
      });

      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error deleting group",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show group detail page if a group is selected
  if (selectedGroup) {
    return (
      <GroupDetailPage
        group={selectedGroup}
        onBack={() => {
          setSelectedGroup(null);
          fetchGroups(); // Refresh groups when going back
        }}
        currentUserId={user?.id}
      />
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <Header 
        onCreateGroup={() => setShowCreateGroup(true)}
        onJoinGroup={() => setShowJoinGroup(true)}
        onOpenAIPredictor={() => setShowAIPredictor(true)}
      />

      <main className="w-full max-w-7xl mx-auto px-4 py-8">
        {/* Decorative hero banner */}
        <div className="relative overflow-hidden rounded-2xl border hero-bg mb-8">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14 animate-fade-in">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Split smarter. Share fairly.</h2>
              <p className="mt-2 text-white/90">Create or join a group to start tracking expenses with seamless settlements.</p>
            </div>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="space-y-4">
                <div className="p-4 bg-primary-gradient rounded-full w-20 h-20 mx-auto flex items-center justify-center shadow-glow">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-primary-gradient">
                  Welcome to TripSplit
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                  The intelligent way to split trip expenses with AI-powered predictions and smart settlements
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
                <div className="bg-card p-4 md:p-6 rounded-xl shadow-sm border text-center space-y-3">
                  <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto text-primary" />
                  <h3 className="font-semibold text-sm md:text-base">Create Groups</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Organize your trips with friends and family
                  </p>
                </div>
                <div className="bg-card p-4 md:p-6 rounded-xl shadow-sm border text-center space-y-3">
                  <DollarSign className="h-6 w-6 md:h-8 md:w-8 mx-auto text-green-600" />
                  <h3 className="font-semibold text-sm md:text-base">Track Expenses</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Add expenses and automatically calculate splits
                  </p>
                </div>
                <div className="bg-card p-4 md:p-6 rounded-xl shadow-sm border text-center space-y-3">
                  <Brain className="h-6 w-6 md:h-8 md:w-8 mx-auto text-ai-primary" />
                  <h3 className="font-semibold text-sm md:text-base">AI Predictions</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Get smart cost estimates for your trips
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  size="lg"
                  className="bg-primary-gradient hover:opacity-90 shadow-glow text-lg px-8 py-6"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Create Your First Group
                </Button>
                <Button
                  onClick={() => setShowJoinGroup(true)}
                  variant="outline"
                  size="lg"
                  className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8 py-6"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Join Existing Group
                </Button>
              </div>

              <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>AI-powered expense predictions</span>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Your Trip Groups</h1>
                <p className="text-muted-foreground">Manage expenses and settle up with friends</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  balance={0}
                  onSelect={(group) => {
                    setSelectedGroup(group);
                  }}
                  onDelete={handleDeleteGroup}
                  currentUserId={user?.id}
                />
              ))}
            </div>

            {filteredGroups.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No groups found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or create a new group
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <PlusCircle className="h-5 w-5" />
              <span>Create New Group</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Bali Adventure 2024"
                value={newGroup.name}
                onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                placeholder="Brief description of your trip..."
                value={newGroup.description}
                onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGroup}
                className="bg-primary-gradient hover:opacity-90"
              >
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinGroup} onOpenChange={setShowJoinGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Join Group</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="Enter 8-character invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono text-center text-lg tracking-wider"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="joinGroupName">Your Name</Label>
              <Input
                id="joinGroupName"
                placeholder="Enter your name"
                value={joinGroupName}
                onChange={(e) => setJoinGroupName(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowJoinGroup(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleJoinGroup}
                className="bg-primary-gradient hover:opacity-90"
              >
                Join Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Trip Predictor */}
      {showAIPredictor && (
        <AITripPredictor onClose={() => setShowAIPredictor(false)} />
      )}
    </div>
  );
};

export default Index;
