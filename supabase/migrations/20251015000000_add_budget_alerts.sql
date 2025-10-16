-- Create budget_alert_logs table to track sent alerts
CREATE TABLE IF NOT EXISTS budget_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical', 'exceeded')),
  percentage_used DECIMAL(5,2) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_alert_logs_group_id ON budget_alert_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_budget_alert_logs_sent_at ON budget_alert_logs(sent_at);

-- Enable RLS on budget_alert_logs
ALTER TABLE budget_alert_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view alert logs for groups they're members of
CREATE POLICY "Users can view budget alert logs for their groups"
  ON budget_alert_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = budget_alert_logs.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Add email_notifications_enabled column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'email_notifications_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create a function to check budget threshold and send alerts
CREATE OR REPLACE FUNCTION check_budget_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_budget DECIMAL;
  v_total_spent DECIMAL;
  v_percentage DECIMAL;
  v_group_name TEXT;
  v_member RECORD;
  v_last_alert RECORD;
  v_alert_type TEXT;
BEGIN
  -- Get the budget for this group
  SELECT amount INTO v_budget
  FROM group_budgets
  WHERE group_id = NEW.group_id;

  -- If no budget is set, exit
  IF v_budget IS NULL OR v_budget = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate total spent for the group
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM expenses
  WHERE group_id = NEW.group_id;

  -- Calculate percentage used
  v_percentage := (v_total_spent / v_budget) * 100;

  -- Determine alert type based on percentage
  IF v_percentage >= 100 THEN
    v_alert_type := 'exceeded';
  ELSIF v_percentage >= 90 THEN
    v_alert_type := 'critical';
  ELSIF v_percentage >= 80 THEN
    v_alert_type := 'warning';
  ELSE
    -- No alert needed
    RETURN NEW;
  END IF;

  -- Get group name
  SELECT name INTO v_group_name
  FROM groups
  WHERE id = NEW.group_id;

  -- Loop through all group members and send alerts
  FOR v_member IN 
    SELECT 
      gm.user_id,
      p.email,
      p.full_name,
      p.email_notifications_enabled
    FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = NEW.group_id
    AND p.email_notifications_enabled = true
  LOOP
    -- Check if we've already sent this type of alert recently (within last 24 hours)
    SELECT * INTO v_last_alert
    FROM budget_alert_logs
    WHERE group_id = NEW.group_id
    AND user_email = v_member.email
    AND alert_type = v_alert_type
    AND sent_at > NOW() - INTERVAL '24 hours'
    ORDER BY sent_at DESC
    LIMIT 1;

    -- Only send if we haven't sent this alert type in the last 24 hours
    IF v_last_alert IS NULL THEN
      -- Call the edge function to send email
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-budget-alert',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'groupId', NEW.group_id,
          'groupName', v_group_name,
          'userEmail', v_member.email,
          'userName', v_member.full_name,
          'budgetAmount', v_budget,
          'currentSpent', v_total_spent,
          'percentageUsed', v_percentage,
          'currency', 'USD'
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on expenses table to check budget after insert/update
DROP TRIGGER IF EXISTS trigger_check_budget_threshold ON expenses;
CREATE TRIGGER trigger_check_budget_threshold
  AFTER INSERT OR UPDATE OF amount ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_threshold();

-- Create trigger on group_budgets table to check when budget is updated
DROP TRIGGER IF EXISTS trigger_check_budget_on_budget_update ON group_budgets;
CREATE TRIGGER trigger_check_budget_on_budget_update
  AFTER INSERT OR UPDATE OF amount ON group_budgets
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_threshold();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON budget_alert_logs TO anon, authenticated;
