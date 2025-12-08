/**
 * Verify IAP Receipt
 * POST /api/verify-iap-receipt
 * Verifies Apple In-App Purchase receipts and saves subscriptions
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://uljciarseazzcqptwuly.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Apple's receipt verification URLs
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';

// Map product IDs to plans (Updated December 2025)
const PRODUCT_ID_TO_PLAN = {
  // New product IDs
  'com.myora.essentials.monthly': 'essentials',
  'com.myora.creator.pro.monthly': 'pro',
  'com.myora.creator.elite.monthly': 'elite',
  
  // Old product IDs (for backward compatibility)
  'com.myora.creator.monthly': 'essentials',
  'com.myora.pro.monthly': 'pro',
  'com.myora.premium.monthly': 'elite',
};

// Map plans to Stripe price IDs (if you want to sync with Stripe)
const PLAN_TO_STRIPE_PRICE = {
  essentials: process.env.STRIPE_PRICE_ESSENTIALS || process.env.STRIPE_PRICE_CREATOR || null,
  pro: process.env.STRIPE_PRICE_PRO || null,
  elite: process.env.STRIPE_PRICE_ELITE || process.env.STRIPE_PRICE_PREMIUM || null,
};

/**
 * Get human-readable status message for Apple receipt validation
 */
function getStatusMessage(status) {
  const statusMessages = {
    0: 'Valid receipt',
    21000: 'The App Store could not read the JSON object you provided',
    21002: 'The receipt data property was malformed or missing',
    21003: 'The receipt could not be authenticated',
    21004: 'The shared secret you provided does not match the shared secret on file',
    21005: 'The receipt server is not currently available',
    21006: 'This receipt is valid but the subscription has expired',
    21007: 'This receipt is from the test environment, but it was sent to the production environment for verification',
    21008: 'This receipt is from the production environment, but it was sent to the test environment for verification',
    21010: 'This receipt could not be authorized',
  };
  return statusMessages[status] || `Unknown error (status code: ${status})`;
}

/**
 * Verify receipt with Apple
 */
function verifyReceiptWithApple(receiptData, isProduction = true) {
  return new Promise((resolve, reject) => {
    const url = isProduction ? APPLE_PRODUCTION_URL : APPLE_SANDBOX_URL;
    const postData = JSON.stringify({
      'receipt-data': receiptData,
      'password': process.env.APPLE_SHARED_SECRET, // Get from App Store Connect
      'exclude-old-transactions': true,
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
    };

    const request = https.request(url, options, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse Apple response'));
        }
      });
    });

    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { receipt, transactionId, planId, userId, email } = req.body;

    if (!receipt || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields: receipt and transactionId' });
    }

    // Verify receipt with Apple
    // Apple's recommendation: Always try production first, then sandbox if needed
    // This handles the case where a production-signed app gets a receipt from the test environment
    // (common during App Review when reviewers use sandbox test accounts)
    let verificationResult;
    let isSandboxReceipt = false;
    
    try {
      // First, try production environment
      verificationResult = await verifyReceiptWithApple(receipt, true);
      
      // If status is 21007, this means "Sandbox receipt used in production"
      // This happens when a production-signed app gets a receipt from test environment
      // (This is expected during App Review - reviewers use sandbox accounts)
      if (verificationResult.status === 21007) {
        console.log('Production validation returned 21007 (sandbox receipt), retrying with sandbox...');
        isSandboxReceipt = true;
        // Retry with sandbox environment - this should succeed for sandbox receipts
        verificationResult = await verifyReceiptWithApple(receipt, false);
        
        // If sandbox validation also fails, log but don't expose internal details
        if (verificationResult.status !== 0) {
          console.error('Sandbox validation also failed:', {
            status: verificationResult.status,
            statusMessage: getStatusMessage(verificationResult.status)
          });
        }
      }
    } catch (error) {
      console.error('Error during receipt verification:', error);
      return res.status(500).json({ 
        error: 'Failed to verify receipt with Apple',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Check if verification was successful
    if (verificationResult.status !== 0) {
      // Log the error for debugging
      console.error('Receipt validation failed:', {
        status: verificationResult.status,
        isSandbox: isSandboxReceipt,
        statusMessage: getStatusMessage(verificationResult.status)
      });
      
      return res.status(400).json({ 
        error: `Receipt validation failed: ${getStatusMessage(verificationResult.status)}`,
        status: verificationResult.status,
        isSandbox: isSandboxReceipt
      });
    }

    // Extract subscription info from latest receipt
    const latestReceiptInfo = verificationResult.latest_receipt_info?.[0];
    if (!latestReceiptInfo) {
      return res.status(400).json({ error: 'No receipt info found' });
    }

    // Get plan from product ID or use provided planId
    const productId = latestReceiptInfo.product_id;
    const detectedPlan = PRODUCT_ID_TO_PLAN[productId] || planId;
    
    if (!detectedPlan) {
      return res.status(400).json({ error: 'Unknown product ID' });
    }

    // Calculate subscription dates
    const purchaseDate = new Date(parseInt(latestReceiptInfo.purchase_date_ms));
    const expiresDate = latestReceiptInfo.expires_date_ms 
      ? new Date(parseInt(latestReceiptInfo.expires_date_ms))
      : new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Check if subscription is still active
    const isActive = expiresDate > new Date();

    // Save to Supabase subscriptions table
    if (userId && userId !== 'guest' && !userId.startsWith('guest-')) {
      const subscriptionData = {
        user_id: userId,
        plan: detectedPlan,
        status: isActive ? 'active' : 'expired',
        iap_transaction_id: transactionId,
        iap_original_transaction_id: latestReceiptInfo.original_transaction_id,
        iap_product_id: productId,
        current_period_start: purchaseDate.toISOString(),
        current_period_end: expiresDate.toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert subscription (insert or update if exists)
      const { error: supabaseError } = await supabase
        .from('subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'iap_original_transaction_id',
        });

      if (supabaseError) {
        console.error('Error saving subscription to Supabase:', supabaseError);
        // Don't fail the request, just log the error
      }
    }

    // Create subscription object for response
    const subscription = {
      id: `iap-${transactionId}`,
      plan: detectedPlan,
      status: isActive ? 'active' : 'expired',
      currentPeriodStart: purchaseDate.toISOString(),
      currentPeriodEnd: expiresDate.toISOString(),
      transactionId: transactionId,
      originalTransactionId: latestReceiptInfo.original_transaction_id,
      productId: productId,
      isAnnual: productId.includes('.annual'),
    };

    res.json({
      success: true,
      subscription: subscription,
    });
  } catch (error) {
    console.error('Error verifying IAP receipt:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to verify receipt',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

