# Futures Store: owner setup

The store works today in **request mode**: a visitor builds a cart, checks out, and the site sends a complete order *request* through the same
request gateway the quote forms use. Nothing is charged. Where the gateway is off, the page shows the order summary to copy, email, call in or print.
This file says exactly what you do to turn on card payments. **You** open the payment account and paste the keys. Nobody else should.

One config file controls everything: `store-config.js`. A mode whose keys are empty falls back to request mode on its own, so you can flip it early.

## Turn on Stripe (recommended; you chose Stripe)

A single Stripe account covers both the store and the tuition billing planned for the platform. Keep them apart with separate products
(and, if you like, separate Stripe "accounts" under one organization): the store uses one-time products; tuition uses recurring prices and invoices.

1. **Open the account.** Go to stripe.com, create the account yourself, and finish verification with the business EIN, the legal business name and address, and the bank
   account where payouts go. Turn on two-step sign-in for the owner login.
2. **Enable Stripe Tax for Missouri and Kansas.** Dashboard, Tax: add your head-office address, register Missouri and Kansas (add other states only when you have nexus),
   and set the default product tax code for physical goods. Posters, rugs and plush are general tangible goods. Ask your accountant whether children's clothing or books are exempt in either state.
3. **Create products.** Only items with an approved price can be bought by card today: the Zone Boundaries pack ($1,195 home, $1,995 classroom), the friend posters ($16), and the three startup packages
   ($1,495, $2,995, $5,995). The plush ($26) stays off until safety testing and its Children's Product Certificate are done. Everything else is quoted, so it goes through the invoice path, not a fixed price.
4. **Pick how checkout is created.** Choose one:
   - **Checkout Sessions (full cart, best).** A small server function creates a Stripe Checkout Session from the order the site sends it. The Futures Hub worker can host it (see "Server function" below).
     Paste its HTTPS address into `stripe.checkoutEndpoint`.
   - **Payment Links (no server).** In Stripe, make a Payment Link per product or variant (adjustable quantity on). Paste each into `stripe.paymentLinks`, keyed by product id, or `product-id:option-id`
     for variants (for example `"zone-boundaries:home": "https://buy.stripe.com/..."`). Payment Links take **one product per checkout**, so a cart with two different products falls back to a request.
5. **Center invoices (PO and net 30).** Stripe Invoicing handles purchase orders and net terms. Create a second function that builds a Stripe Invoice from the order (see below) and paste its address into
   `stripe.invoiceEndpoint`. A center that chooses "Pay by invoice" is sent to Stripe's hosted invoice page. Tax-exempt centers and churches: after you verify their certificate, the function sets the Stripe
   customer's tax status to exempt before the invoice is finalized. The site collects the certificate number now; the file upload placeholder switches on with online ordering.
6. **Paste the public key and endpoint** into `store-config.js`:

   ```js
   window.FF_STORE = { mode: 'stripe', stripe: { publishableKey: 'pk_live_...', checkoutEndpoint: 'https://.../session', invoiceEndpoint: 'https://.../invoice', paymentLinks: {} }, shopify: { ... } };
   ```

   Never paste a secret key (`sk_`), a restricted key (`rk_`) or a webhook secret (`whsec_`) into this file. It is served to every visitor. Secret keys live only on the server function.
7. **Flip the mode.** The one-line change is `mode: 'request'` to `mode: 'stripe'`. With a key and an endpoint (or payment links) present, the site uses Stripe; with either missing it stays in request mode and says nothing is charged.
8. **Test mode first.** Use `pk_test_` keys and Stripe's published test cards, place an order from the site, and confirm the Checkout page, the receipt and the dashboard entry. Then swap in the live key.

### What the site sends to your server function

`POST` JSON: `{ v, ref, mode: "stripe", path: "center" | "family", customer: { name, email, phone, org, orgType }, shipTo, po, payment: "invoice" | "quote" | "request", taxExempt: { claimed, certificate, state },
lines: [{ id, name, options, optionIds, qty, unit, priced }], notes, successUrl, cancelUrl }`. It answers `{ "url": "https://checkout.stripe.com/..." }` (or `{ "url": "<hosted invoice url>" }` for invoices).
The function must **re-price every line from its own copy of the approved prices**, never trust `unit`, and refuse any line that is not priced. It sets `automatic_tax: { enabled: true }`, `shipping_address_collection`
for the US, stores `ref` and the PO number in metadata, and returns only the URL. Freight for rugs is quoted by a person, so rug orders never go through card checkout.

### Server function spec (the Futures Hub worker or a small serverless function)

- Endpoint 1, `POST /session`: validate the order, create a Checkout Session (`mode: payment`, `line_items` from your price ids, `automatic_tax`, `client_reference_id = ref`, `customer_email`), return `{ url }`.
- Endpoint 2, `POST /invoice`: find or create a Customer (`tax_exempt: "exempt"` only after you have verified the certificate), create InvoiceItems, create an Invoice (`collection_method: send_invoice`, `days_until_due: 30`,
  `custom_fields` for the PO number), finalize it, return `{ url: hosted_invoice_url }`.
- Allow only this site's origin (CORS), rate-limit by IP, and log the order `ref` so the confirmation email and the Stripe record match.
- Webhook (`checkout.session.completed`, `invoice.paid`) marks the order paid in your records. The website never shows "payment successful"; Stripe's receipt and your own confirmation email do.

## Shopify instead (only if you choose it later)

Create the shop, add a Storefront API token, create products and variants, then fill `shopify.domain` (`your-shop.myshopify.com`), `shopify.storefrontToken` and `shopify.variantIds` (product id, or `product-id:option-id`,
to the variant's `gid://shopify/ProductVariant/...`). Set `mode: 'shopify'`. The site creates a Shopify cart and sends the visitor to its checkout. Quoted items still go through a request.

## Pictures

Real product photos go in `~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos/` named `<product-id>-<n>.png|jpg`. Run `node tools/import-store-images.mjs` from the website repo; it makes
the web sizes and the manifest. Read the README.md in that folder. The merchandise campaign pictures were staged with `node tools/stage-merch-images.mjs`. Product ids are listed in `store-catalog.js`
(and, for the merchandise, in `store-merch-data.js`, generated by `node tools/build-store-merch.mjs`).

## Before the first real order (see STORE_BLINDSPOTS.md)

Children's Product Certificates for rugs, plush and apparel; a sales tax registration for Missouri and Kansas; a fulfillment owner and a stock count; the returns policy and terms of sale confirmed by counsel; a way to ship rugs
by freight. Prices and sizes for everything marked "Request a quote" or "Price coming soon" are yours to set.

## Where things live

| What | File |
| --- | --- |
| Products, prices, collections, image fallbacks | `store-catalog.js` |
| Merchandise campaign data (generated) | `store-merch-data.js` |
| Cart, drawer | `store-cart.js` |
| Payment adapter (request, stripe, shopify) | `store-checkout.js`, `store-config.js` |
| Store home, collections, Kids' Shop | `store-shop.js` |
| Product page | `store-product.js` |
| Cart page, checkout, confirmation | `store-order.js` |
| Styles | `store-shop.css` |
