import { useState, useEffect } from 'react';
import { Star, TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface SupplierMetrics {
  supplier_id: string;
  supplier_name: string;
  total_receipts: number;
  total_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  avg_quality_rating: number;
  on_time_delivery_rate: number;
  defect_rate: number;
  total_ncrs: number;
  critical_ncrs: number;
  overall_score: number;
  trend: 'up' | 'down' | 'stable';
  rating_tier: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'critical';
}

export default function SupplierQualityRating() {
  const [suppliers, setSuppliers] = useState<SupplierMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(90);

  useEffect(() => {
    loadSupplierMetrics();
  }, [timeRange]);

  const loadSupplierMetrics = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);
      const cutoffDate = format(startDate, 'yyyy-MM-dd');

      const { data: receipts } = await supabase
        .from('goods_receipts')
        .select('id, supplier_id, inspection_status, quality_rating, receipt_date, suppliers(supplier_name), purchase_order_id')
        .gte('receipt_date', cutoffDate);

      const { data: inspections } = await supabase
        .from('quality_inspections')
        .select('reference_id, result, created_at')
        .eq('reference_type', 'goods_receipt')
        .gte('created_at', cutoffDate);

      const { data: ncrs } = await supabase
        .from('ncr_reports')
        .select('quality_inspection_id, severity, created_at, quality_inspections(reference_id)')
        .gte('created_at', cutoffDate);

      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('id, supplier_id, expected_delivery_date')
        .gte('created_at', cutoffDate);

      const supplierMap: Record<string, SupplierMetrics> = {};

      (receipts || []).forEach((receipt: any) => {
        if (!receipt.supplier_id) return;

        if (!supplierMap[receipt.supplier_id]) {
          supplierMap[receipt.supplier_id] = {
            supplier_id: receipt.supplier_id,
            supplier_name: receipt.suppliers?.supplier_name || 'Unknown',
            total_receipts: 0,
            total_inspections: 0,
            passed_inspections: 0,
            failed_inspections: 0,
            avg_quality_rating: 0,
            on_time_delivery_rate: 100,
            defect_rate: 0,
            total_ncrs: 0,
            critical_ncrs: 0,
            overall_score: 0,
            trend: 'stable',
            rating_tier: 'acceptable',
          };
        }

        const metrics = supplierMap[receipt.supplier_id];
        metrics.total_receipts++;

        if (receipt.inspection_status === 'passed') metrics.passed_inspections++;
        if (receipt.inspection_status === 'failed') metrics.failed_inspections++;
        if (receipt.quality_rating) {
          metrics.avg_quality_rating += receipt.quality_rating;
        }
      });

      (inspections || []).forEach((insp: any) => {
        const receipt = receipts?.find((r: any) => r.id === insp.reference_id);
        if (receipt?.supplier_id && supplierMap[receipt.supplier_id]) {
          supplierMap[receipt.supplier_id].total_inspections++;
          if (insp.result === 'pass') supplierMap[receipt.supplier_id].passed_inspections++;
          if (insp.result === 'fail') supplierMap[receipt.supplier_id].failed_inspections++;
        }
      });

      (ncrs || []).forEach((ncr: any) => {
        const inspectionRefId = ncr.quality_inspections?.reference_id;
        const receipt = receipts?.find((r: any) => r.id === inspectionRefId);
        if (receipt?.supplier_id && supplierMap[receipt.supplier_id]) {
          supplierMap[receipt.supplier_id].total_ncrs++;
          if (ncr.severity === 'critical') supplierMap[receipt.supplier_id].critical_ncrs++;
        }
      });

      Object.values(supplierMap).forEach(metrics => {
        if (metrics.total_receipts > 0) {
          metrics.avg_quality_rating = metrics.avg_quality_rating / metrics.total_receipts;
          metrics.defect_rate = (metrics.failed_inspections / Math.max(1, metrics.total_receipts)) * 100;
        }

        const supplierPOs = (purchaseOrders || []).filter(po => po.supplier_id === metrics.supplier_id && po.expected_delivery_date);
        const supplierReceipts = (receipts || []).filter((r: any) => r.supplier_id === metrics.supplier_id);
        if (supplierPOs.length > 0) {
          let onTimeCount = 0;
          supplierPOs.forEach(po => {
            const matchingReceipt = supplierReceipts.find((r: any) => r.purchase_order_id === po.id);
            if (matchingReceipt) {
              const expectedDate = new Date(po.expected_delivery_date);
              const actualDate = new Date(matchingReceipt.receipt_date);
              if (actualDate <= expectedDate) onTimeCount++;
            } else {
              const expectedDate = new Date(po.expected_delivery_date);
              if (expectedDate >= new Date()) onTimeCount++;
            }
          });
          metrics.on_time_delivery_rate = (onTimeCount / supplierPOs.length) * 100;
        } else {
          metrics.on_time_delivery_rate = 100;
        }

        const qualityScore = metrics.avg_quality_rating * 20;
        const passRate = (metrics.passed_inspections / Math.max(1, metrics.total_inspections)) * 100;
        const ncrPenalty = Math.min(20, metrics.total_ncrs * 2 + metrics.critical_ncrs * 5);

        metrics.overall_score = Math.max(0, qualityScore * 0.4 + passRate * 0.4 + metrics.on_time_delivery_rate * 0.2 - ncrPenalty);

        if (metrics.overall_score >= 90) metrics.rating_tier = 'excellent';
        else if (metrics.overall_score >= 75) metrics.rating_tier = 'good';
        else if (metrics.overall_score >= 60) metrics.rating_tier = 'acceptable';
        else if (metrics.overall_score >= 40) metrics.rating_tier = 'needs_improvement';
        else metrics.rating_tier = 'critical';

        if (metrics.overall_score > 80) metrics.trend = 'up';
        else if (metrics.overall_score < 60) metrics.trend = 'down';
        else metrics.trend = 'stable';
      });

      setSuppliers(Object.values(supplierMap).sort((a, b) => b.overall_score - a.overall_score));
    } catch (err) {
      console.error('Failed to load supplier metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      excellent: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: Award },
      good: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      acceptable: { bg: 'bg-amber-100', text: 'text-amber-800', icon: Star },
      needs_improvement: { bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertTriangle },
      critical: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle },
    };
    const c = config[tier] || config.acceptable;
    const Icon = c.icon;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium capitalize">{tier.replace('_', ' ')}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Supplier Quality Ratings</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
          <option value={180}>Last 6 Months</option>
          <option value={365}>Last Year</option>
        </select>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No supplier data available for the selected time range
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {suppliers.map((supplier) => (
            <div key={supplier.supplier_id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">{supplier.supplier_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getTierBadge(supplier.rating_tier)}
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      {supplier.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                      {supplier.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                      {supplier.trend}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900">{supplier.overall_score.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">Score</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Quality Rating</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i <= supplier.avg_quality_rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-slate-700 font-medium">
                      {supplier.avg_quality_rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Pass Rate</span>
                  <span className="font-medium text-emerald-600">
                    {supplier.total_inspections > 0
                      ? ((supplier.passed_inspections / supplier.total_inspections) * 100).toFixed(1)
                      : '0.0'}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Defect Rate</span>
                  <span className="font-medium text-red-600">{supplier.defect_rate.toFixed(1)}%</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total NCRs</span>
                  <span className="font-medium text-slate-900">
                    {supplier.total_ncrs}
                    {supplier.critical_ncrs > 0 && (
                      <span className="text-red-600 ml-1">({supplier.critical_ncrs} critical)</span>
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{supplier.total_receipts} receipts</span>
                  <span>{supplier.total_inspections} inspections</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
