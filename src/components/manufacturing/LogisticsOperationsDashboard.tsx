import React, { useState, useMemo } from "react";
import {
  Truck,
  Package,
  CheckCircle,
  ArrowRight,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowRightLeft,
  ClipboardList,
  CalendarCheck,
  Layers,
  MapPin,
  Loader2,
  Inbox,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, getISOWeek } from "date-fns";
import {
  useShippingOrders,
  useCarriers,
  useWarehouseTransfers,
  useInventoryAdjustments,
  useCycleCountSchedules,
  useKittingOrders,
} from "../../hooks/usePurchasingLogistics";

type TabKey = "shipping" | "carriers" | "transfers" | "adjustments" | "cycles" | "kitting";

const tabs: { key: TabKey; label: string }[] = [
  { key: "shipping", label: "Shipping" },
  { key: "carriers", label: "Carriers" },
  { key: "transfers", label: "Transfers" },
  { key: "adjustments", label: "Adjustments" },
  { key: "cycles", label: "Cycle Counts" },
  { key: "kitting", label: "Kitting" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  picking: "bg-cyan-100 text-cyan-700",
  packed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-amber-100 text-amber-700",
  in_transit: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  pending_approval: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  received: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  applied: "bg-teal-100 text-teal-700",
  rejected: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  express: "bg-red-100 text-red-700",
  urgent: "bg-red-100 text-red-700",
};

const transferTypeStyles: Record<string, string> = {
  standard: "bg-blue-100 text-blue-700",
  urgent: "bg-red-100 text-red-700",
  return: "bg-orange-100 text-orange-700",
};

const adjTypeStyles: Record<string, string> = {
  increase: "bg-green-100 text-green-700",
  decrease: "bg-red-100 text-red-700",
  write_off: "bg-gray-100 text-gray-700",
  recount: "bg-blue-100 text-blue-700",
  damage: "bg-orange-100 text-orange-700",
  theft: "bg-red-100 text-red-700",
};

const timelineSteps = ["draft", "confirmed", "picking", "packed", "shipped", "in_transit", "delivered"];

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
    ))}
  </div>
);

const Loading = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    <span className="ml-2 text-sm text-slate-500">Loading...</span>
  </div>
);

const Empty = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
    <Inbox className="w-10 h-10 mb-2" />
    <span className="text-sm">{message}</span>
  </div>
);

const LogisticsOperationsDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("shipping");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: shipments = [], isLoading: shipmentsLoading } = useShippingOrders();
  const { data: carriers = [], isLoading: carriersLoading } = useCarriers();
  const { data: transfers = [], isLoading: transfersLoading } = useWarehouseTransfers();
  const { data: adjustments = [], isLoading: adjustmentsLoading } = useInventoryAdjustments();
  const { data: cycleCounts = [], isLoading: cyclesLoading } = useCycleCountSchedules();
  const { data: kittingOrders = [], isLoading: kittingLoading } = useKittingOrders();

  const metrics = useMemo(() => {
    const totalShipments = shipments.length;
    const inTransit = shipments.filter((s) => s.status === "in_transit").length;
    const delivered = shipments.filter((s) => s.status === "delivered").length;
    const pendingTransfers = transfers.filter((s) => ["draft", "pending_approval", "approved"].includes(s.status)).length;
    const totalAdjustments = adjustments.length;
    const activeKitting = kittingOrders.filter((k) => ["pending", "in_progress"].includes(k.status)).length;
    return [
      { label: "Total Shipments", value: totalShipments, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "In Transit", value: inTransit, icon: Truck, color: "text-orange-600", bg: "bg-orange-50" },
      { label: "Delivered", value: delivered, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
      { label: "Pending Transfers", value: pendingTransfers, icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50" },
      { label: "Adjustments", value: totalAdjustments, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Active Kitting", value: activeKitting, icon: Layers, color: "text-cyan-600", bg: "bg-cyan-50" },
    ];
  }, [shipments, transfers, adjustments, kittingOrders]);

  const deliveryChartData = useMemo(() => {
    const weekMap = new Map<string, { onTime: number; late: number }>();
    shipments
      .filter((s) => s.status === "delivered" && s.actual_delivery_date)
      .forEach((s) => {
        const weekLabel = `W${getISOWeek(parseISO(s.actual_delivery_date!))}`;
        const entry = weekMap.get(weekLabel) || { onTime: 0, late: 0 };
        const isLate = s.expected_delivery_date && s.actual_delivery_date > s.expected_delivery_date;
        if (isLate) entry.late += 1;
        else entry.onTime += 1;
        weekMap.set(weekLabel, entry);
      });
    return Array.from(weekMap.entries())
      .map(([week, counts]) => ({ week, ...counts }))
      .slice(-8);
  }, [shipments]);

  const getStepIndex = (status: string) => timelineSteps.indexOf(status);

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    try { return format(parseISO(d), "MMM dd, yyyy"); } catch { return d; }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logistics & Distribution</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time shipment tracking and warehouse operations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`${m.bg} p-2 rounded-lg w-fit mb-3`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            <p className="text-xs text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "shipping" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Shipment Tracking</h2>
            </div>
            {shipmentsLoading ? <Loading /> : shipments.length === 0 ? <Empty message="No shipping orders found" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left py-3 px-4 font-medium">Order #</th>
                      <th className="text-left py-3 px-4 font-medium">Customer</th>
                      <th className="text-left py-3 px-4 font-medium">Destination</th>
                      <th className="text-left py-3 px-4 font-medium">Carrier</th>
                      <th className="text-left py-3 px-4 font-medium">Priority</th>
                      <th className="text-left py-3 px-4 font-medium">Ship Date</th>
                      <th className="text-left py-3 px-4 font-medium">Est. Delivery</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((s) => (
                      <React.Fragment key={s.id}>
                        <tr
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                        >
                          <td className="py-3 px-4 font-medium text-blue-600">{s.order_number}</td>
                          <td className="py-3 px-4 text-slate-700">{s.customers?.company_name || s.ship_to_name}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />{s.ship_to_city}, {s.ship_to_country}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{s.carriers?.carrier_name || "-"}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[s.priority] || ""}`}>
                              {s.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{formatDate(s.ship_date)}</td>
                          <td className="py-3 px-4 text-slate-600">{formatDate(s.expected_delivery_date)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[s.status] || ""}`}>
                              {s.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {expandedRow === s.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </td>
                        </tr>
                        {expandedRow === s.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                                <span>Packages: {s.packages_count}</span>
                                <span>Weight: {s.total_weight_kg} kg</span>
                                <span>Cost: ${s.shipping_cost.toFixed(2)}</span>
                                {s.tracking_number && <span>Tracking: {s.tracking_number}</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {timelineSteps.map((step, idx) => {
                                  const currentIdx = getStepIndex(s.status);
                                  const done = currentIdx >= 0 && idx <= currentIdx;
                                  return (
                                    <React.Fragment key={step}>
                                      <div className="flex flex-col items-center">
                                        <div className={`w-3 h-3 rounded-full ${done ? "bg-green-500" : "bg-slate-300"}`} />
                                        <span className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">{step.replace(/_/g, " ")}</span>
                                      </div>
                                      {idx < timelineSteps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mt-[-10px] ${done && idx < currentIdx ? "bg-green-500" : "bg-slate-300"}`} />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                {s.status === "cancelled" && (
                                  <span className="ml-4 text-xs text-red-600 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> Cancelled
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Delivery Performance</h2>
            {deliveryChartData.length === 0 ? <Empty message="No delivery data available for chart" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deliveryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="onTime" name="On-Time" stackId="a" fill="#22c55e" />
                  <Bar dataKey="late" name="Late" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeTab === "carriers" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Carrier Performance</h2>
          </div>
          {carriersLoading ? <Loading /> : carriers.length === 0 ? <Empty message="No carriers found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="text-left py-2.5 px-4 font-medium">Carrier</th>
                    <th className="text-left py-2.5 px-4 font-medium">Code</th>
                    <th className="text-left py-2.5 px-4 font-medium">Type</th>
                    <th className="text-right py-2.5 px-4 font-medium">On-Time %</th>
                    <th className="text-right py-2.5 px-4 font-medium">Damage %</th>
                    <th className="text-right py-2.5 px-4 font-medium">Transit Days</th>
                    <th className="text-center py-2.5 px-4 font-medium">Rating</th>
                    <th className="text-center py-2.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {carriers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-2.5 px-4 font-medium text-slate-800">{c.carrier_name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{c.carrier_code}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{c.carrier_type}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={c.on_time_percentage >= 95 ? "text-green-600" : c.on_time_percentage >= 90 ? "text-amber-600" : "text-red-600"}>
                          {c.on_time_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700">{c.damage_rate_percentage.toFixed(1)}%</td>
                      <td className="py-2.5 px-4 text-right text-slate-700">{c.transit_time_days ?? "-"}</td>
                      <td className="py-2.5 px-4"><RatingStars rating={c.rating} /></td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                          {c.is_active ? "active" : "inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "transfers" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Warehouse Transfers</h2>
          </div>
          {transfersLoading ? <Loading /> : transfers.length === 0 ? <Empty message="No warehouse transfers found" /> : (
            <div className="divide-y divide-slate-100">
              {transfers.map((t) => (
                <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-slate-800">{t.transfer_number}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${transferTypeStyles[t.transfer_type] || "bg-slate-100 text-slate-600"}`}>
                        {t.transfer_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[t.status] || ""}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-700 font-medium">{t.from_warehouse?.warehouse_name || "N/A"}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{t.to_warehouse?.warehouse_name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>{t.total_items} items</span>
                    <span>${t.total_value.toFixed(2)}</span>
                    <span>{formatDate(t.transfer_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "adjustments" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Inventory Adjustments</h2>
          </div>
          {adjustmentsLoading ? <Loading /> : adjustments.length === 0 ? <Empty message="No inventory adjustments found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="text-left py-2.5 px-3 font-medium">Adj #</th>
                    <th className="text-left py-2.5 px-3 font-medium">Type</th>
                    <th className="text-left py-2.5 px-3 font-medium">Product</th>
                    <th className="text-left py-2.5 px-3 font-medium">Adjuster</th>
                    <th className="text-right py-2.5 px-3 font-medium">Before</th>
                    <th className="text-right py-2.5 px-3 font-medium">After</th>
                    <th className="text-right py-2.5 px-3 font-medium">Variance</th>
                    <th className="text-right py-2.5 px-3 font-medium">Cost Impact</th>
                    <th className="text-center py-2.5 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => {
                    const variance = a.quantity_after - a.quantity_before;
                    return (
                      <tr key={a.id} className="border-b border-slate-100">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{a.adjustment_number}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${adjTypeStyles[a.adjustment_type] || "bg-slate-100 text-slate-600"}`}>
                            {a.adjustment_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[140px] truncate">{a.product_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{a.adjuster?.full_name || "-"}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{a.quantity_before}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{a.quantity_after}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          <span className={variance >= 0 ? "text-green-600" : "text-red-600"}>
                            {variance >= 0 ? "+" : ""}{variance}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={a.total_cost_impact >= 0 ? "text-green-600" : "text-red-600"}>
                            ${Math.abs(a.total_cost_impact).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[a.status] || ""}`}>
                            {a.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "cycles" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-slate-600" /> Cycle Count Schedules
            </h2>
          </div>
          {cyclesLoading ? <Loading /> : cycleCounts.length === 0 ? <Empty message="No cycle count schedules found" /> : (
            <div className="divide-y divide-slate-100">
              {cycleCounts.map((c) => {
                const progress = c.total_items_to_count > 0 ? Math.round((c.items_counted / c.total_items_to_count) * 100) : 0;
                return (
                  <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-slate-800">{c.schedule_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{c.count_type}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[c.status] || ""}`}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span>Frequency: {c.frequency}</span>
                      <span>Scheduled: {formatDate(c.scheduled_date)}</span>
                      {c.assignee?.full_name && <span>Assigned: {c.assignee.full_name}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span>{c.items_counted}/{c.total_items_to_count} counted</span>
                      <span>Discrepancies: {c.discrepancies_found}</span>
                      <span>Accuracy: {c.accuracy_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${progress === 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">{progress}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "kitting" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-600" /> Kitting Orders
            </h2>
          </div>
          {kittingLoading ? <Loading /> : kittingOrders.length === 0 ? <Empty message="No kitting orders found" /> : (
            <div className="divide-y divide-slate-100">
              {kittingOrders.map((k) => {
                const progress = k.quantity_to_kit > 0 ? Math.round((k.quantity_kitted / k.quantity_to_kit) * 100) : 0;
                const componentsReady = k.total_components > 0 ? Math.round((k.components_available / k.total_components) * 100) : 0;
                return (
                  <div key={k.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-800">{k.kitting_number}</span>
                        <span className="text-sm text-slate-600">{k.kit_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[k.priority] || ""}`}>
                          {k.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[k.status] || ""}`}>
                          {k.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span>Due: {formatDate(k.scheduled_date)}</span>
                      <span>{k.quantity_kitted}/{k.quantity_to_kit} kitted</span>
                      <span>Components: {k.components_available}/{k.total_components} ({componentsReady}%)</span>
                      {k.assignee?.full_name && <span>Assigned: {k.assignee.full_name}</span>}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${progress === 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">{progress}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogisticsOperationsDashboard;
