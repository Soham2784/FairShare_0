-- Fix infinite recursion in group policies by removing circular dependencies
-- This migration simplifies the policies to prevent circular references

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Users can add members to groups they created" ON public.group_members;
DROP POLICY IF EXISTS "Users can remove members from groups they created" ON public.group_members;

-- Create simplified, non-circular policies for groups
CREATE POLICY "Users can view groups they created or are members of"
  ON public.groups FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Group creators can delete their groups"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- Create simplified policies for group_members
CREATE POLICY "Users can view members of groups they belong to"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members"
  ON public.group_members FOR DELETE
  USING (
    group_id IN (
      SELECT id 
      FROM public.groups 
      WHERE created_by = auth.uid()
    )
  );

-- Also allow users to remove themselves from groups
CREATE POLICY "Users can remove themselves from groups"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
