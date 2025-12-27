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

// Helper function to safely require and execute handlers
async function safeRequireHandler(modulePath, handlerName, req, res) {
  let handler;
  
  // Step 1: Safely require the module
  try {
    const module = require(modulePath);
    
    // Handle different export patterns
    if (typeof module === 'function') {
      handler = module;
    } else if (module.default && typeof module.default === 'function') {
      handler = module.default;
    } else if (module[handlerName] && typeof module[handlerName] === 'function') {
      handler = module[handlerName];
    } else if (module.handler && typeof module.handler === 'function') {
      handler = module.handler;
    } else {
      console.error(`Handler ${handlerName} is not a function. Module exports:`, Object.keys(module));
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: `${handlerName} handler is not a function`,
          modulePath: modulePath,
          exports: Object.keys(module)
        });
      }
      return;
    }
  } catch (requireError) {
    console.error(`Error requiring ${handlerName} module (${modulePath}):`, requireError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: `Failed to load ${handlerName} module`,
        message: requireError.message || String(requireError),
        modulePath: modulePath
      });
    }
    return;
  }
  
  // Step 2: Safely execute the handler
  try {
    return await handler(req, res);
  } catch (handlerError) {
    console.error(`Handler error in ${handlerName}:`, handlerError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: `Handler error in ${handlerName}`,
        message: handlerError.message || String(handlerError),
        stack: process.env.NODE_ENV === 'development' ? handlerError.stack : undefined
      });
    }
  }
}

// Wrap the entire export in a try-catch to catch module-level errors
let handlerFunction;

try {
  handlerFunction = async (req, res) => {
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
} catch (moduleError) {
  // If there's an error during module initialization, create a handler that returns JSON
  console.error('Module initialization error:', moduleError);
  handlerFunction = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Module initialization failed',
      message: moduleError.message || String(moduleError)
    });
  };
}

module.exports = handlerFunction;


// Import handlers from separate files (we'll inline them for simplicity)
// For now, let's use a simpler approach - load the handlers dynamically

async function handleOverview(req, res) {
  return safeRequireHandler('../../lib/admin/overview.js', 'overview', req, res);
}

async function handleUsers(req, res) {
  return safeRequireHandler('../../lib/admin/users.js', 'users', req, res);
}

async function handleSubscriptions(req, res) {
  return safeRequireHandler('../../lib/admin/subscriptions.js', 'subscriptions', req, res);
}

async function handleDeals(req, res) {
  return safeRequireHandler('../../lib/admin/deals.js', 'deals', req, res);
}

async function handleQuotes(req, res) {
  return safeRequireHandler('../../lib/admin/quotes.js', 'quotes', req, res);
}

async function handleBusinessIntelligence(req, res) {
  return safeRequireHandler('../../lib/admin/business-intelligence.js', 'business-intelligence', req, res);
}

async function handleSubmissions(req, res) {
  return safeRequireHandler('../../lib/admin/submissions.js', 'submissions', req, res);
}

async function handleAnalytics(req, res) {
  return safeRequireHandler('../../lib/admin/analytics.js', 'analytics', req, res);
}

async function handleErrors(req, res) {
  return safeRequireHandler('../../lib/admin/errors.js', 'errors', req, res);
}

async function handleSendEmail(req, res) {
  return safeRequireHandler('../../lib/admin/send-email.js', 'send-email', req, res);
}

async function handleMarketing(req, res) {
  return safeRequireHandler('../../lib/admin/marketing.js', 'marketing', req, res);
}

async function handleWaitlist(req, res) {
  return safeRequireHandler('../../lib/admin/waitlist.js', 'waitlist', req, res);
}

async function handleAuth(req, res) {
  return safeRequireHandler('../../lib/admin/auth.js', 'auth', req, res);
}

async function handleEmailHistory(req, res) {
  // email-history.js exports { default: getEmailHistory, getEmailHistory }
  let handler;
  try {
    const emailHistory = require('../../lib/admin/email-history.js');
    handler = emailHistory.getEmailHistory || emailHistory.default || emailHistory;
  } catch (requireError) {
    console.error('Error requiring email-history module:', requireError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Failed to load email-history module',
        message: requireError.message || String(requireError)
      });
    }
    return;
  }
  
  if (typeof handler !== 'function') {
    console.error('Email history handler is not a function');
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Email history handler is not a function' });
    }
    return;
  }
  
  try {
    return await handler(req, res);
  } catch (handlerError) {
    console.error('Handler error in handleEmailHistory:', handlerError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Handler error',
        message: handlerError.message || String(handlerError)
      });
    }
  }
}

