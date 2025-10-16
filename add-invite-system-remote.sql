-- Add invite system to groups for remote Supabase database
-- Run this in the Supabase SQL Editor after enabling RLS

-- Add invite_code column to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(8) UNIQUE,
ADD COLUMN IF NOT EXISTS invite_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE;

-- Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate unique invite code for a group
CREATE OR REPLACE FUNCTION generate_group_invite_code(group_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := generate_invite_code();
        SELECT EXISTS(SELECT 1 FROM public.groups WHERE invite_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    UPDATE public.groups 
    SET invite_code = new_code,
        invite_enabled = true,
        invite_expires_at = NOW() + INTERVAL '30 days'
    WHERE id = group_id_param;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to join group by invite code
CREATE OR REPLACE FUNCTION join_group_by_invite_code(
    invite_code_param TEXT,
    user_name TEXT,
    user_email TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    group_record RECORD;
    member_record RECORD;
    result JSON;
BEGIN
    -- Find group by invite code
    SELECT * INTO group_record
    FROM public.groups 
    WHERE invite_code = invite_code_param 
    AND invite_enabled = true 
    AND (invite_expires_at IS NULL OR invite_expires_at > NOW());
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired invite code'
        );
    END IF;
    
    -- Check if user is already a member
    SELECT * INTO member_record
    FROM public.group_members 
    WHERE group_id = group_record.id AND user_id = auth.uid();
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You are already a member of this group'
        );
    END IF;
    
    -- Add user to group
    INSERT INTO public.group_members (group_id, user_id, name, email, joined_at)
    VALUES (group_record.id, auth.uid(), user_name, user_email, NOW());
    
    RETURN json_build_object(
        'success', true,
        'group_id', group_record.id,
        'group_name', group_record.name
    );
END;
$$ LANGUAGE plpgsql;

-- Update existing groups to have invite codes
UPDATE public.groups 
SET invite_code = generate_invite_code(),
    invite_enabled = true,
    invite_expires_at = NOW() + INTERVAL '30 days'
WHERE invite_code IS NULL;

-- Create index on invite_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);

-- Add RLS policy for invite code access
CREATE POLICY "Anyone can view groups by invite code"
  ON public.groups FOR SELECT
  USING (invite_code IS NOT NULL AND invite_enabled = true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_group_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_group_by_invite_code(TEXT, TEXT, TEXT) TO authenticated;
