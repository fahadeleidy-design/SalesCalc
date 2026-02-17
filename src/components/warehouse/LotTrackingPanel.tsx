import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, X, Save, Search, AlertTriangle, CheckCircle,
  MapPin, Calendar, Truck, Edit3, Minus, ArrowRight, Clock,
  FileText, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ModernModal, Drawer } from '../ui/ModernModal';

interface Lot {
  id: string;
  lot_number: string;
  product_id: string;
  quantity: number;
  manufactured_date: string | null;
  expiry_date: string | null;
  location_id: string | null;
  status: 'active' | 'quarantine' | 'expired' | 'consumed';
  supplier_id: string | null;
  po_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
    sku: string;
    shelf_life_days: number | null;
  };
  location?: {
    location_code: string;
    location_name: string;
  };
  supplier?: {
    name: string;
  };
  purchase_order?: {
    po_number: string;
  };
}

interface LotMovement {
  id: string;
  lot_id: string;
  movement_type: string;
  quantity: number;
  from_location_id: string | null;
  to_location_id: string | null;
  notes: string | null;
  performed_at: string;
  performed_by: string;
  from_location?: { location_name: string };
  to_location?: { location_name: string };
  performer?: { full_name: string };
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active: { label: 'Active', variant: 'success' },
  quarantine: { label: 'Quarantine', variant: 'warning' },
  expired: { label: 'Expired', variant: 'danger' },
  consumed: { label: 'Consumed', variant: 'neutral' },
};

const emptyLotForm = {
  lot_number: '',
  product_id: '',
  quantity: '',
  manufactured_date: '',
  expiry_date: '',
  location_id: '',
  supplier_id: '',
  po_id: '',
  notes: '',
};

export default function LotTrackingPanel() {
  const { profile } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [filteredLots, setFilteredLots] = useState<Lot[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lotForm, setLotForm] = useState({ ...emptyLotForm });
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [lotMovements, setLotMovements] = useState<LotMovement[]>([]);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [consumeQuantity, setConsumeQuantity] = useState('');
  const [transferLocationId, setTransferLocationId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [stats, setStats] = useState({
    expired: 0,
    expiring_soon: 0,
    quarantine: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lotsRes, productsRes, locationsRes, suppliersRes, posRes] = await Promise.all([
        supabase
          .from('lot_tracking')
          .select(`
            *,
            product:products(name, sku, shelf_life_days),
            location:warehouse_locations(location_code, location_name),
            supplier:suppliers(supplier_name),
            purchase_order:purchase_orders(po_number)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('products').select('id, name, sku, shelf_life_days').eq('is_active', true).order('name'),
        supabase.from('warehouse_locations').select('id, location_code, location_name').eq('is_active', true).order('location_code'),
        supabase.from('suppliers').select('id, name').eq('is_active', true).order('name'),
        supabase.from('purchase_orders').select('id, po_number').order('po_number', { ascending: false }).limit(100),
      ]);

      const lotsData = lotsRes.data || [];
      setLots(lotsData);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setPurchaseOrders(posRes.data || []);

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expired = lotsData.filter((lot: Lot) =>
        lot.expiry_date && new Date(lot.expiry_date) < today && lot.status === 'active'
      ).length;

      const expiringSoon = lotsData.filter((lot: Lot) =>
        lot.expiry_date &&
        new Date(lot.expiry_date) >= today &&
        new Date(lot.expiry_date) <= thirtyDaysFromNow &&
        lot.status === 'active'
      ).length;

      const quarantine = lotsData.filter((lot: Lot) => lot.status === 'quarantine').length;

      setStats({ expired, expiring_soon: expiringSoon, quarantine });
    } catch (error) {
      console.error('Failed to load lot tracking data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let filtered = lots;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(lot =>
        lot.lot_number.toLowerCase().includes(search) ||
        lot.product?.name.toLowerCase().includes(search) ||
        lot.product?.sku.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lot => lot.status === statusFilter);
    }

    setFilteredLots(filtered);
  }, [lots, searchTerm, statusFilter]);

  const generateLotNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `LOT-${timestamp}-${random}`;
  };

  const handleAutoGenerateLotNumber = () => {
    setLotForm(prev => ({ ...prev, lot_number: generateLotNumber() }));
  };

  const handleProductChange = (productId: string) => {
    setLotForm(prev => ({ ...prev, product_id: productId }));

    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct?.shelf_life_days && lotForm.manufactured_date) {
      const mfgDate = new Date(lotForm.manufactured_date);
      const expiryDate = new Date(mfgDate);
      expiryDate.setDate(expiryDate.getDate() + selectedProduct.shelf_life_days);
      setLotForm(prev => ({ ...prev, expiry_date: format(expiryDate, 'yyyy-MM-dd') }));
    }
  };

  const handleManufacturedDateChange = (date: string) => {
    setLotForm(prev => ({ ...prev, manufactured_date: date }));

    if (lotForm.product_id && date) {
      const selectedProduct = products.find(p => p.id === lotForm.product_id);
      if (selectedProduct?.shelf_life_days) {
        const mfgDate = new Date(date);
        const expiryDate = new Date(mfgDate);
        expiryDate.setDate(expiryDate.getDate() + selectedProduct.shelf_life_days);
        setLotForm(prev => ({ ...prev, expiry_date: format(expiryDate, 'yyyy-MM-dd') }));
      }
    }
  };

  const handleCreateLot = async () => {
    if (!lotForm.lot_number || !lotForm.product_id || !lotForm.quantity) {
      toast.error('Lot number, product, and quantity are required');
      return;
    }

    try {
      const { error } = await supabase.from('lot_tracking').insert({
        lot_number: lotForm.lot_number,
        product_id: lotForm.product_id,
        quantity: parseFloat(lotForm.quantity),
        manufactured_date: lotForm.manufactured_date || null,
        expiry_date: lotForm.expiry_date || null,
        location_id: lotForm.location_id || null,
        supplier_id: lotForm.supplier_id || null,
        po_id: lotForm.po_id || null,
        notes: lotForm.notes || null,
        status: 'active',
      });

      if (error) throw error;

      toast.success('Lot created successfully');
      setShowCreateModal(false);
      setLotForm({ ...emptyLotForm });
      loadData();
    } catch (error) {
      console.error('Failed to create lot:', error);
      toast.error('Failed to create lot');
    }
  };

  const loadLotMovements = async (lotId: string) => {
    const { data } = await supabase
      .from('lot_movements')
      .select(`
        *,
        from_location:warehouse_locations!lot_movements_from_location_id_fkey(location_name),
        to_location:warehouse_locations!lot_movements_to_location_id_fkey(location_name),
        performer:profiles!lot_movements_performed_by_fkey(full_name)
      `)
      .eq('lot_id', lotId)
      .order('performed_at', { ascending: false });

    setLotMovements(data || []);
  };

  const handleViewLot = async (lot: Lot) => {
    setSelectedLot(lot);
    setShowDetailDrawer(true);
    setEditMode(false);
    await loadLotMovements(lot.id);
  };

  const handleUpdateLotStatus = async (lotId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lot_tracking')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', lotId);

      if (error) throw error;

      toast.success(`Lot status updated to ${newStatus}`);
      loadData();
      if (selectedLot?.id === lotId) {
        setSelectedLot(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Failed to update lot status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleConsumeLot = async () => {
    if (!selectedLot || !consumeQuantity) {
      toast.error('Quantity is required');
      return;
    }

    const quantity = parseFloat(consumeQuantity);
    if (quantity <= 0 || quantity > selectedLot.quantity) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      const newQuantity = selectedLot.quantity - quantity;
      const newStatus = newQuantity === 0 ? 'consumed' : selectedLot.status;

      const { error: updateError } = await supabase
        .from('lot_tracking')
        .update({
          quantity: newQuantity,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLot.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from('lot_movements')
        .insert({
          lot_id: selectedLot.id,
          movement_type: 'consumption',
          quantity: -quantity,
          from_location_id: selectedLot.location_id,
          to_location_id: null,
          notes: `Consumed ${quantity} units`,
          performed_by: profile?.id,
        });

      if (movementError) throw movementError;

      toast.success('Lot quantity consumed successfully');
      setShowConsumeModal(false);
      setConsumeQuantity('');
      loadData();
      if (selectedLot) {
        await loadLotMovements(selectedLot.id);
        setSelectedLot(prev => prev ? { ...prev, quantity: newQuantity, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Failed to consume lot:', error);
      toast.error('Failed to consume lot');
    }
  };

  const handleTransferLot = async () => {
    if (!selectedLot || !transferLocationId) {
      toast.error('Location is required');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('lot_tracking')
        .update({
          location_id: transferLocationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLot.id);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase
        .from('lot_movements')
        .insert({
          lot_id: selectedLot.id,
          movement_type: 'transfer',
          quantity: selectedLot.quantity,
          from_location_id: selectedLot.location_id,
          to_location_id: transferLocationId,
          notes: transferNotes || 'Location transfer',
          performed_by: profile?.id,
        });

      if (movementError) throw movementError;

      toast.success('Lot transferred successfully');
      setShowTransferModal(false);
      setTransferLocationId('');
      setTransferNotes('');
      loadData();
      if (selectedLot) {
        await loadLotMovements(selectedLot.id);
        const newLocation = locations.find(l => l.id === transferLocationId);
        setSelectedLot(prev => prev ? {
          ...prev,
          location_id: transferLocationId,
          location: newLocation
        } : null);
      }
    } catch (error) {
      console.error('Failed to transfer lot:', error);
      toast.error('Failed to transfer lot');
    }
  };

  const handleUpdateLotDetails = async () => {
    if (!selectedLot) return;

    try {
      const { error } = await supabase
        .from('lot_tracking')
        .update({
          notes: selectedLot.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLot.id);

      if (error) throw error;

      toast.success('Lot details updated');
      setEditMode(false);
      loadData();
    } catch (error) {
      console.error('Failed to update lot:', error);
      toast.error('Failed to update lot');
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiry < today) {
      return { text: 'Expired', color: 'text-red-600 bg-red-50' };
    } else if (expiry <= thirtyDaysFromNow) {
      return { text: 'Expiring Soon', color: 'text-amber-600 bg-amber-50' };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading lot tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lot Tracking</h1>
          <p className="text-slate-600 mt-1">Manage lot/serial number traceability</p>
        </div>
        <Button
          onClick={() => {
            setLotForm({ ...emptyLotForm });
            setShowCreateModal(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Create Lot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Expired Lots</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{stats.expired}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Expiring in 30 Days</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">{stats.expiring_soon}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">In Quarantine</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.quarantine}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by lot number, product, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="quarantine">Quarantine</option>
                <option value="expired">Expired</option>
                <option value="consumed">Consumed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Lot Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Manufactured
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No lots found
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => {
                  const expiryStatus = getExpiryStatus(lot.expiry_date);
                  return (
                    <tr
                      key={lot.id}
                      onClick={() => handleViewLot(lot)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{lot.lot_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{lot.product?.name}</div>
                          <div className="text-sm text-slate-500">{lot.product?.sku}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{lot.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {lot.manufactured_date ? format(new Date(lot.manufactured_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {lot.expiry_date ? (
                          <div className="space-y-1">
                            <div className="text-slate-900">{format(new Date(lot.expiry_date), 'MMM dd, yyyy')}</div>
                            {expiryStatus && (
                              <div className={`text-xs px-2 py-0.5 rounded inline-block ${expiryStatus.color}`}>
                                {expiryStatus.text}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lot.location ? (
                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3" />
                            <span className="text-sm">{lot.location.location_code}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig[lot.status].variant}>
                          {statusConfig[lot.status].label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModernModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Lot"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLot} icon={<Save className="w-4 h-4" />}>
              Create Lot
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Lot Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={lotForm.lot_number}
                onChange={(e) => setLotForm(prev => ({ ...prev, lot_number: e.target.value }))}
                placeholder="Enter lot number"
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={handleAutoGenerateLotNumber}
                size="sm"
              >
                Auto Generate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={lotForm.product_id}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={lotForm.quantity}
                onChange={(e) => setLotForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Manufactured Date
              </label>
              <Input
                type="date"
                value={lotForm.manufactured_date}
                onChange={(e) => handleManufacturedDateChange(e.target.value)}
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expiry Date
              </label>
              <Input
                type="date"
                value={lotForm.expiry_date}
                onChange={(e) => setLotForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <select
              value={lotForm.location_id}
              onChange={(e) => setLotForm(prev => ({ ...prev, location_id: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.location_code} - {location.location_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Supplier
              </label>
              <select
                value={lotForm.supplier_id}
                onChange={(e) => setLotForm(prev => ({ ...prev, supplier_id: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Purchase Order
              </label>
              <select
                value={lotForm.po_id}
                onChange={(e) => setLotForm(prev => ({ ...prev, po_id: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select PO</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.po_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={lotForm.notes}
              onChange={(e) => setLotForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes or comments..."
            />
          </div>
        </div>
      </ModernModal>

      <Drawer
        isOpen={showDetailDrawer}
        onClose={() => {
          setShowDetailDrawer(false);
          setEditMode(false);
        }}
        title={`Lot Details: ${selectedLot?.lot_number}`}
        size="lg"
        footer={
          <div className="flex justify-between">
            <div className="flex gap-2">
              {selectedLot?.status === 'active' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUpdateLotStatus(selectedLot.id, 'quarantine')}
                    icon={<ShieldAlert className="w-4 h-4" />}
                  >
                    Quarantine
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowConsumeModal(true)}
                    icon={<Minus className="w-4 h-4" />}
                  >
                    Consume
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowTransferModal(true)}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Transfer
                  </Button>
                </>
              )}
              {selectedLot?.status === 'quarantine' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleUpdateLotStatus(selectedLot.id, 'active')}
                  icon={<ShieldCheck className="w-4 h-4" />}
                >
                  Release
                </Button>
              )}
            </div>
            {editMode ? (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdateLotDetails} icon={<Save className="w-4 h-4" />}>
                  Save
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditMode(true)}
                icon={<Edit3 className="w-4 h-4" />}
              >
                Edit
              </Button>
            )}
          </div>
        }
      >
        {selectedLot && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Status</span>
                <Badge variant={statusConfig[selectedLot.status].variant}>
                  {statusConfig[selectedLot.status].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Product</span>
                <div className="text-right">
                  <div className="font-medium text-slate-900">{selectedLot.product?.name}</div>
                  <div className="text-sm text-slate-500">{selectedLot.product?.sku}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Quantity</span>
                <span className="font-bold text-lg text-slate-900">{selectedLot.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Manufactured</span>
                <span className="text-slate-900">
                  {selectedLot.manufactured_date ? format(new Date(selectedLot.manufactured_date), 'MMM dd, yyyy') : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Expiry</span>
                <div>
                  {selectedLot.expiry_date ? (
                    <div className="text-right">
                      <div className="text-slate-900">{format(new Date(selectedLot.expiry_date), 'MMM dd, yyyy')}</div>
                      {getExpiryStatus(selectedLot.expiry_date) && (
                        <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${getExpiryStatus(selectedLot.expiry_date)!.color}`}>
                          {getExpiryStatus(selectedLot.expiry_date)!.text}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Location</span>
                <div className="flex items-center gap-1 text-slate-900">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedLot.location?.location_name || '-'}</span>
                </div>
              </div>
              {selectedLot.supplier && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Supplier</span>
                  <div className="flex items-center gap-1 text-slate-900">
                    <Truck className="w-4 h-4" />
                    <span>{selectedLot.supplier.name}</span>
                  </div>
                </div>
              )}
              {selectedLot.purchase_order && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">PO Number</span>
                  <span className="text-slate-900">{selectedLot.purchase_order.po_number}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              {editMode ? (
                <textarea
                  value={selectedLot.notes || ''}
                  onChange={(e) => setSelectedLot(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes..."
                />
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-slate-900 min-h-[100px]">
                  {selectedLot.notes || 'No notes available'}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Movement History
              </h3>
              <div className="space-y-3">
                {lotMovements.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No movements recorded</p>
                ) : (
                  lotMovements.map((movement) => (
                    <div key={movement.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="info">{movement.movement_type}</Badge>
                            <span className="text-sm text-slate-600">
                              {format(new Date(movement.performed_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="text-sm text-slate-900">
                            Quantity: <span className="font-medium">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</span>
                          </div>
                          {movement.from_location && (
                            <div className="text-sm text-slate-600">
                              From: {movement.from_location.location_name}
                            </div>
                          )}
                          {movement.to_location && (
                            <div className="text-sm text-slate-600">
                              To: {movement.to_location.location_name}
                            </div>
                          )}
                          {movement.notes && (
                            <div className="text-sm text-slate-500 mt-1">{movement.notes}</div>
                          )}
                          {movement.performer && (
                            <div className="text-xs text-slate-400 mt-1">
                              By: {movement.performer.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ModernModal
        isOpen={showConsumeModal}
        onClose={() => {
          setShowConsumeModal(false);
          setConsumeQuantity('');
        }}
        title="Consume Lot Quantity"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConsumeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConsumeLot} icon={<Save className="w-4 h-4" />}>
              Consume
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Available quantity: <span className="font-bold">{selectedLot?.quantity}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantity to Consume <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={consumeQuantity}
              onChange={(e) => setConsumeQuantity(e.target.value)}
              placeholder="0"
              min="0"
              max={selectedLot?.quantity}
              step="0.01"
            />
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferLocationId('');
          setTransferNotes('');
        }}
        title="Transfer Lot"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferLot} icon={<Save className="w-4 h-4" />}>
              Transfer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Current location: <span className="font-bold">{selectedLot?.location?.location_name || 'Not set'}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Location <span className="text-red-500">*</span>
            </label>
            <select
              value={transferLocationId}
              onChange={(e) => setTransferLocationId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.location_code} - {location.location_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transfer reason or notes..."
            />
          </div>
        </div>
      </ModernModal>
    </div>
  );
}
