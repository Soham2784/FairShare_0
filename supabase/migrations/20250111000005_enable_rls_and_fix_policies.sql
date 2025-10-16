-- Enable RLS on all tables and create comprehensive policies
-- This migration ensures proper data isolation between users

-- Enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
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

-- GROUPS TABLE POLICIES
-- 1. Users can view groups they created
CREATE POLICY "Users can view groups they created"
  ON public.groups FOR SELECT
  USING (created_by = auth.uid());

-- 2. Users can view groups where they are members
CREATE POLICY "Users can view groups they are members of"
  ON public.groups FOR SELECT
  USING (
    id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 4. Group creators can update their groups
CREATE POLICY "Group creators can update their groups"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

-- 5. Group creators can delete their groups
CREATE POLICY "Group creators can delete their groups"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- GROUP_MEMBERS TABLE POLICIES
-- 1. Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid());

-- 2. Group creators can view all members of their groups
CREATE POLICY "Group creators can view members of their groups"
  ON public.group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- 3. Group creators can add members to their groups
CREATE POLICY "Group creators can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- 4. Group creators can remove members from their groups
CREATE POLICY "Group creators can remove members"
  ON public.group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- 5. Users can remove themselves from groups
CREATE POLICY "Users can remove themselves from groups"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- EXPENSES TABLE POLICIES
-- 1. Users can view expenses from groups they are members of
CREATE POLICY "Users can view expenses from their groups"
  ON public.expenses FOR SELECT
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- 2. Users can create expenses in groups they are members of
CREATE POLICY "Users can create expenses in their groups"
  ON public.expenses FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Users can update expenses they created
CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (paid_by = auth.uid());

-- 4. Users can delete expenses they created
CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (paid_by = auth.uid());

-- EXPENSE_SPLITS TABLE POLICIES
-- 1. Users can view expense splits from groups they are members of
CREATE POLICY "Users can view expense splits from their groups"
  ON public.expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT e.id 
      FROM public.expenses e
      JOIN public.group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- 2. Users can create expense splits for expenses in their groups
CREATE POLICY "Users can create expense splits in their groups"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    expense_id IN (
      SELECT e.id 
      FROM public.expenses e
      JOIN public.group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- 3. Users can update expense splits they are part of
CREATE POLICY "Users can update their own expense splits"
  ON public.expense_splits FOR UPDATE
  USING (user_id = auth.uid());

-- 4. Users can delete expense splits they are part of
CREATE POLICY "Users can delete their own expense splits"
  ON public.expense_splits FOR DELETE
  USING (user_id = auth.uid());

-- GROUP_BUDGETS TABLE POLICIES
-- 1. Users can view budgets from groups they are members of
CREATE POLICY "Users can view budgets from their groups"
  ON public.group_budgets FOR SELECT
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- 2. Group creators can manage budgets for their groups
CREATE POLICY "Group creators can manage budgets"
  ON public.group_budgets FOR ALL
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- PROFILES TABLE POLICIES
-- 1. Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- 2. Users can create their own profile
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 3. Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

-- 4. Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_group_budgets_group_id ON public.group_budgets(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
