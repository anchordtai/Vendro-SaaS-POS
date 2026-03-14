import { formatCurrency } from "./currency";

// ESC/POS Commands (80mm thermal)
const ESC = "\x1b";
const GS = "\x1d";
const INIT = ESC + "@";
const CUT = GS + "V" + "\x00";
const LINE_FEED = "\n";
const ALIGN_CENTER = ESC + "a" + "\x01";
const ALIGN_LEFT = ESC + "a" + "\x00";
const BOLD_ON = ESC + "E" + "\x01";
const BOLD_OFF = ESC + "E" + "\x00";
const DOUBLE_HEIGHT = GS + "!" + "\x30";
const NORMAL_HEIGHT = GS + "!" + "\x00";

// Detect thermal printers
export const detectThermalPrinters = (): MediaDeviceInfo[] | null => {
  if ("mediaDevices" in navigator && "enumeratePrinters" in navigator) {
    // WebUSB/BLE printers (modern browsers)
    return null; // Future enhancement
  }

  // Fallback: check USB devices or CSS media queries
  const printerQuery = window.matchMedia(
    "(print-color, max-resolution: 300dpi)",
  );
  return printerQuery.matches ? [] : null;
};

// Print receipt (ESC/POS format optimized for 80mm)
export interface ReceiptData {
  businessName: string;
  address: string[];
  receiptNumber: string;
  date: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
}

export const printReceipt = async (data: ReceiptData) => {
  try {
    // Try thermal printer first
    const hasThermalPrinter = await detectThermalPrinter();
    if (hasThermalPrinter) {
      await printThermalReceipt(data);
    } else {
      // Fallback to browser print
      printBrowserReceipt(data);
    }
  } catch (error) {
    console.error("Print error:", error);
    // Last resort: browser print
    printBrowserReceipt(data);
  }
};

// Thermal printer detection
async function detectThermalPrinter(): Promise<boolean> {
  try {
    // Check for common thermal printer ports (Web Serial API)
    if ("serial" in navigator) {
      const ports = await (navigator.serial as any).getPorts();
      return ports.some(
        (port: any) =>
          port.getInfo().usbProductId && port.getInfo().usbVendorId,
      );
    }
    return false;
  } catch {
    return false;
  }
}

// ESC/POS thermal printing
async function printThermalReceipt(data: ReceiptData) {
  let receipt = INIT + ALIGN_CENTER + DOUBLE_HEIGHT;

  // Header
  receipt += "ONYXX NIGHTLIFE\n";
  receipt += "Onyxxnightlife Tampora\n";
  receipt += "Hotel and Suite\n";
  receipt += "Bwari Abuja\n\n";

  receipt += NORMAL_HEIGHT + ALIGN_LEFT + BOLD_ON;
  receipt += `Receipt: ${data.receiptNumber}\n`;
  receipt += `Date: ${data.date}\n`;
  receipt += `Cashier: ${data.cashier}\n\n`;
  receipt += BOLD_OFF;

  // Items (48 chars max width)
  data.items.forEach((item) => {
    const nameLine = item.name.padEnd(25, " ");
    const qtyPrice =
      `${item.quantity}x${formatCurrency(item.price).slice(0, -3)}`.padEnd(
        15,
        " ",
      );
    const subtotal = formatCurrency(item.subtotal).slice(0, -3);
    receipt += `${nameLine}${qtyPrice}${subtotal}\n`;
  });

  receipt += "\n" + BOLD_ON + ALIGN_CENTER;
  receipt += `Subtotal: ${formatCurrency(data.subtotal)}\n`;
  if (data.tax > 0) receipt += `Tax: ${formatCurrency(data.tax)}\n`;
  receipt += `TOTAL: ${formatCurrency(data.total)}\n`;
  receipt += BOLD_OFF + ALIGN_LEFT;

  receipt += `\nPayment: ${data.paymentMethod.replace("_", " ").toUpperCase()}\n\n`;
  receipt += ALIGN_CENTER + "Thank you for your purchase!\n";
  receipt += "Please come again\n\n";

  receipt += ALIGN_CENTER + CUT;

  // Send to printer (Web Serial API or iframe hack)
  const printWindow = window.open("", "_blank");
  printWindow?.document.write(`
    <pre style="font-family: monospace; font-size: 12px; line-height: 1.2;">${receipt}</pre>
    <script>window.onload = () => window.print(); window.onafterprint = () => window.close();</script>
  `);
}

// Browser print fallback (optimized for thermal CSS)
function printBrowserReceipt(data: ReceiptData) {
  const printWindow = window.open("", "_blank");
  const css = `
    @media print {
      @page { 
        size: 80mm;
        margin: 5mm;
      }
      body { 
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.2;
        color: black;
        width: 80mm;
        margin: 0;
        padding: 10px;
      }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .double { font-size: 18px; line-height: 1; }
      .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
      .total { border-top: 2px solid black; padding-top: 5px; }
    }
  `;

  printWindow?.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>${css}</style>
    </head>
    <body>
      <div class="center double bold">ONYXX NIGHTLIFE</div>
      <div class="center">Onyxxnightlife Tampora Hotel and Suite</div>
      <div class="center">Bwari Abuja</div>
      
      <div style="margin: 15px 0;">
        <div>Receipt: ${data.receiptNumber}</div>
        <div>Date: ${data.date}</div>
        <div>Cashier: ${data.cashier}</div>
      </div>
      
      ${data.items
        .map(
          (item) => `
        <div class="item-row">
          <span>${item.name.slice(0, 25)}</span>
          <span>${item.quantity}x${formatCurrency(item.price).slice(1)} ${formatCurrency(item.subtotal).slice(1)}</span>
        </div>
      `,
        )
        .join("")}
      
      <div class="total center bold">
        Subtotal: ${formatCurrency(data.subtotal)}<br>
        TOTAL: ${formatCurrency(data.total)}
      </div>
      
      <div class="center" style="margin-top: 15px;">
        Payment: ${data.paymentMethod.replace("_", " ").toUpperCase()}<br><br>
        Thank you for your purchase!
      </div>
    </body>
    </html>
  `);

  printWindow?.document.close();
  printWindow?.print();
}
