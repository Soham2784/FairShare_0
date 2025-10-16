-- Fix RLS policies for existing users - simple approach
-- This temporarily relaxes policies to allow existing users to access their data

-- Temporarily disable RLS to allow access to existing data
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_policy" ON public.group_members;
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
DROP POLICY IF EXISTS "expense_splits_select_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_insert_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_update_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_delete_policy" ON public.expense_splits;
DROP POLICY IF EXISTS "group_budgets_select_policy" ON public.group_budgets;
DROP POLICY IF EXISTS "group_budgets_insert_policy" ON public.group_budgets;
DROP POLICY IF EXISTS "group_budgets_update_policy" ON public.group_budgets;
DROP POLICY IF EXISTS "group_budgets_delete_policy" ON public.group_budgets;

-- Re-enable RLS with very permissive policies for now
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow authenticated users to see their data
-- GROUPS - Allow users to see groups they created OR are members of
CREATE POLICY "groups_permissive_select"
  ON public.groups FOR SELECT
  USING (
    created_by = auth.uid() OR 
    id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "groups_permissive_insert"
  ON public.groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "groups_permissive_update"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "groups_permissive_delete"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- GROUP_MEMBERS - Allow users to see memberships they're part of
CREATE POLICY "group_members_permissive_select"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "group_members_permissive_insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "group_members_permissive_update"
  ON public.group_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "group_members_permissive_delete"
  ON public.group_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- EXPENSES - Allow users to see expenses from groups they're part of
CREATE POLICY "expenses_permissive_select"
  ON public.expenses FOR SELECT
  USING (
    paid_by = auth.uid() OR
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_permissive_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (
    paid_by = auth.uid() AND
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_permissive_update"
  ON public.expenses FOR UPDATE
  USING (paid_by = auth.uid());

CREATE POLICY "expenses_permissive_delete"
  ON public.expenses FOR DELETE
  USING (paid_by = auth.uid());

-- EXPENSE_SPLITS - Allow users to see splits they're part of
CREATE POLICY "expense_splits_permissive_select"
  ON public.expense_splits FOR SELECT
  USING (
    user_id = auth.uid() OR
    expense_id IN (
      SELECT e.id 
      FROM public.expenses e
      JOIN public.group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_permissive_insert"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    expense_id IN (
      SELECT e.id 
      FROM public.expenses e
      JOIN public.group_members gm ON e.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits_permissive_update"
  ON public.expense_splits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "expense_splits_permissive_delete"
  ON public.expense_splits FOR DELETE
  USING (user_id = auth.uid());

-- GROUP_BUDGETS - Allow users to see budgets from groups they're part of
CREATE POLICY "group_budgets_permissive_select"
  ON public.group_budgets FOR SELECT
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "group_budgets_permissive_insert"
  ON public.group_budgets FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "group_budgets_permissive_update"
  ON public.group_budgets FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "group_budgets_permissive_delete"
  ON public.group_budgets FOR DELETE
  USING (
    group_id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );
