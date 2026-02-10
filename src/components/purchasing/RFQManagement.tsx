import { useState, useEffect } from 'react';
import { FileText, Plus, X, Send, Award, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  description: string;
  due_date: string;
  status: 'draft' | 'sent' | 'responses_received' | 'evaluated' | 'awarded' | 'cancelled';
  created_by: string;
  awarded_supplier_id: string | null;
  created_at: string;
}

interface RFQItem {
  id: string;
  rfq_id: string;
  item_description: string;
  quantity: number;
  specifications: string;
  unit: string;
}

interface RFQSupplier {
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier?: {
    id: string;
    name: string;
    email: string;
  };
}

interface RFQResponse {
  id: string;
  rfq_id: string;
  rfq_item_id: string;
  supplier_id: string;
  quoted_price: number;
  delivery_days: number;
  notes: string;
  response_date: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
}

export function RFQManagement() {
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<string | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseSupplier, setResponseSupplier] = useState<string>('');

  const [newRFQ, setNewRFQ] = useState({
    title: '',
    description: '',
    due_date: '',
    supplier_ids: [] as string[],
    items: [{ item_description: '', quantity: 1, specifications: '', unit: 'pcs' }]
  });

  const [newResponse, setNewResponse] = useState({
    supplier_id: '',
    item_responses: [] as { rfq_item_id: string; quoted_price: number; delivery_days: number; notes: string }[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRFQs(), loadSuppliers()]);
    setLoading(false);
  };

  const loadRFQs = async () => {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading RFQs:', error);
      return;
    }

    setRfqs(data || []);
  };

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, email')
      .order('name');

    if (error) {
      console.error('Error loading suppliers:', error);
      return;
    }

    setSuppliers(data || []);
  };

  const generateRFQNumber = () => {
    const timestamp = Date.now();
    return `RFQ-${timestamp.toString().slice(-8)}`;
  };

  const createRFQ = async () => {
    if (!newRFQ.title || !newRFQ.due_date || newRFQ.supplier_ids.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const rfqNumber = generateRFQNumber();

    const { data: rfqData, error: rfqError } = await supabase
      .from('rfqs')
      .insert({
        rfq_number: rfqNumber,
        title: newRFQ.title,
        description: newRFQ.description,
        due_date: newRFQ.due_date,
        status: 'draft',
        created_by: userData.user.id
      })
      .select()
      .single();

    if (rfqError) {
      console.error('Error creating RFQ:', rfqError);
      alert('Failed to create RFQ');
      return;
    }

    const itemsToInsert = newRFQ.items.map(item => ({
      rfq_id: rfqData.id,
      item_description: item.item_description,
      quantity: item.quantity,
      specifications: item.specifications,
      unit: item.unit
    }));

    const { error: itemsError } = await supabase
      .from('rfq_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating RFQ items:', itemsError);
    }

    const suppliersToInsert = newRFQ.supplier_ids.map(supplier_id => ({
      rfq_id: rfqData.id,
      supplier_id
    }));

    const { error: suppliersError } = await supabase
      .from('rfq_suppliers')
      .insert(suppliersToInsert);

    if (suppliersError) {
      console.error('Error linking suppliers:', suppliersError);
    }

    setShowCreateModal(false);
    setNewRFQ({
      title: '',
      description: '',
      due_date: '',
      supplier_ids: [],
      items: [{ item_description: '', quantity: 1, specifications: '', unit: 'pcs' }]
    });
    loadRFQs();
  };

  const sendRFQ = async (rfqId: string) => {
    const { error } = await supabase
      .from('rfqs')
      .update({ status: 'sent' })
      .eq('id', rfqId);

    if (error) {
      console.error('Error sending RFQ:', error);
      alert('Failed to send RFQ');
      return;
    }

    loadRFQs();
  };

  const recordResponse = async () => {
    if (!selectedRFQ || newResponse.item_responses.length === 0) {
      alert('Please fill in all response details');
      return;
    }

    const responsesToInsert = newResponse.item_responses.map(response => ({
      rfq_id: selectedRFQ,
      rfq_item_id: response.rfq_item_id,
      supplier_id: newResponse.supplier_id,
      quoted_price: response.quoted_price,
      delivery_days: response.delivery_days,
      notes: response.notes,
      response_date: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('rfq_responses')
      .insert(responsesToInsert);

    if (error) {
      console.error('Error recording response:', error);
      alert('Failed to record response');
      return;
    }

    const { error: updateError } = await supabase
      .from('rfqs')
      .update({ status: 'responses_received' })
      .eq('id', selectedRFQ);

    if (updateError) {
      console.error('Error updating RFQ status:', updateError);
    }

    setShowResponseModal(false);
    setNewResponse({
      supplier_id: '',
      item_responses: []
    });
    loadRFQs();
  };

  const awardRFQ = async (rfqId: string, supplierId: string) => {
    const { error } = await supabase
      .from('rfqs')
      .update({ status: 'awarded', awarded_supplier_id: supplierId })
      .eq('id', rfqId);

    if (error) {
      console.error('Error awarding RFQ:', error);
      alert('Failed to award RFQ');
      return;
    }

    loadRFQs();
  };

  const addItem = () => {
    setNewRFQ({
      ...newRFQ,
      items: [...newRFQ.items, { item_description: '', quantity: 1, specifications: '', unit: 'pcs' }]
    });
  };

  const removeItem = (index: number) => {
    const items = [...newRFQ.items];
    items.splice(index, 1);
    setNewRFQ({ ...newRFQ, items });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newRFQ.items];
    items[index] = { ...items[index], [field]: value };
    setNewRFQ({ ...newRFQ, items });
  };

  const toggleSupplier = (supplierId: string) => {
    const ids = [...newRFQ.supplier_ids];
    const index = ids.indexOf(supplierId);
    if (index > -1) {
      ids.splice(index, 1);
    } else {
      ids.push(supplierId);
    }
    setNewRFQ({ ...newRFQ, supplier_ids: ids });
  };

  const getStatusBadge = (status: RFQ['status']) => {
    const variants = {
      draft: 'neutral',
      sent: 'info',
      responses_received: 'warning',
      evaluated: 'primary',
      awarded: 'success',
      cancelled: 'danger'
    } as const;

    const icons = {
      draft: <FileText className="h-3 w-3" />,
      sent: <Send className="h-3 w-3" />,
      responses_received: <Clock className="h-3 w-3" />,
      evaluated: <CheckCircle className="h-3 w-3" />,
      awarded: <Award className="h-3 w-3" />,
      cancelled: <X className="h-3 w-3" />
    };

    return (
      <Badge variant={variants[status]} icon={icons[status]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredRFQs = rfqs.filter(rfq => {
    if (activeTab === 'active') {
      return ['draft', 'sent', 'responses_received', 'evaluated'].includes(rfq.status);
    } else {
      return ['awarded', 'cancelled'].includes(rfq.status);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Request for Quote Management</h2>
          <p className="text-slate-600 mt-1">Manage RFQs and supplier responses</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="h-4 w-4" />}>
          Create RFQ
        </Button>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-slate-600">Loading RFQs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  RFQ Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Suppliers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredRFQs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No RFQs found
                  </td>
                </tr>
              ) : (
                filteredRFQs.map((rfq) => (
                  <RFQRow
                    key={rfq.id}
                    rfq={rfq}
                    onView={() => setSelectedRFQ(rfq.id)}
                    onSend={() => sendRFQ(rfq.id)}
                    onRecordResponse={(supplierId) => {
                      setSelectedRFQ(rfq.id);
                      setResponseSupplier(supplierId);
                      setShowResponseModal(true);
                    }}
                    onAward={(supplierId) => awardRFQ(rfq.id, supplierId)}
                    getStatusBadge={getStatusBadge}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateRFQModal
          newRFQ={newRFQ}
          suppliers={suppliers}
          onClose={() => setShowCreateModal(false)}
          onCreate={createRFQ}
          updateField={(field, value) => setNewRFQ({ ...newRFQ, [field]: value })}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          toggleSupplier={toggleSupplier}
        />
      )}

      {showResponseModal && selectedRFQ && (
        <RecordResponseModal
          rfqId={selectedRFQ}
          supplierId={responseSupplier}
          onClose={() => {
            setShowResponseModal(false);
            setSelectedRFQ(null);
            setResponseSupplier('');
          }}
          onSubmit={recordResponse}
          newResponse={newResponse}
          setNewResponse={setNewResponse}
        />
      )}

      {selectedRFQ && !showResponseModal && (
        <RFQDetailView
          rfqId={selectedRFQ}
          onClose={() => setSelectedRFQ(null)}
          onAward={awardRFQ}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );
}

function RFQRow({
  rfq,
  onView,
  onSend,
  onRecordResponse,
  onAward,
  getStatusBadge
}: {
  rfq: RFQ;
  onView: () => void;
  onSend: () => void;
  onRecordResponse: (supplierId: string) => void;
  onAward: (supplierId: string) => void;
  getStatusBadge: (status: RFQ['status']) => JSX.Element;
}) {
  const [suppliers, setSuppliers] = useState<RFQSupplier[]>([]);

  useEffect(() => {
    loadSuppliers();
  }, [rfq.id]);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('rfq_suppliers')
      .select('*, supplier:suppliers(id, name, email)')
      .eq('rfq_id', rfq.id);

    if (error) {
      console.error('Error loading suppliers:', error);
      return;
    }

    setSuppliers(data || []);
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-900">{rfq.rfq_number}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-900">{rfq.title}</div>
        {rfq.description && (
          <div className="text-xs text-slate-500 mt-1 truncate max-w-xs">{rfq.description}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge variant="neutral">{suppliers.length} suppliers</Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
        {new Date(rfq.due_date).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(rfq.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View
          </button>
          {rfq.status === 'draft' && (
            <button
              onClick={onSend}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Send
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateRFQModal({
  newRFQ,
  suppliers,
  onClose,
  onCreate,
  updateField,
  addItem,
  removeItem,
  updateItem,
  toggleSupplier
}: {
  newRFQ: any;
  suppliers: Supplier[];
  onClose: () => void;
  onCreate: () => void;
  updateField: (field: string, value: any) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: string, value: any) => void;
  toggleSupplier: (supplierId: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Create New RFQ</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newRFQ.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="RFQ title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={newRFQ.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="RFQ description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newRFQ.due_date}
              onChange={(e) => updateField('due_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Suppliers <span className="text-red-500">*</span>
            </label>
            <div className="border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {suppliers.map(supplier => (
                <label key={supplier.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRFQ.supplier_ids.includes(supplier.id)}
                    onChange={() => toggleSupplier(supplier.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{supplier.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Line Items <span className="text-red-500">*</span>
              </label>
              <Button size="sm" onClick={addItem} icon={<Plus className="h-4 w-4" />}>
                Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {newRFQ.items.map((item: any, index: number) => (
                <div key={index} className="border border-slate-300 rounded-lg p-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.item_description}
                        onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                        placeholder="Item description"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <textarea
                        value={item.specifications}
                        onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                        placeholder="Specifications"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                          placeholder="Quantity"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          placeholder="Unit"
                          className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    {newRFQ.items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 mt-1"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onCreate}>
            Create RFQ
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecordResponseModal({
  rfqId,
  supplierId,
  onClose,
  onSubmit,
  newResponse,
  setNewResponse
}: {
  rfqId: string;
  supplierId: string;
  onClose: () => void;
  onSubmit: () => void;
  newResponse: any;
  setNewResponse: (response: any) => void;
}) {
  const [items, setItems] = useState<RFQItem[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadData();
  }, [rfqId, supplierId]);

  const loadData = async () => {
    const { data: itemsData } = await supabase
      .from('rfq_items')
      .select('*')
      .eq('rfq_id', rfqId);

    if (itemsData) {
      setItems(itemsData);
      setNewResponse({
        supplier_id: supplierId,
        item_responses: itemsData.map(item => ({
          rfq_item_id: item.id,
          quoted_price: 0,
          delivery_days: 0,
          notes: ''
        }))
      });
    }

    if (supplierId) {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (supplierData) {
        setSupplier(supplierData);
      }
    }
  };

  const updateResponse = (index: number, field: string, value: any) => {
    const responses = [...newResponse.item_responses];
    responses[index] = { ...responses[index], [field]: value };
    setNewResponse({ ...newResponse, item_responses: responses });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Record Supplier Response</h3>
            {supplier && (
              <p className="text-sm text-slate-600 mt-1">{supplier.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-slate-300 rounded-lg p-4 space-y-3">
              <div className="font-medium text-slate-900">{item.item_description}</div>
              <div className="text-sm text-slate-600">
                Quantity: {item.quantity} {item.unit}
              </div>
              {item.specifications && (
                <div className="text-sm text-slate-600">{item.specifications}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quoted Price
                  </label>
                  <input
                    type="number"
                    value={newResponse.item_responses[index]?.quoted_price || 0}
                    onChange={(e) => updateResponse(index, 'quoted_price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Delivery Days
                  </label>
                  <input
                    type="number"
                    value={newResponse.item_responses[index]?.delivery_days || 0}
                    onChange={(e) => updateResponse(index, 'delivery_days', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newResponse.item_responses[index]?.notes || ''}
                  onChange={(e) => updateResponse(index, 'notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Submit Response
          </Button>
        </div>
      </div>
    </div>
  );
}

function RFQDetailView({
  rfqId,
  onClose,
  onAward,
  getStatusBadge
}: {
  rfqId: string;
  onClose: () => void;
  onAward: (rfqId: string, supplierId: string) => void;
  getStatusBadge: (status: RFQ['status']) => JSX.Element;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'responses' | 'evaluation'>('details');
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [items, setItems] = useState<RFQItem[]>([]);
  const [suppliers, setSuppliers] = useState<(RFQSupplier & { supplier: Supplier })[]>([]);
  const [responses, setResponses] = useState<RFQResponse[]>([]);

  useEffect(() => {
    loadData();
  }, [rfqId]);

  const loadData = async () => {
    const { data: rfqData } = await supabase
      .from('rfqs')
      .select('*')
      .eq('id', rfqId)
      .single();

    if (rfqData) {
      setRfq(rfqData);
    }

    const { data: itemsData } = await supabase
      .from('rfq_items')
      .select('*')
      .eq('rfq_id', rfqId);

    if (itemsData) {
      setItems(itemsData);
    }

    const { data: suppliersData } = await supabase
      .from('rfq_suppliers')
      .select('*, supplier:suppliers(*)')
      .eq('rfq_id', rfqId);

    if (suppliersData) {
      setSuppliers(suppliersData as any);
    }

    const { data: responsesData } = await supabase
      .from('rfq_responses')
      .select('*')
      .eq('rfq_id', rfqId);

    if (responsesData) {
      setResponses(responsesData);
    }
  };

  if (!rfq) {
    return null;
  }

  const getSupplierResponses = (supplierId: string) => {
    return responses.filter(r => r.supplier_id === supplierId);
  };

  const getSupplierTotal = (supplierId: string) => {
    const supplierResponses = getSupplierResponses(supplierId);
    return supplierResponses.reduce((sum, r) => sum + r.quoted_price, 0);
  };

  const getSupplierMaxDelivery = (supplierId: string) => {
    const supplierResponses = getSupplierResponses(supplierId);
    return Math.max(...supplierResponses.map(r => r.delivery_days), 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-lg md:rounded-lg shadow-xl w-full md:max-w-6xl md:max-h-[90vh] h-[90vh] md:h-auto overflow-hidden flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{rfq.rfq_number}</h3>
            <p className="text-sm text-slate-600 mt-1">{rfq.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'responses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Responses
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'evaluation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Evaluation
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <div className="mt-1">{getStatusBadge(rfq.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <div className="mt-1 text-slate-900">{new Date(rfq.due_date).toLocaleDateString()}</div>
                </div>
              </div>

              {rfq.description && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <div className="mt-1 text-slate-900">{rfq.description}</div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Suppliers</label>
                <div className="space-y-2">
                  {suppliers.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-900">{s.supplier.name}</div>
                        <div className="text-sm text-slate-600">{s.supplier.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Line Items</label>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="border border-slate-300 rounded-lg p-4">
                      <div className="font-medium text-slate-900">{item.item_description}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Quantity: {item.quantity} {item.unit}
                      </div>
                      {item.specifications && (
                        <div className="text-sm text-slate-600 mt-2">{item.specifications}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'responses' && (
            <div className="space-y-6">
              {suppliers.map(supplier => {
                const supplierResponses = getSupplierResponses(supplier.supplier_id);
                return (
                  <div key={supplier.id} className="border border-slate-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-slate-900">{supplier.supplier.name}</div>
                      {supplierResponses.length > 0 && (
                        <Badge variant="success">Responded</Badge>
                      )}
                    </div>
                    {supplierResponses.length === 0 ? (
                      <p className="text-sm text-slate-500">No response yet</p>
                    ) : (
                      <div className="space-y-3">
                        {items.map(item => {
                          const response = supplierResponses.find(r => r.rfq_item_id === item.id);
                          return (
                            <div key={item.id} className="bg-slate-50 p-3 rounded-lg">
                              <div className="font-medium text-sm text-slate-900">{item.item_description}</div>
                              {response && (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-slate-600">Price:</span>
                                    <span className="ml-2 font-medium text-slate-900">${response.quoted_price}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Delivery:</span>
                                    <span className="ml-2 font-medium text-slate-900">{response.delivery_days} days</span>
                                  </div>
                                  {response.notes && (
                                    <div className="col-span-2">
                                      <span className="text-slate-600">Notes:</span>
                                      <span className="ml-2 text-slate-900">{response.notes}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Total Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Max Delivery
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {suppliers.map(supplier => {
                      const supplierResponses = getSupplierResponses(supplier.supplier_id);
                      const hasResponded = supplierResponses.length > 0;
                      const total = getSupplierTotal(supplier.supplier_id);
                      const maxDelivery = getSupplierMaxDelivery(supplier.supplier_id);
                      const isAwarded = rfq.awarded_supplier_id === supplier.supplier_id;

                      return (
                        <tr key={supplier.id}>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-slate-900">{supplier.supplier.name}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {hasResponded ? (
                              <div className="text-sm font-semibold text-slate-900">${total.toFixed(2)}</div>
                            ) : (
                              <div className="text-sm text-slate-400">-</div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {hasResponded ? (
                              <div className="text-sm text-slate-900">{maxDelivery} days</div>
                            ) : (
                              <div className="text-sm text-slate-400">-</div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {isAwarded ? (
                              <Badge variant="success" icon={<Award className="h-3 w-3" />}>
                                Awarded
                              </Badge>
                            ) : hasResponded ? (
                              <Badge variant="info">Responded</Badge>
                            ) : (
                              <Badge variant="neutral">Pending</Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {hasResponded && !isAwarded && rfq.status !== 'awarded' && (
                              <button
                                onClick={() => onAward(rfq.id, supplier.supplier_id)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                Award
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rfq.status !== 'awarded' && responses.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Ready to Award</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Review the responses above and click Award to select the winning supplier.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
