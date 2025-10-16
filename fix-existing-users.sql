-- Fix RLS policies to allow existing users to access their groups
-- This adds policies to let users see groups they're members of

-- First, let's add a policy to allow users to see groups they're members of
-- We'll use a simple approach that doesn't cause recursion

-- Add policy for users to see groups they're members of
CREATE POLICY "Users can view groups they are members of"
  ON public.groups FOR SELECT
  USING (
    id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for group creators to see all members of their groups
CREATE POLICY "Group creators can view members of their groups"
  ON public.group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Add policy for group creators to add members to their groups
CREATE POLICY "Group creators can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Add policy for group creators to remove members from their groups
CREATE POLICY "Group creators can remove members"
  ON public.group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Add policy for users to see expenses from groups they're members of
CREATE POLICY "Users can view expenses from their groups"
  ON public.expenses FOR SELECT
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for users to create expenses in groups they're members of
CREATE POLICY "Users can create expenses in their groups"
  ON public.expenses FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for users to see expense splits from groups they're members of
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

-- Add policy for users to create expense splits in groups they're members of
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

-- Add policy for users to see budgets from groups they're members of
CREATE POLICY "Users can view budgets from their groups"
  ON public.group_budgets FOR SELECT
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for group creators to manage budgets for their groups
CREATE POLICY "Group creators can manage budgets"
  ON public.group_budgets FOR ALL
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );
