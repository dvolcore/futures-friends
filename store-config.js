/* Futures Friends Store connection. Public addresses and PUBLIC keys only: never put a secret key in any file served to the browser.
   mode 'request' (default, live now): Place order sends an order REQUEST through the site's request gateway (intake-config.js). Nothing is
   charged. Where the gateway is off, the page shows the order summary to email, call in or print.
   mode 'stripe': Stripe Checkout Sessions (a server creates the session) or Payment Links (no server). Needs the keys below.
   mode 'shopify': Shopify Storefront API cart. Needs the shop domain and a Storefront token.
   A mode whose keys are empty falls back to 'request' on its own, so flipping the mode early is safe.
   Owner steps, one line at a time: STORE_SETUP.md. */
window.FF_STORE = {
  mode: 'request',
  stripe: {
    publishableKey: '',        // pk_live_... or pk_test_... (public)
    checkoutEndpoint: '',      // https URL of the session function: POST order -> { url } (or { sessionId })
    invoiceEndpoint: '',       // https URL for center PO / net-30 invoices: POST order -> { url } (hosted invoice) or { ref }
    paymentLinks: {},          // no-server fallback: { "product-id": "https://buy.stripe.com/...", "zone-boundaries:home": "https://buy.stripe.com/..." }
    successUrl: '',            // optional; defaults to this site's #order-return
    cancelUrl: ''              // optional; defaults to this site's #checkout
  },
  shopify: {
    domain: '',                // your-shop.myshopify.com
    storefrontToken: '',       // public Storefront API access token
    apiVersion: '2025-07',
    variantIds: {}             // { "product-id": "gid://shopify/ProductVariant/123", "zone-boundaries:home": "gid://shopify/ProductVariant/456" }
  }
};
