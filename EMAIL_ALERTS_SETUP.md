# Budget Email Alerts Setup Guide

This guide explains how to set up and use the email alert feature for budget notifications in Group Spend Guru.

## Features

✅ **Automatic Email Alerts** - Users receive emails when:
- Budget usage reaches 90% (Critical Alert)
- Budget is exceeded (Exceeded Alert)
- Budget usage reaches 80% (Warning Alert)

✅ **Smart Alert Management**
- Prevents duplicate alerts within 24 hours
- Only sends to users with email notifications enabled
- Tracks all sent alerts in database

✅ **Beautiful Email Templates**
- Professional HTML emails with gradient styling
- Budget progress visualization
- Personalized recommendations
- Direct links to group details

## Setup Instructions

### 1. Database Migration

Run the migration to create the necessary tables and triggers:

```bash
# Navigate to your project directory
cd "c:\soham22\MaAJOR Project\group-spend-guru"

# Apply the migration using Supabase CLI
supabase db push
```

Or manually run the SQL file:
- File: `supabase/migrations/20251015000000_add_budget_alerts.sql`

This creates:
- `budget_alert_logs` table to track sent alerts
- `email_notifications_enabled` column in profiles table
- Database triggers to automatically check budget thresholds
- RLS policies for secure access

### 2. Deploy Supabase Edge Function

Deploy the email sending function:

```bash
# Deploy the edge function
supabase functions deploy send-budget-alert

# Set the required environment variables
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set APP_URL=https://your-app-url.com
```

### 3. Get Resend API Key

1. Sign up at [Resend.com](https://resend.com)
2. Verify your domain or use their test domain
3. Create an API key
4. Add it to Supabase secrets (see step 2)

### 4. Configure Email Sender

Update the email sender in the edge function if needed:
- File: `supabase/functions/send-budget-alert/index.ts`
- Line: `from: 'Group Spend Guru <notifications@groupspendguru.com>'`
- Change to your verified domain

### 5. Enable HTTP Extension (if needed)

The database trigger uses `net.http_post` to call the edge function. Ensure the `http` extension is enabled:

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS http;
```

### 6. Set Supabase Configuration

Add these settings to your Supabase project:

```sql
-- Run in Supabase SQL Editor
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.supabase_anon_key = 'your-anon-key';
```

Replace with your actual Supabase URL and anon key from `.env` file.

## How It Works

### Automatic Triggers

1. **When an expense is added/updated:**
   - Trigger calculates total spending vs budget
   - If threshold reached (80%, 90%, or 100%)
   - Checks if alert was sent in last 24 hours
   - Sends email to all group members with notifications enabled

2. **When budget is set/updated:**
   - Same process runs to check current spending
   - Alerts users if already over threshold

### Manual Test Alert

Users can send a test alert from the Budget Monitor UI:
- Only available when budget usage ≥ 80%
- Click "Send Test Alert" button
- Receives immediate email with current budget status

### Email Notification Settings

Users can toggle email notifications:
- Enabled by default for all users
- Can be disabled per user in Budget Monitor
- Setting is stored in `profiles.email_notifications_enabled`

## UI Components

### Budget Monitor Enhancements

The `BudgetMonitor` component now includes:

1. **Email Notifications Card**
   - Toggle email notifications on/off
   - Shows current notification status
   - Send test alert button
   - View alert history

2. **Alert History**
   - Shows last 10 alerts sent
   - Displays alert type and percentage
   - Shows when alert was sent

## Email Template

The email includes:
- **Header**: Alert icon and group name
- **Budget Stats**: Total budget, current spending, remaining amount
- **Progress Bar**: Visual representation of budget usage
- **Recommendations**: Context-aware tips based on spending level
- **CTA Button**: Link to view group details
- **Footer**: Unsubscribe information

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**
   ```bash
   supabase secrets list
   ```

2. **Check Edge Function Logs**
   ```bash
   supabase functions logs send-budget-alert
   ```

3. **Verify HTTP Extension**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'http';
   ```

### TypeScript Errors

The component may show TypeScript errors for `budget_alert_logs` table. To fix:

1. Regenerate Supabase types:
   ```bash
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

2. Or add type assertions where needed (already done with `// @ts-ignore`)

### Database Trigger Not Firing

1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_check_budget_threshold';
   ```

2. Check trigger function:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'check_budget_threshold';
   ```

## Testing

### Test the Complete Flow

1. **Set a budget** for a group (e.g., $1000)
2. **Add expenses** totaling 90% of budget ($900)
3. **Check your email** - should receive critical alert
4. **Add more expenses** to exceed budget
5. **Check email again** - should receive exceeded alert
6. **Try adding more expenses** within 24 hours - no duplicate alert

### Test Manual Alert

1. Navigate to a group with budget ≥ 80% used
2. Scroll to "Email Notifications" card
3. Click "Send Test Alert"
4. Check your email inbox

## API Reference

### Edge Function Endpoint

```
POST /functions/v1/send-budget-alert
```

**Request Body:**
```json
{
  "groupId": "uuid",
  "groupName": "string",
  "userEmail": "email",
  "userName": "string",
  "budgetAmount": number,
  "currentSpent": number,
  "percentageUsed": number,
  "currency": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Budget alert email sent successfully",
  "emailId": "resend-email-id"
}
```

## Database Schema

### budget_alert_logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| group_id | UUID | Reference to groups table |
| user_email | TEXT | Recipient email |
| alert_type | TEXT | 'warning', 'critical', or 'exceeded' |
| percentage_used | DECIMAL | Budget percentage at alert time |
| sent_at | TIMESTAMPTZ | When alert was sent |
| created_at | TIMESTAMPTZ | Record creation time |

### profiles (new column)

| Column | Type | Description |
|--------|------|-------------|
| email_notifications_enabled | BOOLEAN | User preference for email alerts |

## Security

- **RLS Policies**: Users can only view alerts for groups they're members of
- **Rate Limiting**: 24-hour cooldown between same alert types
- **Email Validation**: Only sends to verified user emails
- **Secure Triggers**: Uses `SECURITY DEFINER` for database functions

## Future Enhancements

Potential improvements:
- [ ] Customizable alert thresholds per group
- [ ] SMS notifications option
- [ ] Weekly budget summary emails
- [ ] Multi-language email templates
- [ ] Email preferences per group (not just global)
- [ ] Digest mode (daily summary instead of instant alerts)

## Support

For issues or questions:
1. Check Supabase logs
2. Verify all environment variables are set
3. Ensure database migration ran successfully
4. Test edge function independently

---

**Note**: The Deno TypeScript errors in the edge function are expected and can be ignored. The code will work correctly when deployed to Supabase's Deno runtime.
