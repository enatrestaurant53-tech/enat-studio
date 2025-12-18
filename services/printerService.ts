
import qz from 'qz-tray';
import { Order, SystemSettings } from '../types';
import { db } from './dataService';

class PrinterService {
  private connected: boolean = false;

  constructor() {
    // Set up SHA-256 hashing for QZ Tray (required for connection reliability in some envs)
    qz.api.setSha256Type(function(data: string) {
        return new Promise((resolve) => {
            const buffer = new TextEncoder().encode(data);
            window.crypto.subtle.digest('SHA-256', buffer).then(hash => {
                resolve(Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
            });
        });
    });
  }

  async connect(): Promise<void> {
    if (qz.websocket.isActive()) {
      this.connected = true;
      return;
    }

    try {
      // Basic connect configuration
      await qz.websocket.connect({
          retries: 0, 
          delay: 0
      });
      this.connected = true;
      console.log("QZ Tray Connected");
    } catch (err) {
      console.error("QZ Tray Connection Error:", err);
      this.connected = false;
      throw new Error("Could not connect to QZ Tray. Is it running?");
    }
  }

  async disconnect(): Promise<void> {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
      this.connected = false;
    }
  }

  async getPrinters(): Promise<string[]> {
    if (!this.connected) await this.connect();
    return await qz.printers.find();
  }

  async printReceipt(order: Order, overridePrinter?: string): Promise<void> {
    if (!this.connected) await this.connect();

    // Fix: db.getSystemSettings is async
    const settings = await db.getSystemSettings();
    const printerName = overridePrinter || settings.receiptPrinterName;

    if (!printerName) {
      throw new Error("No receipt printer configured. Please go to Developer Settings.");
    }

    const config = qz.configs.create(printerName, { 
        size: { width: 80, units: 'mm' }, // Standard 80mm width
        scaleContent: true
    });

    const htmlData = this.generateReceiptHtml(order, settings);

    const data = [
      {
        type: 'html',
        format: 'plain',
        data: htmlData
      }
    ];

    try {
      await qz.print(config, data);
    } catch (err) {
      console.error("Printing failed", err);
      throw err;
    }
  }

  // Generate HTML formatted for 80mm thermal paper
  private generateReceiptHtml(order: Order, settings: SystemSettings): string {
    const { restaurantName, restaurantLocation } = settings;
    const date = new Date(order.timestamp).toLocaleString();

    return `
      <html>
        <head>
          <style>
            body { 
                font-family: 'Courier New', monospace; 
                width: 300px; /* Approx 80mm printable area usually fits 72mm ~ 576 dots. 300px is safe for HTML scaling */
                margin: 0;
                padding: 0;
                font-size: 14px;
                color: #000;
            }
            .header { text-align: center; margin-bottom: 15px; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 14px; margin: 2px 0; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .item-name { font-weight: bold; }
            .qty { margin-right: 5px; }
            .price { text-align: right; }
            .totals { margin-top: 15px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 5px;}
            .sub-row { display: flex; justify-content: space-between; font-size: 12px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${restaurantName}</h1>
            <p class="subtitle">${restaurantLocation}</p>
            <p class="subtitle">Table: ${order.tableName}</p>
            <p class="subtitle">Order #${order.id.substring(0, 6).toUpperCase()}</p>
            <p class="subtitle">${date}</p>
          </div>

          <div class="divider"></div>

          ${order.items.map(item => `
            <div class="item-row">
              <span class="item-name"><span class="qty">${item.quantity}x</span> ${item.name}</span>
              <span class="price">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}

          <div class="divider"></div>

          <div class="totals">
            <div class="sub-row">
              <span>Subtotal</span>
              <span>AED ${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="sub-row">
              <span>VAT (5%)</span>
              <span>AED ${order.tax.toFixed(2)}</span>
            </div>
            <div class="sub-row">
              <span>Service (5%)</span>
              <span>AED ${order.serviceFee.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL</span>
              <span>AED ${order.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>Payment: ${order.paymentStatus}</p>
          </div>
        </body>
      </html>
    `;
  }
}

export const printerService = new PrinterService();
