/**
 * Create Annual Stripe Products
 * Run this script to create annual subscription products in Stripe
 * 
 * Usage: node scripts/create-stripe-annual-products.js
 * 
 * Make sure STRIPE_SECRET_KEY is set in your environment or .env.local
 */

require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ANNUAL_PRODUCTS = [
  {
    name: 'ORA Creator Essentials Annual',
    description: 'Creator Essentials plan billed annually',
    price: 191.88, // $15.99/month × 12
    priceId: 'price_CREATOR_ANNUAL', // Will be updated after creation
    planId: 'creator-annual',
  },
  {
    name: 'ORA Creator Pro Annual',
    description: 'Creator Pro plan billed annually',
    price: 383.88, // $31.99/month × 12
    priceId: 'price_PRO_ANNUAL',
    planId: 'pro-annual',
  },
  {
    name: 'ORA Creator Elite Annual',
    description: 'Creator Elite plan billed annually',
    price: 767.88, // $63.99/month × 12
    priceId: 'price_PREMIUM_ANNUAL',
    planId: 'premium-annual',
  },
];

async function createAnnualProducts() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
    console.log('\nPlease set STRIPE_SECRET_KEY in your .env.local file or environment variables');
    process.exit(1);
  }

  console.log('🚀 Creating annual Stripe products...\n');

  const results = [];

  for (const product of ANNUAL_PRODUCTS) {
    try {
      // Create the product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
      });

      console.log(`✅ Created product: ${product.name} (ID: ${stripeProduct.id})`);

      // Create the price (annual subscription)
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
      });

      console.log(`✅ Created price: $${product.price}/year (Price ID: ${stripePrice.id})`);

      results.push({
        planId: product.planId,
        productId: stripeProduct.id,
        priceId: stripePrice.id,
        name: product.name,
        price: product.price,
      });

      console.log('');
    } catch (error) {
      console.error(`❌ Error creating ${product.name}:`, error.message);
      results.push({
        planId: product.planId,
        error: error.message,
      });
    }
  }

  console.log('\n📋 Summary:');
  console.log('='.repeat(60));
  console.log('\nUpdate your create-checkout-session.js with these Price IDs:\n');
  
  results.forEach(result => {
    if (result.priceId) {
      console.log(`  ${result.planId}: '${result.priceId}', // ${result.name} - $${result.price}/year`);
    } else {
      console.log(`  ${result.planId}: 'ERROR - ${result.error}'`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Done! Copy the Price IDs above and update create-checkout-session.js\n');
}

createAnnualProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

