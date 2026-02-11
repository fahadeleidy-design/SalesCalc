import React, { useState } from 'react';
import {
  MapPin,
  Route,
  Navigation,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Truck,
  User,
  DollarSign
} from 'lucide-react';
import { useDeliveryRoutes, useRouteStops, useVehicles, useDrivers } from '../hooks/useLogistics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RoutePlanningPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);

  const { routes, loading, fetchRoutes, createRoute, updateRoute } = useDeliveryRoutes();
  const { stops, fetchStops } = useRouteStops(selectedRoute || undefined);
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const filteredRoutes = routes.filter(route => route.route_date === selectedDate);

  // KPIs
  const routeKPIs = {
    totalRoutes: filteredRoutes.length,
    planned: filteredRoutes.filter(r => r.status === 'planned').length,
    inProgress: filteredRoutes.filter(r => r.status === 'in_progress').length,
    completed: filteredRoutes.filter(r => r.status === 'completed').length,
    totalDistance: filteredRoutes.reduce((sum, r) => sum + (r.total_distance_km || 0), 0),
    totalStops: filteredRoutes.reduce((sum, r) => sum + r.stops_count, 0),
    completionRate: filteredRoutes.length > 0
      ? (filteredRoutes.filter(r => r.status === 'completed').length / filteredRoutes.length) * 100
      : 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStopStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'en_route':
        return <Navigation className="w-5 h-5 text-blue-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Route Planning</h1>
          <p className="text-gray-600 mt-1">Plan and optimize delivery routes for maximum efficiency</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              fetchRoutes({ date: e.target.value });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button
            onClick={() => setShowRouteModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Route
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Routes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{routeKPIs.totalRoutes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Route className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{routeKPIs.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Distance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{routeKPIs.totalDistance.toFixed(0)} km</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{routeKPIs.completionRate.toFixed(0)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Routes List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Routes for {format(new Date(selectedDate), 'MMM dd, yyyy')}
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="text-center py-8">
                <Route className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No routes for this date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredRoutes.map((route) => (
                  <div
                    key={route.id}
                    onClick={() => {
                      setSelectedRoute(route.id);
                      fetchStops(route.id);
                    }}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedRoute === route.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{route.route_number}</h3>
                        <p className="text-sm text-gray-600">{route.route_name}</p>
                      </div>
                      <Badge className={getStatusColor(route.status)}>
                        {route.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{route.stops_count} stops ({route.completed_stops} completed)</span>
                      </div>

                      {route.total_distance_km && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Route className="w-4 h-4" />
                          <span>{route.total_distance_km.toFixed(0)} km</span>
                        </div>
                      )}

                      {route.departure_time && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{route.departure_time}</span>
                        </div>
                      )}
                    </div>

                    {route.optimization_score && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <span className="text-xs text-gray-600">Optimization Score</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {route.optimization_score.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Route Details */}
        <div className="lg:col-span-2">
          {selectedRoute ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Route Details</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit Route
                  </Button>
                  <Button size="sm">
                    Start Route
                  </Button>
                </div>
              </div>

              {/* Route Info */}
              {(() => {
                const route = routes.find(r => r.id === selectedRoute);
                if (!route) return null;

                const vehicle = vehicles.find(v => v.id === route.vehicle_id);
                const driver = drivers.find(d => d.id === route.driver_id);

                return (
                  <div className="space-y-6">
                    {/* Assignment Info */}
                    <div className="grid grid-cols-2 gap-4">
                      {vehicle && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Truck className="w-4 h-4" />
                            <span>Vehicle</span>
                          </div>
                          <p className="font-semibold text-gray-900">{vehicle.vehicle_number}</p>
                          <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p>
                        </div>
                      )}

                      {driver && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <User className="w-4 h-4" />
                            <span>Driver</span>
                          </div>
                          <p className="font-semibold text-gray-900">{driver.full_name}</p>
                          <p className="text-sm text-gray-600">{driver.driver_code}</p>
                        </div>
                      )}
                    </div>

                    {/* Route Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Distance</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {route.total_distance_km?.toFixed(0) || '—'} km
                        </p>
                      </div>

                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {route.total_duration_minutes ? `${Math.floor(route.total_duration_minutes / 60)}h ${route.total_duration_minutes % 60}m` : '—'}
                        </p>
                      </div>

                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Est. Cost</p>
                        <p className="text-2xl font-bold text-green-600">
                          SAR {route.estimated_cost?.toFixed(2) || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Stops Timeline */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Stops</h3>
                      <div className="space-y-3">
                        {stops.length === 0 ? (
                          <div className="text-center py-8">
                            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No stops added yet</p>
                          </div>
                        ) : (
                          stops.map((stop, index) => (
                            <div
                              key={stop.id}
                              className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">
                                  {stop.stop_sequence}
                                </div>
                                {index < stops.length - 1 && (
                                  <div className="flex-1 w-px bg-gray-300 my-2"></div>
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{stop.customer_name}</h4>
                                    <p className="text-sm text-gray-600">{stop.address}</p>
                                  </div>
                                  {getStopStatusIcon(stop.status)}
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                  {stop.time_window_start && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      <span>{stop.time_window_start} - {stop.time_window_end}</span>
                                    </div>
                                  )}

                                  {stop.distance_from_previous_km && (
                                    <div className="flex items-center gap-1">
                                      <Route className="w-4 h-4" />
                                      <span>{stop.distance_from_previous_km.toFixed(1)} km</span>
                                    </div>
                                  )}

                                  <Badge className={getStatusColor(stop.status)}>
                                    {stop.status.replace('_', ' ')}
                                  </Badge>
                                </div>

                                {stop.delivery_notes && (
                                  <p className="text-sm text-gray-600 mt-2 italic">{stop.delivery_notes}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Route className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Route</h3>
              <p className="text-gray-600">Choose a route from the list to view details and stops</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
