/**
 * Update Stripe Product Descriptions
 * Run this script locally to remove descriptions from Stripe products
 * 
 * Usage:
 *   cd ORA-website
 *   vercel env pull .env.local  (to get env vars)
 *   node scripts/update-stripe-products.js
 */

// Load environment variables from .env.local if it exists
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, try to load manually or use process.env
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Price IDs from create-checkout-session.js
const PLAN_PRICE_IDS = {
  creator: 'price_1SSzEbAawVwKR3X2nnKqmteT',
  pro: 'price_1SQ1FSAawVwKR3X2LEeBfKXt',
  premium: 'price_1SQ1FUAawVwKR3X2AfwilFhS',
};

async function updateProducts() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
      console.log('Please set it: export STRIPE_SECRET_KEY=sk_...');
      process.exit(1);
    }

    console.log('🔍 Fetching products from prices...\n');
    
    // Get product IDs from prices
    const productsToUpdate = {};
    
    for (const [planId, priceId] of Object.entries(PLAN_PRICE_IDS)) {
      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product);
      
      productsToUpdate[planId] = {
        productId: price.product,
        currentName: product.name,
        currentDescription: product.description || '(none)',
        planName: planId === 'creator' ? 'Creator Essentials' : 
                 planId === 'pro' ? 'Pro' : 'Premium',
      };
      
      console.log(`📦 ${productsToUpdate[planId].planName}:`);
      console.log(`   Current Name: ${product.name}`);
      console.log(`   Current Description: ${product.description || '(none)'}`);
      console.log(`   Product ID: ${price.product}\n`);
    }
    
    console.log('🔄 Updating products...\n');
    const results = [];
    
    // Update each product
    for (const [planId, { productId, planName }] of Object.entries(productsToUpdate)) {
      const updated = await stripe.products.update(productId, {
        description: '', // Remove description completely
        name: `ORA ${planName} Plan`, // Keep simple name
      });
      
      results.push({
        planId,
        planName,
        productId,
        updated: {
          name: updated.name,
          description: updated.description || '(removed)',
        },
      });
      
      console.log(`✅ Updated ${planName}:`);
      console.log(`   New Name: ${updated.name}`);
      console.log(`   Description: ${updated.description || '(removed)'}\n`);
    }
    
    console.log('✨ All products updated successfully!\n');
    console.log('Summary:');
    results.forEach(r => {
      console.log(`  - ${r.planName}: "${r.updated.name}" (description removed)`);
    });
    
  } catch (error) {
    console.error('❌ Error updating products:', error.message);
    if (error.type) {
      console.error(`   Type: ${error.type}`);
    }
    process.exit(1);
  }
}

// Run the update
updateProducts()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

