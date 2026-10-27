import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, TrendingUp, BarChart3, PieChart, LineChart, Eye, Plus, Save, Factory, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProductionRecord } from '../types';

interface MonthlySummaryItem {
  month: string;
  production: number;
  target: number;
}

interface DailyTrendItem {
  day: string;
  efficiency: number;
}

const DEFAULT_MONTHLY_DATA: MonthlySummaryItem[] = [
  { month: 'Jan', production: 2400, target: 2500 },
  { month: 'Feb', production: 2600, target: 2500 },
  { month: 'Mar', production: 2300, target: 2500 },
  { month: 'Apr', production: 2700, target: 2500 },
  { month: 'May', production: 2500, target: 2500 },
  { month: 'Jun', production: 2800, target: 2500 },
];

const DEFAULT_DAILY_TREND: DailyTrendItem[] = [
  { day: 'Mon', efficiency: 94 },
  { day: 'Tue', efficiency: 96 },
  { day: 'Wed', efficiency: 92 },
  { day: 'Thu', efficiency: 98 },
  { day: 'Fri', efficiency: 95 },
  { day: 'Sat', efficiency: 93 },
  { day: 'Sun', efficiency: 89 },
];

const PRODUCTION_BREAKDOWN = [
  { name: 'Hot Rolled Coils', value: 35, color: '#0088FE' },
  { name: 'Cold Rolled Sheets', value: 25, color: '#00C49F' },
  { name: 'Wire Rods', value: 20, color: '#FFBB28' },
  { name: 'Structural Steel', value: 15, color: '#FF8042' },
  { name: 'Others', value: 5, color: '#8884D8' },
];

const DEFAULT_INSIGHTS = [
  'Production efficiency has improved by 3.2% compared to last month',
  'Hot Rolled Coils production is 12% above target for this quarter',
  'Weekend production efficiency drops by 6% on average - consider maintenance scheduling',
  'April showed the highest production output with 2,700 tons',
  'Wire Rods production line shows consistent performance with minimal variance'
];

const INITIAL_PRODUCTION_RECORDS: ProductionRecord[] = [
  {
    id: 'prod-1',
    date: new Date(Date.now() - 0 * 86400000).toISOString().split('T')[0],
    shift: 'Day',
    steel_production: 2650.0,
    molten_iron: 1980.0,
    efficiency: 96.5,
    quality_rate: 99.1,
    uptime_hours: 22.5,
    downtime_hours: 1.5,
    downtime_reason: 'Routine ladle inspection',
    energy_consumption: 15400,
    notes: 'Blast Furnace #2 optimal heat run'
  },
  {
    id: 'prod-2',
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    shift: 'Night',
    steel_production: 2520.0,
    molten_iron: 1890.0,
    efficiency: 95.0,
    quality_rate: 98.4,
    uptime_hours: 21.8,
    downtime_hours: 2.2,
    downtime_reason: 'Conveyor calibration',
    energy_consumption: 15100,
    notes: 'Hot strip mill normal operations'
  },
  {
    id: 'prod-3',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    shift: 'Day',
    steel_production: 2710.0,
    molten_iron: 2010.0,
    efficiency: 97.2,
    quality_rate: 99.3,
    uptime_hours: 23.0,
    downtime_hours: 1.0,
    downtime_reason: 'Minor sensor check',
    energy_consumption: 15650,
    notes: 'Exceeded target output for HR coils'
  },
  {
    id: 'prod-4',
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    shift: 'Night',
    steel_production: 2480.0,
    molten_iron: 1850.0,
    efficiency: 93.8,
    quality_rate: 98.0,
    uptime_hours: 21.5,
    downtime_hours: 2.5,
    downtime_reason: 'Slag gate adjustment',
    energy_consumption: 14950,
    notes: 'Standard wire rod feed rate'
  },
  {
    id: 'prod-5',
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    shift: 'Day',
    steel_production: 2590.0,
    molten_iron: 1940.0,
    efficiency: 95.8,
    quality_rate: 98.7,
    uptime_hours: 22.2,
    downtime_hours: 1.8,
    downtime_reason: 'Tundish changeover',
    energy_consumption: 15300,
    notes: 'Billet caster operating at capacity'
  }
];

const Production = () => {
  const [showInsights, setShowInsights] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [productionData, setProductionData] = useState<ProductionRecord[]>(INITIAL_PRODUCTION_RECORDS);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { user } = useAuth();

  const [updateForm, setUpdateForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'Day',
    steel_production: '2450',
    molten_iron: '1820',
    efficiency: '94.5',
    quality_rate: '98.5',
    uptime_hours: '22.0',
    downtime_hours: '2.0',
    downtime_reason: '',
    energy_consumption: '15200',
    notes: ''
  });

  const [monthlyData, setMonthlyData] = useState<MonthlySummaryItem[]>(DEFAULT_MONTHLY_DATA);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>(DEFAULT_DAILY_TREND);
  const [insights, setInsights] = useState<string[]>(DEFAULT_INSIGHTS);

  const updateChartsWithNewData = useCallback((data: ProductionRecord[]) => {
    if (data.length === 0) return;

    const monthlyProduction = data.reduce<Record<string, { month: string; production: number; target: number; count: number }>>((acc, item) => {
      const month = new Date(item.date).toLocaleDateString('en-US', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { month, production: 0, target: 2500, count: 0 };
      }
      acc[month].production += Number(item.steel_production) || 0;
      acc[month].count += 1;
      return acc;
    }, {});

    const updatedMonthlyData: MonthlySummaryItem[] = Object.values(monthlyProduction).map((item) => ({
      month: item.month,
      production: Math.round(item.production / (item.count || 1)),
      target: 2500
    }));

    if (updatedMonthlyData.length > 0) {
      setMonthlyData(updatedMonthlyData.slice(0, 6));
    }

    const recentWeekData = data.slice(0, 7).reverse();
    const updatedDailyTrend: DailyTrendItem[] = recentWeekData.map((item) => ({
      day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
      efficiency: Number(item.efficiency) || 0
    }));

    if (updatedDailyTrend.length > 0) {
      setDailyTrend(updatedDailyTrend);
    }
  }, []);

  const generateInsights = useCallback((data: ProductionRecord[]) => {
    if (data.length === 0) return;

    const newInsights: string[] = [];
    const avgEfficiency = data.reduce((sum, item) => sum + (Number(item.efficiency) || 0), 0) / data.length;
    newInsights.push(`Current average production efficiency is ${avgEfficiency.toFixed(1)}%`);

    const bestDay = data.reduce((best, current) =>
      (Number(current.efficiency) || 0) > (Number(best.efficiency) || 0) ? current : best
    );
    newInsights.push(`Best efficiency recorded: ${Number(bestDay.efficiency).toFixed(1)}% on ${new Date(bestDay.date).toLocaleDateString()}`);

    const totalProduction = data.reduce((sum, item) => sum + (Number(item.steel_production) || 0), 0);
    newInsights.push(`Total steel production in last ${data.length} records: ${totalProduction.toFixed(0)} tons`);

    const avgQuality = data.reduce((sum, item) => sum + (Number(item.quality_rate) || 0), 0) / data.length;
    newInsights.push(`Average quality rate maintained at ${avgQuality.toFixed(1)}%`);

    const totalDowntime = data.reduce((sum, item) => sum + (Number(item.downtime_hours) || 0), 0);
    newInsights.push(`Total downtime in recent operations: ${totalDowntime.toFixed(1)} hours`);

    setInsights(newInsights);
  }, []);

  const fetchProductionData = useCallback(async () => {
    try {
      setLoading(true);
      setNotice(null);

      const { data, error: fetchError } = await supabase
        .from('production')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (fetchError) {
        console.warn('Production fetch notice:', fetchError.message);
        if (fetchError.message.includes('Could not find the table') || fetchError.code === '42P01') {
          setNotice('Displaying benchmark steel plant metrics. Run the Supabase migration script to record persistent shifts.');
        } else {
          setNotice(`Notice: ${fetchError.message}`);
        }
      } else if (data && data.length > 0) {
        setProductionData(data as ProductionRecord[]);
        updateChartsWithNewData(data as ProductionRecord[]);
        generateInsights(data as ProductionRecord[]);
      }
    } catch (err: unknown) {
      console.warn('Production: fetch error:', err);
      setNotice('Displaying benchmark steel metrics.');
    } finally {
      setLoading(false);
    }
  }, [updateChartsWithNewData, generateInsights]);

  useEffect(() => {
    fetchProductionData();
  }, [fetchProductionData]);

  const handleUpdateProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSuccessMsg(null);

    const shiftRecord: ProductionRecord = {
      id: `prod-${Date.now()}`,
      date: updateForm.date,
      shift: updateForm.shift,
      steel_production: parseFloat(updateForm.steel_production) || 2400,
      molten_iron: parseFloat(updateForm.molten_iron) || 1800,
      efficiency: parseFloat(updateForm.efficiency) || 94,
      quality_rate: parseFloat(updateForm.quality_rate) || 98,
      uptime_hours: parseFloat(updateForm.uptime_hours) || 22,
      downtime_hours: parseFloat(updateForm.downtime_hours || '0'),
      downtime_reason: updateForm.downtime_reason || null,
      energy_consumption: updateForm.energy_consumption ? parseFloat(updateForm.energy_consumption) : null,
      notes: updateForm.notes || 'Normal operations',
      created_at: new Date().toISOString()
    };

    // 1. Immediately close the modal dialog so the box exits instantly
    setShowUpdateForm(false);

    // 2. Immediately update local state so user sees their shift in the table & charts
    const updatedList = [shiftRecord, ...productionData.filter(p => !(p.date === shiftRecord.date && p.shift === shiftRecord.shift))];
    setProductionData(updatedList);
    updateChartsWithNewData(updatedList);
    generateInsights(updatedList);

    // 3. If logged in, sync to Supabase in the background
    if (user) {
      try {
        const { error: insertError } = await supabase
          .from('production')
          .insert([
            {
              date: shiftRecord.date,
              shift: shiftRecord.shift,
              steel_production: shiftRecord.steel_production,
              molten_iron: shiftRecord.molten_iron,
              efficiency: shiftRecord.efficiency,
              quality_rate: shiftRecord.quality_rate,
              uptime_hours: shiftRecord.uptime_hours,
              downtime_hours: shiftRecord.downtime_hours,
              downtime_reason: shiftRecord.downtime_reason,
              energy_consumption: shiftRecord.energy_consumption,
              notes: shiftRecord.notes,
              operator_id: user.id
            }
          ]);

        if (insertError) {
          console.warn('Production insert notice:', insertError.message);
          setSuccessMsg(`Shift for ${shiftRecord.date} recorded in active session.`);
        } else {
          setSuccessMsg(`Shift for ${shiftRecord.date} saved to database successfully.`);
          await fetchProductionData();
        }
      } catch (err) {
        console.warn('Production insert exception:', err);
        setSuccessMsg(`Shift recorded in active session.`);
      }
    } else {
      setSuccessMsg(`Shift recorded in session. Log in to permanently save shifts to Supabase.`);
    }
  };

  const getCurrentStats = () => {
    if (productionData.length === 0) {
      return {
        dailyOutput: 2500,
        efficiency: 94.2,
        uptime: 22.1,
        qualityRate: 98.7
      };
    }

    const latest = productionData[0];
    return {
      dailyOutput: Number(latest.steel_production) || 2500,
      efficiency: Number(latest.efficiency) || 94.2,
      uptime: Number(latest.uptime_hours) || 22.1,
      qualityRate: Number(latest.quality_rate) || 98.7
    };
  };

  const stats = getCurrentStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Management</h1>
            <p className="text-gray-600 mt-2">Monitor and optimize steel production operations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchProductionData}
              title="Refresh production data"
              disabled={loading}
              className="p-2 border border-gray-300 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowUpdateForm(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors duration-200 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Daily Shift</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-800 flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 text-blue-500 mt-0.5" />
              <div className="text-sm">{notice}</div>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-xs text-blue-600 hover:text-blue-900 ml-4 font-medium"
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

        {/* Update Production Modal */}
        {showUpdateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Record Daily Production Shift</h3>
              <form onSubmit={handleUpdateProduction} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={updateForm.date}
                      onChange={(e) => setUpdateForm({ ...updateForm, date: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                    <select
                      value={updateForm.shift}
                      onChange={(e) => setUpdateForm({ ...updateForm, shift: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="Day">Day</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Steel Production (tons)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={updateForm.steel_production}
                      onChange={(e) => setUpdateForm({ ...updateForm, steel_production: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 2500.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Molten Iron (tons)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={updateForm.molten_iron}
                      onChange={(e) => setUpdateForm({ ...updateForm, molten_iron: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 1800.0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={updateForm.efficiency}
                      onChange={(e) => setUpdateForm({ ...updateForm, efficiency: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 94.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quality Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={updateForm.quality_rate}
                      onChange={(e) => setUpdateForm({ ...updateForm, quality_rate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 98.7"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uptime (hours)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={updateForm.uptime_hours}
                      onChange={(e) => setUpdateForm({ ...updateForm, uptime_hours: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 22.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Downtime (hours)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="24"
                      value={updateForm.downtime_hours}
                      onChange={(e) => setUpdateForm({ ...updateForm, downtime_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., 1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Downtime Reason (if any)</label>
                  <input
                    type="text"
                    value={updateForm.downtime_reason}
                    onChange={(e) => setUpdateForm({ ...updateForm, downtime_reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Scheduled maintenance on furnace #2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Energy Consumption (kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={updateForm.energy_consumption}
                    onChange={(e) => setUpdateForm({ ...updateForm, energy_consumption: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., 15000.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Shift observations..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center font-medium"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Production Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpdateForm(false)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Factory className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Daily Output</p>
                <p className="text-2xl font-bold text-gray-900">{stats.dailyOutput.toFixed(1)} tons</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{stats.efficiency.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uptime.toFixed(1)} hrs</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Quality Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.qualityRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Production Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-teal-600" />
                Monthly Production vs Target
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="production" fill="#0d9488" name="Actual Production (tons)" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target (tons)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Efficiency Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-teal-600" />
                Daily Efficiency Trend
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[85, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="efficiency" stroke="#0d9488" strokeWidth={3} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Production Breakdown and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Production Breakdown Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-teal-600" />
                Production Breakdown by Product
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={PRODUCTION_BREAKDOWN}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {PRODUCTION_BREAKDOWN.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Insights Panel */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-teal-600" />
                  Production Insights
                </h3>
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200"
                >
                  {showInsights ? 'Hide Insights' : 'Show Insights'}
                </button>
              </div>

              {showInsights ? (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="p-3 bg-teal-50 border-l-4 border-teal-500 rounded text-sm text-gray-700">
                      {insight}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Click "Show Insights" to view analytical recommendations</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Production Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recorded Production Shifts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Steel Output</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productionData.length > 0 ? (
                  productionData.slice(0, 10).map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.shift}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {Number(record.steel_production).toFixed(1)} tons
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Number(record.efficiency).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Number(record.quality_rate).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Number(record.uptime_hours).toFixed(1)} hrs
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {record.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                      No shift records logged yet. Click "Add Daily Shift" above to record today's production output.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Production;
