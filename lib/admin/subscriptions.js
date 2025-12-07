/**
 * Admin Subscriptions & Payments API
 * GET /api/admin/subscriptions
 * Returns comprehensive subscription and payment data for business intelligence
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
  console.warn('Stripe not configured');
}

module.exports = async (req, res) => {
  // Check admin authentication
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ora_admin_2025';
  const expectedToken = process.env.ADMIN_TOKEN || adminPassword;
  
  if (adminToken !== expectedToken && adminToken !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let subscriptions = [];
    let subscriptionStats = {
      total: 0,
      active: 0,
      cancelled: 0,
      trialing: 0,
      pastDue: 0,
      expired: 0
    };
    let revenueMetrics = {
      mrr: 0, // Monthly Recurring Revenue
      arr: 0, // Annual Recurring Revenue
      totalRevenue: 0,
      averageRevenuePerUser: 0,
      lifetimeValue: 0
    };
    let planBreakdown = {
      free: 0,
      creator: 0,
      pro: 0,
      premium: 0
    };
    let monthlyRevenue = [];
    let churnData = {
      churnRate: 0,
      churnedThisMonth: 0,
      retentionRate: 0
    };

    if (supabase) {
      // Get all subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!subsError && subsData) {
        subscriptions = subsData;

        // Calculate stats
        subscriptionStats.total = subsData.length;
        subsData.forEach(sub => {
          if (subscriptionStats.hasOwnProperty(sub.status)) {
            subscriptionStats[sub.status]++;
          }
          if (planBreakdown.hasOwnProperty(sub.plan)) {
            planBreakdown[sub.plan]++;
          }
        });

        // Calculate MRR (Monthly Recurring Revenue)
        const activeSubs = subsData.filter(s => s.status === 'active' || s.status === 'trialing');
        const planPrices = {
          creator: 19.99, // Web price (IAP is $25.99, but we track web price for consistency)
          pro: 39.99,     // Web price (IAP is $51.99)
          premium: 79.99, // Web price (IAP is $103.99)
          free: 0
        };
        
        // Check if subscription is IAP and use IAP price if available
        activeSubs.forEach(sub => {
          if (sub.iap_product_id) {
            // IAP subscriptions - use IAP pricing
            if (sub.plan === 'creator') {
              planPrices.creator = sub.iap_product_id.includes('.annual') ? 15.99 : 25.99;
            } else if (sub.plan === 'pro') {
              planPrices.pro = sub.iap_product_id.includes('.annual') ? 31.99 : 51.99;
            } else if (sub.plan === 'premium') {
              planPrices.premium = sub.iap_product_id.includes('.annual') ? 63.99 : 103.99;
            }
          }
        });

        revenueMetrics.mrr = activeSubs.reduce((sum, sub) => {
          return sum + (planPrices[sub.plan] || 0);
        }, 0);

        revenueMetrics.arr = revenueMetrics.mrr * 12;
        revenueMetrics.totalRevenue = revenueMetrics.mrr; // Can be enhanced with historical data

        // Calculate ARPU (Average Revenue Per User)
        const activePaidSubs = activeSubs.filter(s => s.plan !== 'free');
        revenueMetrics.averageRevenuePerUser = activePaidSubs.length > 0 
          ? revenueMetrics.mrr / activePaidSubs.length 
          : 0;

        // Calculate LTV (Lifetime Value) - simplified: ARPU * average subscription duration
        // This is a simplified calculation - in production, use actual subscription history
        revenueMetrics.lifetimeValue = revenueMetrics.averageRevenuePerUser * 12; // Assuming 12 month average

        // Get monthly revenue trend (next 12 months)
        // Calculate from current month forward to 12 months ahead
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-based: 0=Jan, 10=Nov, 11=Dec
        
        // Build array from December 2025 to November 2026 (next 12 months)
        const revenueData = [];
        // Show next 12 months, starting from December 2025 (next month)
        for (let i = 1; i <= 12; i++) {
          // Calculate month: i=1 means next month (December), i=12 means 12 months ahead
          let targetMonth = currentMonth + i;
          let targetYear = currentYear;
          
          // Handle year rollover (when going forward past December)
          if (targetMonth > 11) {
            targetMonth -= 12;
            targetYear += 1;
          }
          
          const monthDate = new Date(targetYear, targetMonth, 1);
          const monthStart = new Date(targetYear, targetMonth, 1);
          const monthEnd = new Date(targetYear, targetMonth + 1, 0);
          
          // Count active subscriptions that were active during this month
          // A subscription is active in a month if it was created before or during that month
          // and is still active or was active during that month
          const activeInMonth = subsData.filter(sub => {
            if (sub.status !== 'active' && sub.status !== 'trialing') return false;
            const created = new Date(sub.created_at);
            // Subscription must have been created by the end of this month
            return created <= monthEnd;
          });

          const monthRevenue = activeInMonth.reduce((sum, sub) => {
            return sum + (planPrices[sub.plan] || 0);
          }, 0);

          revenueData.push({
            month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: Math.round(monthRevenue * 100) / 100,
            subscribers: activeInMonth.length
          });
        }
        
        monthlyRevenue = revenueData;

        // Calculate churn rate
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const cancelledThisMonth = subsData.filter(sub => {
          if (sub.status !== 'cancelled') return false;
          const cancelled = new Date(sub.updated_at);
          return cancelled >= lastMonth;
        }).length;

        const activeAtStartOfMonth = subsData.filter(sub => {
          const created = new Date(sub.created_at);
          return created < lastMonth && (sub.status === 'active' || sub.status === 'trialing');
        }).length;

        churnData.churnedThisMonth = cancelledThisMonth;
        churnData.churnRate = activeAtStartOfMonth > 0 
          ? (cancelledThisMonth / activeAtStartOfMonth) * 100 
          : 0;
        churnData.retentionRate = 100 - churnData.churnRate;

        // Get Stripe data if available (for more accurate revenue)
        if (stripe) {
          try {
            const stripeSubs = await stripe.subscriptions.list({
              limit: 100,
              status: 'all'
            });

            // Calculate actual MRR from Stripe
            let actualMRR = 0;
            stripeSubs.data.forEach(sub => {
              if (sub.status === 'active' || sub.status === 'trialing') {
                const amount = sub.items.data[0]?.price?.unit_amount || 0;
                actualMRR += amount / 100; // Convert from cents
              }
            });

            if (actualMRR > 0) {
              revenueMetrics.mrr = actualMRR;
              revenueMetrics.arr = actualMRR * 12;
            }
          } catch (stripeError) {
            console.error('Error fetching Stripe data:', stripeError);
            // Continue with Supabase data
          }
        }
      }
    }

    return res.json({
      subscriptions: subscriptions.slice(0, 50), // Return recent 50
      stats: subscriptionStats,
      revenue: revenueMetrics,
      planBreakdown,
      monthlyRevenue,
      churn: churnData
    });
  } catch (error) {
    console.error('Error in admin subscriptions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

