# Onyxx Nightlife POS - Complete Setup Guide

## 🎯 Overview

This guide covers the complete setup and deployment of the **Onyxx Nightlife POS** system as a Windows desktop application with offline-first capabilities.

## 📋 Prerequisites

### Development Environment
- Node.js 18+ 
- npm or yarn
- Git
- Windows 10+ (for building/installing)

### Production Environment
- Windows 10+ target machine
- 4GB RAM minimum
- 500MB disk space
- USB port (for thermal printer)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run electron-dev
```

### 3. Build Windows Installer
```bash
npm run build-pos
```

### 4. Install on Target Machine
- Copy `dist/onyxx-nightlife-pos-v1.0.0/` to USB drive
- Run `install.bat` or double-click `OnyxxPOSSetup.exe`
- Follow installation wizard

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Onyxx Nightlife POS                      │
├─────────────────────────────────────────────────────────────┤
│  Electron Desktop Application (1280x800)                    │
│  ├── Next.js 14 Frontend (App Router)                       │
│  ├── TypeScript                                            │
│  ├── Tailwind CSS                                          │
│  └── IndexedDB (Local Database)                            │
├─────────────────────────────────────────────────────────────┤
│  Core Features                                             │
│  ├── Product Management                                     │
│  ├── POS Checkout System                                   │
│  ├── Sales Tracking                                        │
│  ├── Thermal Receipt Printing                              │
│  ├── Real-time Dashboard                                   │
│  ├── Report Generation                                     │
│  └── Offline Sync Engine                                   │
├─────────────────────────────────────────────────────────────┤
│  Data Storage                                             │
│  ├── Local: IndexedDB (Primary)                           │
│  ├── Cloud: Supabase (Optional Sync)                      │
│  └── Export: CSV Reports                                  │
├─────────────────────────────────────────────────────────────┤
│  Hardware Integration                                      │
│  ├── USB Thermal Printers (ESC/POS)                       │
│  ├── Windows Default Printers                             │
│  └── Barcode Scanners (Future)                            │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
onyxx-nightlife-pos/
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Electron preload script
├── lib/
│   ├── localDB.ts           # IndexedDB database
│   ├── printer.ts           # Thermal printer service
│   ├── offline-sync.ts      # Sync engine
│   ├── currency.ts          # Naira formatter
│   └── auth-store.ts        # Authentication
├── src/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   └── lib/                 # Utilities
├── types/
│   └── electron.d.ts        # TypeScript declarations
├── public/                  # Static assets
├── build-electron.js        # Build script
├── package.json             # Dependencies and scripts
└── dist/                    # Build output
    └── OnyxxPOSSetup.exe    # Windows installer
```

## 🔧 Configuration

### Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Electron Configuration
```javascript
// electron/main.js
{
  width: 1280,
  height: 800,
  autoHideMenuBar: true,
  kiosk: false,
  resizable: false
}
```

### Database Schema
```typescript
// IndexedDB Stores
interface Product {
  id: string;
  name: string;
  price_naira: number;
  barcode: string;
  stock_quantity: number;
  image_url: string;
  created_at: string;
}

interface Sale {
  id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'pos_card';
  receipt_number: string;
  created_at: string;
  items: SaleItem[];
}
```

## 🖨️ Printer Setup

### USB Thermal Printers
1. Connect USB thermal printer
2. Install printer drivers
3. Test with `printerService.testPrint()`

### ESC/POS Commands
```typescript
// Receipt format
ONYYX NIGHTLIFE
Onyxxnightlife Tampora Hotel and Suite
Bwari Abuja
--------------------------------
Receipt: RCP123456
Date: 2024-03-14
Time: 14:30:00
Cashier: John Doe
--------------------------------
ITEM           QTY    PRICE     TOTAL
Product Name     2   ₦1,000   ₦2,000
Another Item     1   ₦5,000   ₦5,000
--------------------------------
TOTAL:                     ₦7,000
Payment: CASH
Thank you for visiting Onyxx Nightlife
```

## 💾 Database Operations

### Product Management
```typescript
// Add product
await localDB.saveProduct({
  id: 'uuid',
  name: 'Product Name',
  price_naira: 1000,
  barcode: '123456789',
  stock_quantity: 50,
  image_url: '/image.jpg',
  created_at: new Date().toISOString(),
  is_active: true
});

// Get products
const products = await localDB.getActiveProducts();
```

### Sales Processing
```typescript
// Create sale
const sale = {
  id: 'uuid',
  cashier_id: 'cashier_id',
  total_amount: 7000,
  payment_method: 'cash',
  receipt_number: 'RCP123456',
  created_at: new Date().toISOString(),
  items: [/* sale items */]
};

await localDB.saveSale(sale);
await offlineSync.queueSale(sale);
```

## 🔄 Offline Sync

### Sync Engine
```typescript
// Check sync status
const status = await offlineSync.getStatus();

// Force sync
await offlineSync.forceSync();

// Monitor sync progress
offlineSync.onProgress((progress) => {
  console.log(`${progress.percentage}% complete`);
});
```

### Sync Queue
- Sales are queued when offline
- Automatic sync when online
- Retry mechanism for failed syncs
- Conflict resolution support

## 📊 Reporting

### Daily Sales Report
```typescript
// Generate report
const todaySales = await localDB.getTodaySales();
const report = generateSalesReport(todaySales);

// Export to CSV
exportToCSV(report, `sales-report-${date}.csv`);
```

### Available Reports
- Daily sales summary
- Product performance
- Cashier performance
- Inventory reports

## 🔐 Security

### Authentication
- Local authentication fallback
- Supabase integration optional
- Role-based access control
- Session management

### Data Protection
- Local data encryption
- Secure API communication
- Audit logging
- Backup and restore

## 🚀 Deployment

### Build Process
```bash
# 1. Clean previous builds
npm run clean

# 2. Install dependencies
npm install

# 3. Build Next.js
npm run build

# 4. Build Electron
npm run electron-build

# 5. Generate installer
npm run build-installer

# 6. Create distribution package
npm run build-pos
```

### Distribution Package
```
dist/onyxx-nightlife-pos-v1.0.0/
├── OnyxxPOSSetup.exe    # Main installer
├── install.bat          # Installation script
└── README.txt           # Installation guide
```

### Installation Steps
1. Copy package to target machine
2. Run `install.bat` or double-click installer
3. Follow installation wizard
4. Launch from desktop shortcut
5. Configure initial settings
6. Add products and users

## 🛠️ Troubleshooting

### Common Issues

#### 1. Printer Not Working
```bash
# Check printer detection
await printerService.detectThermalPrinters();

# Test print
await printerService.testPrint();
```

#### 2. Sync Not Working
```bash
# Check network status
const status = await offlineSync.getStatus();

# Force sync
await offlineSync.forceSync();

# Retry failed items
await offlineSync.retryFailedItems();
```

#### 3. Database Issues
```bash
# Clear and reinitialize
await localDB.clearAllData();

# Export data for backup
const backup = await localDB.exportData();

# Import data
await localDB.importData(backup);
```

### Error Codes
- `ELECTRON_001`: Electron startup failed
- `PRINTER_001`: No printer detected
- `DB_001`: Database initialization failed
- `SYNC_001`: Sync operation failed
- `AUTH_001`: Authentication failed

## 📱 User Interface

### Main Screens
1. **Login Screen** - User authentication
2. **Dashboard** - Real-time statistics
3. **POS Page** - Checkout interface
4. **Products** - Product management
5. **Sales** - Sales history
6. **Reports** - Report generation
7. **Settings** - System configuration

### Navigation
- Keyboard shortcuts for common actions
- Touch-friendly interface
- Responsive design for different screen sizes
- Accessibility features

## 🔧 Maintenance

### Regular Tasks
- Database backup (weekly)
- Software updates (monthly)
- Printer maintenance (as needed)
- Performance monitoring (continuous)

### Updates
- Automatic update checking
- Manual update installation
- Configuration migration
- Data compatibility

## 📞 Support

### Contact Information
- **Email**: support@onyxxnightlife.com
- **Phone**: +234-XXX-XXXX-XXXX
- **Website**: www.onyxxnightlife.com

### Support Hours
- Monday - Friday: 9:00 AM - 6:00 PM
- Saturday: 10:00 AM - 4:00 PM
- Sunday: Closed

### Emergency Support
- Critical system failures
- Data recovery assistance
- Urgent security issues

## 📄 License

This software is licensed to [Customer Name] for use at [Location].

**License Key**: [LICENSE_KEY_HERE]
**Installation Limit**: [NUMBER] installations
**Support Period**: [START_DATE] - [END_DATE]

---

## 🎉 Success Criteria

✅ **Functional Requirements**
- [ ] Offline operation complete
- [ ] Thermal printing working
- [ ] Fast POS checkout
- [ ] Product management
- [ ] Real-time dashboard
- [ ] Report generation
- [ ] Windows installer created

✅ **Non-Functional Requirements**
- [ ] Performance optimized
- [ ] Security implemented
- [ ] User-friendly interface
- [ ] Reliable sync engine
- [ ] Proper error handling
- [ ] Comprehensive documentation

✅ **Deployment Requirements**
- [ ] Installer generated successfully
- [ ] Distribution package created
- [ ] Installation instructions provided
- [ ] Support documentation complete

---

**Generated**: March 14, 2026  
**Version**: 1.0.0  
**Status**: Ready for Production
