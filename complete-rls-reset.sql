-- Complete RLS reset - disable everything and start fresh
-- This will completely remove all RLS and policies

-- Disable RLS on all tables
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (this will work even if they don't exist)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on groups table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'groups' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.groups';
    END LOOP;
    
    -- Drop all policies on group_members table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.group_members';
    END LOOP;
    
    -- Drop all policies on expenses table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'expenses' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.expenses';
    END LOOP;
    
    -- Drop all policies on expense_splits table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'expense_splits' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.expense_splits';
    END LOOP;
    
    -- Drop all policies on group_budgets table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_budgets' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.group_budgets';
    END LOOP;
    
    -- Drop all policies on profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Drop any functions that might be causing issues
DROP FUNCTION IF EXISTS is_user_member_of_group(UUID, UUID);
DROP FUNCTION IF EXISTS is_user_group_creator(UUID, UUID);
DROP FUNCTION IF EXISTS generate_invite_code();
DROP FUNCTION IF EXISTS generate_group_invite_code(UUID);
DROP FUNCTION IF EXISTS join_group_by_invite_code(TEXT, TEXT, TEXT);

-- Now we have a completely clean slate
-- Let's just enable RLS without any policies for now
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create very basic policies that won't cause recursion
-- GROUPS - Only allow users to see groups they created
CREATE POLICY "groups_select_policy"
  ON public.groups FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "groups_insert_policy"
  ON public.groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "groups_update_policy"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "groups_delete_policy"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- GROUP_MEMBERS - Only allow users to see their own memberships
CREATE POLICY "group_members_select_policy"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "group_members_insert_policy"
  ON public.group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "group_members_update_policy"
  ON public.group_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "group_members_delete_policy"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- EXPENSES - Only allow users to see expenses they paid
CREATE POLICY "expenses_select_policy"
  ON public.expenses FOR SELECT
  USING (paid_by = auth.uid());

CREATE POLICY "expenses_insert_policy"
  ON public.expenses FOR INSERT
  WITH CHECK (paid_by = auth.uid());

CREATE POLICY "expenses_update_policy"
  ON public.expenses FOR UPDATE
  USING (paid_by = auth.uid());

CREATE POLICY "expenses_delete_policy"
  ON public.expenses FOR DELETE
  USING (paid_by = auth.uid());

-- EXPENSE_SPLITS - Only allow users to see their own splits
CREATE POLICY "expense_splits_select_policy"
  ON public.expense_splits FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "expense_splits_insert_policy"
  ON public.expense_splits FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "expense_splits_update_policy"
  ON public.expense_splits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "expense_splits_delete_policy"
  ON public.expense_splits FOR DELETE
  USING (user_id = auth.uid());

-- GROUP_BUDGETS - Allow all authenticated users for now
CREATE POLICY "group_budgets_select_policy"
  ON public.group_budgets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "group_budgets_insert_policy"
  ON public.group_budgets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "group_budgets_update_policy"
  ON public.group_budgets FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "group_budgets_delete_policy"
  ON public.group_budgets FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- PROFILES - Only allow users to see their own profile
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  USING (user_id = auth.uid());
