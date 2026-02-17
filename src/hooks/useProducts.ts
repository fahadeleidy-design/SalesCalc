import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  unit_price: number;
  cost_price: number;
  unit: string;
  sku: string;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
  tax_rate: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all products
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
  });
}

/**
 * Fetch active products only
 */
export function useActiveProducts() {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
  });
}

/**
 * Fetch products by category
 */
export function useProductsByCategory(category: string) {
  return useQuery({
    queryKey: ['products', 'category', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!category,
  });
}

/**
 * Fetch a single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

/**
 * Search products by name or SKU
 */
export function useSearchProducts(searchTerm: string) {
  return useQuery({
    queryKey: ['products', 'search', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    enabled: searchTerm.length >= 2,
  });
}

/**
 * Fetch low stock products
 */
export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('stock_quantity', { ascending: true });

      if (error) throw error;

      // Filter client-side for column-to-column comparison
      const lowStockProducts = (data as Product[]).filter(
        p => p.stock_quantity <= (p.min_stock_level || 0)
      );

      return lowStockProducts;
    },
  });
}

/**
 * Create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
}

/**
 * Update an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.setQueryData(['products', data.id], data);
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });
}

/**
 * Delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });
}

/**
 * Update product stock
 */
export function useUpdateProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ stock_quantity: quantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.setQueryData(['products', data.id], data);
      toast.success('Stock updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stock: ${error.message}`);
    },
  });
}

// NEW HOOKS FOR ENHANCED FEATURES

export function useProductVariants(productId?: string) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductInventory(productId?: string, variantId?: string) {
  return useQuery({
    queryKey: ['product-inventory', productId, variantId],
    queryFn: async () => {
      let query = supabase
        .from('product_inventory')
        .select('*');

      if (productId) {
        query = query.eq('product_id', productId);
      }
      if (variantId) {
        query = query.eq('variant_id', variantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductPricingTiers(productId?: string) {
  return useQuery({
    queryKey: ['product-pricing-tiers', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_pricing_tiers')
        .select('*')
        .eq('product_id', productId!)
        .eq('is_active', true)
        .order('min_quantity', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductBundles(filters?: { isActive?: boolean }) {
  return useQuery({
    queryKey: ['product-bundles', filters],
    queryFn: async () => {
      let query = supabase
        .from('product_bundles')
        .select(`
          *,
          bundle_items:product_bundle_items(
            *,
            product:products(id, name, sku, unit_price, image_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProductAnalytics(productId?: string) {
  return useQuery({
    queryKey: ['product-analytics', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_analytics')
        .select('*')
        .eq('product_id', productId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
}

export function useProductRecommendations(productId?: string) {
  return useQuery({
    queryKey: ['product-recommendations', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_recommendations')
        .select(`
          *,
          recommended_product:products!product_recommendations_recommended_product_id_fkey(
            id, name, sku, unit_price, image_url, category
          )
        `)
        .eq('product_id', productId!)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductReviews(productId?: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          customer:customers(company_name)
        `)
        .eq('product_id', productId!)
        .order('review_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductAttachments(productId?: string) {
  return useQuery({
    queryKey: ['product-attachments', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_attachments')
        .select(`
          *,
          uploaded_by_profile:profiles!product_attachments_uploaded_by_fkey(full_name)
        `)
        .eq('product_id', productId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductSuppliers(productId?: string) {
  return useQuery({
    queryKey: ['product-suppliers', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_suppliers')
        .select('*')
        .eq('product_id', productId!)
        .order('is_preferred', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useProductPerformanceDashboard() {
  return useQuery({
    queryKey: ['product-performance-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_performance_dashboard')
        .select('*')
        .order('total_revenue', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useTopSellingProducts(limit: number = 20) {
  return useQuery({
    queryKey: ['top-selling-products', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('top_selling_products')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateProductVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variant: any) => {
      const { data, error } = await supabase
        .from('product_variants')
        .insert([variant])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
    },
  });
}

export function useCreateProductBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bundle, items }: { bundle: any; items: any[] }) => {
      // Create bundle
      const { data: bundleData, error: bundleError } = await supabase
        .from('product_bundles')
        .insert([bundle])
        .select()
        .single();

      if (bundleError) throw bundleError;

      // Create bundle items
      const itemsWithBundleId = items.map(item => ({
        ...item,
        bundle_id: bundleData.id,
      }));

      const { error: itemsError } = await supabase
        .from('product_bundle_items')
        .insert(itemsWithBundleId);

      if (itemsError) throw itemsError;

      return bundleData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-bundles'] });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data, error } = await supabase
        .from('product_inventory')
        .update({ quantity_available: quantity, last_restocked: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });
}

export function useCreateProductReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: any) => {
      const { data, error } = await supabase
        .from('product_reviews')
        .insert([review])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    },
  });
}

export function useUpdateProductAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.rpc('update_product_analytics', {
        p_product_id: productId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['product-performance-dashboard'] });
    },
  });
}

export function useCheckStockAvailability() {
  return useMutation({
    mutationFn: async ({ productId, variantId, quantity }: {
      productId: string;
      variantId?: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase.rpc('check_stock_availability', {
        p_product_id: productId,
        p_variant_id: variantId || null,
        p_quantity: quantity,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useGetVolumePrice() {
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const { data, error } = await supabase.rpc('get_volume_discount_price', {
        p_product_id: productId,
        p_quantity: quantity,
      });

      if (error) throw error;
      return data;
    },
  });
}
