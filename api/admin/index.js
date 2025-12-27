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
  // Set content type to JSON immediately
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Check authentication
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const type = req.query.type || req.body?.type || 'overview';

    try {
      let result;
      switch (type) {
        case 'overview':
          result = await handleOverview(req, res);
          break;
        case 'users':
          result = await handleUsers(req, res);
          break;
        case 'subscriptions':
          result = await handleSubscriptions(req, res);
          break;
        case 'deals':
          result = await handleDeals(req, res);
          break;
        case 'quotes':
          result = await handleQuotes(req, res);
          break;
        case 'business':
          result = await handleBusinessIntelligence(req, res);
          break;
        case 'submissions':
          result = await handleSubmissions(req, res);
          break;
        case 'analytics':
          result = await handleAnalytics(req, res);
          break;
        case 'errors':
          result = await handleErrors(req, res);
          break;
        case 'send-email':
          result = await handleSendEmail(req, res);
          break;
        case 'marketing':
          result = await handleMarketing(req, res);
          break;
        case 'waitlist':
          result = await handleWaitlist(req, res);
          break;
        case 'auth':
          result = await handleAuth(req, res);
          break;
        case 'email-history':
          result = await handleEmailHistory(req, res);
          break;
        default:
          return res.status(400).json({ error: 'Invalid type parameter', type: type });
      }
      return result;
    } catch (handlerError) {
      console.error(`Error in admin API handler (${type}):`, handlerError);
      // Ensure we return JSON even if handler fails
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Internal server error',
          message: handlerError.message || String(handlerError),
          type: type,
          stack: process.env.NODE_ENV === 'development' ? handlerError.stack : undefined
        });
      }
    }
  } catch (error) {
    console.error(`Fatal error in admin API:`, error);
    // Last resort - ensure JSON response
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        fatal: true
      });
    }
  }
};


// Import handlers from separate files (we'll inline them for simplicity)
// For now, let's use a simpler approach - load the handlers dynamically

async function handleOverview(req, res) {
  try {
    const handler = require('../../lib/admin/overview.js');
    if (typeof handler !== 'function') {
      throw new Error('Overview handler is not a function');
    }
    // Ensure handler returns JSON even on error
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleOverview:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleOverview:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load overview', message: error.message || String(error) });
    }
  }
}

async function handleUsers(req, res) {
  try {
    const handler = require('../../lib/admin/users.js');
    if (typeof handler !== 'function') {
      throw new Error('Users handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleUsers:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleUsers:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load users', message: error.message || String(error) });
    }
  }
}

async function handleSubscriptions(req, res) {
  try {
    const handler = require('../../lib/admin/subscriptions.js');
    if (typeof handler !== 'function') {
      throw new Error('Subscriptions handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleSubscriptions:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleSubscriptions:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load subscriptions', message: error.message || String(error) });
    }
  }
}

async function handleDeals(req, res) {
  try {
    const handler = require('../../lib/admin/deals.js');
    if (typeof handler !== 'function') {
      throw new Error('Deals handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleDeals:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleDeals:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load deals', message: error.message || String(error) });
    }
  }
}

async function handleQuotes(req, res) {
  try {
    const handler = require('../../lib/admin/quotes.js');
    if (typeof handler !== 'function') {
      throw new Error('Quotes handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleQuotes:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleQuotes:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load quotes', message: error.message || String(error) });
    }
  }
}

async function handleBusinessIntelligence(req, res) {
  try {
    const handler = require('../../lib/admin/business-intelligence.js');
    if (typeof handler !== 'function') {
      throw new Error('Business intelligence handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleBusinessIntelligence:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleBusinessIntelligence:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load business intelligence', message: error.message || String(error) });
    }
  }
}

async function handleSubmissions(req, res) {
  try {
    const handler = require('../../lib/admin/submissions.js');
    if (typeof handler !== 'function') {
      throw new Error('Submissions handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleSubmissions:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleSubmissions:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load submissions', message: error.message || String(error) });
    }
  }
}

async function handleAnalytics(req, res) {
  try {
    const handler = require('../../lib/admin/analytics.js');
    if (typeof handler !== 'function') {
      throw new Error('Analytics handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleAnalytics:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleAnalytics:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load analytics', message: error.message || String(error) });
    }
  }
}

async function handleErrors(req, res) {
  try {
    const handler = require('../../lib/admin/errors.js');
    if (typeof handler !== 'function') {
      throw new Error('Errors handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleErrors:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleErrors:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load errors', message: error.message || String(error) });
    }
  }
}

async function handleSendEmail(req, res) {
  try {
    const handler = require('../../lib/admin/send-email.js');
    if (typeof handler !== 'function') {
      throw new Error('Send email handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleSendEmail:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleSendEmail:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to send email', message: error.message || String(error) });
    }
  }
}

async function handleMarketing(req, res) {
  try {
    const marketing = require('../../lib/admin/marketing.js');
    // marketing.js exports { default: handler, ... }
    const handler = marketing.default || marketing.handler || marketing;
    if (typeof handler !== 'function') {
      throw new Error('Marketing handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleMarketing:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleMarketing:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load marketing', message: error.message || String(error) });
    }
  }
}

async function handleWaitlist(req, res) {
  try {
    const handler = require('../../lib/admin/waitlist.js');
    if (typeof handler !== 'function') {
      throw new Error('Waitlist handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleWaitlist:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleWaitlist:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load waitlist', message: error.message || String(error) });
    }
  }
}

async function handleAuth(req, res) {
  try {
    const handler = require('../../lib/admin/auth.js');
    if (typeof handler !== 'function') {
      throw new Error('Auth handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleAuth:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleAuth:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to authenticate', message: error.message || String(error) });
    }
  }
}

async function handleEmailHistory(req, res) {
  try {
    const emailHistory = require('../../lib/admin/email-history.js');
    // email-history.js exports { default: getEmailHistory, getEmailHistory }
    const handler = emailHistory.getEmailHistory || emailHistory.default || emailHistory;
    if (typeof handler !== 'function') {
      throw new Error('Email history handler is not a function');
    }
    try {
      return await handler(req, res);
    } catch (handlerError) {
      console.error('Handler error in handleEmailHistory:', handlerError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Handler error', message: handlerError.message || String(handlerError) });
      }
    }
  } catch (error) {
    console.error('Error loading handleEmailHistory:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to load email history', message: error.message || String(error) });
    }
  }
}

