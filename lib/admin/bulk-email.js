/**
 * Bulk Email API Handler
 * Handles sending bulk emails to multiple users individually
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Check admin authentication
function checkAuth(req) {
  const adminToken = req.headers['x-admin-token'] || req.query.token || req.body.token;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;
  
  return adminToken === expectedToken || adminToken === adminPassword;
}

/**
 * Get users for bulk email
 */
async function getBulkEmailUsers(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { type } = req.query; // 'all', 'subscribed', 'free'

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, display_name');

    if (type === 'subscribed') {
      // Get users with active subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active');
      
      const userIds = subscriptions?.map(s => s.user_id) || [];
      if (userIds.length > 0) {
        query = query.in('id', userIds);
      } else {
        return res.json({ success: true, users: [] });
      }
    } else if (type === 'free') {
      // Get users without active subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active');
      
      const subscribedUserIds = subscriptions?.map(s => s.user_id) || [];
      if (subscribedUserIds.length > 0) {
        query = query.not('id', 'in', `(${subscribedUserIds.join(',')})`);
      }
    }

    const { data: users, error } = await query;

    if (error) throw error;

    return res.json({
      success: true,
      users: (users || []).map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name || u.full_name || u.email.split('@')[0]
      }))
    });
  } catch (error) {
    console.error('Error in getBulkEmailUsers:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

// Handler
async function handler(req, res) {
  return await getBulkEmailUsers(req, res);
}

module.exports = {
  default: handler,
  getBulkEmailUsers
};

