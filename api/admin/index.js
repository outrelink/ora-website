/**
 * Consolidated Admin API
 * GET/POST /api/admin?type=overview|users|subscriptions|deals|quotes|business|submissions|analytics|errors
 * POST /api/admin?type=send-email
 * 
 * This consolidates all admin endpoints into a single serverless function
 * to stay within Vercel's Hobby plan limit of 12 functions
 */

// Catch any unhandled errors at the process level
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in admin API:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in admin API:', reason);
});

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
      // Headers already sent, can't return JSON - this shouldn't happen but handle it
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
    // Headers already sent - shouldn't happen but handle gracefully
    return;
  }
  
  // Step 2: Safely execute the handler
  try {
    const result = await handler(req, res);
    // Ensure handler returned something or sent a response
    if (result === undefined && !res.headersSent) {
      console.warn(`Handler ${handlerName} did not return a response or send headers`);
      return res.status(500).json({ 
        error: `Handler ${handlerName} did not return a response`,
        modulePath: modulePath
      });
    }
    return result;
  } catch (handlerError) {
    console.error(`Handler error in ${handlerName}:`, handlerError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: `Handler error in ${handlerName}`,
        message: handlerError.message || String(handlerError),
        stack: process.env.NODE_ENV === 'development' ? handlerError.stack : undefined
      });
    }
    // Headers already sent - handler must have sent a response before throwing
    // This is unusual but we'll log it
    console.error(`Handler ${handlerName} threw error after sending headers`);
    return;
  }
}

// Main handler function - wrap everything to catch any errors
// Use a wrapper function to catch any synchronous errors during module load
const mainHandler = async (req, res) => {
  // Set content type to JSON immediately - this must be first
  try {
    res.setHeader('Content-Type', 'application/json');
  } catch (headerError) {
    // Headers already sent, can't set content type
    console.error('Cannot set headers:', headerError);
  }
  
  try {
    // Check authentication
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const type = req.query.type || req.body?.type || 'overview';

    try {
      let result;
      // Wrap each handler call to catch any synchronous errors
      switch (type) {
        case 'overview':
          result = await Promise.resolve().then(() => handleOverview(req, res));
          break;
        case 'users':
          result = await Promise.resolve().then(() => handleUsers(req, res));
          break;
        case 'subscriptions':
          result = await Promise.resolve().then(() => handleSubscriptions(req, res));
          break;
        case 'deals':
          result = await Promise.resolve().then(() => handleDeals(req, res));
          break;
        case 'quotes':
          result = await Promise.resolve().then(() => handleQuotes(req, res));
          break;
        case 'business':
          result = await Promise.resolve().then(() => handleBusinessIntelligence(req, res));
          break;
        case 'submissions':
          result = await Promise.resolve().then(() => handleSubmissions(req, res));
          break;
        case 'analytics':
          result = await Promise.resolve().then(() => handleAnalytics(req, res));
          break;
        case 'errors':
          result = await Promise.resolve().then(() => handleErrors(req, res));
          break;
        case 'send-email':
          result = await Promise.resolve().then(() => handleSendEmail(req, res));
          break;
        case 'marketing':
          result = await Promise.resolve().then(() => handleMarketing(req, res));
          break;
        case 'waitlist':
          result = await Promise.resolve().then(() => handleWaitlist(req, res));
          break;
        case 'auth':
          result = await Promise.resolve().then(() => handleAuth(req, res));
          break;
        case 'email-history':
          result = await Promise.resolve().then(() => handleEmailHistory(req, res));
          break;
        case 'welcome-email-settings':
          result = await Promise.resolve().then(() => handleWelcomeEmailSettings(req, res));
          break;
        default:
          return res.status(400).json({ error: 'Invalid type parameter', type: type });
      }
      
      // If handler didn't return anything, return a default response
      if (result === undefined && !res.headersSent) {
        return res.status(500).json({ error: 'Handler did not return a response', type: type });
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
      try {
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error.message || 'An unexpected error occurred',
          fatal: true
        });
      } catch (jsonError) {
        // Even JSON.stringify failed, try plain text
        console.error('Failed to send JSON error:', jsonError);
        try {
          res.status(500).send(JSON.stringify({ error: 'Internal server error' }));
        } catch (sendError) {
          console.error('Failed to send any response:', sendError);
        }
      }
    }
  }
};

// Export with error wrapper
module.exports = async (req, res) => {
  try {
    return await mainHandler(req, res);
  } catch (error) {
    // Catch any errors that escape the main handler
    console.error('Unhandled error in module.exports:', error);
    if (!res.headersSent) {
      try {
        return res.status(500).json({
          error: 'Internal server error',
          message: error.message || String(error)
        });
      } catch (e) {
        console.error('Failed to send error response:', e);
      }
    }
  }
};


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
  // marketing.js exports { default: handler, getMarketingHistory, sendMarketingNotification }
  // The default export is the handler function that routes GET vs POST
  // Pass the shared Supabase client to avoid env var issues
  let handler;
  try {
    const marketing = require('../../lib/admin/marketing.js');
    handler = marketing.default || marketing.handler || marketing;
    
    if (typeof handler !== 'function') {
      console.error('Marketing handler is not a function. Exports:', Object.keys(marketing));
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Marketing handler is not a function' });
      }
      return;
    }
    
    // Pass supabase client if handler accepts it, otherwise use default
    if (handler.length > 2) {
      return await handler(req, res, supabase);
    } else {
      return await handler(req, res);
    }
  } catch (error) {
    console.error('Error in handleMarketing:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Handler error',
        message: error.message || String(error)
      });
    }
  }
}

async function handleWaitlist(req, res) {
  // waitlist.js exports a default async function
  // Pass the shared Supabase client to avoid env var issues
  let handler;
  try {
    const waitlist = require('../../lib/admin/waitlist.js');
    handler = waitlist.default || waitlist;
    
    if (typeof handler !== 'function') {
      console.error('Waitlist handler is not a function. Exports:', Object.keys(waitlist));
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Waitlist handler is not a function' });
      }
      return;
    }
    
    // Pass supabase client if handler accepts it, otherwise use default
    if (handler.length > 2) {
      return await handler(req, res, supabase);
    } else {
      return await handler(req, res);
    }
  } catch (error) {
    console.error('Error in handleWaitlist:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Handler error',
        message: error.message || String(error)
      });
    }
  }
}

async function handleAuth(req, res) {
  return safeRequireHandler('../../lib/admin/auth.js', 'auth', req, res);
}

async function handleEmailHistory(req, res) {
  // email-history.js exports { default: getEmailHistory, getEmailHistory }
  // Pass the shared Supabase client to avoid env var issues
  let handler;
  try {
    const emailHistory = require('../../lib/admin/email-history.js');
    handler = emailHistory.default || emailHistory.getEmailHistory || emailHistory;
    
    if (typeof handler !== 'function') {
      console.error('Email history handler is not a function. Exports:', Object.keys(emailHistory));
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Email history handler is not a function' });
      }
      return;
    }
    
    // Pass supabase client if handler accepts it, otherwise use default
    if (handler.length > 2) {
      return await handler(req, res, supabase);
    } else {
      return await handler(req, res);
    }
  } catch (error) {
    console.error('Error in handleEmailHistory:', error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Handler error',
        message: error.message || String(error)
      });
    }
  }
}

async function handleWelcomeEmailSettings(req, res) {
  // welcome-email-settings.js exports { default: handler, getWelcomeEmailSettings, saveWelcomeEmailSettings }
  let handler;
  try {
    const welcomeEmailSettings = require('../../lib/admin/welcome-email-settings.js');
    handler = welcomeEmailSettings.default || welcomeEmailSettings.handler || welcomeEmailSettings;
  } catch (requireError) {
    console.error('Error requiring welcome-email-settings module:', requireError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Failed to load welcome-email-settings module',
        message: requireError.message || String(requireError)
      });
    }
    return;
  }
  
  if (typeof handler !== 'function') {
    console.error('Welcome email settings handler is not a function');
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Welcome email settings handler is not a function' });
    }
    return;
  }
  
  try {
    return await handler(req, res);
  } catch (handlerError) {
    console.error('Handler error in handleWelcomeEmailSettings:', handlerError);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Handler error',
        message: handlerError.message || String(handlerError)
      });
    }
  }
}

