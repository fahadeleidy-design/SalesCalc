import React, { useState } from 'react';
import {
  Truck,
  Users,
  Wrench,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Fuel,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useVehicles, useDrivers, Vehicle, Driver } from '../hooks/useLogistics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabType = 'vehicles' | 'drivers' | 'maintenance';

export default function FleetManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const { vehicles, loading: vehiclesLoading, createVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const { drivers, loading: driversLoading, createDriver, updateDriver, deleteDriver } = useDrivers();

  const tabs = [
    { id: 'vehicles' as TabType, label: 'Vehicles', icon: Truck, count: vehicles.length },
    { id: 'drivers' as TabType, label: 'Drivers', icon: Users, count: drivers.length },
    { id: 'maintenance' as TabType, label: 'Maintenance', icon: Wrench, count: 0 },
  ];

  // Vehicle KPIs
  const vehicleKPIs = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    inUse: vehicles.filter(v => v.status === 'in_use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    totalCapacity: vehicles.reduce((sum, v) => sum + (v.capacity_kg || 0), 0),
    averageAge: vehicles.reduce((sum, v) => sum + (v.year ? new Date().getFullYear() - v.year : 0), 0) / vehicles.length || 0,
  };

  // Driver KPIs
  const driverKPIs = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    onLeave: drivers.filter(d => d.status === 'on_leave').length,
    averageRating: drivers.reduce((sum, d) => sum + d.safety_rating, 0) / drivers.length || 0,
    totalDeliveries: drivers.reduce((sum, d) => sum + d.total_deliveries, 0),
    onTimeRate: drivers.reduce((sum, d) => {
      const rate = d.total_deliveries > 0 ? (d.on_time_deliveries / d.total_deliveries) * 100 : 0;
      return sum + rate;
    }, 0) / drivers.length || 0,
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.driver_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in_use':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
      case 'suspended':
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-gray-600 mt-1">Manage vehicles, drivers, and maintenance schedules</p>
        </div>
        <Button
          onClick={() => {
            if (activeTab === 'vehicles') {
              setSelectedVehicle(null);
              setShowVehicleModal(true);
            } else if (activeTab === 'drivers') {
              setSelectedDriver(null);
              setShowDriverModal(true);
            }
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}
        </Button>
      </div>

      {/* KPI Cards */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{vehicleKPIs.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{vehicleKPIs.available}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Use</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{vehicleKPIs.inUse}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Capacity</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(vehicleKPIs.totalCapacity / 1000).toFixed(1)}t</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{driverKPIs.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Drivers</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{driverKPIs.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{driverKPIs.averageRating.toFixed(1)}/5</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On-Time Rate</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{driverKPIs.onTimeRate.toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              <Badge variant="secondary">{tab.count}</Badge>
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          {activeTab === 'vehicles' ? (
            <>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </>
          ) : (
            <>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </>
          )}
        </select>
      </div>

      {/* Content */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {vehiclesLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No vehicles found</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{vehicle.vehicle_number}</h3>
                    <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model} {vehicle.year}</p>
                  </div>
                  <Badge className={getStatusColor(vehicle.status)}>
                    {vehicle.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{vehicle.vehicle_type}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{vehicle.capacity_kg} kg / {vehicle.capacity_cbm} m³</span>
                  </div>

                  {vehicle.license_plate && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Plate:</span>
                      <span className="font-medium">{vehicle.license_plate}</span>
                    </div>
                  )}

                  {vehicle.fuel_type && (
                    <div className="flex items-center gap-2 text-sm">
                      <Fuel className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Fuel:</span>
                      <span className="font-medium capitalize">{vehicle.fuel_type}</span>
                    </div>
                  )}

                  {vehicle.next_maintenance_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Next Maintenance:</span>
                      <span className="font-medium">{format(new Date(vehicle.next_maintenance_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowVehicleModal(true);
                    }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this vehicle?')) {
                        deleteVehicle(vehicle.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {driversLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading drivers...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No drivers found</p>
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <Card key={driver.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{driver.full_name}</h3>
                    <p className="text-sm text-gray-600">{driver.driver_code}</p>
                  </div>
                  <Badge className={getStatusColor(driver.status)}>
                    {driver.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{driver.phone}</span>
                    </div>
                  )}

                  {driver.license_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">License:</span>
                      <span className="font-medium">{driver.license_number}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Safety Rating:</span>
                    <span className="font-medium text-yellow-600">{driver.safety_rating.toFixed(1)}/5.0</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Total Deliveries:</span>
                    <span className="font-medium">{driver.total_deliveries}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">On-Time:</span>
                    <span className="font-medium text-green-600">
                      {driver.total_deliveries > 0
                        ? ((driver.on_time_deliveries / driver.total_deliveries) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </div>

                  {driver.employment_type && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{driver.employment_type.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowDriverModal(true);
                    }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this driver?')) {
                        deleteDriver(driver.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <Card className="p-12 text-center">
          <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Maintenance Module</h3>
          <p className="text-gray-600">Vehicle maintenance tracking coming soon</p>
        </Card>
      )}
    </div>
  );
}
