/**
 * Process Post-Purchase Queue
 * POST /api/process-queue (or run as cron job)
 * 
 * Background worker that processes pending items in post_purchase_queue
 * Calls /verify-receipt for each pending transaction
 * Implements exponential backoff for retries
 */

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 60000; // 1 minute
const MAX_DELAY_MS = 3600000; // 1 hour

/**
 * Calculate next attempt time with exponential backoff
 */
function calculateNextAttempt(attempts) {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempts), MAX_DELAY_MS);
  return new Date(Date.now() + delay).toISOString();
}

/**
 * Call verify-receipt endpoint
 */
async function verifyReceipt(payload) {
  const verifyUrl = process.env.VERIFY_RECEIPT_URL || 'https://myora.co/api/verify-receipt';
  
  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transactionId: payload.transactionId,
      rawReceipt: payload.rawReceipt,
      productId: payload.productId,
      userId: payload.userId
    })
  });

  if (!response.ok) {
    throw new Error(`Verify receipt failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Security: Check CRON_SECRET for cron job invocations
  // Vercel adds Authorization header with CRON_SECRET for cron jobs
  // For manual POST requests, you can skip this check or use the same secret
  const authHeader = req.headers.authorization || req.headers.get?.('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it for all requests
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Accept both GET (from cron) and POST (manual) requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending items (next_attempt_at <= now, attempts < MAX_ATTEMPTS)
    const { data: pendingItems, error: fetchError } = await supabase
      .from('post_purchase_queue')
      .select('*')
      .lte('next_attempt_at', new Date().toISOString())
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      console.error('Error fetching queue items:', fetchError);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to fetch queue items',
        details: fetchError.message 
      });
    }

    if (!pendingItems || pendingItems.length === 0) {
      return res.json({ 
        ok: true, 
        message: 'No pending items to process',
        processed: 0 
      });
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0
    };

    // Process each item
    for (const item of pendingItems) {
      try {
        results.processed++;

        // Call verify-receipt endpoint
        const verifyResult = await verifyReceipt(item.payload);

        if (verifyResult.ok && verifyResult.verified) {
          // Success - remove from queue
          await supabase
            .from('post_purchase_queue')
            .delete()
            .eq('id', item.id);

          results.succeeded++;
          console.log(`✓ Processed transaction ${item.transaction_id} successfully`);
        } else {
          // Verification failed - retry with backoff
          const newAttempts = item.attempts + 1;
          const nextAttempt = calculateNextAttempt(newAttempts);

          await supabase
            .from('post_purchase_queue')
            .update({
              attempts: newAttempts,
              next_attempt_at: nextAttempt,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          results.retried++;
          console.log(`⚠ Retrying transaction ${item.transaction_id} (attempt ${newAttempts}/${MAX_ATTEMPTS})`);
        }

      } catch (error) {
        // Error processing - retry with backoff
        const newAttempts = item.attempts + 1;
        const nextAttempt = calculateNextAttempt(newAttempts);

        await supabase
          .from('post_purchase_queue')
          .update({
            attempts: newAttempts,
            next_attempt_at: nextAttempt,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        results.failed++;
        console.error(`✗ Error processing transaction ${item.transaction_id}:`, error.message);
      }
    }

    return res.json({ 
      ok: true, 
      message: 'Queue processing complete',
      results 
    });

  } catch (error) {
    console.error('Queue processing error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Internal server error' 
    });
  }
};
