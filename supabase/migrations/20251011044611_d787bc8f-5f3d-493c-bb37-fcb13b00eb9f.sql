-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

-- Create a security definer function to check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
    AND group_id = _group_id
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can view members of their groups"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(auth.uid(), group_id));