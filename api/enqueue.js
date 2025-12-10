/**
 * Enqueue Post-Purchase Job
 * POST /api/enqueue
 * 
 * Adds transaction to post_purchase_queue for background processing
 * Ensures idempotency (unique per transaction_id)
 */

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, rawReceipt, productId, userId, email } = req.body;

    // Validate required fields
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing required field: transactionId' });
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare payload
    const payload = {
      transactionId,
      rawReceipt: rawReceipt || null,
      productId: productId || null,
      userId: userId || null,
      email: email || null,
      enqueuedAt: new Date().toISOString()
    };

    // Log enqueue attempt
    console.log('[ENQUEUE] Attempting to enqueue transaction', {
      transactionId,
      productId,
      userId,
      timestamp: new Date().toISOString()
    });

    // Insert into queue (idempotent - unique constraint on transaction_id)
    const { data, error } = await supabase
      .from('post_purchase_queue')
      .upsert({
        transaction_id: transactionId,
        payload: payload,
        attempts: 0,
        next_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'transaction_id'
      })
      .select();
    
    // Log result
    if (error) {
      console.error('[ENQUEUE] Failed to enqueue transaction', {
        transactionId,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[ENQUEUE] Successfully enqueued transaction', {
        transactionId,
        productId,
        queueId: data?.[0]?.id,
        timestamp: new Date().toISOString()
      });
    }

    if (error) {
      // If it's a unique constraint violation, that's okay (idempotency)
      if (error.code === '23505') {
        return res.json({ 
          ok: true, 
          message: 'Transaction already enqueued',
          transactionId 
        });
      }

      console.error('Error enqueueing job:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to enqueue job',
        details: error.message 
      });
    }

    return res.json({ 
      ok: true, 
      message: 'Transaction enqueued successfully',
      transactionId,
      queueId: data?.[0]?.id 
    });

  } catch (error) {
    console.error('Enqueue error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Internal server error' 
    });
  }
};
