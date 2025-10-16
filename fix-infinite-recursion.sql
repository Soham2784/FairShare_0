-- Fix infinite recursion in RLS policies
-- This creates a simpler, non-recursive policy structure

-- First, drop ALL existing policies to start fresh
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

-- Create a simple function to check if user is member of a group
CREATE OR REPLACE FUNCTION is_user_member_of_group(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple function to check if user created a group
CREATE OR REPLACE FUNCTION is_user_group_creator(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.groups 
    WHERE id = group_id_param AND created_by = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GROUPS TABLE POLICIES (using functions to avoid recursion)
-- 1. Users can view groups they created
CREATE POLICY "Users can view groups they created"
  ON public.groups FOR SELECT
  USING (created_by = auth.uid());

-- 2. Users can view groups where they are members (using function)
CREATE POLICY "Users can view groups they are members of"
  ON public.groups FOR SELECT
  USING (is_user_member_of_group(id, auth.uid()));

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

-- GROUP_MEMBERS TABLE POLICIES (using functions to avoid recursion)
-- 1. Users can view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid());

-- 2. Group creators can view all members of their groups (using function)
CREATE POLICY "Group creators can view members of their groups"
  ON public.group_members FOR SELECT
  USING (is_user_group_creator(group_id, auth.uid()));

-- 3. Group creators can add members to their groups (using function)
CREATE POLICY "Group creators can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (is_user_group_creator(group_id, auth.uid()));

-- 4. Group creators can remove members from their groups (using function)
CREATE POLICY "Group creators can remove members"
  ON public.group_members FOR DELETE
  USING (is_user_group_creator(group_id, auth.uid()));

-- 5. Users can remove themselves from groups
CREATE POLICY "Users can remove themselves from groups"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- EXPENSES TABLE POLICIES (using functions to avoid recursion)
-- 1. Users can view expenses from groups they are members of
CREATE POLICY "Users can view expenses from their groups"
  ON public.expenses FOR SELECT
  USING (is_user_member_of_group(group_id, auth.uid()));

-- 2. Users can create expenses in groups they are members of
CREATE POLICY "Users can create expenses in their groups"
  ON public.expenses FOR INSERT
  WITH CHECK (is_user_member_of_group(group_id, auth.uid()));

-- 3. Users can update expenses they created
CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (paid_by = auth.uid());

-- 4. Users can delete expenses they created
CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (paid_by = auth.uid());

-- EXPENSE_SPLITS TABLE POLICIES (using functions to avoid recursion)
-- 1. Users can view expense splits from groups they are members of
CREATE POLICY "Users can view expense splits from their groups"
  ON public.expense_splits FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id AND is_user_member_of_group(e.group_id, auth.uid())
    )
  );

-- 2. Users can create expense splits for expenses in their groups
CREATE POLICY "Users can create expense splits in their groups"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id AND is_user_member_of_group(e.group_id, auth.uid())
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

-- GROUP_BUDGETS TABLE POLICIES (using functions to avoid recursion)
-- 1. Users can view budgets from groups they are members of
CREATE POLICY "Users can view budgets from their groups"
  ON public.group_budgets FOR SELECT
  USING (is_user_member_of_group(group_id, auth.uid()));

-- 2. Group creators can manage budgets for their groups
CREATE POLICY "Group creators can manage budgets"
  ON public.group_budgets FOR ALL
  USING (is_user_group_creator(group_id, auth.uid()));

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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_user_member_of_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_group_creator(UUID, UUID) TO authenticated;
