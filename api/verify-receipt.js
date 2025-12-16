/**
 * Server-side Receipt Verification Endpoint
 * POST /api/verify-receipt
 * 
 * Verifies receipts with Apple (production → sandbox fallback)
 * Saves to iap_receipts and updates subscriptions table
 */

const https = require('https');

const APP_SHARED_SECRET = process.env.APP_SHARED_SECRET;

function productIdToPlan(productId) {
  if (!productId) return 'free';
  const id = productId.toLowerCase();
  if (id.includes('essentials')) return 'essentials';
  if (id.includes('pro')) return 'pro';
  if (id.includes('elite')) return 'elite';
  return 'free';
}

function calculatePeriodEnd(purchaseDateMs, billingPeriod = 'month') {
  const purchaseDate = new Date(parseInt(purchaseDateMs) || Date.now());
  const periodMs = billingPeriod === 'year' ? 365*24*60*60*1000 : 30*24*60*60*1000;
  return new Date(purchaseDate.getTime() + periodMs).toISOString();
}

async function verifyWithApple(rawReceipt, useSandbox = false) {
  const url = useSandbox ? 'https://sandbox.itunes.apple.com/verifyReceipt' : 'https://buy.itunes.apple.com/verifyReceipt';
  const body = JSON.stringify({ 
    'receipt-data': rawReceipt, 
    'password': APP_SHARED_SECRET, 
    'exclude-old-transactions': false 
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json', 
        'Content-Length': Buffer.byteLength(body) 
      } 
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { 
        try { 
          resolve(JSON.parse(data)); 
        } catch(e) { 
          reject(e); 
        } 
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transactionId, rawReceipt, productId, userId, email } = req.body;

    if (!transactionId || !rawReceipt || !productId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Production -> sandbox fallback
    let appleResp = await verifyWithApple(rawReceipt, false);
    if (appleResp?.status === 21007) appleResp = await verifyWithApple(rawReceipt, true);

    const verificationStatus = appleResp?.status === 0 ? 'verified' : 'failed';

    // Pick latest transaction from latest_receipt_info
    const latestReceiptInfoArray = appleResp.latest_receipt_info || appleResp.receipt?.in_app || [];
    const latestReceiptInfo = latestReceiptInfoArray.reduce((latest, item) => {
      const itemDate = parseInt(item.expires_date_ms || item.purchase_date_ms || 0);
      const latestDate = parseInt(latest?.expires_date_ms || latest?.purchase_date_ms || 0);
      return itemDate > latestDate ? item : latest;
    }, {});

    const purchaseDateMs = latestReceiptInfo?.purchase_date_ms || latestReceiptInfo?.original_purchase_date_ms || Date.now();
    const expiresDateMs = latestReceiptInfo?.expires_date_ms;
    const currentPeriodStart = new Date(parseInt(purchaseDateMs)).toISOString();
    const currentPeriodEnd = expiresDateMs ? new Date(parseInt(expiresDateMs)).toISOString() : calculatePeriodEnd(purchaseDateMs, 'month');
    const originalTransactionId = latestReceiptInfo?.original_transaction_id || transactionId;
    const plan = productIdToPlan(productId);

    // Save receipt
    await supabase.from('iap_receipts').upsert({
      transaction_id: transactionId,
      user_id: userId || null,
      email: email || null,
      product_id: productId,
      raw_receipt: typeof rawReceipt === 'string' ? rawReceipt : JSON.stringify(rawReceipt),
      verification_status: verificationStatus,
      verification_response: appleResp,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'transaction_id' });

    // Update subscription if verified
    if (appleResp?.status === 0 && latestReceiptInfo) {
      await supabase.from('subscriptions').upsert({
        iap_transaction_id: transactionId,
        iap_original_transaction_id: originalTransactionId,
        user_id: userId || null,
        plan,
        status: 'active',
        iap_product_id: productId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      }, { onConflict: 'iap_transaction_id' });
    }

    return res.json({ ok: true, verified: appleResp?.status === 0, plan, appleResp });
  } catch (err) {
    console.error('Receipt verification error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
};
