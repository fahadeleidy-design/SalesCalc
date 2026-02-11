import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ==================== VEHICLES ====================

export interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: 'truck' | 'van' | 'trailer' | 'forklift' | 'crane';
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  ownership_type: 'owned' | 'leased' | 'contracted';
  capacity_kg?: number;
  capacity_cbm?: number;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  fuel_type?: 'diesel' | 'petrol' | 'electric' | 'hybrid';
  current_location?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  insurance_expiry?: string;
  registration_expiry?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  odometer_km?: number;
  acquisition_date?: string;
  acquisition_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('vehicle_number');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const createVehicle = async (vehicleData: Partial<Vehicle>) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Vehicle created successfully');
      await fetchVehicles();
      return data;
    } catch (error: any) {
      console.error('Error creating vehicle:', error);
      toast.error(error.message || 'Failed to create vehicle');
      throw error;
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Vehicle updated successfully');
      await fetchVehicles();
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      toast.error(error.message || 'Failed to update vehicle');
      throw error;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Vehicle deleted successfully');
      await fetchVehicles();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error(error.message || 'Failed to delete vehicle');
      throw error;
    }
  };

  return {
    vehicles,
    loading,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
}

// ==================== DRIVERS ====================

export interface Driver {
  id: string;
  driver_code: string;
  full_name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  certifications?: string[];
  employment_type: 'full_time' | 'part_time' | 'contracted';
  status: 'active' | 'on_leave' | 'suspended' | 'terminated';
  hire_date?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  safety_rating: number;
  total_deliveries: number;
  on_time_deliveries: number;
  incidents_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('driver_code');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const createDriver = async (driverData: Partial<Driver>) => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([driverData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Driver created successfully');
      await fetchDrivers();
      return data;
    } catch (error: any) {
      console.error('Error creating driver:', error);
      toast.error(error.message || 'Failed to create driver');
      throw error;
    }
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Driver updated successfully');
      await fetchDrivers();
    } catch (error: any) {
      console.error('Error updating driver:', error);
      toast.error(error.message || 'Failed to update driver');
      throw error;
    }
  };

  const deleteDriver = async (id: string) => {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Driver deleted successfully');
      await fetchDrivers();
    } catch (error: any) {
      console.error('Error deleting driver:', error);
      toast.error(error.message || 'Failed to delete driver');
      throw error;
    }
  };

  return {
    drivers,
    loading,
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
  };
}

// ==================== DELIVERY ROUTES ====================

export interface DeliveryRoute {
  id: string;
  route_number: string;
  route_name: string;
  vehicle_id?: string;
  driver_id?: string;
  route_date: string;
  departure_time?: string;
  planned_return_time?: string;
  actual_departure_time?: string;
  actual_return_time?: string;
  total_distance_km?: number;
  total_duration_minutes?: number;
  estimated_cost?: number;
  actual_cost?: number;
  stops_count: number;
  completed_stops: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  optimization_score?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  shipment_id?: string;
  stop_sequence: number;
  stop_type: 'pickup' | 'delivery' | 'return' | 'inspection';
  customer_name: string;
  address: string;
  contact_phone?: string;
  planned_arrival_time?: string;
  planned_departure_time?: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  time_window_start?: string;
  time_window_end?: string;
  distance_from_previous_km?: number;
  duration_from_previous_minutes?: number;
  status: 'pending' | 'en_route' | 'arrived' | 'completed' | 'failed' | 'skipped';
  failure_reason?: string;
  delivery_notes?: string;
  signature_captured: boolean;
  photo_captured: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeliveryRoutes() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = async (filters?: { date?: string; status?: string }) => {
    try {
      let query = supabase
        .from('delivery_routes')
        .select('*')
        .order('route_date', { ascending: false });

      if (filters?.date) {
        query = query.eq('route_date', filters.date);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const createRoute = async (routeData: Partial<DeliveryRoute>) => {
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert([routeData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Route created successfully');
      await fetchRoutes();
      return data;
    } catch (error: any) {
      console.error('Error creating route:', error);
      toast.error(error.message || 'Failed to create route');
      throw error;
    }
  };

  const updateRoute = async (id: string, updates: Partial<DeliveryRoute>) => {
    try {
      const { error } = await supabase
        .from('delivery_routes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Route updated successfully');
      await fetchRoutes();
    } catch (error: any) {
      console.error('Error updating route:', error);
      toast.error(error.message || 'Failed to update route');
      throw error;
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Route deleted successfully');
      await fetchRoutes();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast.error(error.message || 'Failed to delete route');
      throw error;
    }
  };

  return {
    routes,
    loading,
    fetchRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
  };
}

// ==================== ROUTE STOPS ====================

export function useRouteStops(routeId?: string) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStops = async (rid?: string) => {
    const targetId = rid || routeId;
    if (!targetId) return;

    try {
      const { data, error} = await supabase
        .from('route_stops')
        .select('*')
        .eq('route_id', targetId)
        .order('stop_sequence');

      if (error) throw error;
      setStops(data || []);
    } catch (error: any) {
      console.error('Error fetching stops:', error);
      toast.error('Failed to load stops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      fetchStops();
    }
  }, [routeId]);

  const createStop = async (stopData: Partial<RouteStop>) => {
    try {
      const { data, error } = await supabase
        .from('route_stops')
        .insert([stopData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Stop created successfully');
      await fetchStops(stopData.route_id);
      return data;
    } catch (error: any) {
      console.error('Error creating stop:', error);
      toast.error(error.message || 'Failed to create stop');
      throw error;
    }
  };

  const updateStop = async (id: string, updates: Partial<RouteStop>) => {
    try {
      const { error } = await supabase
        .from('route_stops')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Stop updated successfully');
      await fetchStops();
    } catch (error: any) {
      console.error('Error updating stop:', error);
      toast.error(error.message || 'Failed to update stop');
      throw error;
    }
  };

  const deleteStop = async (id: string) => {
    try {
      const { error } = await supabase
        .from('route_stops')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Stop deleted successfully');
      await fetchStops();
    } catch (error: any) {
      console.error('Error deleting stop:', error);
      toast.error(error.message || 'Failed to delete stop');
      throw error;
    }
  };

  return {
    stops,
    loading,
    fetchStops,
    createStop,
    updateStop,
    deleteStop,
  };
}

// ==================== WAREHOUSE TRANSFERS ====================

export interface WarehouseTransfer {
  id: string;
  transfer_number: string;
  from_location_id?: string;
  to_location_id?: string;
  transfer_date: string;
  requested_by?: string;
  approved_by?: string;
  shipped_by?: string;
  received_by?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  transfer_type: 'standard' | 'urgent' | 'return';
  shipping_cost: number;
  estimated_arrival_date?: string;
  actual_arrival_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseTransferItem {
  id: string;
  transfer_id: string;
  product_id?: string;
  product_name: string;
  quantity_requested: number;
  quantity_shipped: number;
  quantity_received: number;
  unit_cost?: number;
  condition_on_receipt?: 'good' | 'damaged' | 'partial';
  notes?: string;
  created_at: string;
}

export function useWarehouseTransfers() {
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async (status?: string) => {
    try {
      let query = supabase
        .from('warehouse_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransfers(data || []);
    } catch (error: any) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const createTransfer = async (transferData: Partial<WarehouseTransfer>, items: Partial<WarehouseTransferItem>[]) => {
    try {
      const { data: transfer, error: transferError } = await supabase
        .from('warehouse_transfers')
        .insert([transferData])
        .select()
        .single();

      if (transferError) throw transferError;

      const itemsWithTransferId = items.map(item => ({
        ...item,
        transfer_id: transfer.id,
      }));

      const { error: itemsError } = await supabase
        .from('warehouse_transfer_items')
        .insert(itemsWithTransferId);

      if (itemsError) throw itemsError;

      toast.success('Transfer created successfully');
      await fetchTransfers();
      return transfer;
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(error.message || 'Failed to create transfer');
      throw error;
    }
  };

  const updateTransfer = async (id: string, updates: Partial<WarehouseTransfer>) => {
    try {
      const { error } = await supabase
        .from('warehouse_transfers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Transfer updated successfully');
      await fetchTransfers();
    } catch (error: any) {
      console.error('Error updating transfer:', error);
      toast.error(error.message || 'Failed to update transfer');
      throw error;
    }
  };

  return {
    transfers,
    loading,
    fetchTransfers,
    createTransfer,
    updateTransfer,
  };
}

// ==================== CONTAINERS ====================

export interface Container {
  id: string;
  container_number: string;
  container_type: 'pallet' | 'crate' | 'box' | 'cage' | 'custom';
  dimensions_length_m?: number;
  dimensions_width_m?: number;
  dimensions_height_m?: number;
  max_weight_kg?: number;
  current_weight_kg: number;
  current_location_id?: string;
  status: 'empty' | 'loading' | 'loaded' | 'in_transit' | 'unloading' | 'damaged' | 'retired';
  ownership: 'owned' | 'rented' | 'customer';
  last_inspection_date?: string;
  condition: 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useContainers() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContainers = async (status?: string) => {
    try {
      let query = supabase
        .from('containers')
        .select('*')
        .order('container_number');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContainers(data || []);
    } catch (error: any) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const createContainer = async (containerData: Partial<Container>) => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .insert([containerData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Container created successfully');
      await fetchContainers();
      return data;
    } catch (error: any) {
      console.error('Error creating container:', error);
      toast.error(error.message || 'Failed to create container');
      throw error;
    }
  };

  const updateContainer = async (id: string, updates: Partial<Container>) => {
    try {
      const { error } = await supabase
        .from('containers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Container updated successfully');
      await fetchContainers();
    } catch (error: any) {
      console.error('Error updating container:', error);
      toast.error(error.message || 'Failed to update container');
      throw error;
    }
  };

  return {
    containers,
    loading,
    fetchContainers,
    createContainer,
    updateContainer,
  };
}

// ==================== DOCK DOORS ====================

export interface DockDoor {
  id: string;
  door_number: string;
  door_name: string;
  door_type: 'receiving' | 'shipping' | 'cross_dock' | 'standard';
  location?: string;
  max_vehicle_length_m?: number;
  has_dock_leveler: boolean;
  has_dock_seal: boolean;
  equipment_available?: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'closed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DockSchedule {
  id: string;
  dock_door_id?: string;
  carrier_id?: string;
  shipment_id?: string;
  purchase_order_id?: string;
  schedule_type: 'inbound' | 'outbound' | 'cross_dock';
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  check_in_time?: string;
  check_out_time?: string;
  driver_name?: string;
  vehicle_number?: string;
  status: 'scheduled' | 'checked_in' | 'loading' | 'unloading' | 'completed' | 'cancelled' | 'no_show';
  delay_minutes: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function useDockManagement() {
  const [dockDoors, setDockDoors] = useState<DockDoor[]>([]);
  const [schedules, setSchedules] = useState<DockSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDockDoors = async () => {
    try {
      const { data, error } = await supabase
        .from('dock_doors')
        .select('*')
        .order('door_number');

      if (error) throw error;
      setDockDoors(data || []);
    } catch (error: any) {
      console.error('Error fetching dock doors:', error);
      toast.error('Failed to load dock doors');
    }
  };

  const fetchSchedules = async (date?: string) => {
    try {
      let query = supabase
        .from('dock_schedules')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time_start', { ascending: true });

      if (date) {
        query = query.eq('scheduled_date', date);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDockDoors();
    fetchSchedules();
  }, []);

  const createSchedule = async (scheduleData: Partial<DockSchedule>) => {
    try {
      const { data, error } = await supabase
        .from('dock_schedules')
        .insert([scheduleData])
        .select()
        .single();

      if (error) throw error;
      toast.success('Schedule created successfully');
      await fetchSchedules();
      return data;
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast.error(error.message || 'Failed to create schedule');
      throw error;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<DockSchedule>) => {
    try {
      const { error } = await supabase
        .from('dock_schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Schedule updated successfully');
      await fetchSchedules();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast.error(error.message || 'Failed to update schedule');
      throw error;
    }
  };

  return {
    dockDoors,
    schedules,
    loading,
    fetchDockDoors,
    fetchSchedules,
    createSchedule,
    updateSchedule,
  };
}
