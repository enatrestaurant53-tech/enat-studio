// @ts-nocheck

// In a real production app, you would use a database like Supabase or MongoDB.
// For Vercel Serverless, global variables are per-instance. 
// For a truly persistent central store, connect this to a DB.
let centralStore: any = {
  menu: [],
  orders: [],
  expenses: [],
  waiterCalls: [],
  categories: [],
  users: [],
  logs: [],
  settings: {
    isMaintenanceMode: false,
    maintenanceMessage: 'Updating our menu for a better experience.',
    restaurantName: 'Enat Restaurant',
    restaurantLocation: 'Dubai, UAE',
    restaurantLogo: '',
    totalTables: 17,
    theme: 'SAVANNA',
    tableSelectionMode: 'WHEEL',
    receiptPrinterName: ''
  }
};

export default async function handler(req: any, res: any) {
  const { method, query } = req;
  const type = query.type as string;

  // Simulate minimal network latency
  await new Promise(resolve => setTimeout(resolve, 100));

  if (method === 'GET') {
    if (!type) return res.status(200).json(centralStore);
    return res.status(200).json(centralStore[type] || []);
  }

  if (method === 'POST') {
    const body = req.body;
    
    switch (type) {
      case 'orders':
        // Update existing or add new
        const oIdx = centralStore.orders.findIndex((o: any) => o.id === body.id);
        if (oIdx >= 0) centralStore.orders[oIdx] = body;
        else centralStore.orders.push(body);
        break;
      case 'menu':
        const mIdx = centralStore.menu.findIndex((m: any) => m.id === body.id);
        if (mIdx >= 0) centralStore.menu[mIdx] = body;
        else centralStore.menu.push(body);
        break;
      case 'expenses':
        centralStore.expenses.push(body);
        break;
      case 'settings':
        centralStore.settings = { ...centralStore.settings, ...body };
        break;
      case 'waiterCalls':
        if (body.resolveId) {
            const c = centralStore.waiterCalls.find((w: any) => w.id === body.resolveId);
            if (c) c.status = 'RESOLVED';
        } else {
            centralStore.waiterCalls.push(body);
        }
        break;
      case 'sync':
        // Full sync for first-time init
        centralStore = { ...centralStore, ...body };
        break;
    }
    return res.status(200).json({ success: true, data: centralStore[type] });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
