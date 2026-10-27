import React, { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, AlertTriangle, CheckCircle, Edit, Save, X, Plus, RefreshCw, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { InventoryItem } from '../types';

const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'item-1', item_id: 'STL001', name: 'Carbon Steel Sheets', category: 'Finished Products', quantity: 2500, unit: 'tons', status: 'In Stock', min_threshold: 500, max_threshold: 5000, location: 'Warehouse A', supplier: 'Steel Supply Co.', cost_per_unit: 45000.00 },
  { id: 'item-2', item_id: 'STL002', name: 'Stainless Steel Rods', category: 'Finished Products', quantity: 180, unit: 'tons', status: 'Low Stock', min_threshold: 200, max_threshold: 1000, location: 'Warehouse B', supplier: 'Quality Steel Ltd.', cost_per_unit: 52000.00 },
  { id: 'item-3', item_id: 'STL003', name: 'Iron Ore', category: 'Raw Materials', quantity: 5000, unit: 'tons', status: 'In Stock', min_threshold: 1000, max_threshold: 10000, location: 'Storage Yard 1', supplier: 'Mining Corp', cost_per_unit: 8000.00 },
  { id: 'item-4', item_id: 'STL004', name: 'Alloy Steel Pipes', category: 'Finished Products', quantity: 50, unit: 'tons', status: 'Critical', min_threshold: 100, max_threshold: 800, location: 'Warehouse C', supplier: 'Pipe Industries', cost_per_unit: 55000.00 },
  { id: 'item-5', item_id: 'STL005', name: 'Steel Coils', category: 'Finished Products', quantity: 800, unit: 'tons', status: 'In Stock', min_threshold: 300, max_threshold: 2000, location: 'Warehouse A', supplier: 'Coil Manufacturing', cost_per_unit: 48000.00 },
  { id: 'item-6', item_id: 'RAW001', name: 'Coal', category: 'Raw Materials', quantity: 3500, unit: 'tons', status: 'In Stock', min_threshold: 1000, max_threshold: 8000, location: 'Coal Storage', supplier: 'Coal Mines Ltd.', cost_per_unit: 5000.00 },
  { id: 'item-7', item_id: 'RAW002', name: 'Limestone', category: 'Raw Materials', quantity: 2200, unit: 'tons', status: 'In Stock', min_threshold: 500, max_threshold: 5000, location: 'Storage Yard 2', supplier: 'Limestone Quarry', cost_per_unit: 3000.00 },
  { id: 'item-8', item_id: 'RAW003', name: 'Dolomite', category: 'Raw Materials', quantity: 1800, unit: 'tons', status: 'In Stock', min_threshold: 400, max_threshold: 4000, location: 'Storage Yard 3', supplier: 'Mineral Suppliers', cost_per_unit: 3500.00 },
];

const Inventory = () => {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(INITIAL_INVENTORY_ITEMS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    status: 'In Stock'
  });
  const [newItem, setNewItem] = useState({
    item_id: '',
    name: '',
    category: '',
    quantity: '',
    unit: 'tons',
    status: 'In Stock',
    min_threshold: '100',
    max_threshold: '10000',
    location: '',
    supplier: '',
    cost_per_unit: ''
  });
  const { user } = useAuth();

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn('Inventory: fetch notice:', fetchError.message);
        if (fetchError.message.includes('Could not find the table') || fetchError.code === '42P01') {
          setError('Inventory table not found in Supabase. Displaying local steel stock records.');
        } else {
          setError(`Supabase sync note: ${fetchError.message}`);
        }
      } else if (data && data.length > 0) {
        setInventoryData(data as InventoryItem[]);
      }
    } catch (err: unknown) {
      console.warn('Inventory: unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const handleSeedSampleData = async () => {
    setSeeding(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error: seedError } = await supabase
        .from('inventory')
        .upsert(INITIAL_INVENTORY_ITEMS, { onConflict: 'item_id' });

      if (seedError) {
        console.warn('Seed notice:', seedError.message);
        setInventoryData(INITIAL_INVENTORY_ITEMS);
        setSuccessMsg('Sample inventory loaded in current session.');
      } else {
        await fetchInventoryData();
        setSuccessMsg('Sample inventory synchronized to Supabase successfully.');
      }
    } catch {
      setInventoryData(INITIAL_INVENTORY_ITEMS);
      setSuccessMsg('Sample inventory loaded in current session.');
    } finally {
      setSeeding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'text-green-600 bg-green-100';
      case 'Low Stock': return 'text-yellow-600 bg-yellow-100';
      case 'Critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Stock': return <CheckCircle className="h-4 w-4" />;
      case 'Low Stock': return <TrendingUp className="h-4 w-4" />;
      case 'Critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({
      quantity: item.quantity,
      status: item.status
    });
  };

  const handleSave = async (id: string) => {
    try {
      setError(null);
      setSuccessMsg(null);

      // Optimistically update local state immediately
      setInventoryData(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, quantity: editForm.quantity, status: editForm.status }
            : item
        )
      );
      setEditingId(null);

      // If user is authenticated, sync to Supabase
      if (user) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: editForm.quantity,
            status: editForm.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.warn('Supabase update notice:', updateError.message);
          setSuccessMsg('Updated in current session (Supabase sync pending).');
        } else {
          setSuccessMsg('Inventory item updated successfully.');
        }
      } else {
        setSuccessMsg('Updated in current session. Log in to permanently sync changes.');
      }
    } catch (err) {
      console.error('Inventory: Error updating inventory:', err);
      setError('Failed to update inventory. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ quantity: 0, status: 'In Stock' });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const generatedId = `inv-${Date.now()}`;
    const cleanItemId = newItem.item_id.trim().toUpperCase() || `STL${Date.now().toString().slice(-4)}`;

    const newInventoryRecord: InventoryItem = {
      id: generatedId,
      item_id: cleanItemId,
      name: newItem.name.trim(),
      category: newItem.category || 'Raw Materials',
      quantity: parseInt(newItem.quantity) || 0,
      unit: newItem.unit || 'tons',
      status: newItem.status || 'In Stock',
      min_threshold: parseInt(newItem.min_threshold) || 100,
      max_threshold: parseInt(newItem.max_threshold) || 10000,
      location: newItem.location ? newItem.location.trim() : 'Warehouse',
      supplier: newItem.supplier ? newItem.supplier.trim() : 'RINL Stock',
      cost_per_unit: newItem.cost_per_unit ? parseFloat(newItem.cost_per_unit) : null,
      created_at: new Date().toISOString()
    };

    // 1. Immediately close the modal dialog and reset inputs so the box exits instantly
    setShowAddForm(false);
    setNewItem({
      item_id: '',
      name: '',
      category: '',
      quantity: '',
      unit: 'tons',
      status: 'In Stock',
      min_threshold: '100',
      max_threshold: '10000',
      location: '',
      supplier: '',
      cost_per_unit: ''
    });

    // 2. Always update local state immediately so user sees the item right away
    setInventoryData(prev => [newInventoryRecord, ...prev.filter(i => i.item_id !== cleanItemId)]);

    // 3. If user is logged in, sync to Supabase in the background
    if (user) {
      try {
        const { error: insertError } = await supabase
          .from('inventory')
          .insert([
            {
              item_id: newInventoryRecord.item_id,
              name: newInventoryRecord.name,
              category: newInventoryRecord.category,
              quantity: newInventoryRecord.quantity,
              unit: newInventoryRecord.unit,
              status: newInventoryRecord.status,
              min_threshold: newInventoryRecord.min_threshold,
              max_threshold: newInventoryRecord.max_threshold,
              location: newInventoryRecord.location,
              supplier: newInventoryRecord.supplier,
              cost_per_unit: newInventoryRecord.cost_per_unit
            }
          ]);

        if (insertError) {
          console.warn('Supabase insert notice:', insertError.message);
          setSuccessMsg(`Item "${newInventoryRecord.name}" added to session. Note: Supabase reported "${insertError.message}".`);
        } else {
          setSuccessMsg(`Item "${newInventoryRecord.name}" saved successfully.`);
          await fetchInventoryData();
        }
      } catch (insertErr) {
        console.warn('Supabase insert exception:', insertErr);
        setSuccessMsg(`Item "${newInventoryRecord.name}" added to current session.`);
      }
    } else {
      setSuccessMsg(`Item "${newInventoryRecord.name}" added to session. Log in to permanently persist items in Supabase.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-2">Track and manage steel materials and products</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchInventoryData}
              title="Refresh inventory"
              disabled={loading}
              className="p-2 border border-gray-300 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-200 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

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
              className="ml-4 text-xs text-amber-700 hover:text-amber-900 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-emerald-800 flex items-start justify-between">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 text-emerald-500 mt-0.5" />
              <div className="text-sm font-medium">{successMsg}</div>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="ml-4 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Inventory Item</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item ID</label>
                  <input
                    type="text"
                    value={newItem.item_id}
                    onChange={(e) => setNewItem({ ...newItem, item_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., STL006"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Structural Steel Beams"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select Category</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Finished Products">Finished Products</option>
                    <option value="Tools & Equipment">Tools & Equipment</option>
                    <option value="Spare Parts">Spare Parts</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Warehouse A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., RINL Internal Stock"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.cost_per_unit}
                    onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., 45000"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium"
                  >
                    Save Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventoryData.filter(item => item.status === 'In Stock').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventoryData.filter(item => item.status === 'Low Stock').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventoryData.filter(item => item.status === 'Critical').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Current Inventory</h3>
            <button
              onClick={handleSeedSampleData}
              disabled={seeding}
              className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300 px-3 py-1.5 rounded flex items-center space-x-1 transition-colors"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{seeding ? 'Loading sample...' : 'Reset Default Stock'}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventoryData.map((item) => (
                  <tr key={item.id || item.item_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      ) : (
                        `${item.quantity.toLocaleString()} ${item.unit}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === item.id ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="In Stock">In Stock</option>
                          <option value="Low Stock">Low Stock</option>
                          <option value="Critical">Critical</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingId === item.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(item.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-teal-600 hover:text-teal-900 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
