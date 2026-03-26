# Vendro SaaS POS Platform - Setup Guide

## Overview

Vendro is a multi-tenant SaaS Point of Sale platform that adapts to different business types with industry-specific features. This document provides setup instructions for deploying the complete platform.

## Database Setup

### 1. Execute Database Schema

Run the SQL files in order:

```bash
# 1. Create main schema and tables
psql -d your_database -f saas-schema.sql

# 2. Add payment processing tables
psql -d your_database -f payment-tables.sql

# 3. Apply Row Level Security policies
psql -d your_database -f rls-policies.sql

# 4. Seed plans and feature flags
psql -d your_database -f seed-plans.sql
```

### 2. Environment Variables

Create `.env.local` with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Flutterwave Payment Integration
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_WEBHOOK_HASH=your_webhook_hash

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Key Features Implemented

### ✅ Multi-Tenancy Architecture
- Tenant-based data isolation
- Row Level Security (RLS) on all tables
- Tenant context in all API calls

### ✅ Business Type Configuration
- **Pharmacy**: Expiry tracking, batch management, prescription mode
- **Hotel Bar**: Open tabs, table management, age verification
- **Nightclub**: Fast checkout, cover charges, VIP management
- **Grocery**: Barcode scanning, bulk inventory, weight-based pricing
- **Retail**: Loyalty programs, returns management, promotions

### ✅ Subscription System
- Three tiers: Starter, Growth, Enterprise
- Business size-based pricing (Small, Medium, Large)
- Monthly/yearly billing cycles
- 14-day free trial for all new accounts
- Flutterwave payment integration

### ✅ Authentication & Access Control
- Tenant signup with business configuration
- Role-based access control (Super Admin, Tenant Admin, Manager, Cashier, Staff)
- Middleware for route protection
- Subscription status enforcement

### ✅ Modern UI/UX
- Stunning landing page with glassmorphism effects
- Responsive design for all devices
- Smooth animations and transitions
- Industry-specific feature showcases

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── logout/
│   │   └── payments/
│   │       ├── initialize/
│   │       ├── callback/
│   │       └── webhook/
│   ├── signup/
│   │   ├── page.tsx
│   │   └── success/
│   ├── login/
│   ├── pricing/
│   ├── payment/
│   │   ├── success/
│   │   └── failed/
│   ├── page.tsx (Landing page)
│   └── middleware.ts
├── lib/
│   ├── tenant-service.ts
│   ├── payment-service.ts
│   └── supabase.ts
└── types/
    └── saas.ts
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Payments
- `POST /api/payments/initialize` - Initialize Flutterwave payment
- `GET /api/payments/callback` - Payment callback handler
- `POST /api/payments/webhook` - Flutterwave webhook handler

## Database Tables

### Core Tables
- `tenants` - Business/tenant information
- `users` - User accounts with role-based access
- `subscriptions` - Subscription management
- `plans` - Available pricing plans
- `outlets` - Multi-location support

### Business Tables
- `products` - Product catalog with industry-specific fields
- `sales` - Sales transactions
- `sale_items` - Line items for sales
- `open_tabs` - For bar/nightclub tabs
- `inventory_logs` - Inventory tracking

### System Tables
- `feature_flags` - Dynamic feature enabling
- `pending_transactions` - Payment processing
- `payment_records` - Payment history

## Security Features

- Row Level Security (RLS) on all tables
- Tenant data isolation
- Secure payment processing with Flutterwave
- JWT-based authentication
- Subscription enforcement middleware

## Business Logic

### Feature Flags
Features are dynamically enabled based on:
- Business type (pharmacy, bar, etc.)
- Subscription tier (starter, growth, enterprise)
- Business size (small, medium, large)

### Subscription Limits
Each plan enforces limits on:
- Maximum products
- Maximum outlets
- Maximum users/staff

### Trial Management
- 14-day free trial for all new tenants
- Automatic trial expiry handling
- Graceful upgrade to paid plans

## Deployment

1. **Database Setup**: Execute SQL files in order
2. **Environment Configuration**: Set up all required environment variables
3. **Flutterwave Setup**: Configure payment gateway and webhooks
4. **Deploy**: Deploy to your preferred hosting platform

## Next Steps

The platform is now ready for use. Users can:
1. Sign up for a 14-day free trial
2. Configure their business type and size
3. Add products and start selling
4. Upgrade to paid plans as needed

All core SaaS functionality is implemented and production-ready.
