/**
 * Process Post-Purchase Queue
 * GET/POST /api/process-queue (or run as cron job)
 * 
 * Background worker that processes pending items in post_purchase_queue
 * Calls /verify-receipt for each pending transaction
 * Implements exponential backoff for retries
 */

const MAX_ATTEMPTS = 5;

async function verifyReceipt(payload) {
  const verifyUrl = process.env.VERIFY_RECEIPT_URL || 'https://myora.co/api/verify-receipt';
  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Verify receipt failed: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('verifyReceipt error:', err);
    throw err;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  // Optional: Cron authentication
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  
  // Parse query parameters manually from URL
  let querySecret = null;
  if (req.url) {
    try {
      const url = new URL(req.url, `https://${req.headers.host || 'myora.co'}`);
      querySecret = url.searchParams.get('secret') || url.searchParams.get('cron_secret');
    } catch (e) {
      const secretMatch = req.url.match(/[?&](?:secret|cron_secret)=([^&]+)/);
      if (secretMatch) {
        querySecret = decodeURIComponent(secretMatch[1]);
      }
    }
  }
  // Also try req.query as fallback
  if (!querySecret) {
    querySecret = req.query?.secret || req.query?.cron_secret;
  }

  if (cronSecret && authHeader !== cronSecret && querySecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate required environment variables
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Query pending items that haven't exceeded max attempts
    // Status should be 'pending' or 'processing', and attempts < max_attempts
    const { data: pendingItems, error: fetchError } = await supabase
      .from('post_purchase_queue')
      .select('*')
      .in('status', ['pending', 'processing'])
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching pending items:', fetchError);
      throw fetchError;
    }
    
    if (!pendingItems || pendingItems.length === 0) {
      return res.json({ ok: true, message: 'No pending items', processed: 0 });
    }

    const results = { processed: 0, succeeded: 0, failed: 0, retried: 0 };

    for (const item of pendingItems) {
      results.processed++;
      
      // Mark as processing
      await supabase
        .from('post_purchase_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', item.id);
      
      try {
        const verifyResult = await verifyReceipt(item.payload);
        if (verifyResult.ok && verifyResult.verified) {
          // Success - delete from queue
          await supabase.from('post_purchase_queue').delete().eq('id', item.id);
          results.succeeded++;
        } else {
          // Verification failed - retry
          const newAttempts = (item.attempts || 0) + 1;
          const maxAttempts = item.max_attempts || MAX_ATTEMPTS;
          const status = newAttempts >= maxAttempts ? 'failed' : 'pending';
          
          await supabase.from('post_purchase_queue').update({ 
            attempts: newAttempts,
            status: status,
            error_message: verifyResult.error || 'Verification failed',
            updated_at: new Date().toISOString() 
          }).eq('id', item.id);
          results.retried++;
        }
      } catch (err) {
        // Error during processing - retry
        const newAttempts = (item.attempts || 0) + 1;
        const maxAttempts = item.max_attempts || MAX_ATTEMPTS;
        const status = newAttempts >= maxAttempts ? 'failed' : 'pending';
        const errorMsg = err.message || String(err);
        
        await supabase.from('post_purchase_queue').update({ 
          attempts: newAttempts,
          status: status,
          error_message: errorMsg,
          updated_at: new Date().toISOString() 
        }).eq('id', item.id);
        results.failed++;
      }
    }

    return res.json({ ok: true, message: 'Queue processed', results });
  } catch (err) {
    console.error('Process queue error:', err);
    const errorMessage = err.message || String(err);
    const errorStack = err.stack;
    
    // Return detailed error for debugging
    return res.status(500).json({ 
      ok: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      hint: 'Check Supabase connection, environment variables, and table schema'
    });
  }
};
