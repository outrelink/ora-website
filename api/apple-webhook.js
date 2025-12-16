/**
 * Apple App Store Server Notifications Webhook
 * Handles real-time subscription events from Apple
 * POST /api/apple-webhook
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://mhremnqxmbwuxlmmuagw.supabase.co';
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

    // Map product ID to plan (Updated December 2025)
    const productIdToPlan = {
      // New product IDs
      'com.myora.essentials.monthly': 'essentials',
      'com.myora.creator.pro.monthly': 'pro',
      'com.myora.creator.elite.monthly': 'elite',
      
      // Old product IDs (for backward compatibility)
      'com.myora.creator.monthly': 'essentials',
      'com.myora.pro.monthly': 'pro',
      'com.myora.premium.monthly': 'elite',
    };

    const plan = productIdToPlan[productId];
    if (!plan) {
      console.log('Unknown product ID:', productId);
      return;
    }

    // Calculate subscription dates
    // Safely parse timestamps - handle invalid values
    const purchaseDateMs = latestReceiptInfo.purchase_date_ms 
      ? parseInt(latestReceiptInfo.purchase_date_ms, 10) 
      : Date.now();
    const purchaseDate = isNaN(purchaseDateMs) ? new Date() : new Date(purchaseDateMs);
    
    const expiresDateMs = latestReceiptInfo.expires_date_ms 
      ? parseInt(latestReceiptInfo.expires_date_ms, 10) 
      : null;
    const expiresDate = expiresDateMs && !isNaN(expiresDateMs)
      ? new Date(expiresDateMs)
      : new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // CRITICAL: Find user by looking up subscription with original_transaction_id
    // Apple webhooks don't provide user_id directly - we must look it up
    let dbUserId = null;
    
    // Look up existing subscription by original_transaction_id to get user_id
    const { data: existingSub, error: lookupError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('iap_original_transaction_id', originalTransactionId)
      .single();
    
    if (existingSub && existingSub.user_id && existingSub.user_id !== 'unknown' && existingSub.user_id !== 'guest') {
      dbUserId = existingSub.user_id;
      console.log('✅ Found user by transaction ID:', { 
        userId: dbUserId, 
        originalTransactionId,
        notificationType: notification_type
      });
    } else {
      // If subscription doesn't exist yet (first purchase), we can't determine user
      // This should be rare - usually the app saves subscription first
      console.warn('⚠️ Could not find user for transaction:', {
        originalTransactionId,
        transactionId,
        productId,
        notificationType: notification_type,
        existingSubUserId: existingSub?.user_id,
        lookupError: lookupError?.message
      });
      
      // For INITIAL_BUY, we'll save with 'unknown' and it can be updated later when app verifies receipt
      // For other events (renewal, cancellation), we need user_id - skip if not found
      if (notification_type !== 'INITIAL_BUY') {
        console.error('❌ Cannot process webhook event without user_id:', {
          notificationType: notification_type,
          originalTransactionId,
          note: 'Subscription may not exist yet - app will create it on next receipt verification'
        });
        return;
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
        
        if (dbUserId) {
          await supabase.from('subscriptions')
            .update({
              status: 'active',
              iap_transaction_id: transactionId,
              current_period_start: purchaseDate.toISOString(),
              current_period_end: expiresDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('iap_original_transaction_id', originalTransactionId);
        } else {
          console.warn('Cannot renew subscription - user not found:', { originalTransactionId });
        }
        break;

      case 'DID_FAIL_TO_RENEW':
        // Subscription failed to renew (payment issue)
        console.log('Subscription failed to renew:', { userId: dbUserId, plan, transactionId });
        
        if (dbUserId) {
          await supabase.from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('iap_original_transaction_id', originalTransactionId);
        } else {
          console.warn('Cannot update failed renewal - user not found:', { originalTransactionId });
        }
        break;

      case 'DID_CANCEL':
        // User cancelled subscription (still active until period ends)
        console.log('Subscription cancelled:', { userId: dbUserId, plan, transactionId });
        
        if (dbUserId) {
          await supabase.from('subscriptions')
            .update({
              status: 'cancelled',
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .eq('iap_original_transaction_id', originalTransactionId);
        } else {
          // Fallback: update by transaction ID only
          await supabase.from('subscriptions')
            .update({
              status: 'cancelled',
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .eq('iap_original_transaction_id', originalTransactionId);
        }
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

