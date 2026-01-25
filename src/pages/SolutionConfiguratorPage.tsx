import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Wand2,
    ChevronRight,
    ChevronLeft,
    Check,
    Package,
    Target,
    FileText,
    Save,
    Plus,
    Trash2,
    Search,
} from 'lucide-react';
import { formatCurrency } from '../lib/currencyUtils';

interface Product {
    id: string;
    name: string;
    description: string;
    category: string;
    unit_price: number;
    is_active: boolean;
}

interface SelectedProduct {
    product_id: string;
    product: Product;
    quantity: number;
    unit_price: number;
}

interface Requirements {
    project_type: 'office' | 'hospitality' | 'mixed';
    space_sqm: number;
    workstations: number;
    hotel_rooms: number;
    finish_grade: 'economy' | 'standard' | 'premium' | 'luxury';
    materials: string[];
    services: string[];
    timeline: string;
    fire_rating_required: boolean;
}

const WIZARD_STEPS = [
    { id: 'requirements', title: 'Project Details', icon: Target },
    { id: 'products', title: 'Select Products', icon: Package },
    { id: 'configure', title: 'Configure', icon: Wand2 },
    { id: 'review', title: 'Review & Save', icon: FileText },
];

// Furniture industry options
const PROJECT_TYPES = [
    { value: 'office', label: 'Office Furniture' },
    { value: 'hospitality', label: 'Hospitality/Hotel' },
    { value: 'mixed', label: 'Mixed Project' },
];

const FINISH_GRADES = [
    { value: 'economy', label: 'Economy', description: 'Basic laminate, fabric' },
    { value: 'standard', label: 'Standard', description: 'Mid-grade materials' },
    { value: 'premium', label: 'Premium', description: 'High-quality finishes' },
    { value: 'luxury', label: 'Luxury', description: 'Top-tier materials, custom design' },
];

const MATERIAL_OPTIONS = ['Laminate', 'Veneer', 'Solid Wood', 'Metal', 'Leather', 'Fabric', 'Glass', 'Marble', 'HPL'];
const SERVICE_OPTIONS = ['Space Planning', 'Design Consultation', 'Installation', 'Delivery', 'Removal of Old Furniture', 'Custom Manufacturing', 'Project Management'];

const FURNITURE_CATEGORIES = [
    { id: 'office', label: 'Office Furniture', subcats: ['Desks', 'Workstations', 'Task Chairs', 'Storage', 'Meeting'] },
    { id: 'hospitality', label: 'Hospitality', subcats: ['Bedding', 'Casegoods', 'Hotel Seating', 'Lighting'] },
    { id: 'chairs', label: 'Imported Chairs', subcats: ['Executive', 'Mesh', 'Visitor', 'Lounge'] },
    { id: 'services', label: 'Services', subcats: ['Logistics', 'Design', 'Installation'] },
];

export default function SolutionConfiguratorPage() {
    const { profile } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [products, setProducts] = useState<Product[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [configName, setConfigName] = useState('');
    const [opportunityId, setOpportunityId] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [requirements, setRequirements] = useState<Requirements>({
        project_type: 'office',
        space_sqm: 100,
        workstations: 0,
        hotel_rooms: 0,
        finish_grade: 'standard',
        materials: [],
        services: [],
        timeline: '',
        fire_rating_required: false,
    });
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsRes, opportunitiesRes] = await Promise.all([
                supabase.from('products').select('*').eq('is_active', true).order('name'),
                supabase.from('crm_opportunities').select('id, name, customer:customers(company_name)').order('name'),
            ]);

            setProducts(productsRes.data || []);
            setOpportunities(opportunitiesRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(
        (p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        }
    );

    const addProduct = (product: Product) => {
        if (selectedProducts.some((sp) => sp.product_id === product.id)) return;
        setSelectedProducts([
            ...selectedProducts,
            { product_id: product.id, product, quantity: 1, unit_price: product.unit_price },
        ]);
    };

    const removeProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter((sp) => sp.product_id !== productId));
    };

    const updateProductQuantity = (productId: string, quantity: number) => {
        setSelectedProducts(
            selectedProducts.map((sp) => (sp.product_id === productId ? { ...sp, quantity: Math.max(1, quantity) } : sp))
        );
    };

    const subtotal = selectedProducts.reduce((sum, sp) => sum + sp.unit_price * sp.quantity, 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const total = subtotal - discountAmount;

    const handleSave = async (generateQuote: boolean = false) => {
        if (!configName) {
            alert('Please enter a configuration name');
            return;
        }

        setSaving(true);
        try {
            const configData = {
                name: configName,
                description: notes,
                status: generateQuote ? 'quoted' : 'configured',
                opportunity_id: opportunityId || null,
                requirements: requirements,
                selected_products: selectedProducts.map((sp) => ({
                    product_id: sp.product_id,
                    quantity: sp.quantity,
                    unit_price: sp.unit_price,
                })),
                configuration_json: { requirements, products: selectedProducts },
                subtotal,
                discount_percentage: discountPercentage,
                discount_amount: discountAmount,
                total,
                configured_by: profile?.id,
                created_by: profile?.id,
            };

            const { error } = await (supabase as any)
                .from('solution_configurations')
                .insert(configData);

            if (error) throw error;

            alert(generateQuote ? 'Configuration saved and quote generated!' : 'Configuration saved successfully!');

            // Reset form
            setConfigName('');
            setOpportunityId('');
            setRequirements({
                project_type: 'office',
                space_sqm: 100,
                workstations: 0,
                hotel_rooms: 0,
                finish_grade: 'standard',
                materials: [],
                services: [],
                timeline: '',
                fire_rating_required: false,
            });
            setSelectedProducts([]);
            setDiscountPercentage(0);
            setNotes('');
            setCurrentStep(0);
        } catch (error: any) {
            console.error('Error saving configuration:', error);
            alert('Failed to save configuration: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0:
                return requirements.space_sqm > 0 && requirements.project_type;
            case 1:
                return selectedProducts.length > 0;
            case 2:
                return true;
            case 3:
                return configName.length > 0;
            default:
                return false;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Solution Configurator</h1>
                    <p className="text-slate-600 mt-1">Build custom solutions based on customer requirements</p>
                </div>
            </div>

            {/* Wizard Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-8">
                    {WIZARD_STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => index <= currentStep && setCurrentStep(index)}
                                disabled={index > currentStep}
                                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${index === currentStep
                                    ? 'bg-indigo-600 text-white'
                                    : index < currentStep
                                        ? 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {index < currentStep ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                                <span className="font-medium hidden md:inline">{step.title}</span>
                            </button>
                            {index < WIZARD_STEPS.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-slate-300 mx-2" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[400px]">
                    {/* Step 1: Project Details */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Project Details</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Project Type</label>
                                    <select
                                        value={requirements.project_type}
                                        onChange={(e) => setRequirements({ ...requirements, project_type: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {PROJECT_TYPES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Space Size (sqm)</label>
                                    <input
                                        type="number"
                                        value={requirements.space_sqm}
                                        onChange={(e) => setRequirements({ ...requirements, space_sqm: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Finish Grade</label>
                                    <select
                                        value={requirements.finish_grade}
                                        onChange={(e) => setRequirements({ ...requirements, finish_grade: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {FINISH_GRADES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(requirements.project_type === 'office' || requirements.project_type === 'mixed') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Workstations</label>
                                        <input
                                            type="number"
                                            value={requirements.workstations}
                                            onChange={(e) => setRequirements({ ...requirements, workstations: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            min="0"
                                        />
                                    </div>
                                )}

                                {(requirements.project_type === 'hospitality' || requirements.project_type === 'mixed') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Number of Hotel Rooms</label>
                                        <input
                                            type="number"
                                            value={requirements.hotel_rooms}
                                            onChange={(e) => setRequirements({ ...requirements, hotel_rooms: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            min="0"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Materials</label>
                                    <div className="flex flex-wrap gap-2">
                                        {MATERIAL_OPTIONS.map((material) => (
                                            <button
                                                key={material}
                                                type="button"
                                                onClick={() => {
                                                    const current = requirements.materials;
                                                    setRequirements({
                                                        ...requirements,
                                                        materials: current.includes(material)
                                                            ? current.filter((m) => m !== material)
                                                            : [...current, material],
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${requirements.materials.includes(material)
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {material}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Required Services</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SERVICE_OPTIONS.map((service) => (
                                            <button
                                                key={service}
                                                type="button"
                                                onClick={() => {
                                                    const current = requirements.services;
                                                    setRequirements({
                                                        ...requirements,
                                                        services: current.includes(service)
                                                            ? current.filter((s) => s !== service)
                                                            : [...current, service],
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${requirements.services.includes(service)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {service}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={requirements.fire_rating_required}
                                        onChange={(e) => setRequirements({ ...requirements, fire_rating_required: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Fire Rating Compliance Required (Hotels/Commercial)</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Link to Opportunity (Optional)</label>
                                <select
                                    value={opportunityId}
                                    onChange={(e) => setOpportunityId(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select opportunity...</option>
                                    {opportunities.map((opp) => (
                                        <option key={opp.id} value={opp.id}>
                                            {opp.name} {opp.customer ? `(${opp.customer.company_name})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Products */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900">Select Products</h2>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search products..."
                                            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-64"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                                    <button
                                        onClick={() => setActiveCategory('all')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === 'all'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        All Products
                                    </button>
                                    {FURNITURE_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Available Products */}
                                <div>
                                    <h3 className="text-sm font-medium text-slate-700 mb-3">Available Products</h3>
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {filteredProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedProducts.some((sp) => sp.product_id === product.id)
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                                    }`}
                                                onClick={() => addProduct(product)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-medium text-slate-900">{product.name}</h4>
                                                        <p className="text-sm text-slate-500 mt-1">{product.description}</p>
                                                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs mt-2">
                                                            {product.category}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-slate-900">{formatCurrency(product.unit_price)}</p>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addProduct(product);
                                                            }}
                                                            className="mt-2 p-1 text-indigo-600 hover:bg-indigo-100 rounded"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected Products */}
                                <div>
                                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                                        Selected Products ({selectedProducts.length})
                                    </h3>
                                    {selectedProducts.length === 0 ? (
                                        <div className="p-8 border border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                                            Click products to add them to your configuration
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedProducts.map((sp) => (
                                                <div key={sp.product_id} className="p-4 border border-slate-200 rounded-lg bg-white">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h4 className="font-medium text-slate-900">{sp.product.name}</h4>
                                                            <p className="text-sm text-slate-500">{formatCurrency(sp.unit_price)} each</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                value={sp.quantity}
                                                                onChange={(e) => updateProductQuantity(sp.product_id, parseInt(e.target.value))}
                                                                className="w-16 px-2 py-1 border border-slate-300 rounded text-center"
                                                                min="1"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeProduct(sp.product_id)}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-right font-medium text-slate-900 mt-2">
                                                        {formatCurrency(sp.unit_price * sp.quantity)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Configure */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Configure Pricing</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-medium text-slate-900 mb-4">Pricing Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Discount (%)</span>
                                            <input
                                                type="number"
                                                value={discountPercentage}
                                                onChange={(e) => setDiscountPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                                className="w-20 px-2 py-1 border border-slate-300 rounded text-right"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-red-600">
                                                <span>Discount Amount</span>
                                                <span>-{formatCurrency(discountAmount)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-200 pt-3 flex justify-between text-lg font-semibold">
                                            <span>Total</span>
                                            <span className="text-indigo-600">{formatCurrency(total)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Configuration Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={6}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Add any special notes, customizations, or implementation details..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review & Save */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Review Configuration</h2>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Configuration Name *</label>
                                <input
                                    type="text"
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., Acme Corp Enterprise Package"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                                        <Target className="w-4 h-4" />
                                        Project Details
                                    </h3>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-slate-600">Project Type</dt>
                                            <dd className="font-medium capitalize">{requirements.project_type}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-slate-600">Space Size</dt>
                                            <dd className="font-medium">{requirements.space_sqm} sqm</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-slate-600">Finish Grade</dt>
                                            <dd className="font-medium capitalize">{requirements.finish_grade}</dd>
                                        </div>
                                        {requirements.workstations > 0 && (
                                            <div className="flex justify-between">
                                                <dt className="text-slate-600">Workstations</dt>
                                                <dd className="font-medium">{requirements.workstations}</dd>
                                            </div>
                                        )}
                                        {requirements.hotel_rooms > 0 && (
                                            <div className="flex justify-between">
                                                <dt className="text-slate-600">Hotel Rooms</dt>
                                                <dd className="font-medium">{requirements.hotel_rooms}</dd>
                                            </div>
                                        )}
                                        {requirements.materials.length > 0 && (
                                            <div>
                                                <dt className="text-slate-600 mb-1">Materials</dt>
                                                <dd className="flex flex-wrap gap-1">
                                                    {requirements.materials.map((m) => (
                                                        <span key={m} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                                            {m}
                                                        </span>
                                                    ))}
                                                </dd>
                                            </div>
                                        )}
                                        {requirements.services.length > 0 && (
                                            <div>
                                                <dt className="text-slate-600 mb-1">Services</dt>
                                                <dd className="flex flex-wrap gap-1">
                                                    {requirements.services.map((s) => (
                                                        <span key={s} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </dd>
                                            </div>
                                        )}
                                        {requirements.fire_rating_required && (
                                            <div className="flex justify-between">
                                                <dt className="text-slate-600">Fire Rating</dt>
                                                <dd className="font-medium text-emerald-600">Required ✓</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6">
                                    <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Products ({selectedProducts.length})
                                    </h3>
                                    <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                                        {selectedProducts.map((sp) => (
                                            <div key={sp.product_id} className="flex justify-between">
                                                <span className="text-slate-600">
                                                    {sp.product.name} x {sp.quantity}
                                                </span>
                                                <span className="font-medium">{formatCurrency(sp.unit_price * sp.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span className="text-indigo-600">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>

                    {currentStep < WIZARD_STEPS.length - 1 ? (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(currentStep + 1)}
                            disabled={!canProceed()}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => handleSave(false)}
                                disabled={saving || !configName}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                Save Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={saving || !configName}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save & Generate Quote'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
