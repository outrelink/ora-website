/**
 * Marketing Notifications API Handler
 * Handles sending marketing push notifications to users who have opted in
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get marketing notification history
 */
async function getMarketingHistory(req, res) {
  try {
    const { data: notifications, error } = await supabase
      .from('marketing_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.json({
      success: true,
      notifications: notifications || []
    });
  } catch (error) {
    console.error('Error fetching marketing history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch marketing history'
    });
  }
}

/**
 * Send marketing notification to all opted-in users
 */
async function sendMarketingNotification(req, res) {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // Get all users who have marketing notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, push_token')
      .eq('marketing_notifications', true)
      .not('push_token', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Continue even if we can't fetch users - we'll use Expo Push API
    }

    const recipientCount = users?.length || 0;
    const pushTokens = users?.map(u => u.push_token).filter(Boolean) || [];

    // Store notification in database
    const { error: notifError } = await supabase
      .from('marketing_notifications')
      .insert({
        title: title,
        message: message,
        type: type || 'update',
        recipient_count: recipientCount,
        sent_at: new Date().toISOString()
      });

    if (notifError) {
      console.error('Error saving notification:', notifError);
    }

    // Send push notifications via Expo Push API
    if (pushTokens.length > 0) {
      try {
        const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate'
          },
          body: JSON.stringify(
            pushTokens.map(token => ({
              to: token,
              sound: 'default',
              title: title,
              body: message,
              data: {
                type: 'marketing',
                marketingType: type || 'update'
              },
              priority: 'default',
              channelId: 'marketing-updates'
            }))
          )
        });

        const expoData = await expoPushResponse.json();
        console.log('Expo push response:', expoData);
      } catch (pushError) {
        console.error('Error sending push notifications:', pushError);
        // Don't fail the request if push fails - notification is still saved
      }
    }

    return res.json({
      success: true,
      recipient_count: recipientCount,
      message: `Marketing notification sent to ${recipientCount} users`
    });
  } catch (error) {
    console.error('Error sending marketing notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send marketing notification'
    });
  }
}

// For GET requests
async function handler(req, res) {
  if (req.method === 'POST') {
    return await sendMarketingNotification(req, res);
  } else {
    return await getMarketingHistory(req, res);
  }
}

module.exports = {
  default: handler,
  getMarketingHistory,
  sendMarketingNotification
};

