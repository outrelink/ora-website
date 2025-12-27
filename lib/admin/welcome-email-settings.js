/**
 * Welcome Email Settings API Handler
 * Manages welcome email template and auto-send settings
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Check admin authentication
function checkAuth(req) {
  const adminToken = req.headers['x-admin-token'] || req.query.token || req.body.token;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;
  
  return adminToken === expectedToken || adminToken === adminPassword;
}

/**
 * Get welcome email settings
 */
async function getWelcomeEmailSettings(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { data: settings, error } = await supabase
      .from('welcome_email_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching welcome email settings:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch welcome email settings' 
      });
    }

    // Return default if no settings found
    if (!settings) {
      return res.json({
        success: true,
        settings: {
          subject: 'Welcome to ORA!',
          message: 'Welcome to ORA, {{displayName}}!\n\nThank you for joining ORA. We\'re here to help you manage your creator business and ensure you get paid fairly for your work.\n\nHere\'s what you can do with ORA:\n\n• Calculate your rates with our pricing calculator\n• Track your deals and payments\n• Generate professional quotes and media kits\n• Analyze contracts before signing\n• Manage your brand partnerships\n\nIf you have any questions, feel free to reach out to us.\n\nBest regards,\nThe ORA Team\n\n---\n© 2025 ORA. All rights reserved.\nVisit us at https://myora.co',
          auto_send: true
        }
      });
    }

    return res.json({
      success: true,
      settings: {
        subject: settings.subject,
        message: settings.message,
        auto_send: settings.auto_send !== false
      }
    });
  } catch (error) {
    console.error('Error in getWelcomeEmailSettings:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

/**
 * Save welcome email settings
 */
async function saveWelcomeEmailSettings(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { subject, message, auto_send } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subject and message are required' 
      });
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('welcome_email_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('welcome_email_settings')
        .update({
          subject: subject.trim(),
          message: message.trim(),
          auto_send: auto_send !== false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('welcome_email_settings')
        .insert({
          subject: subject.trim(),
          message: message.trim(),
          auto_send: auto_send !== false
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.json({
      success: true,
      message: 'Welcome email settings saved successfully',
      settings: result
    });
  } catch (error) {
    console.error('Error in saveWelcomeEmailSettings:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

// Handler
async function handler(req, res) {
  if (req.method === 'POST') {
    return await saveWelcomeEmailSettings(req, res);
  } else {
    return await getWelcomeEmailSettings(req, res);
  }
}

module.exports = {
  default: handler,
  getWelcomeEmailSettings,
  saveWelcomeEmailSettings
};

