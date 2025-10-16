-- Minimal RLS fix - completely avoid recursion
-- This approach uses the simplest possible policies

-- First, disable RLS temporarily to clean up
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view groups they created" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can view members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Users can remove themselves from groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view expenses from their groups" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses in their groups" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expense splits from their groups" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can create expense splits in their groups" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can update their own expense splits" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can delete their own expense splits" ON public.expense_splits;
DROP POLICY IF EXISTS "Users can view budgets from their groups" ON public.group_budgets;
DROP POLICY IF EXISTS "Group creators can manage budgets" ON public.group_budgets;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view groups by invite code" ON public.groups;

-- Drop any existing functions that might cause issues
DROP FUNCTION IF EXISTS is_user_member_of_group(UUID, UUID);
DROP FUNCTION IF EXISTS is_user_group_creator(UUID, UUID);

-- Now enable RLS and create very simple policies
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- GROUPS TABLE - Simple policies only
CREATE POLICY "Users can view groups they created"
  ON public.groups FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- GROUP_MEMBERS TABLE - Simple policies only
CREATE POLICY "Users can view their own memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves to groups"
  ON public.group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove themselves from groups"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- EXPENSES TABLE - Simple policies only
CREATE POLICY "Users can view expenses they paid"
  ON public.expenses FOR SELECT
  USING (paid_by = auth.uid());

CREATE POLICY "Users can create expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (paid_by = auth.uid());

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (paid_by = auth.uid());

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (paid_by = auth.uid());

-- EXPENSE_SPLITS TABLE - Simple policies only
CREATE POLICY "Users can view their own expense splits"
  ON public.expense_splits FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own expense splits"
  ON public.expense_splits FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own expense splits"
  ON public.expense_splits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own expense splits"
  ON public.expense_splits FOR DELETE
  USING (user_id = auth.uid());

-- GROUP_BUDGETS TABLE - Simple policies only
CREATE POLICY "Users can view all budgets"
  ON public.group_budgets FOR SELECT
  USING (true);

CREATE POLICY "Users can create budgets"
  ON public.group_budgets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update budgets"
  ON public.group_budgets FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete budgets"
  ON public.group_budgets FOR DELETE
  USING (true);

-- PROFILES TABLE - Simple policies only
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (user_id = auth.uid());
