/**
 * Creator Pool API Handler
 * Manages a pool of creator email addresses for easy access when sending emails
 * GET /api/admin?type=creator-pool - List all creators
 * POST /api/admin?type=creator-pool - Add a creator
 * PUT /api/admin?type=creator-pool - Update a creator
 * DELETE /api/admin?type=creator-pool - Delete a creator
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
 * Get all creators from pool
 */
async function getCreatorPool(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);

  try {
    if (!supabase) {
      return res.json({
        success: true,
        creators: [],
        message: 'Supabase not configured'
      });
    }

    const { data: creators, error } = await supabase
      .from('creator_pool')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          creators: [],
          message: 'Creator pool table not found. Run the migration to create it.'
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      creators: creators || []
    });
  } catch (error) {
    console.error('Error fetching creator pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch creator pool',
      message: error.message
    });
  }
}

/**
 * Add a creator to the pool
 */
async function addCreatorToPool(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);

  try {
    const { email, display_name, social_media, category, notes } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Supabase not configured'
      });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('creator_pool')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'This email address is already in the pool'
      });
    }

    const { data: creator, error } = await supabase
      .from('creator_pool')
      .insert({
        email: email.toLowerCase().trim(),
        display_name: display_name || null,
        social_media: social_media || null,
        category: category || null,
        notes: notes || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, provide helpful error
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.status(500).json({
          success: false,
          error: 'Creator pool table not found. Please run the database migration to create it.',
          message: 'Table "creator_pool" does not exist'
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      creator: creator
    });
  } catch (error) {
    console.error('Error adding creator to pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add creator to pool',
      message: error.message
    });
  }
}

/**
 * Update a creator in the pool
 */
async function updateCreatorInPool(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);

  try {
    const { id, email, display_name, social_media, category, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Supabase not configured'
      });
    }

    const updateData = {};
    if (email) updateData.email = email.toLowerCase().trim();
    if (display_name !== undefined) updateData.display_name = display_name || null;
    if (social_media !== undefined) updateData.social_media = social_media || null;
    if (category !== undefined) updateData.category = category || null;
    if (notes !== undefined) updateData.notes = notes || null;
    updateData.updated_at = new Date().toISOString();

    // If email is being updated, check for duplicates
    if (email) {
      const { data: existing } = await supabase
        .from('creator_pool')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .neq('id', id)
        .single();

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'This email address is already in the pool'
        });
      }
    }

    const { data: creator, error } = await supabase
      .from('creator_pool')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.status(500).json({
          success: false,
          error: 'Creator pool table not found'
        });
      }
      throw error;
    }

    if (!creator) {
      return res.status(404).json({
        success: false,
        error: 'Creator not found'
      });
    }

    return res.json({
      success: true,
      creator: creator
    });
  } catch (error) {
    console.error('Error updating creator in pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update creator',
      message: error.message
    });
  }
}

/**
 * Delete a creator from the pool
 */
async function deleteCreatorFromPool(req, res, passedSupabaseClient = null) {
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient(passedSupabaseClient);

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Supabase not configured'
      });
    }

    const { error } = await supabase
      .from('creator_pool')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return res.status(500).json({
          success: false,
          error: 'Creator pool table not found'
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      message: 'Creator removed from pool'
    });
  } catch (error) {
    console.error('Error deleting creator from pool:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete creator',
      message: error.message
    });
  }
}

/**
 * Main handler - routes requests based on HTTP method
 */
async function handler(req, res, passedSupabaseClient = null) {
  const method = req.method || 'GET';
  
  try {
    if (method === 'GET') {
      return await getCreatorPool(req, res, passedSupabaseClient);
    } else if (method === 'POST') {
      return await addCreatorToPool(req, res, passedSupabaseClient);
    } else if (method === 'PUT') {
      return await updateCreatorInPool(req, res, passedSupabaseClient);
    } else if (method === 'DELETE') {
      return await deleteCreatorFromPool(req, res, passedSupabaseClient);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Error in creator pool handler:', error);
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
  getCreatorPool,
  addCreatorToPool,
  updateCreatorInPool,
  deleteCreatorFromPool
};

