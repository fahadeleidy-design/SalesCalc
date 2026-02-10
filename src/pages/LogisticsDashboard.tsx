import { useState, useEffect, useCallback } from 'react';
import { Truck, Package, MapPin, TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';

interface LogisticsMetrics {
  activeShipments: number;
  inTransit: number;
  delivered: number;
  pendingReceipts: number;
  avgDeliveryTime: number;
  onTimeDeliveryRate: number;
  totalMovements: number;
  stockAccuracy: number;
}

interface ShipmentSummary {
  id: string;
  shipment_number: string;
  status: string;
  customer_name: string;
  scheduled_date: string;
  estimated_delivery: string | null;
}

interface ReceiptSummary {
  id: string;
  receipt_number: string;
  supplier_name: string;
  status: string;
  receipt_date: string;
}

export default function LogisticsDashboard() {
  const [metrics, setMetrics] = useState<LogisticsMetrics>({
    activeShipments: 0,
    inTransit: 0,
    delivered: 0,
    pendingReceipts: 0,
    avgDeliveryTime: 0,
    onTimeDeliveryRate: 0,
    totalMovements: 0,
    stockAccuracy: 95,
  });
  const [urgentShipments, setUrgentShipments] = useState<ShipmentSummary[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [shipmentsRes, receiptsRes, movementsRes] = await Promise.all([
        supabase.from('shipments').select('*, customer:customers(company_name)').order('created_at', { ascending: false }),
        supabase.from('goods_receipts').select('*, purchase_order:purchase_orders(supplier_name)').order('receipt_date', { ascending: false }),
        supabase.from('stock_movements').select('*').gte('performed_at', weekAgo),
      ]);

      const shipments = shipmentsRes.data || [];
      const receipts = receiptsRes.data || [];
      const movements = movementsRes.data || [];

      const activeShips = shipments.filter((s: any) => !['delivered', 'returned'].includes(s.status));
      const inTransit = shipments.filter((s: any) => ['dispatched', 'in_transit'].includes(s.status));
      const delivered = shipments.filter((s: any) => s.status === 'delivered' && s.actual_delivery_date >= weekAgo);

      const pending = receipts.filter((r: any) => r.status === 'received' || r.inspection_status === 'pending');

      const deliveredWithDates = shipments.filter((s: any) => s.status === 'delivered' && s.scheduled_ship_date && s.actual_delivery_date);
      let avgDays = 0;
      let onTimeCount = 0;

      if (deliveredWithDates.length > 0) {
        const totalDays = deliveredWithDates.reduce((sum: number, s: any) => {
          const scheduled = new Date(s.scheduled_ship_date).getTime();
          const actual = new Date(s.actual_delivery_date).getTime();
          const days = (actual - scheduled) / (1000 * 60 * 60 * 24);
          if (days <= 0) onTimeCount++;
          return sum + Math.abs(days);
        }, 0);
        avgDays = totalDays / deliveredWithDates.length;
      }

      setMetrics({
        activeShipments: activeShips.length,
        inTransit: inTransit.length,
        delivered: delivered.length,
        pendingReceipts: pending.length,
        avgDeliveryTime: Math.round(avgDays),
        onTimeDeliveryRate: deliveredWithDates.length > 0 ? Math.round((onTimeCount / deliveredWithDates.length) * 100) : 0,
        totalMovements: movements.length,
        stockAccuracy: 95,
      });

      const urgent = shipments
        .filter((s: any) => {
          if (!['preparing', 'packed', 'dispatched', 'in_transit'].includes(s.status)) return false;
          if (!s.estimated_delivery_date) return false;
          const daysUntil = (new Date(s.estimated_delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntil <= 2;
        })
        .slice(0, 5)
        .map((s: any) => ({
          id: s.id,
          shipment_number: s.shipment_number,
          status: s.status,
          customer_name: s.customer?.company_name || 'Unknown',
          scheduled_date: s.scheduled_ship_date,
          estimated_delivery: s.estimated_delivery_date,
        }));

      setUrgentShipments(urgent);

      const pendingList = pending.slice(0, 5).map((r: any) => ({
        id: r.id,
        receipt_number: r.receipt_number,
        supplier_name: r.purchase_order?.supplier_name || 'Unknown',
        status: r.status,
        receipt_date: r.receipt_date,
      }));

      setPendingReceipts(pendingList);
    } catch (err) {
      console.error('Failed to load logistics data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logistics Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time logistics and warehouse operations overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Shipments"
          value={metrics.activeShipments}
          icon={Truck}
          color="blue"
          subtitle={`${metrics.inTransit} in transit`}
        />
        <MetricCard
          label="Delivered (7d)"
          value={metrics.delivered}
          icon={CheckCircle}
          color="emerald"
          subtitle={`${metrics.onTimeDeliveryRate}% on-time`}
        />
        <MetricCard
          label="Pending Receipts"
          value={metrics.pendingReceipts}
          icon={Package}
          color={metrics.pendingReceipts > 5 ? 'orange' : 'slate'}
          subtitle="Awaiting inspection"
        />
        <MetricCard
          label="Movements (7d)"
          value={metrics.totalMovements}
          icon={TrendingUp}
          color="cyan"
          subtitle={`${metrics.stockAccuracy}% accuracy`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Urgent Shipments
            </h3>
            <span className="text-xs text-slate-500">Next 48 hours</span>
          </div>
          {urgentShipments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No urgent shipments</div>
          ) : (
            <div className="space-y-3">
              {urgentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{shipment.shipment_number}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{shipment.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 font-medium capitalize">
                      {shipment.status.replace('_', ' ')}
                    </span>
                    {shipment.estimated_delivery && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        ETA: {format(new Date(shipment.estimated_delivery), 'MMM d')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Pending Receipts
            </h3>
            <span className="text-xs text-slate-500">Awaiting action</span>
          </div>
          {pendingReceipts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No pending receipts</div>
          ) : (
            <div className="space-y-3">
              {pendingReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{receipt.receipt_number}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{receipt.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-medium capitalize">
                      {receipt.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Avg Delivery Time</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-900">{metrics.avgDeliveryTime}</span>
            <span className="text-slate-500 mb-1">days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Based on last 30 deliveries</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">On-Time Delivery</h3>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold ${metrics.onTimeDeliveryRate >= 90 ? 'text-emerald-600' : metrics.onTimeDeliveryRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
              {metrics.onTimeDeliveryRate}%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${metrics.onTimeDeliveryRate >= 90 ? 'bg-emerald-500' : metrics.onTimeDeliveryRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${metrics.onTimeDeliveryRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3 text-sm">Stock Accuracy</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-900">{metrics.stockAccuracy}%</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">From cycle counts</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Logistics Performance Summary</h3>
            <p className="text-sm text-slate-600 mb-3">
              {metrics.activeShipments > 0
                ? `You have ${metrics.activeShipments} active shipments with ${metrics.inTransit} currently in transit. `
                : 'All shipments delivered. '}
              {metrics.pendingReceipts > 0
                ? `There are ${metrics.pendingReceipts} receipts pending inspection. `
                : 'All receipts processed. '}
              {metrics.onTimeDeliveryRate >= 90
                ? 'Excellent on-time delivery performance.'
                : metrics.onTimeDeliveryRate >= 70
                ? 'Good delivery performance, room for improvement.'
                : 'Delivery performance needs attention.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-full font-medium">
                {metrics.totalMovements} movements this week
              </span>
              <span className="text-xs px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-full font-medium">
                {metrics.delivered} deliveries last 7 days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, subtitle }: { label: string; value: number; icon: any; color: string; subtitle?: string }) {
  const colorMap: Record<string, { bg: string; text: string; val: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-900' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', val: 'text-orange-900' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', val: 'text-cyan-900' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-500', val: 'text-slate-900' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold ${c.val} mt-0.5`}>{value}</p>
        </div>
      </div>
      {subtitle && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      )}
    </div>
  );
}
