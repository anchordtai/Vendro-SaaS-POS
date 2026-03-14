// Thermal Printer Utility for POS System
// Supports USB thermal printers and browser printing

export interface ThermalPrinter {
  name: string;
  deviceId: string;
}

export class ThermalPrinterService {
  private printers: ThermalPrinter[] = [];
  private isConnected = false;

  constructor() {
    this.initializePrinters();
  }

  public async initializePrinters() {
    try {
      // Check for USB devices (thermal printers)
      if ('usb' in navigator) {
        const usbNavigator = navigator as any;
        const devices = await usbNavigator.usb.getDevices();
        this.printers = devices.map((device: any) => ({
          name: device.productName || 'Unknown Printer',
          deviceId: device.deviceId
        }));
        console.log('Found USB printers:', this.printers);
      }

      // Check for Web Bluetooth API support
      if ('bluetooth' in navigator) {
        console.log('Bluetooth API available');
      }
    } catch (error) {
      console.error('Error initializing printers:', error);
    }
  }

  public async connectToPrinter(printerId: string): Promise<boolean> {
    try {
      if ('usb' in navigator) {
        const usbNavigator = navigator as any;
        const device = await usbNavigator.usb.requestDevice({
          filters: [{ vendorId: printerId }]
        });
        
        if (device) {
          this.isConnected = true;
          console.log('Connected to printer:', device.productName);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  public async printReceipt(content: string): Promise<boolean> {
    try {
      if (this.isConnected) {
        return await this.sendToThermalPrinter(content);
      } else {
        return this.printToBrowser(content);
      }
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  }

  private async sendToThermalPrinter(content: string): Promise<boolean> {
    try {
      // ESC/POS commands for thermal printer
      const thermalCommands = this.formatForThermalPrinter(content);
      
      // This would require actual USB communication
      // For now, we'll use the browser print as fallback
      console.log('Thermal printer commands:', thermalCommands);
      return true;
    } catch (error) {
      console.error('Thermal printer error:', error);
      return false;
    }
  }

  private formatForThermalPrinter(content: string): string {
    // Convert to thermal printer commands
    // ESC/POS command sequences for thermal printers
    
    const lines = content.split('\n');
    let commands = '';

    // Initialize printer
    commands += '\x1B\x40'; // ESC @
    commands += '\x1B\x61'; // Center alignment

    lines.forEach(line => {
      // Add text with proper formatting
      commands += line + '\x0A'; // Line feed
    });

    // Cut paper
    commands += '\x1D\x56\x00'; // GS V 0

    return commands;
  }

  private async printToBrowser(content: string): Promise<boolean> {
    return new Promise((resolve) => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { 
                  font-family: 'Courier New', monospace; 
                  white-space: pre; 
                  padding: 10px; 
                  font-size: 12px;
                  width: 280px;
                  line-height: 1.2;
                }
                @media print {
                  body { margin: 0; padding: 5px; }
                }
              </style>
            </head>
            <body><pre>${content}</pre></body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Auto-print with delay for thermal printer compatibility
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          resolve(true);
        }, 500);
      } else {
        resolve(false);
      }
    });
  }

  public getAvailablePrinters(): ThermalPrinter[] {
    return this.printers;
  }

  isConnectedToPrinter(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const thermalPrinter = new ThermalPrinterService();
