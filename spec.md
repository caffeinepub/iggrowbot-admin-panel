# BharatSMM Full Automation Panel

## Current State
- Single-page Admin Panel with API credential configuration (API URL + API Key)
- Backend: stores IGGROWBOT API credentials per Principal
- Frontend: one form to enter/save credentials, a "How to Connect API" guide dialog
- No dashboard stats, no payment system, no service sync, no order automation

## Requested Changes (Diff)

### Add
- **Dashboard**: Live Provider Balance display (fetched from IGGROWBOT API via backend), Low Balance Alert when balance < ₹5
- **Service Sync**: Backend fetches all services from IGGROWBOT API, stores them with a 20% profit margin applied to prices, exposed via a query for frontend to display
- **Payment System (UPI)**: Payment page with UPI ID (8825245372-13c6@ibl) displayed + QR-code image, input fields for UTR (Transaction ID) and Amount; on submission, backend validates UTR and credits the user's wallet automatically
- **User Wallet**: Per-user balance stored in backend, updated when payment verified
- **Order Placement**: Users can place orders for services; backend deducts from wallet and forwards the order to IGGROWBOT API automatically
- **Order History**: Per-user order list with status tracking
- **Multi-page navigation**: Dashboard, Services, Add Funds, Orders tabs

### Modify
- Backend: add balance fetch, service sync, wallet management, payment verification, order placement functions
- Frontend: replace single-page config with a full tabbed panel (Dashboard, Services, Add Funds, Orders + Admin/Settings tab)
- Admin Settings: keep existing API credentials form, add Sync Services button, show provider balance

### Remove
- Nothing removed; existing credential management kept in Settings tab

## Implementation Plan
1. **Backend (Motoko)**:
   - `getProviderBalance()` - HTTP outcall to IGGROWBOT API to fetch live balance
   - `syncServices()` - HTTP outcall to fetch all services, store with 20% margin
   - `getServices()` - query to return synced service list
   - `getUserBalance(user)` - query wallet balance per user
   - `submitPayment(utr, amount)` - store pending payment, credit wallet on UTR validation
   - `placeOrder(serviceId, link, quantity)` - deduct wallet, call IGGROWBOT order API
   - `getOrders(user)` - query user's order history
   - `getPendingPayments()` - admin query for pending payments
   - Low balance alert threshold stored as stable var (₹5 default)

2. **Frontend**:
   - Tab navigation: Dashboard | Services | Add Funds | My Orders | Settings
   - Dashboard tab: provider balance card with low-balance warning, quick stats (total orders, wallet balance)
   - Services tab: synced service list with search, service card shows name/rate/min/max, Order button
   - Add Funds tab: UPI QR code display, UTR + Amount input, submit for instant credit
   - My Orders tab: order history table with status badges
   - Settings tab: existing API config form + Sync Services button
