/**
 * Email History API Handler
 * GET /api/admin?type=email-history
 * Retrieves email logs from the database
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
 * Get email history
 */
async function getEmailHistory(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);

  try {
    const { 
      type = 'all', // 'all', 'individual', 'welcome', 'bulk', 'marketing'
      status = 'all', // 'all', 'sent', 'failed'
      limit: limitParam = 50,
      offset: offsetParam = 0,
      search = '' // Search by email or subject
    } = req.query;
    
    // Parse limit and offset as integers
    const limit = parseInt(limitParam, 10) || 50;
    const offset = parseInt(offsetParam, 10) || 0;

    if (!supabase) {
      return res.json({
        success: true,
        emails: [],
        total: 0,
        message: 'Supabase not configured'
      });
    }

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' });

    // Filter by type
    if (type !== 'all') {
      query = query.eq('email_type', type);
    }

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Search by email or subject
    if (search) {
      query = query.or(`to_email.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    // Order by sent_at descending (newest first)
    query = query.order('sent_at', { ascending: false });

    // Apply pagination (ensure valid integers)
    const validOffset = Math.max(0, parseInt(offset, 10) || 0);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    query = query.range(validOffset, validOffset + validLimit - 1);
    
    // Store for response
    const finalLimit = validLimit;
    const finalOffset = validOffset;

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('Error fetching email history:', error);
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          emails: [],
          total: 0,
          message: 'Email logs table not found. Run the migration to create it.'
        });
      }
      throw error;
    }

    // Format emails for display
    const formattedEmails = (emails || []).map(email => ({
      id: email.id,
      to: email.to_email,
      from: email.from_email,
      subject: email.subject,
      message: email.message,
      messageHtml: email.message_html,
      type: email.email_type,
      recipientType: email.recipient_type,
      recipientCount: email.recipient_count || 1,
      useHtmlTemplate: email.use_html_template || false,
      sentAt: email.sent_at,
      sentBy: email.sent_by,
      status: email.status || 'sent',
      errorMessage: email.error_message,
      metadata: email.metadata || {}
    }));

    return res.json({
      success: true,
      emails: formattedEmails,
      total: count || 0,
      limit: finalLimit,
      offset: finalOffset
    });
  } catch (error) {
    console.error('Error in email history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = {
  default: getEmailHistory,
  getEmailHistory
};

