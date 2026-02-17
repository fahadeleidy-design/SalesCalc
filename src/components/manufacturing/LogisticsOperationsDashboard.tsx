import React, { useState } from "react";
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Star,
  ChevronDown,
  ChevronUp,
  Plane,
  Ship,
  Mail,
  AlertCircle,
  BarChart3,
  ArrowRightLeft,
  ClipboardList,
  CalendarCheck,
  Plus,
  Layers,
  MapPin,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const mockShipments = [
  { id: "1", so_number: "SO-2026-001", customer: "ABC Corporation", destination: "Riyadh", carrier: "Saudi Post", method: "ground" as const, ship_date: "2026-02-14", est_delivery: "2026-02-17", status: "in_transit" as const, packages: 12, weight: 450 },
  { id: "2", so_number: "SO-2026-002", customer: "National Hospital", destination: "Jeddah", carrier: "Aramex", method: "air" as const, ship_date: "2026-02-15", est_delivery: "2026-02-16", status: "delivered" as const, packages: 3, weight: 85 },
  { id: "3", so_number: "SO-2026-003", customer: "King Saud University", destination: "Riyadh", carrier: "Own Fleet", method: "ground" as const, ship_date: "2026-02-16", est_delivery: "2026-02-18", status: "picked" as const, packages: 25, weight: 1200 },
  { id: "4", so_number: "SO-2026-004", customer: "Ministry of Education", destination: "Dammam", carrier: "DHL", method: "courier" as const, ship_date: "2026-02-17", est_delivery: "2026-02-19", status: "ready_to_ship" as const, packages: 8, weight: 320 },
  { id: "5", so_number: "SO-2026-005", customer: "Al-Faisaliah Hotel", destination: "Riyadh", carrier: "Own Fleet", method: "ground" as const, ship_date: "2026-02-13", est_delivery: "2026-02-15", status: "delivered" as const, packages: 15, weight: 680 },
  { id: "6", so_number: "SO-2026-006", customer: "SABIC", destination: "Jubail", carrier: "DHL", method: "air" as const, ship_date: "2026-02-16", est_delivery: "2026-02-17", status: "shipped" as const, packages: 6, weight: 210 },
  { id: "7", so_number: "SO-2026-007", customer: "Madinah General Hospital", destination: "Madinah", carrier: "Aramex", method: "ground" as const, ship_date: "2026-02-17", est_delivery: "2026-02-20", status: "packed" as const, packages: 10, weight: 540 },
  { id: "8", so_number: "SO-2026-008", customer: "Taif Municipality", destination: "Taif", carrier: "Saudi Post", method: "sea" as const, ship_date: "2026-02-10", est_delivery: "2026-02-22", status: "returned" as const, packages: 4, weight: 1800 },
];

const deliveryPerformance = [
  { week: "W3 Jan", onTime: 22, late: 3 },
  { week: "W4 Jan", onTime: 19, late: 2 },
  { week: "W1 Feb", onTime: 25, late: 4 },
  { week: "W2 Feb", onTime: 21, late: 1 },
  { week: "W3 Feb", onTime: 28, late: 3 },
  { week: "W4 Feb", onTime: 24, late: 2 },
  { week: "W1 Mar", onTime: 20, late: 5 },
  { week: "W2 Mar", onTime: 26, late: 2 },
];

const mockCarriers = [
  { name: "Aramex", type: "Express", shipments: 156, onTime: 96.2, damageRate: 0.3, avgTransit: 2.1, rating: 5, status: "active" },
  { name: "DHL", type: "International", shipments: 98, onTime: 94.8, damageRate: 0.5, avgTransit: 2.8, rating: 4, status: "active" },
  { name: "Saudi Post", type: "National", shipments: 210, onTime: 89.5, damageRate: 1.2, avgTransit: 4.1, rating: 3, status: "active" },
  { name: "Own Fleet", type: "Internal", shipments: 134, onTime: 97.1, damageRate: 0.1, avgTransit: 1.5, rating: 5, status: "active" },
  { name: "FedEx", type: "International", shipments: 45, onTime: 91.0, damageRate: 0.8, avgTransit: 3.5, rating: 3, status: "inactive" },
];

const mockTransfers = [
  { id: "TRF-001", from: "Riyadh Central", to: "Jeddah South", type: "replenishment", items: 45, status: "in_transit", date: "2026-02-15" },
  { id: "TRF-002", from: "Dammam Port", to: "Riyadh Central", type: "receiving", items: 120, status: "pending", date: "2026-02-17" },
  { id: "TRF-003", from: "Riyadh Central", to: "Madinah Branch", type: "distribution", items: 30, status: "completed", date: "2026-02-14" },
  { id: "TRF-004", from: "Jeddah South", to: "Dammam Port", type: "return", items: 15, status: "pending", date: "2026-02-18" },
];

const mockAdjustments = [
  { id: "ADJ-001", type: "cycle_count", product: "Steel Beam A36", location: "Riyadh Central - A3", prevQty: 500, adjQty: 487, reason: "Cycle count variance", status: "approved" },
  { id: "ADJ-002", type: "damage", product: "Copper Wire 2mm", location: "Jeddah South - B1", prevQty: 200, adjQty: 185, reason: "Water damage", status: "pending" },
  { id: "ADJ-003", type: "receiving", product: "PVC Pipe 4inch", location: "Dammam Port - C2", prevQty: 1000, adjQty: 1050, reason: "Supplier bonus units", status: "approved" },
  { id: "ADJ-004", type: "write_off", product: "Paint Batch #221", location: "Riyadh Central - D4", prevQty: 75, adjQty: 0, reason: "Expired stock", status: "approved" },
  { id: "ADJ-005", type: "transfer", product: "Safety Helmets", location: "Madinah Branch - A1", prevQty: 300, adjQty: 340, reason: "Transfer receipt", status: "pending" },
];

const mockKitting = [
  { id: "KIT-001", name: "Safety Equipment Kit A", workOrder: "WO-2026-088", requiredDate: "2026-02-20", progress: 75, status: "in_progress", total: 40, completed: 30 },
  { id: "KIT-002", name: "Electrical Panel Set B", workOrder: "WO-2026-091", requiredDate: "2026-02-22", progress: 30, status: "pending", total: 25, completed: 8 },
  { id: "KIT-003", name: "Plumbing Starter Pack", workOrder: "WO-2026-095", requiredDate: "2026-02-19", progress: 100, status: "completed", total: 50, completed: 50 },
];

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  ready_to_ship: "bg-blue-100 text-blue-700",
  picked: "bg-cyan-100 text-cyan-700",
  packed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-amber-100 text-amber-700",
  in_transit: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
};

const methodIcons: Record<string, React.ReactNode> = {
  ground: <Truck className="w-3.5 h-3.5" />,
  air: <Plane className="w-3.5 h-3.5" />,
  sea: <Ship className="w-3.5 h-3.5" />,
  courier: <Mail className="w-3.5 h-3.5" />,
};

const methodColors: Record<string, string> = {
  ground: "bg-emerald-100 text-emerald-700",
  air: "bg-sky-100 text-sky-700",
  sea: "bg-blue-100 text-blue-700",
  courier: "bg-violet-100 text-violet-700",
};

const transferTypeColors: Record<string, string> = {
  replenishment: "bg-blue-100 text-blue-700",
  receiving: "bg-green-100 text-green-700",
  distribution: "bg-purple-100 text-purple-700",
  return: "bg-orange-100 text-orange-700",
};

const adjTypeColors: Record<string, string> = {
  cycle_count: "bg-blue-100 text-blue-700",
  damage: "bg-red-100 text-red-700",
  receiving: "bg-green-100 text-green-700",
  write_off: "bg-gray-100 text-gray-700",
  transfer: "bg-purple-100 text-purple-700",
};

const timelineSteps = ["draft", "ready_to_ship", "picked", "packed", "shipped", "in_transit", "delivered"];

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
    ))}
  </div>
);

const LogisticsOperationsDashboard = () => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const metrics = [
    { label: "Active Shipments", value: "34", icon: Package, trend: "+6", up: true, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Transit", value: "18", icon: Truck, trend: "+3", up: true, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Delivered Today", value: "7", icon: CheckCircle, trend: "+2", up: true, color: "text-green-600", bg: "bg-green-50" },
    { label: "On-Time Rate", value: "93.5%", icon: Clock, trend: "+1.2%", up: true, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Avg Transit Time", value: "3.2 days", icon: BarChart3, trend: "-0.4", up: true, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Pending Transfers", value: "5", icon: ArrowRightLeft, trend: "-2", up: false, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const getStepIndex = (status: string) => {
    if (status === "returned") return -1;
    return timelineSteps.indexOf(status);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Logistics & Distribution</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time shipment tracking and warehouse operations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`${m.bg} p-2 rounded-lg`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${m.up ? "text-green-600" : "text-red-600"}`}>
                {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{m.value}</p>
            <p className="text-xs text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Shipment Tracking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left py-3 px-4 font-medium">SO Number</th>
                <th className="text-left py-3 px-4 font-medium">Customer</th>
                <th className="text-left py-3 px-4 font-medium">Destination</th>
                <th className="text-left py-3 px-4 font-medium">Carrier</th>
                <th className="text-left py-3 px-4 font-medium">Method</th>
                <th className="text-left py-3 px-4 font-medium">Ship Date</th>
                <th className="text-left py-3 px-4 font-medium">Est. Delivery</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {mockShipments.map((s) => (
                <React.Fragment key={s.id}>
                  <tr
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                  >
                    <td className="py-3 px-4 font-medium text-blue-600">{s.so_number}</td>
                    <td className="py-3 px-4 text-slate-700">{s.customer}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />{s.destination}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{s.carrier}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${methodColors[s.method]}`}>
                        {methodIcons[s.method]}{s.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.ship_date}</td>
                    <td className="py-3 px-4 text-slate-600">{s.est_delivery}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[s.status]}`}>
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
                        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                          <span>Packages: {s.packages}</span>
                          <span>|</span>
                          <span>Weight: {s.weight} kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {timelineSteps.map((step, idx) => {
                            const currentIdx = getStepIndex(s.status);
                            const done = s.status !== "returned" && idx <= currentIdx;
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
                          {s.status === "returned" && (
                            <span className="ml-4 text-xs text-red-600 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Returned
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Delivery Performance</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deliveryPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Legend />
              <Bar dataKey="onTime" name="On-Time" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="late" name="Late" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Carrier Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left py-2.5 px-4 font-medium">Carrier</th>
                  <th className="text-left py-2.5 px-4 font-medium">Type</th>
                  <th className="text-right py-2.5 px-4 font-medium">Ships</th>
                  <th className="text-right py-2.5 px-4 font-medium">On-Time</th>
                  <th className="text-right py-2.5 px-4 font-medium">Dmg %</th>
                  <th className="text-right py-2.5 px-4 font-medium">Days</th>
                  <th className="text-center py-2.5 px-4 font-medium">Rating</th>
                  <th className="text-center py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockCarriers.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{c.type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{c.shipments}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={c.onTime >= 95 ? "text-green-600" : c.onTime >= 90 ? "text-amber-600" : "text-red-600"}>{c.onTime}%</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{c.damageRate}%</td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{c.avgTransit}</td>
                    <td className="py-2.5 px-4"><RatingStars rating={c.rating} /></td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[c.status]}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Warehouse Transfers</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {mockTransfers.map((t) => (
              <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-slate-800">{t.id}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${transferTypeColors[t.type]}`}>{t.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-700 font-medium">{t.from}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{t.to}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{t.items} items</span>
                  <span>Requested: {t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Inventory Adjustments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left py-2.5 px-3 font-medium">Adj#</th>
                  <th className="text-left py-2.5 px-3 font-medium">Type</th>
                  <th className="text-left py-2.5 px-3 font-medium">Product</th>
                  <th className="text-right py-2.5 px-3 font-medium">Prev</th>
                  <th className="text-right py-2.5 px-3 font-medium">Adj</th>
                  <th className="text-right py-2.5 px-3 font-medium">Var</th>
                  <th className="text-center py-2.5 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockAdjustments.map((a) => {
                  const variance = a.adjQty - a.prevQty;
                  return (
                    <tr key={a.id} className="border-b border-slate-100">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{a.id}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${adjTypeColors[a.type]}`}>{a.type.replace(/_/g, " ")}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-[120px] truncate">{a.product}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{a.prevQty}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{a.adjQty}</td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        <span className={variance >= 0 ? "text-green-600" : "text-red-600"}>
                          {variance >= 0 ? "+" : ""}{variance}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[a.status]}`}>{a.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Kitting Status</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {mockKitting.map((k) => (
              <div key={k.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-sm text-slate-800">{k.id}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-sm text-slate-700">{k.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[k.status]}`}>{k.status.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                  <span>WO: {k.workOrder}</span>
                  <span>Due: {k.requiredDate}</span>
                  <span>{k.completed}/{k.total} units</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${k.progress === 100 ? "bg-green-500" : k.progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${k.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">{k.progress}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Create Shipment", icon: Plus, color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
              { label: "Warehouse Transfer", icon: ArrowRightLeft, color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100" },
              { label: "Stock Adjustment", icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50 hover:bg-amber-100" },
              { label: "Schedule Count", icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50 hover:bg-green-100" },
            ].map((action) => (
              <button key={action.label} className={`${action.bg} rounded-xl p-4 flex flex-col items-center gap-2 transition-colors border border-transparent hover:border-slate-200`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-xs font-medium text-slate-700 text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsOperationsDashboard;
