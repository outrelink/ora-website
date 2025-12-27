/**
 * Marketing Notifications API Handler
 * Handles sending marketing push notifications and emails to users who have opted in
 */

const { createClient } = require('@supabase/supabase-js');

// Try to get Supabase client from env vars, or use passed client
function getSupabaseClient(passedClient) {
  if (passedClient) return passedClient;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Also try alternative env var names
  const altUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const altKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const url = supabaseUrl || altUrl;
  const key = supabaseKey || altKey;
  
  return url && key ? createClient(url, key) : null;
}

// Check admin authentication
function checkAuth(req) {
  const adminToken = req.headers['x-admin-token'] || req.query.token || req.body.token;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;
  
  return adminToken === expectedToken || adminToken === adminPassword;
}

/**
 * Get marketing notification history
 */
async function getMarketingHistory(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);
  
  try {
    if (!supabase) {
      return res.json({
        success: true,
        notifications: [],
        message: 'Supabase not configured'
      });
    }

    const { data: notifications, error } = await supabase
      .from('marketing_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          notifications: [],
          message: 'Marketing notifications table not found'
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      notifications: notifications || []
    });
  } catch (error) {
    console.error('Error fetching marketing history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch marketing history',
      message: error.message
    });
  }
}

/**
 * Send marketing notification to all opted-in users
 */
async function sendMarketingNotification(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);
  
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Supabase not configured'
      });
    }

    // Get all users who have marketing notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, push_token')
      .eq('marketing_notifications', true);
    
    // Also get user emails for email sending
    const userIds = users?.map(u => u.user_id) || [];
    let userEmails = [];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      userEmails = profiles?.map(p => p.email).filter(Boolean) || [];
    }

    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue even if we can't fetch users - we'll use Expo Push API
    }

    const recipientCount = users?.length || 0;
    const pushTokens = users?.map(u => u.push_token).filter(Boolean) || [];
    const emailCount = userEmails.length;

    // Store notification in database
    const { error: notifError } = await supabase
      .from('marketing_notifications')
      .insert({
        title: title,
        message: message,
        type: type || 'update',
        recipient_count: recipientCount,
        sent_at: new Date().toISOString()
      });

    if (notifError) {
      console.error('Error saving notification:', notifError);
    }

    // Send push notifications via Expo Push API
    if (pushTokens.length > 0) {
      try {
        const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate'
          },
          body: JSON.stringify(
            pushTokens.map(token => ({
              to: token,
              sound: 'default',
              title: title,
              body: message,
              data: {
                type: 'marketing',
                marketingType: type || 'update'
              },
              priority: 'default',
              channelId: 'marketing-updates'
            }))
          )
        });

        const expoData = await expoPushResponse.json();
        console.log('Expo push response:', expoData);
      } catch (pushError) {
        console.error('Error sending push notifications:', pushError);
        // Don't fail the request if push fails - notification is still saved
      }
    }

    // Send marketing emails via Zoho Mail
    if (userEmails.length > 0) {
      try {
        const nodemailer = require('nodemailer');
        const { generateEmailTemplate, generatePlainTextTemplate } = require('./email-template');
        const zohoEmail = (process.env.ZOHO_EMAIL || '').trim();
        const zohoPassword = (process.env.ZOHO_PASSWORD || '').trim();
        // Marketing emails should use hello@myora.co
        const zohoFromEmail = (process.env.ZOHO_HELLO_EMAIL || 'hello@myora.co' || process.env.ZOHO_FROM_EMAIL || zohoEmail).trim();
        const zohoSmtpHost = process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.eu';
        const zohoSmtpPort = parseInt(process.env.ZOHO_SMTP_PORT || '587', 10);

        if (zohoEmail && zohoPassword) {
          const transporter = nodemailer.createTransport({
            host: zohoSmtpHost,
            port: zohoSmtpPort,
            secure: zohoSmtpPort === 465,
            auth: {
              user: zohoEmail,
              pass: zohoPassword
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          // Send emails in batches to avoid rate limiting
          const batchSize = 10;
          for (let i = 0; i < userEmails.length; i += batchSize) {
            const batch = userEmails.slice(i, i + batchSize);
            await Promise.all(
              batch.map(email => {
                // Generate HTML email with branding
                const emailHtml = generateEmailTemplate({
                  subject: title,
                  message: message,
                  displayName: email.split('@')[0],
                  primaryColor: '#f97316',
                  replyTo: zohoFromEmail,
                  appStoreUrl: req.body.appStoreUrl || null // Pass App Store URL if provided
                });

                const emailText = generatePlainTextTemplate({
                  message: message,
                  displayName: email.split('@')[0]
                });

                return transporter.sendMail({
                  from: `ORA <${zohoFromEmail}>`,
                  to: email,
                  subject: title,
                  text: emailText,
                  html: emailHtml,
                  replyTo: zohoFromEmail,
                  // Email headers for better sender recognition
                  headers: {
                    'X-Sender': 'ORA',
                    'X-Sender-Avatar': 'https://myora.co/adaptive-icon.png', // Some email clients may use this
                    'List-Unsubscribe': `<mailto:${zohoFromEmail}?subject=unsubscribe>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
                  }
                }).catch(err => {
                  console.error(`Failed to send email to ${email}:`, err);
                });
              })
            );
          }
          console.log(`Marketing emails sent to ${userEmails.length} users`);
        }
      } catch (emailError) {
        console.error('Error sending marketing emails:', emailError);
        // Don't fail the request if email fails - push notifications still sent
      }
    }

    return res.json({
      success: true,
      recipient_count: recipientCount,
      email_count: emailCount,
      push_count: pushTokens.length,
      message: `Marketing notification sent to ${recipientCount} users (${emailCount} emails, ${pushTokens.length} push notifications)`
    });
  } catch (error) {
    console.error('Error sending marketing notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send marketing notification'
    });
  }
}

// For GET requests
async function handler(req, res, passedSupabaseClient = null) {
  try {
    const method = req.method || 'GET';
    if (method === 'POST') {
      return await sendMarketingNotification(req, res, passedSupabaseClient);
    } else {
      return await getMarketingHistory(req, res, passedSupabaseClient);
    }
  } catch (error) {
    console.error('Error in marketing handler:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = {
  default: handler,
  getMarketingHistory,
  sendMarketingNotification
};

