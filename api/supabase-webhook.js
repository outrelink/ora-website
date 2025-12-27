/**
 * Supabase Webhook Handler
 * Handles webhook events from Supabase (e.g., user signups)
 * Sends welcome emails via Zoho Mail when new users sign up
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { generateEmailTemplate, generatePlainTextTemplate } = require('../lib/admin/email-template');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get Zoho configuration
const zohoEmail = (process.env.ZOHO_EMAIL || '').trim();
const zohoPassword = (process.env.ZOHO_PASSWORD || '').trim();
const zohoFromEmail = (process.env.ZOHO_FROM_EMAIL || zohoEmail).trim();
const zohoSmtpHost = process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.eu';
const zohoSmtpPort = parseInt(process.env.ZOHO_SMTP_PORT || '587', 10);

// Create Zoho transporter (reusable)
let zohoTransporter = null;

function getZohoTransporter() {
  if (!zohoTransporter && zohoEmail && zohoPassword) {
    zohoTransporter = nodemailer.createTransport({
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
  }
  return zohoTransporter;
}

/**
 * Send welcome email to new user
 * Uses template from database (managed by admin panel)
 */
async function sendWelcomeEmail(userEmail, displayName) {
  try {
    // Check if auto-send is enabled and get template from database
    const { data: settings, error: settingsError } = await supabase
      .from('welcome_email_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error('Could not load welcome email settings:', settingsError);
      return { success: false, error: 'Welcome email settings not found' };
    }

    // Check if auto-send is enabled
    if (!settings.auto_send) {
      console.log('Auto-send welcome emails is disabled in admin panel');
      return { success: false, error: 'Auto-send is disabled' };
    }

    const transporter = getZohoTransporter();
    if (!transporter) {
      console.error('Zoho Mail not configured - skipping welcome email');
      return { success: false, error: 'Zoho Mail not configured' };
    }

    // Generate HTML email with branding
    const emailHtml = generateEmailTemplate({
      subject: settings.subject || 'Welcome to ORA!',
      message: settings.message || '',
      displayName: displayName || 'Creator',
      primaryColor: '#f97316',
      replyTo: zohoFromEmail
    });

    const emailText = generatePlainTextTemplate({
      message: settings.message || '',
      displayName: displayName || 'Creator'
    });

    const mailOptions = {
      from: `ORA <${zohoFromEmail}>`,
      to: userEmail,
      subject: settings.subject || 'Welcome to ORA!',
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
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  // Verify webhook secret if set
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = req.headers['x-supabase-webhook-secret'];
    if (providedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const event = req.body;

    // Handle user.created event (new user signup)
    if (event.type === 'user.created' || (event.record && event.record.email)) {
      const userEmail = event.record?.email || event.user?.email;
      const displayName = event.record?.raw_user_meta_data?.display_name || 
                         event.user?.user_metadata?.display_name ||
                         userEmail?.split('@')[0] || 'Creator';

      if (userEmail) {
        console.log('New user signup detected:', userEmail);
        
        // Send welcome email asynchronously (don't block the response)
        sendWelcomeEmail(userEmail, displayName).catch(err => {
          console.error('Failed to send welcome email:', err);
        });

        return res.json({ 
          success: true, 
          message: 'Welcome email queued',
          userEmail 
        });
      }
    }

    // Handle other events if needed
    return res.json({ 
      success: true, 
      message: 'Webhook received',
      eventType: event.type 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

