-- Complete fix for infinite recursion in group policies
-- This migration removes ALL existing policies and creates clean, non-circular ones

-- Drop ALL existing policies on groups and group_members
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups they created or are members of" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Users can add members to groups they created" ON public.group_members;
DROP POLICY IF EXISTS "Users can remove members from groups they created" ON public.group_members;
DROP POLICY IF EXISTS "Users can remove themselves from groups" ON public.group_members;

-- Create completely new, simple policies for groups
-- Policy 1: Users can view groups they created
CREATE POLICY "Users can view groups they created"
  ON public.groups FOR SELECT
  USING (created_by = auth.uid());

-- Policy 2: Users can view groups where they are members (using a simple subquery)
CREATE POLICY "Users can view groups they are members of"
  ON public.groups FOR SELECT
  USING (
    id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy 4: Group creators can update their groups
CREATE POLICY "Group creators can update their groups"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

-- Policy 5: Group creators can delete their groups
CREATE POLICY "Group creators can delete their groups"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- Create simple policies for group_members
-- Policy 1: Users can view their own membership records
CREATE POLICY "Users can view their own memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Group creators can view all members of their groups
CREATE POLICY "Group creators can view members of their groups"
  ON public.group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Policy 3: Group creators can add members to their groups
CREATE POLICY "Group creators can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Policy 4: Group creators can remove members from their groups
CREATE POLICY "Group creators can remove members"
  ON public.group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Policy 5: Users can remove themselves from groups
CREATE POLICY "Users can remove themselves from groups"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
