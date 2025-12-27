/**
 * Consolidated Admin API Router
 * GET/POST /api/admin?type=overview|users|subscriptions|deals|quotes|business|submissions|analytics|errors
 * POST /api/admin?type=send-email
 * 
 * Routes all admin requests to appropriate handlers
 */

const overview = require('../lib/admin/overview');
const users = require('../lib/admin/users');
const subscriptions = require('../lib/admin/subscriptions');
const deals = require('../lib/admin/deals');
const quotes = require('../lib/admin/quotes');
const businessIntelligence = require('../lib/admin/business-intelligence');
const submissions = require('../lib/admin/submissions');
const analytics = require('../lib/admin/analytics');
const errors = require('../lib/admin/errors');
const waitlist = require('../lib/admin/waitlist');
const sendEmail = require('../lib/admin/send-email');
const auth = require('../lib/admin/auth');
const welcomeEmailSettings = require('../lib/admin/welcome-email-settings');
const bulkEmail = require('../lib/admin/bulk-email');
const emailHistory = require('../lib/admin/email-history');
const marketing = require('../lib/admin/marketing');

module.exports = async (req, res) => {
  const type = req.query.type || (req.body && req.body.type) || 'overview';

  try {
    switch (type) {
      case 'overview':
        return await overview(req, res);
      case 'users':
        return await users(req, res);
      case 'subscriptions':
        return await subscriptions(req, res);
      case 'deals':
        return await deals(req, res);
      case 'quotes':
        return await quotes(req, res);
      case 'business':
        return await businessIntelligence(req, res);
      case 'submissions':
        return await submissions(req, res);
      case 'analytics':
        return await analytics(req, res);
      case 'errors':
        return await errors(req, res);
      case 'waitlist':
        return await waitlist(req, res);
      case 'send-email':
        return await sendEmail(req, res);
      case 'welcome-email-settings':
        const welcomeEmailHandler = welcomeEmailSettings.default || welcomeEmailSettings.getWelcomeEmailSettings || welcomeEmailSettings;
        return await welcomeEmailHandler(req, res);
      case 'bulk-email-users':
        return await bulkEmail(req, res);
      case 'email-history':
        const emailHistoryHandler = emailHistory.default || emailHistory.getEmailHistory || emailHistory;
        return await emailHistoryHandler(req, res);
      case 'marketing':
        const marketingHandler = marketing.default || marketing.getMarketingHistory || marketing;
        return await marketingHandler(req, res);
      case 'auth':
        return await auth(req, res);
      default:
        return res.status(400).json({ error: 'Invalid type parameter. Use: overview, users, subscriptions, deals, quotes, business, submissions, analytics, errors, send-email, welcome-email-settings, bulk-email-users, email-history, marketing, or auth' });
    }
  } catch (error) {
    console.error(`Error in admin API router (${type}):`, error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || String(error),
        type: type
      });
    }
  }
};

