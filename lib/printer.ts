// Thermal printer implementation using ESC/POS protocol
// Supports USB and Windows default printers

export interface ReceiptData {
  receipt_number: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'pos_card';
  cashier_name: string;
  date: string;
  time: string;
}

export interface PrinterInfo {
  name: string;
  isDefault: boolean;
  type: 'usb' | 'network' | 'bluetooth' | 'default';
  status: 'connected' | 'disconnected' | 'unknown';
}

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CR = '\x0D';

// ESC/POS commands
const ESC_POS = {
  INIT: ESC + '@', // Initialize printer
  CENTER: ESC + 'a' + '\x01', // Center align
  LEFT: ESC + 'a' + '\x00', // Left align
  RIGHT: ESC + 'a' + '\x02', // Right align
  BOLD_ON: ESC + 'E' + '\x01', // Bold on
  BOLD_OFF: ESC + 'E' + '\x00', // Bold off
  UNDERLINE_ON: ESC + '-' + '\x01', // Underline on
  UNDERLINE_OFF: ESC + '-' + '\x00', // Underline off
  DOUBLE_HEIGHT_ON: GS + '!' + '\x10', // Double height on
  DOUBLE_WIDTH_ON: GS + '!' + '\x20', // Double width on
  DOUBLE_SIZE_ON: GS + '!' + '\x30', // Double height and width on
  NORMAL_SIZE: GS + '!' + '\x00', // Normal size
  CUT_PAPER: GS + 'V' + '\x00', // Full cut
  PARTIAL_CUT: GS + 'V' + '\x01', // Partial cut
  LINE_FEED: LF,
  CARRIAGE_RETURN: CR,
  PAPER_ADVANCE_3_LINES: ESC + 'd' + '\x03',
  PAPER_ADVANCE_6_LINES: ESC + 'd' + '\x06',
};

// Currency formatter for Naira
const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Generate ESC/POS receipt data
const generateReceiptData = (receipt: ReceiptData): string => {
  let output = '';

  // Initialize printer
  output += ESC_POS.INIT;

  // Header - Centered and Bold
  output += ESC_POS.CENTER;
  output += ESC_POS.BOLD_ON;
  output += ESC_POS.DOUBLE_SIZE_ON;
  output += 'ONYYX NIGHTLIFE' + ESC_POS.LINE_FEED;
  output += ESC_POS.NORMAL_SIZE;
  output += 'Onyxxnightlife Tampora Hotel and Suite' + ESC_POS.LINE_FEED;
  output += 'Bwari Abuja' + ESC_POS.LINE_FEED;
  output += ESC_POS.BOLD_OFF;
  output += '--------------------------------' + ESC_POS.LINE_FEED;
  output += ESC_POS.LINE_FEED;

  // Receipt details
  output += ESC_POS.LEFT;
  output += `Receipt: ${receipt.receipt_number}` + ESC_POS.LINE_FEED;
  output += `Date: ${receipt.date}` + ESC_POS.LINE_FEED;
  output += `Time: ${receipt.time}` + ESC_POS.LINE_FEED;
  output += `Cashier: ${receipt.cashier_name}` + ESC_POS.LINE_FEED;
  output += ESC_POS.LINE_FEED;

  // Items header
  output += ESC_POS.BOLD_ON;
  output += 'ITEM           QTY    PRICE     TOTAL' + ESC_POS.LINE_FEED;
  output += ESC_POS.BOLD_OFF;
  output += '--------------------------------' + ESC_POS.LINE_FEED;

  // Items
  receipt.items.forEach(item => {
    const name = item.name.padEnd(14, ' ');
    const qty = item.quantity.toString().padStart(3, ' ');
    const price = formatNaira(item.price).padStart(9, ' ');
    const subtotal = formatNaira(item.subtotal).padStart(9, ' ');
    
    output += `${name}${qty}${price}${subtotal}` + ESC_POS.LINE_FEED;
  });

  // Footer line
  output += '--------------------------------' + ESC_POS.LINE_FEED;
  output += ESC_POS.LINE_FEED;

  // Total
  output += ESC_POS.BOLD_ON;
  output += `TOTAL: ${formatNaira(receipt.total_amount).padStart(25, ' ')}` + ESC_POS.LINE_FEED;
  output += ESC_POS.BOLD_OFF;
  output += ESC_POS.LINE_FEED;

  // Payment method
  output += `Payment: ${receipt.payment_method.toUpperCase()}` + ESC_POS.LINE_FEED;
  output += ESC_POS.LINE_FEED;

  // Footer message
  output += ESC_POS.CENTER;
  output += 'Thank you for visiting Onyxx Nightlife' + ESC_POS.LINE_FEED;
  output += ESC_POS.LINE_FEED;
  output += ESC_POS.LINE_FEED;

  // Cut paper
  output += ESC_POS.PAPER_ADVANCE_3_LINES;
  output += ESC_POS.CUT_PAPER;

  return output;
};

// Windows printer interface using Electron
class WindowsPrinter {
  private static instance: WindowsPrinter;
  private printers: PrinterInfo[] = [];
  private defaultPrinter: PrinterInfo | null = null;

  static getInstance(): WindowsPrinter {
    if (!WindowsPrinter.instance) {
      WindowsPrinter.instance = new WindowsPrinter();
    }
    return WindowsPrinter.instance;
  }

  async detectPrinters(): Promise<PrinterInfo[]> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Electron environment
        const printers = await window.electronAPI.getPrinters();
        this.printers = printers.map((printer: any) => ({
          name: printer.name,
          isDefault: printer.isDefault || false,
          type: this.detectPrinterType(printer.name),
          status: 'connected'
        }));

        // Set default printer
        this.defaultPrinter = this.printers.find(p => p.isDefault) || this.printers[0] || null;
      } else {
        // Browser environment - simulate printer detection
        this.printers = [
          {
            name: 'Default Printer',
            isDefault: true,
            type: 'default',
            status: 'connected'
          }
        ];
        this.defaultPrinter = this.printers[0];
      }
    } catch (error) {
      console.error('Error detecting printers:', error);
      // Fallback to default printer
      this.printers = [
        {
          name: 'Default Printer',
          isDefault: true,
          type: 'default',
          status: 'unknown'
        }
      ];
      this.defaultPrinter = this.printers[0];
    }

    return this.printers;
  }

  private detectPrinterType(printerName: string): 'usb' | 'network' | 'bluetooth' | 'default' {
    const name = printerName.toLowerCase();
    
    if (name.includes('usb') || name.includes('pos') || name.includes('thermal')) {
      return 'usb';
    } else if (name.includes('bluetooth') || name.includes('bt')) {
      return 'bluetooth';
    } else if (name.includes('network') || name.includes('ip') || name.includes('wifi')) {
      return 'network';
    } else {
      return 'default';
    }
  }

  async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    try {
      if (!this.defaultPrinter) {
        await this.detectPrinters();
      }

      if (!this.defaultPrinter) {
        throw new Error('No printer available');
      }

      const receiptContent = generateReceiptData(receiptData);

      if (typeof window !== 'undefined' && window.electronAPI) {
        // Electron environment - use native printing
        const success = await window.electronAPI.printReceipt({
          printerName: this.defaultPrinter.name,
          content: receiptContent,
          options: {
            silent: true,
            printBackground: false,
            deviceName: this.defaultPrinter.name
          }
        });
        return success;
      } else {
        // Browser environment - create print preview
        this.printInBrowser(receiptData, receiptContent);
        return true;
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }

  private printInBrowser(receiptData: ReceiptData, content: string): void {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Could not open print window');
    }

    // Create receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData.receipt_number}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            white-space: pre;
          }
          .center {
            text-align: center;
          }
          .bold {
            font-weight: bold;
          }
          .double-size {
            font-size: 18px;
            font-weight: bold;
          }
          .total {
            font-weight: bold;
            text-align: right;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="double-size">ONYYX NIGHTLIFE</div>
          <div>Onyxxnightlife Tampora Hotel and Suite</div>
          <div>Bwari Abuja</div>
          <hr>
        </div>
        <div>
          Receipt: ${receiptData.receipt_number}<br>
          Date: ${receiptData.date}<br>
          Time: ${receiptData.time}<br>
          Cashier: ${receiptData.cashier_name}
        </div>
        <hr>
        <div class="bold">ITEM           QTY    PRICE     TOTAL</div>
        <hr>
        ${receiptData.items.map(item => 
          `${item.name.padEnd(14, ' ')}${item.quantity.toString().padStart(3, ' ')}${formatNaira(item.price).padStart(9, ' ')}${formatNaira(item.subtotal).padStart(9, ' ')}`
        ).join('<br>')}
        <hr>
        <div class="total">TOTAL: ${formatNaira(receiptData.total_amount)}</div>
        <div>Payment: ${receiptData.payment_method.toUpperCase()}</div>
        <div class="footer">
          Thank you for visiting Onyxx Nightlife
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  getDefaultPrinter(): PrinterInfo | null {
    return this.defaultPrinter;
  }

  getAllPrinters(): PrinterInfo[] {
    return this.printers;
  }

  setDefaultPrinter(printerName: string): boolean {
    const printer = this.printers.find(p => p.name === printerName);
    if (printer) {
      this.printers.forEach(p => p.isDefault = false);
      printer.isDefault = true;
      this.defaultPrinter = printer;
      return true;
    }
    return false;
  }
}

// USB Thermal Printer Detection
export class ThermalPrinterDetector {
  static async detectUSBPrinters(): Promise<PrinterInfo[]> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Use Electron to detect USB printers
        const printers = await window.electronAPI.detectPrinters();
        return printers.filter((printer: any) => 
          printer.name.toLowerCase().includes('thermal') ||
          printer.name.toLowerCase().includes('pos') ||
          printer.name.toLowerCase().includes('receipt')
        ).map((printer: any) => ({
          name: printer.name,
          isDefault: printer.isDefault || false,
          type: 'usb' as const,
          status: 'connected' as const
        }));
      }
      return [];
    } catch (error) {
      console.error('Error detecting USB printers:', error);
      return [];
    }
  }

  static async detectBluetoothPrinters(): Promise<PrinterInfo[]> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const printers = await window.electronAPI.detectPrinters();
        return printers.filter((printer: any) => 
          printer.name.toLowerCase().includes('bluetooth') ||
          printer.name.toLowerCase().includes('bt')
        ).map((printer: any) => ({
          name: printer.name,
          isDefault: printer.isDefault || false,
          type: 'bluetooth' as const,
          status: 'connected' as const
        }));
      }
      return [];
    } catch (error) {
      console.error('Error detecting Bluetooth printers:', error);
      return [];
    }
  }
}

// Main printer service
export class PrinterService {
  private windowsPrinter: WindowsPrinter;

  constructor() {
    this.windowsPrinter = WindowsPrinter.getInstance();
  }

  async initialize(): Promise<void> {
    await this.windowsPrinter.detectPrinters();
  }

  async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    try {
      return await this.windowsPrinter.printReceipt(receiptData);
    } catch (error) {
      console.error('Failed to print receipt:', error);
      throw error;
    }
  }

  async detectThermalPrinters(): Promise<PrinterInfo[]> {
    const usbPrinters = await ThermalPrinterDetector.detectUSBPrinters();
    const bluetoothPrinters = await ThermalPrinterDetector.detectBluetoothPrinters();
    
    return [...usbPrinters, ...bluetoothPrinters];
  }

  getDefaultPrinter(): PrinterInfo | null {
    return this.windowsPrinter.getDefaultPrinter();
  }

  getAllPrinters(): PrinterInfo[] {
    return this.windowsPrinter.getAllPrinters();
  }

  setDefaultPrinter(printerName: string): boolean {
    return this.windowsPrinter.setDefaultPrinter(printerName);
  }

  // Test print function
  async testPrint(): Promise<boolean> {
    const testReceipt: ReceiptData = {
      receipt_number: 'TEST-' + Date.now(),
      items: [
        {
          name: 'Test Product',
          quantity: 1,
          price: 1000,
          subtotal: 1000
        }
      ],
      total_amount: 1000,
      payment_method: 'cash',
      cashier_name: 'Test Cashier',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    try {
      await this.printReceipt(testReceipt);
      return true;
    } catch (error) {
      console.error('Test print failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const printerService = new PrinterService();
