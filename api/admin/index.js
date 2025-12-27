/**
 * Consolidated Admin API
 * GET/POST /api/admin?type=overview|users|subscriptions|deals|quotes|business|submissions|analytics|errors
 * POST /api/admin?type=send-email
 * 
 * This consolidates all admin endpoints into a single serverless function
 * to stay within Vercel's Hobby plan limit of 12 functions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Stripe integration (optional)
let stripe = null;
try {
  const Stripe = require('stripe');
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (stripeSecretKey) {
    stripe = Stripe(stripeSecretKey);
  }
} catch (error) {
  // Stripe not configured
}

// Admin authentication check
function checkAuth(req) {
  const adminToken = req.headers['x-admin-token'] || req.query.token || (req.body && req.body.token);
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;
  
  return adminToken === expectedToken || adminToken === adminPassword;
}

module.exports = async (req, res) => {
  // Check authentication
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const type = req.query.type || req.body?.type || 'overview';

  try {
    switch (type) {
      case 'overview':
        return await handleOverview(req, res);
      case 'users':
        return await handleUsers(req, res);
      case 'subscriptions':
        return await handleSubscriptions(req, res);
      case 'deals':
        return await handleDeals(req, res);
      case 'quotes':
        return await handleQuotes(req, res);
      case 'business':
        return await handleBusinessIntelligence(req, res);
      case 'submissions':
        return await handleSubmissions(req, res);
      case 'analytics':
        return await handleAnalytics(req, res);
      case 'errors':
        return await handleErrors(req, res);
      case 'send-email':
        return await handleSendEmail(req, res);
      case 'marketing':
        return await handleMarketing(req, res);
      case 'waitlist':
        return await handleWaitlist(req, res);
      case 'auth':
        return await handleAuth(req, res);
      case 'email-history':
        return await handleEmailHistory(req, res);
      default:
        return res.status(400).json({ error: 'Invalid type parameter' });
    }
  } catch (error) {
    console.error(`Error in admin API (${type}):`, error);
    // Return proper JSON error response
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      type: type
    });
  }
};

async function handleEmailHistory(req, res) {
  const handler = require('../../lib/admin/email-history.js');
  return handler(req, res);
}

// Import handlers from separate files (we'll inline them for simplicity)
// For now, let's use a simpler approach - load the handlers dynamically

async function handleOverview(req, res) {
  try {
    const handler = require('../../lib/admin/overview.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleOverview:', error);
    return res.status(500).json({ error: 'Failed to load overview', message: error.message });
  }
}

async function handleUsers(req, res) {
  try {
    const handler = require('../../lib/admin/users.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleUsers:', error);
    return res.status(500).json({ error: 'Failed to load users', message: error.message });
  }
}

async function handleSubscriptions(req, res) {
  try {
    const handler = require('../../lib/admin/subscriptions.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleSubscriptions:', error);
    return res.status(500).json({ error: 'Failed to load subscriptions', message: error.message });
  }
}

async function handleDeals(req, res) {
  try {
    const handler = require('../../lib/admin/deals.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleDeals:', error);
    return res.status(500).json({ error: 'Failed to load deals', message: error.message });
  }
}

async function handleQuotes(req, res) {
  try {
    const handler = require('../../lib/admin/quotes.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleQuotes:', error);
    return res.status(500).json({ error: 'Failed to load quotes', message: error.message });
  }
}

async function handleBusinessIntelligence(req, res) {
  try {
    const handler = require('../../lib/admin/business-intelligence.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleBusinessIntelligence:', error);
    return res.status(500).json({ error: 'Failed to load business intelligence', message: error.message });
  }
}

async function handleSubmissions(req, res) {
  try {
    const handler = require('../../lib/admin/submissions.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleSubmissions:', error);
    return res.status(500).json({ error: 'Failed to load submissions', message: error.message });
  }
}

async function handleAnalytics(req, res) {
  try {
    const handler = require('../../lib/admin/analytics.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleAnalytics:', error);
    return res.status(500).json({ error: 'Failed to load analytics', message: error.message });
  }
}

async function handleErrors(req, res) {
  try {
    const handler = require('../../lib/admin/errors.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleErrors:', error);
    return res.status(500).json({ error: 'Failed to load errors', message: error.message });
  }
}

async function handleSendEmail(req, res) {
  try {
    const handler = require('../../lib/admin/send-email.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleSendEmail:', error);
    return res.status(500).json({ error: 'Failed to send email', message: error.message });
  }
}

async function handleMarketing(req, res) {
  try {
    const marketing = require('../../lib/admin/marketing.js');
    const handler = marketing.default || marketing;
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleMarketing:', error);
    return res.status(500).json({ error: 'Failed to load marketing', message: error.message });
  }
}

async function handleWaitlist(req, res) {
  try {
    const handler = require('../../lib/admin/waitlist.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleWaitlist:', error);
    return res.status(500).json({ error: 'Failed to load waitlist', message: error.message });
  }
}

async function handleAuth(req, res) {
  try {
    const handler = require('../../lib/admin/auth.js');
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleAuth:', error);
    return res.status(500).json({ error: 'Failed to authenticate', message: error.message });
  }
}

async function handleEmailHistory(req, res) {
  try {
    const emailHistory = require('../../lib/admin/email-history.js');
    // email-history.js exports getEmailHistory function
    const handler = emailHistory.getEmailHistory || emailHistory.default || emailHistory;
    return await handler(req, res);
  } catch (error) {
    console.error('Error in handleEmailHistory:', error);
    return res.status(500).json({ error: 'Failed to load email history', message: error.message });
  }
}

