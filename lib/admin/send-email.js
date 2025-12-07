/**
 * Admin Send Email API
 * POST /api/admin/send-email
 * Sends custom emails to users from the admin dashboard using Zoho Mail SMTP
 * 
 * Required Environment Variables:
 * - ZOHO_EMAIL: Your Zoho email address for authentication (e.g., noreply@myora.co)
 * - ZOHO_PASSWORD: Your Zoho app-specific password (not your regular password)
 * 
 * Optional Environment Variables:
 * - ZOHO_FROM_EMAIL: Email address to send from (defaults to ZOHO_EMAIL)
 *   Use support@myora.co or help@myora.co for replyable support emails
 * - ZOHO_HELLO_EMAIL: Email address for bulk emails (defaults to ZOHO_FROM_EMAIL)
 *   Use hello@myora.co for bulk emails and newsletters
 * - ZOHO_SMTP_HOST: SMTP server (default: smtp.zoho.com or smtppro.zoho.eu)
 * - ZOHO_SMTP_PORT: SMTP port (default: 587 for TLS)
 */

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.error('nodemailer not installed. Run: npm install nodemailer');
}

const { createClient } = require('@supabase/supabase-js');
const { generateEmailTemplate, generatePlainTextTemplate } = require('./email-template');

// Initialize Supabase for email logging
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = async (req, res) => {
  // Check admin authentication
  const adminToken = req.headers['x-admin-token'] || req.query.token || req.body.token;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;
  
  if (adminToken !== expectedToken && adminToken !== adminPassword) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { to, subject, message, isHtml, useHtmlTemplate } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'to, subject, and message are required' 
      });
    }

    // Check if nodemailer is available
    if (!nodemailer) {
      return res.status(500).json({ 
        success: false,
        error: 'Email service not configured. Please install nodemailer: npm install nodemailer' 
      });
    }

    // Get Zoho configuration from environment variables
    // Trim whitespace to avoid common copy-paste issues
    const zohoEmail = (process.env.ZOHO_EMAIL || '').trim();
    const zohoPassword = (process.env.ZOHO_PASSWORD || '').trim();
    // Support email for "from" address (defaults to ZOHO_EMAIL if not set)
    // Use support@myora.co or help@myora.co for replyable emails
    // For bulk emails, use ZOHO_HELLO_EMAIL if set, otherwise ZOHO_FROM_EMAIL
    const useHelloEmail = req.body.useHelloEmail || false;
    const zohoFromEmail = useHelloEmail 
      ? (process.env.ZOHO_HELLO_EMAIL || process.env.ZOHO_FROM_EMAIL || zohoEmail).trim()
      : (process.env.ZOHO_FROM_EMAIL || zohoEmail).trim();
    
    // Use explicit SMTP host if set, otherwise try to detect
    // For custom domains with Zoho EU, you need to explicitly set ZOHO_SMTP_HOST
    let zohoSmtpHost = process.env.ZOHO_SMTP_HOST;
    if (!zohoSmtpHost) {
      // Try to detect based on email or default to US
      // Note: Custom domains (like myora.co) won't auto-detect, so set ZOHO_SMTP_HOST explicitly
      if (zohoEmail.includes('.eu') || zohoEmail.match(/@.*\.(eu|de|fr|it|es|nl|be|at|ch|pl|cz|se|no|dk|fi)/i)) {
        zohoSmtpHost = 'smtppro.zoho.eu';
      } else {
        zohoSmtpHost = 'smtp.zoho.com';
      }
    }
    zohoSmtpHost = zohoSmtpHost.trim();
    
    const zohoSmtpPort = parseInt(process.env.ZOHO_SMTP_PORT || '587', 10);
    
    // Validate password format (Zoho app passwords are typically 16 characters, alphanumeric)
    if (zohoPassword.length < 8) {
      console.warn('Warning: Zoho app password seems too short. App passwords are typically 16 characters.');
    }

    if (!zohoEmail || !zohoPassword) {
      console.error('Missing Zoho Mail configuration:', {
        hasEmail: !!zohoEmail,
        hasPassword: !!zohoPassword,
        emailLength: zohoEmail ? zohoEmail.length : 0,
        passwordLength: zohoPassword ? zohoPassword.length : 0,
        envKeys: Object.keys(process.env).filter(k => k.includes('ZOHO'))
      });
      return res.status(500).json({ 
        success: false,
        error: 'Zoho Mail configuration missing. Please set ZOHO_EMAIL and ZOHO_PASSWORD environment variables in your deployment settings (e.g., Vercel).\n\nTo get an app-specific password:\n1. Go to Zoho Account Security\n2. Enable 2-Factor Authentication\n3. Generate an App-Specific Password\n4. Use that password in ZOHO_PASSWORD' 
      });
    }

    // Log configuration (without password) for debugging
    console.log('Zoho SMTP Configuration:', {
      email: zohoEmail,
      host: zohoSmtpHost,
      port: zohoSmtpPort,
      passwordLength: zohoPassword.length,
      passwordStartsWith: zohoPassword.substring(0, 2) + '...'
    });

    // Try multiple SMTP configurations (different ports/security)
    // For Zoho EU, use smtppro.zoho.eu
    const smtpConfigs = [
      {
        host: zohoSmtpHost,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          // Always use ZOHO_EMAIL for authentication (SMTP login)
          // ZOHO_FROM_EMAIL is only used for the "from" address
          user: zohoEmail,
          pass: zohoPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      },
      {
        host: zohoSmtpHost,
        port: 465,
        secure: true,
        auth: {
          // Always use ZOHO_EMAIL for authentication (SMTP login)
          // ZOHO_FROM_EMAIL is only used for the "from" address
          user: zohoEmail,
          pass: zohoPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    ];

    let transporter = null;
    let lastError = null;

    // Try each configuration
    for (const config of smtpConfigs) {
      try {
        transporter = nodemailer.createTransport(config);
        await transporter.verify();
        console.log('Zoho SMTP connection successful with config:', { port: config.port, secure: config.secure });
        break; // Success, exit loop
      } catch (error) {
        console.error(`Zoho SMTP verification failed for port ${config.port}:`, error.message);
        lastError = error;
        transporter = null;
        continue; // Try next configuration
      }
    }

    if (!transporter) {
      console.error('All Zoho SMTP configurations failed. Last error:', lastError);
      const isEU = zohoSmtpHost.includes('.eu');
      return res.status(500).json({ 
        success: false,
        error: `Failed to authenticate with Zoho Mail. Please verify:\n\n1. Your email address (${zohoEmail}) is correct\n2. The app-specific password is correct (16 characters, no spaces)\n3. 2FA is enabled on your Zoho account\n4. The app-specific password was generated for SMTP access\n5. If using Zoho EU, make sure ZOHO_SMTP_HOST is set to "smtppro.zoho.eu" in Vercel\n\nCurrent SMTP Host: ${zohoSmtpHost}\nError: ${lastError?.message || 'Unknown error'}\n\nTroubleshooting:\n- For Zoho EU accounts, add environment variable: ZOHO_SMTP_HOST = smtppro.zoho.eu\n- Regenerate the app-specific password and update ZOHO_PASSWORD in Vercel\n- Make sure there are no extra spaces in the password` 
      });
    }

    // Generate email content
    let emailText = message.trim();
    let emailHtml = undefined;

    // If HTML template is requested, generate branded HTML email
    if (useHtmlTemplate || isHtml) {
      emailHtml = generateEmailTemplate({
        subject: subject.trim(),
        message: message.trim(),
        displayName: to.split('@')[0], // Use email prefix as display name if not provided
        primaryColor: '#f97316',
        replyTo: zohoFromEmail
      });
      emailText = generatePlainTextTemplate({
        message: message.trim(),
        displayName: to.split('@')[0]
      });
    } else if (isHtml) {
      // Custom HTML provided
      emailHtml = message.trim();
      emailText = undefined;
    } else {
      // Plain text
      emailText = message.trim();
    }

    // Send email
    // Use ZOHO_FROM_EMAIL if set (for replyable support emails), otherwise use ZOHO_EMAIL
    const mailOptions = {
      from: `ORA <${zohoFromEmail}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: emailText,
      html: emailHtml,
      replyTo: zohoFromEmail // Allow replies to go to the from address
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: to.trim(),
      subject: subject.trim()
    });

    // Log email to database
    if (supabase) {
      try {
        await supabase.from('email_logs').insert({
          to_email: to.trim(),
          from_email: zohoFromEmail,
          subject: subject.trim(),
          message: emailText || '',
          message_html: emailHtml || null,
          email_type: 'individual',
          recipient_count: 1,
          use_html_template: useHtmlTemplate || false,
          status: 'sent',
          metadata: {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
          }
        });
      } catch (logError) {
        console.error('Failed to log email to database:', logError);
        // Don't fail the request if logging fails
      }
    }

    return res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      }
    });
  } catch (error) {
    console.error('Error in admin send-email:', error);
    
    // Log failed email to database
    if (supabase && to && subject) {
      try {
        await supabase.from('email_logs').insert({
          to_email: to.trim(),
          from_email: zohoFromEmail || process.env.ZOHO_EMAIL || '',
          subject: subject.trim(),
          message: message?.trim() || '',
          email_type: 'individual',
          recipient_count: 1,
          status: 'failed',
          error_message: error.message || 'Unknown error',
          metadata: {
            errorCode: error.code,
            errorStack: error.stack
          }
        });
      } catch (logError) {
        console.error('Failed to log failed email to database:', logError);
      }
    }
    
    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your Zoho email and app-specific password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to Zoho SMTP server. Please check your SMTP settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

