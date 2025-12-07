/**
 * Apple App Store Server Notifications Webhook
 * Handles real-time subscription events from Apple
 * POST /api/apple-webhook
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://uljciarseazzcqptwuly.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Apple's notification verification URL
const APPLE_VERIFY_URL = 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/notifications/verify';
const APPLE_VERIFY_URL_PRODUCTION = 'https://api.storekit.itunes.apple.com/inApps/v1/notifications/verify';

/**
 * Verify notification with Apple
 */
async function verifyNotificationWithApple(notification) {
  // For production, you'll need to verify the signed payload
  // For now, we'll process the notification
  // In production, verify the JWT signature from Apple
  
  return {
    valid: true,
    notification: notification,
  };
}

/**
 * Handle subscription status updates
 */
async function handleSubscriptionEvent(event) {
  const { notification_type, unified_receipt } = event;
  
  try {
    // Extract subscription info
    const latestReceiptInfo = unified_receipt?.latest_receipt_info?.[0];
    if (!latestReceiptInfo) {
      console.log('No receipt info in notification');
      return;
    }

    const productId = latestReceiptInfo.product_id;
    const transactionId = latestReceiptInfo.transaction_id;
    const originalTransactionId = latestReceiptInfo.original_transaction_id;
    const userId = unified_receipt?.latest_receipt_info?.[0]?.original_transaction_id; // You'll need to map this to your user ID

    // Map product ID to plan
    const productIdToPlan = {
      'com.myora.creator.monthly': 'creator',
      'com.myora.creator.annual': 'creator',
      'com.myora.pro.monthly': 'pro',
      'com.myora.pro.annual': 'pro',
      'com.myora.premium.monthly': 'premium',
      'com.myora.premium.annual': 'premium',
    };

    const plan = productIdToPlan[productId];
    if (!plan) {
      console.log('Unknown product ID:', productId);
      return;
    }

    // Calculate subscription dates
    const purchaseDate = new Date(parseInt(latestReceiptInfo.purchase_date_ms));
    const expiresDate = latestReceiptInfo.expires_date_ms 
      ? new Date(parseInt(latestReceiptInfo.expires_date_ms))
      : new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find user by original_transaction_id or email
    // You'll need to store this mapping when user first purchases
    let dbUserId = userId;
    
    // Try to find user by transaction ID if userId not available
    if (!dbUserId) {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('iap_original_transaction_id', originalTransactionId)
        .single();
      
      if (existingSub) {
        dbUserId = existingSub.user_id;
      }
    }

    // Handle different notification types
    switch (notification_type) {
      case 'INITIAL_BUY':
        // User purchased subscription
        console.log('New subscription:', { userId: dbUserId, plan, transactionId });
        
        // Save to Supabase
        await supabase.from('subscriptions').upsert({
          user_id: dbUserId || 'unknown',
          plan: plan,
          status: 'active',
          iap_transaction_id: transactionId,
          iap_original_transaction_id: originalTransactionId,
          iap_product_id: productId,
          current_period_start: purchaseDate.toISOString(),
          current_period_end: expiresDate.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'iap_original_transaction_id' });
        break;

      case 'DID_RENEW':
        // Subscription renewed
        console.log('Subscription renewed:', { userId: dbUserId, plan, transactionId });
        
        await supabase.from('subscriptions')
          .update({
            status: 'active',
            iap_transaction_id: transactionId,
            current_period_start: purchaseDate.toISOString(),
            current_period_end: expiresDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('iap_original_transaction_id', originalTransactionId);
        break;

      case 'DID_FAIL_TO_RENEW':
        // Subscription failed to renew (payment issue)
        console.log('Subscription failed to renew:', { userId: dbUserId, plan, transactionId });
        
        await supabase.from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('iap_original_transaction_id', originalTransactionId);
        break;

      case 'DID_CANCEL':
        // User cancelled subscription (still active until period ends)
        console.log('Subscription cancelled:', { userId: dbUserId, plan, transactionId });
        
        await supabase.from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('iap_original_transaction_id', originalTransactionId);
        break;

      case 'REFUND':
        // User got refund
        console.log('Subscription refunded:', { userId: dbUserId, plan, transactionId });
        
        await supabase.from('subscriptions')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('iap_original_transaction_id', originalTransactionId);
        break;

      case 'REVOKE':
        // Subscription revoked (family sharing, etc.)
        console.log('Subscription revoked:', { userId: dbUserId, plan, transactionId });
        
        await supabase.from('subscriptions')
          .update({
            status: 'revoked',
            updated_at: new Date().toISOString(),
          })
          .eq('iap_original_transaction_id', originalTransactionId);
        break;

      default:
        console.log('Unknown notification type:', notification_type);
    }
  } catch (error) {
    console.error('Error handling subscription event:', error);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apple sends notifications in different formats
    // For App Store Server Notifications v2 (recommended)
    if (req.body.signedPayload) {
      // Verify and decode the JWT payload
      // TODO: Implement JWT verification with Apple's public key
      // For now, we'll process the notification
      
      const notification = req.body;
      await handleSubscriptionEvent(notification);
      
      return res.status(200).json({ received: true });
    }

    // For older notification format
    if (req.body.notification_type) {
      await handleSubscriptionEvent(req.body);
      return res.status(200).json({ received: true });
    }

    // Unknown format
    console.log('Unknown notification format:', req.body);
    return res.status(400).json({ error: 'Invalid notification format' });
  } catch (error) {
    console.error('Error processing Apple webhook:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process webhook',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

