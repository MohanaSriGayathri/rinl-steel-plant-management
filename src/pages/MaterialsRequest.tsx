import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Search, Package, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, X, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MaterialRequest } from '../types';

const INITIAL_MATERIAL_REQUESTS: MaterialRequest[] = [
  {
    id: 'req-1',
    request_id: 'REQ1001',
    material: 'Iron Ore Pellets (65% Fe)',
    quantity: 5000,
    unit: 'tons',
    priority: 'Critical',
    status: 'Approved',
    request_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    required_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    estimated_delivery: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    notes: 'Required for Blast Furnace #2 charge'
  },
  {
    id: 'req-2',
    request_id: 'REQ1002',
    material: 'Premium Coking Coal',
    quantity: 3200,
    unit: 'tons',
    priority: 'High',
    status: 'In Transit',
    request_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    required_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    estimated_delivery: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    notes: 'Rake en route from Visakhapatnam port siding'
  },
  {
    id: 'req-3',
    request_id: 'REQ1003',
    material: 'Limestone Flux',
    quantity: 1800,
    unit: 'tons',
    priority: 'Medium',
    status: 'Pending',
    request_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    required_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    estimated_delivery: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    notes: 'SMS flux requirement batch 4'
  },
  {
    id: 'req-4',
    request_id: 'REQ1004',
    material: 'High Alumina Refractory Bricks',
    quantity: 500,
    unit: 'pieces',
    priority: 'High',
    status: 'Delivered',
    request_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    required_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    estimated_delivery: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    notes: 'Received and inspected at refractory stores'
  },
  {
    id: 'req-5',
    request_id: 'REQ1005',
    material: 'Ferro Manganese',
    quantity: 250,
    unit: 'tons',
    priority: 'Low',
    status: 'Pending',
    request_date: new Date().toISOString().split('T')[0],
    required_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    estimated_delivery: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    notes: 'Steel making alloy additive'
  }
];

const MaterialsRequest = () => {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>(INITIAL_MATERIAL_REQUESTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { user } = useAuth();

  const [newRequest, setNewRequest] = useState({
    material: '',
    quantity: '',
    unit: 'tons',
    priority: 'Medium',
    required_date: '',
    notes: ''
  });

  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState<MaterialRequest | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('material_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn('Material requests notice:', fetchError.message);
        if (fetchError.message.includes('Could not find the table') || fetchError.code === '42P01') {
          setError('Displaying benchmark steel requisitions. Run the migration script in Supabase to sync live database records.');
        } else {
          setError(`Supabase notice: ${fetchError.message}`);
        }
      } else if (data && data.length > 0) {
        setRequests(data as MaterialRequest[]);
      }
    } catch (err: unknown) {
      console.warn('Material requests fetch error:', err);
      setError('Displaying benchmark steel material requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'In Transit': return 'text-blue-600 bg-blue-100';
      case 'Delivered': return 'text-purple-600 bg-purple-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'In Transit': return <Package className="h-4 w-4" />;
      case 'Delivered': return <CheckCircle className="h-4 w-4" />;
      case 'Rejected': return <XCircle className="h-4 w-4" />;
      default: return <ClipboardList className="h-4 w-4" />;
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const generatedNum = Math.floor(1000 + Math.random() * 9000);
    const requestId = `REQ${generatedNum}`;
    const estimatedDelivery = newRequest.required_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const localRecord: MaterialRequest = {
      id: `req-local-${Date.now()}`,
      request_id: requestId,
      material: newRequest.material,
      quantity: parseInt(newRequest.quantity) || 1,
      unit: newRequest.unit,
      priority: newRequest.priority,
      status: 'Pending',
      request_date: new Date().toISOString().split('T')[0],
      required_date: newRequest.required_date || null,
      estimated_delivery: estimatedDelivery,
      notes: newRequest.notes || null,
      created_at: new Date().toISOString()
    };

    // 1. Immediately close the modal dialog and reset form so the box exits instantly
    setShowNewRequest(false);
    setNewRequest({
      material: '',
      quantity: '',
      unit: 'tons',
      priority: 'Medium',
      required_date: '',
      notes: ''
    });

    // 2. Immediately update local state
    setRequests(prev => [localRecord, ...prev]);

    // 3. If user is authenticated, sync to Supabase in the background
    if (user) {
      try {
        const { error: insertError } = await supabase
          .from('material_requests')
          .insert([
            {
              request_id: requestId,
              material: localRecord.material,
              quantity: localRecord.quantity,
              unit: localRecord.unit,
              priority: localRecord.priority,
              status: 'Pending',
              request_date: localRecord.request_date,
              required_date: localRecord.required_date,
              estimated_delivery: estimatedDelivery,
              notes: localRecord.notes,
              user_id: user.id
            }
          ]);

        if (insertError) {
          console.warn('Material request sync notice:', insertError.message);
          setSuccessMsg(`Request #${requestId} for ${localRecord.material} created in session.`);
        } else {
          setSuccessMsg(`Request #${requestId} for ${localRecord.material} saved successfully.`);
          await fetchRequests();
        }
      } catch (insertErr) {
        console.warn('Material request insert exception:', insertErr);
        setSuccessMsg(`Request #${requestId} created in current session.`);
      }
    } else {
      setSuccessMsg(`Request #${requestId} created in guest session. Log in to persist across devices.`);
    }
  };

  const handleTrackRequest = () => {
    setTrackingError(null);
    if (!trackingId.trim()) {
      setTrackingError('Please enter a Request ID (e.g., REQ1001).');
      setTrackingResult(null);
      return;
    }

    const trimmed = trackingId.trim().toUpperCase();
    const found = requests.find(req => req.request_id.toUpperCase() === trimmed);
    if (found) {
      setTrackingResult(found);
      setTrackingError(null);
    } else {
      setTrackingResult(null);
      setTrackingError(`No material request found with ID "${trackingId.trim()}". Try REQ1001 or REQ1002.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Materials Request</h1>
            <p className="text-gray-600 mt-2">Manage raw material procurement and internal requisitions</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchRequests}
              disabled={loading}
              title="Refresh requests"
              className="p-2 border border-gray-300 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewRequest(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-200 shadow-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </button>
          </div>
        </div>

        {/* Guest Mode Informational Banner */}
        {!user && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-700 flex items-center justify-between">
            <div className="flex items-center">
              <Info className="h-5 w-5 mr-3 flex-shrink-0 text-blue-500" />
              <p className="text-sm">
                Viewing in guest exploration mode. You can create requests and test tracking in this session. <a href="/login" className="underline font-semibold hover:text-blue-900">Sign in</a> to permanently persist requests in Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Notice Banner */}
        {error && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-amber-800 flex items-start justify-between">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Notice</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-xs text-amber-700 hover:text-amber-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded text-green-700 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 text-green-500" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="ml-4 text-xs text-green-700 hover:text-green-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* New Request Modal */}
        {showNewRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Material Request</h3>
                <button onClick={() => setShowNewRequest(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                  <select
                    value={newRequest.material}
                    onChange={(e) => setNewRequest({ ...newRequest, material: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select Material</option>
                    <option value="Iron Ore Pellets">Iron Ore Pellets</option>
                    <option value="Coking Coal">Coking Coal</option>
                    <option value="Limestone Flux">Limestone Flux</option>
                    <option value="Dolomite">Dolomite</option>
                    <option value="Ferro Manganese">Ferro Manganese</option>
                    <option value="Refractory Bricks">Refractory Bricks</option>
                    <option value="Scrap Metal">Scrap Metal</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={newRequest.quantity}
                      onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={newRequest.unit}
                      onChange={(e) => setNewRequest({ ...newRequest, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="tons">Tons</option>
                      <option value="kg">Kilograms</option>
                      <option value="pieces">Pieces</option>
                      <option value="meters">Meters</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required By Date</label>
                  <input
                    type="date"
                    value={newRequest.required_date}
                    onChange={(e) => setNewRequest({ ...newRequest, required_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Specifications</label>
                  <textarea
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Specify target blast furnace or quality specs..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium"
                  >
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewRequest(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tracking Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Search className="h-5 w-5 mr-2 text-teal-600" />
            Track Material Requisition
          </h3>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              placeholder="Enter Request ID (e.g., REQ1001, REQ1002)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              onClick={handleTrackRequest}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md transition-colors duration-200 font-medium"
            >
              Track
            </button>
          </div>

          {trackingError && (
            <p className="mt-3 text-sm text-red-600 font-medium">{trackingError}</p>
          )}

          {trackingResult && (
            <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Request Details ({trackingResult.request_id})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Material:</span> {trackingResult.material}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Quantity:</span> {trackingResult.quantity} {trackingResult.unit}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trackingResult.status)}`}>
                    {getStatusIcon(trackingResult.status)}
                    <span className="ml-1">{trackingResult.status}</span>
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Est. Delivery:</span> {trackingResult.estimated_delivery || 'TBD'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Priority:</span>{' '}
                  <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                    {trackingResult.priority}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Request Date:</span> {new Date(trackingResult.request_date).toLocaleDateString()}
                </div>
              </div>
              {trackingResult.notes && (
                <div className="mt-3 text-sm">
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="text-gray-600 mt-0.5">{trackingResult.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClipboardList className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(req => req.status === 'Pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(req => req.status === 'Approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(req => req.status === 'In Transit').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Active Material Requisitions</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {requests.length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Delivery
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id || request.request_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">
                      {request.request_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {request.material}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.quantity.toLocaleString()} {request.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        request.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        request.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.request_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.estimated_delivery ? new Date(request.estimated_delivery).toLocaleDateString() : 'TBD'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {requests.length === 0 && (
            <div className="text-center py-12 px-4">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium">No material requests found.</p>
              <p className="text-gray-500 text-sm mt-1">Create your first request to initiate raw material requisitions.</p>
              <button
                onClick={() => setShowNewRequest(true)}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md transition-colors duration-200 text-sm inline-flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Create Request</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialsRequest;
