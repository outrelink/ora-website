/**
 * Server-side Receipt Verification Endpoint
 * POST /api/verify-receipt
 * 
 * Verifies receipts with Apple (production → sandbox fallback)
 * Saves to iap_receipts and updates subscriptions table
 */

const https = require('https');

// App Store Shared Secret (from environment variable)
const APP_SHARED_SECRET = process.env.APP_SHARED_SECRET || 'f138bdc23d8e4181876ed20cefa7dc42';

/**
 * Verify receipt with Apple
 */
async function verifyWithApple(rawReceipt, useSandbox = false) {
  const url = useSandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  const body = JSON.stringify({
    'receipt-data': rawReceipt,
    'password': APP_SHARED_SECRET,
    'exclude-old-transactions': false
  });

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Apple response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Map product ID to plan name
 */
function productIdToPlan(productId) {
  if (!productId) return 'free';
  
  const id = productId.toLowerCase();
  if (id.includes('essentials')) return 'essentials';
  if (id.includes('pro')) return 'pro';
  if (id.includes('elite')) return 'elite';
  
  return 'free';
}

/**
 * Calculate period end from purchase date
 */
function calculatePeriodEnd(purchaseDateMs, billingPeriod = 'month') {
  const purchaseDate = new Date(parseInt(purchaseDateMs) || Date.now());
  const periodMs = billingPeriod === 'year' 
    ? 365 * 24 * 60 * 60 * 1000 
    : 30 * 24 * 60 * 60 * 1000;
  
  return new Date(purchaseDate.getTime() + periodMs).toISOString();
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, rawReceipt, productId, userId } = req.body;

    // Validate required fields
    if (!transactionId || !rawReceipt || !productId) {
      return res.status(400).json({ 
        error: 'Missing required fields: transactionId, rawReceipt, productId' 
      });
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try production verification first
    let appleResp = await verifyWithApple(rawReceipt, false);

    // If Apple says sandbox receipt in production (status 21007), try sandbox endpoint
    if (appleResp?.status === 21007) {
      console.log('Receipt is from sandbox, retrying with sandbox endpoint...');
      appleResp = await verifyWithApple(rawReceipt, true);
    }

    // Determine verification status
    const verificationStatus = appleResp?.status === 0 ? 'verified' : 'failed';

    // Save verification result to iap_receipts
    const { error: receiptError } = await supabase
      .from('iap_receipts')
      .upsert({
        transaction_id: transactionId,
        user_id: userId || null,
        product_id: productId,
        raw_receipt: typeof rawReceipt === 'string' ? rawReceipt : JSON.stringify(rawReceipt),
        verification_status: verificationStatus,
        verification_response: appleResp,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'transaction_id'
      });

    if (receiptError) {
      console.error('Error saving receipt:', receiptError);
      // Continue anyway - don't fail the request
    }

    // If verified, update subscriptions table
    if (appleResp?.status === 0) {
      // Extract subscription info from Apple response
      const latestReceiptInfo = appleResp.latest_receipt_info?.[0] || appleResp.receipt?.in_app?.[0];
      
      if (!latestReceiptInfo) {
        console.warn('No receipt info found in Apple response');
        return res.json({ 
          ok: true, 
          verified: false, 
          error: 'No receipt info in Apple response',
          appleResp 
        });
      }

      const purchaseDateMs = latestReceiptInfo.purchase_date_ms || latestReceiptInfo.original_purchase_date_ms;
      const expiresDateMs = latestReceiptInfo.expires_date_ms;
      
      const currentPeriodStart = purchaseDateMs 
        ? new Date(parseInt(purchaseDateMs)).toISOString()
        : new Date().toISOString();
      
      const currentPeriodEnd = expiresDateMs
        ? new Date(parseInt(expiresDateMs)).toISOString()
        : calculatePeriodEnd(purchaseDateMs || Date.now(), 'month');

      const originalTransactionId = latestReceiptInfo.original_transaction_id || transactionId;
      const plan = productIdToPlan(productId);

      // Upsert subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          iap_transaction_id: transactionId,
          iap_original_transaction_id: originalTransactionId,
          user_id: userId || null,
          plan: plan,
          status: 'active',
          iap_product_id: productId,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'iap_transaction_id'
        });

      if (subError) {
        console.error('Error updating subscription:', subError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to update subscription',
          details: subError.message 
        });
      }

      return res.json({ 
        ok: true, 
        verified: true, 
        plan: plan,
        appleResp: {
          status: appleResp.status,
          environment: appleResp.environment
        }
      });
    }

    // Verification failed
    return res.json({ 
      ok: true, 
      verified: false, 
      error: `Apple verification failed with status: ${appleResp?.status}`,
      appleResp: {
        status: appleResp?.status,
        error: appleResp?.error || 'Unknown error'
      }
    });

  } catch (error) {
    console.error('Receipt verification error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Internal server error' 
    });
  }
};
