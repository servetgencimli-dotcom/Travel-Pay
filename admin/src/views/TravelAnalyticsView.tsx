import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { Compass, MapPin, PieChart, Plane } from 'lucide-react';

export const TravelAnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getTravelAnalytics();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return <div className="p-8 text-xs text-slate-400">Loading travel analytics...</div>;
  }

  const { total_trips, trips_by_status, top_destinations, expenses_by_category } = data || {};

  return (
    <div className="p-8 space-y-8">
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Smart Tourism & Travel Analytics
          </h3>
          <p className="text-xs text-slate-400">Aggregated travel itineraries, top destinations, and categorical tourism spend.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Planned & Active Trips</span>
            <Plane className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{total_trips ?? 0}</div>
          <div className="text-xs text-slate-400">
            {trips_by_status?.length > 0
              ? trips_by_status.map((s: any) => `${s.status}: ${s.count}`).join(' • ')
              : 'Total student & user itineraries'}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Top Destinations</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm text-slate-300 font-mono space-y-1">
            {top_destinations?.length > 0 ? (
              top_destinations.map((d: any) => (
                <div key={d.destination_country} className="flex justify-between">
                  <span>{d.destination_country}</span>
                  <span className="text-emerald-400 font-bold">{d.trip_count} trips</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500 font-sans">Ready for trip creation in Phase 4</span>
            )}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Category Distribution</span>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            {expenses_by_category?.length > 0 ? (
              expenses_by_category.map((c: any) => (
                <div key={c.name} className="flex justify-between font-mono text-xs">
                  <span>{c.name}</span>
                  <span className="text-purple-400 font-bold">₼ {Number(c.total_amount).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500">Expense tracking ready for Phase 4</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
