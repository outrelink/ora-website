/**
 * Admin Waitlist API
 * GET /api/admin?type=waitlist
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = async (req, res) => {
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;

  if (adminToken !== expectedToken && adminToken !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!supabase) {
      return res.json({ 
        total: 0,
        waitlist: [],
        message: 'Supabase not configured'
      });
    }

    const { data, error } = await supabase
      .from('waitlist_signups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.json({
          total: 0,
          waitlist: [],
          message: 'Waitlist table not found'
        });
      }
      console.error('Error fetching waitlist signups:', error);
      return res.status(500).json({ 
        error: 'Failed to load waitlist data',
        message: error.message
      });
    }

    const waitlist = (data || []).map(entry => ({
      id: entry.id,
      email: entry.email,
      source: entry.source || 'unknown',
      metadata: entry.metadata || {},
      createdAt: entry.created_at,
      status: entry.status || 'pending'
    }));

    return res.json({
      total: waitlist.length,
      waitlist
    });
  } catch (error) {
    console.error('Error in admin waitlist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

