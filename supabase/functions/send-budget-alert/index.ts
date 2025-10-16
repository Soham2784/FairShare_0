import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface BudgetAlertRequest {
  groupId: string
  groupName: string
  userEmail: string
  userName: string
  budgetAmount: number
  currentSpent: number
  percentageUsed: number
  currency: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      groupId, 
      groupName, 
      userEmail, 
      userName,
      budgetAmount, 
      currentSpent, 
      percentageUsed,
      currency = 'USD'
    }: BudgetAlertRequest = await req.json()

    // Validate required fields
    if (!userEmail || !groupName || !budgetAmount || !currentSpent) {
      throw new Error('Missing required fields')
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency 
      }).format(amount)
    }

    const remaining = budgetAmount - currentSpent
    const alertLevel = percentageUsed >= 100 ? 'exceeded' : percentageUsed >= 90 ? 'critical' : 'warning'
    
    // Determine email subject and styling based on alert level
    const emailConfig = {
      exceeded: {
        subject: `🚨 Budget Exceeded - ${groupName}`,
        color: '#ef4444',
        icon: '🚨',
        message: 'Your group has exceeded the budget!'
      },
      critical: {
        subject: `⚠️ Budget Alert: 90% Used - ${groupName}`,
        color: '#f59e0b',
        icon: '⚠️',
        message: 'You\'ve used 90% of your budget!'
      },
      warning: {
        subject: `⚡ Budget Warning - ${groupName}`,
        color: '#3b82f6',
        icon: '⚡',
        message: 'Your spending is approaching the budget limit'
      }
    }

    const config = emailConfig[alertLevel as keyof typeof emailConfig]

    // Create HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Budget Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">${config.icon}</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Budget Alert</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${groupName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${userName || 'there'},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${config.message}
              </p>

              <!-- Budget Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="10" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Total Budget:</td>
                        <td align="right" style="color: #111827; font-size: 18px; font-weight: 600; padding: 8px 0;">${formatCurrency(budgetAmount)}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Current Spending:</td>
                        <td align="right" style="color: #111827; font-size: 18px; font-weight: 600; padding: 8px 0;">${formatCurrency(currentSpent)}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-top: 2px solid #e5e7eb; padding-top: 12px;">
                          ${remaining >= 0 ? 'Remaining:' : 'Over Budget:'}
                        </td>
                        <td align="right" style="color: ${remaining >= 0 ? '#059669' : '#dc2626'}; font-size: 20px; font-weight: 700; padding: 8px 0; border-top: 2px solid #e5e7eb; padding-top: 12px;">
                          ${formatCurrency(Math.abs(remaining))}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 15px;">
                          <div style="background-color: #e5e7eb; height: 12px; border-radius: 6px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, ${config.color} 0%, ${config.color}dd 100%); height: 100%; width: ${Math.min(percentageUsed, 100)}%; border-radius: 6px;"></div>
                          </div>
                          <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0; text-align: center;">
                            <strong style="color: ${config.color}; font-size: 16px;">${percentageUsed.toFixed(1)}%</strong> of budget used
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Recommendations -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 4px; margin-bottom: 30px;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">💡 Recommendations</h3>
                <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                  ${percentageUsed >= 90 ? `
                    <li>Review and prioritize essential expenses only</li>
                    <li>Consider group discussions to reduce upcoming costs</li>
                    <li>Look for cost-saving alternatives for planned activities</li>
                  ` : `
                    <li>Monitor your spending closely</li>
                    <li>Set daily spending limits to stay on track</li>
                    <li>Look for group discounts and deals</li>
                  `}
                </ul>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${Deno.env.get('APP_URL') || 'https://your-app-url.com'}" 
                       style="display: inline-block; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      View Group Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                You're receiving this email because you're a member of <strong>${groupName}</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Group Spend Guru - Smart Budget Tracking for Groups
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Group Spend Guru <notifications@groupspendguru.com>',
        to: [userEmail],
        subject: config.subject,
        html: htmlContent,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    // Log the alert in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('budget_alert_logs')
      .insert({
        group_id: groupId,
        user_email: userEmail,
        alert_type: alertLevel,
        percentage_used: percentageUsed,
        sent_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Budget alert email sent successfully',
        emailId: data.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending budget alert:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
