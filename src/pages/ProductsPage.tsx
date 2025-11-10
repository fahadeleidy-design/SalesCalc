import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search, DollarSign, Tag, Upload, Download, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { formatCurrency } from '../lib/currencyUtils';
import { useAuth } from '../contexts/AuthContext';
import { validatePrice } from '../lib/validation';

type Product = Database['public']['Tables']['products']['Row'];

export default function ProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'unit',
    unit_price: '',
    cost_price: '',
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canEditCost = profile?.role === 'finance' || profile?.role === 'admin';
  const canViewCost = profile?.role === 'finance' || profile?.role === 'admin' || profile?.role === 'ceo';

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sku || !formData.name || !formData.unit_price) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const productData: any = {
        ...formData,
        unit_price: parseFloat(formData.unit_price),
      };

      if (canEditCost && formData.cost_price) {
        productData.cost_price = parseFloat(formData.cost_price);
      }

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData as any)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData as any])
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Upload image if selected
      if (imageFile && productId) {
        const imageUrl = await uploadImage(productId);
        if (imageUrl) {
          await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .eq('id', productId);
        }
      }

      alert(editingProduct ? 'Product updated successfully' : 'Product added successfully');

      setShowModal(false);
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: '',
        unit: 'unit',
        unit_price: '',
        cost_price: '',
        is_active: true,
      });
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Failed to save product: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleExportToExcel = () => {
    const headers = ['SKU', 'Name', 'Description', 'Category', 'Unit', 'Unit Price', 'Cost Price', 'Image URL', 'Active'];

    const csvRows = [
      headers.join(','),
      ...products.map(p => [
        p.sku,
        `"${p.name}"`,
        `"${p.description || ''}"`,
        `"${p.category || ''}"`,
        p.unit,
        p.unit_price,
        p.cost_price || '',
        p.image_url || '',
        p.is_active ? 'Yes' : 'No'
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('Invalid file format. File must contain headers and at least one product.');
        return;
      }

      const productsToImport: any[] = [];

      // CSV format: SKU, Name, Description, Category, Unit, Unit Price, Cost Price, Image URL, Active
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.trim().replace(/^"|"$/g, ''));
        if (!values || values.length < 6) continue;

        const [sku, name, description, category, unit, unit_price, cost_price, image_url, is_active] = values;

        if (!sku || !name || !unit_price) continue;

        productsToImport.push({
          sku,
          name,
          description: description || '',
          category: category || '',
          unit: unit || 'unit',
          unit_price: unit_price,
          cost_price: cost_price || null,
          image_url: image_url || null,
          is_active: is_active?.toLowerCase() === 'no' ? 'false' : 'true',
        });
      }

      if (productsToImport.length === 0) {
        alert('No valid products found in the file.');
        return;
      }

      try {
        setUploading(true);

        // Use bulk import function
        const { data, error } = await supabase.rpc('bulk_import_products', {
          p_products: productsToImport,
          p_file_name: file.name
        });

        if (error) throw error;

        const result = data as any;

        if (result.failed > 0) {
          alert(
            `Import completed with warnings:\n` +
            `✅ Successful: ${result.successful}\n` +
            `❌ Failed: ${result.failed}\n\n` +
            `Check console for error details.`
          );
          console.error('Import errors:', result.errors);
        } else {
          alert(`✅ Successfully imported ${result.successful} products!`);
        }

        loadProducts();
      } catch (error: any) {
        console.error('Error importing products:', error);
        alert('Failed to import products: ' + error.message);
      } finally {
        setUploading(false);
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      unit: product.unit || 'unit',
      unit_price: product.unit_price.toString(),
      cost_price: product.cost_price?.toString() || '',
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;
      alert('Product deleted successfully');
      loadProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product: ' + error.message);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-600 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-medium cursor-pointer transition-colors">
            <Upload className="w-5 h-5" />
            Import CSV
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleImportFromExcel}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                sku: '',
                name: '',
                description: '',
                category: '',
                unit: 'unit',
                unit_price: '',
                is_active: true,
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {canEditCost && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Finance: Add Cost Prices for Profit Tracking
          </h3>
          <p className="text-sm text-amber-800 mb-2">
            As a finance user, you have exclusive access to manage cost prices. This enables:
          </p>
          <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
            <li>Accurate profit margin calculations on all quotations</li>
            <li>CEO profit dashboard with real-time margin tracking</li>
            <li>Financial analytics and cost control</li>
          </ul>
          <p className="text-xs text-amber-700 mt-3 font-medium">
            💡 Click "Edit" on any product or add new products to set cost prices
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">CSV Import Format</h3>
        <p className="text-sm text-blue-800 mb-2">Your CSV file should have the following columns:</p>
        <code className="block bg-white px-3 py-2 rounded text-xs text-slate-900 overflow-x-auto">
          SKU,Name,Description,Category,Unit,Unit Price,{canEditCost ? 'Cost Price,' : ''}Active
        </code>
        <p className="text-xs text-blue-600 mt-2">
          Example: PROD001,"Office Chair","Ergonomic chair","Furniture",unit,299.99,{canEditCost ? '199.99,' : ''}Yes
        </p>
      </div>

      {products.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {products.length === 0 ? 'No Products Yet' : 'No Products Found'}
          </h3>
          <p className="text-slate-600 mb-6">
            {products.length === 0
              ? 'Start building your product catalog to use in quotations.'
              : 'Try adjusting your search terms'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {product.image_url && (
                <div className="mb-3">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              )}

              <h3 className="font-semibold text-slate-900 mb-1">{product.name}</h3>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {product.description || 'No description'}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">SKU:</span>
                  <span className="font-medium text-slate-900">{product.sku}</span>
                </div>
                {product.category && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Tag className="w-4 h-4" />
                    <span>{product.category}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-600">Unit Price</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(product.unit_price)}
                    </span>
                    <span className="text-xs text-slate-500">/ {product.unit}</span>
                  </div>
                </div>
                {canViewCost && product.cost_price && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-amber-600 font-medium">Cost Price</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-amber-700">
                        {formatCurrency(product.cost_price)}
                      </span>
                      <span className="text-xs text-amber-600">
                        ({((product.unit_price - product.cost_price) / product.unit_price * 100).toFixed(1)}% margin)
                      </span>
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      product.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Image
                  </label>
                  <div className="flex items-start gap-4">
                    {imagePreview || editingProduct?.image_url ? (
                      <div className="relative">
                        <img
                          src={imagePreview || editingProduct?.image_url || ''}
                          alt="Product preview"
                          className="w-32 h-32 object-cover rounded-lg border border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Choose Image
                      </label>
                      <p className="text-xs text-slate-500 mt-2">
                        PNG, JPG, WEBP up to 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="unit">Unit</option>
                    <option value="box">Box</option>
                    <option value="piece">Piece</option>
                    <option value="set">Set</option>
                    <option value="meter">Meter</option>
                    <option value="kg">Kilogram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unit Price *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => {
                        const value = validatePrice(e.target.value);
                        setFormData({ ...formData, unit_price: value.toString() });
                      }}
                      onBlur={(e) => {
                        if (!e.target.value || parseFloat(e.target.value) < 0) {
                          setFormData({ ...formData, unit_price: '0' });
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                {canEditCost && (
                  <div>
                    <label className="block text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                      Cost Price (Finance Only)
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                        Required for Profit Tracking
                      </span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 w-5 h-5" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_price}
                        onChange={(e) => {
                          const value = validatePrice(e.target.value);
                          setFormData({ ...formData, cost_price: value.toString() });
                        }}
                        onBlur={(e) => {
                          if (e.target.value && parseFloat(e.target.value) < 0) {
                            setFormData({ ...formData, cost_price: '0' });
                          }
                        }}
                        placeholder="Enter supplier cost"
                        className="w-full pl-10 pr-4 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50"
                      />
                    </div>
                    {formData.cost_price && formData.unit_price && (
                      <p className="text-xs text-amber-600 mt-1">
                        Margin: {((parseFloat(formData.unit_price) - parseFloat(formData.cost_price)) / parseFloat(formData.unit_price) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.value === 'active' })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
