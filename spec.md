# BharatSMM Panel

## Current State
Empty workspace. Rebuilding from scratch.

## Requested Changes (Diff)

### Add
- Full BharatSMM SMM panel with multi-tab layout
- Admin Settings page with 'Provider API Connection' section
- API Key input field (masked) with Save button
- 'Sync Services' button to pull live catalog from IGGROWBOT
- New Order page with service selection and quantity input
- Add Funds page with UPI QR code and UTR entry for wallet credit
- Admin dashboard with pending payments table and manual credit tool
- Orders page for user order history

### Modify
- N/A (new project)

### Remove
- N/A

## Implementation Plan
1. Generate Motoko backend with: settings store (apiKey, upiId), services catalog, user wallets, orders, payments
2. Build React frontend with tabs: New Order, Add Funds, My Orders, Admin (Settings, Dashboard)
3. Admin Settings: Provider API Connection card with masked API key input + Save, Sync Services button
4. Wire IGGROWBOT HTTP outcall for service sync (via http_outcalls component)
5. UPI QR in Add Funds; UTR submission for wallet credit
