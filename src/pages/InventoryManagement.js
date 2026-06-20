import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import UiIcon from '../components/UiIcon';

const ROW_COUNT_OPTIONS = [50, 100, 200, 500, 1000, 2000];

const STATUS_COLORS = {
  Healthy: 'bg-green-100 text-green-800',
  'Low Stock': 'bg-yellow-100 text-yellow-800',
  'Out of Stock': 'bg-red-100 text-red-800',
};

const MOVEMENT_TYPE_COLORS = {
  receive: 'bg-green-100 text-green-700',
  sale: 'bg-red-100 text-red-700',
  return: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-gray-100 text-gray-600',
};

const MOVEMENT_TYPES = [
  { value: 'receive', label: 'Receive (stock in)' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Customer Return' },
  { value: 'sale', label: 'Manual Sale' },
];

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\w\s#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function SummaryCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-800',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color] ?? 'bg-gray-50 text-gray-700'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function InventoryManagement() {
  const { authFetch } = useAuth();
  const { products } = useProducts();

  const productMap = useMemo(
    () => new Map(products.flatMap((p) => [[p.id, p], [Number(p.id), p], [String(p.id), p]])),
    [products]
  );

  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  // Modals
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [settingsTarget, setSettingsTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  // Adjust form state
  const [adjustChange, setAdjustChange] = useState('');
  const [adjustType, setAdjustType] = useState('receive');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  const getInventoryProductName = useCallback(
    (inv) => inv?.product_name || productMap.get(inv?.product_id)?.name || `Product #${inv?.product_id || '-'}`,
    [productMap]
  );

  const flash = useCallback((type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  }, []);

  const loadSummary = useCallback(async () => {
    const res = await authFetch('/inventory/summary');
    if (res.ok) setSummary(await res.json());
  }, [authFetch]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const all = [];
      let p = 1;
      while (true) {
        const params = new URLSearchParams({
          page: String(p),
          per_page: '200',
        });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());

        const res = await authFetch(`/inventory/?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load inventory');
        const batch = await res.json();
        all.push(...batch);
        if (batch.length < 200) break;
        p++;
      }
      setInventory(all);
      await loadSummary();
    } catch {
      flash('error', 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [authFetch, flash, loadSummary, search, statusFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    const terms = normalizeSearchText(search).split(' ').filter(Boolean);
    return inventory.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (terms.length > 0) {
        const product = productMap.get(inv.product_id);
        const productName = inv.product_name || product?.name || '';
        const searchableText = normalizeSearchText([
          productName,
          inv.product_id,
          `#${inv.product_id}`,
          inv.location,
          inv.supplier,
          inv.status,
        ].join(' '));
        if (!terms.every((term) => searchableText.includes(term))) return false;
      }
      return true;
    });
  }, [inventory, statusFilter, search, productMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };
  const handleStatusChange = (e) => { setStatusFilter(e.target.value); setPage(1); };
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  // Adjust modal
  const handleAdjustOpen = (inv) => {
    setAdjustTarget(inv);
    setAdjustChange('');
    setAdjustType('receive');
    setAdjustReason('');
  };

  const adjustPreview = adjustTarget
    ? Math.max(0, (adjustTarget.on_hand || 0) + (parseInt(adjustChange, 10) || 0))
    : 0;

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const change = parseInt(adjustChange, 10);
    if (!adjustChange || isNaN(change) || change === 0) {
      flash('error', 'Enter a non-zero quantity change');
      return;
    }
    setAdjustSaving(true);
    try {
      const res = await authFetch(`/inventory/${adjustTarget.product_id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change,
          movement_type: adjustType,
          reason: adjustReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        flash('error', body.detail || 'Failed to adjust stock');
        return;
      }
      const updated = await res.json();
      setInventory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setAdjustTarget(null);
      flash('success', `Stock updated — ${updated.on_hand} on hand`);
      loadSummary().catch(() => {});
    } catch {
      flash('error', 'Failed to adjust stock');
    } finally {
      setAdjustSaving(false);
    }
  };

  // Settings modal
  const handleSettingsOpen = (inv) => {
    setSettingsTarget(inv);
    setSettingsForm({
      reorder_level: inv.reorder_level,
      reorder_qty: inv.reorder_qty,
      avg_daily_usage: inv.avg_daily_usage ?? '',
      location: inv.location ?? '',
      supplier: inv.supplier ?? '',
      lead_time_days: inv.lead_time_days,
    });
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const body = {
        reorder_level: Number(settingsForm.reorder_level),
        reorder_qty: Number(settingsForm.reorder_qty),
        avg_daily_usage: settingsForm.avg_daily_usage !== '' ? Number(settingsForm.avg_daily_usage) : null,
        location: settingsForm.location.trim() || null,
        supplier: settingsForm.supplier.trim() || null,
        lead_time_days: Number(settingsForm.lead_time_days),
      };
      const res = await authFetch(`/inventory/${settingsTarget.product_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setInventory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSettingsTarget(null);
      flash('success', 'Inventory settings saved');
    } catch {
      flash('error', 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const pagesWindow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (currentPage >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages];
  }, [totalPages, currentPage]);

  return (
    <div>
      {/* Flash */}
      {(error || success) && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="Total Products" value={summary.total_products.toLocaleString()} color="blue" />
          <SummaryCard label="Healthy" value={summary.healthy_count.toLocaleString()} color="green" />
          <SummaryCard label="Low Stock" value={summary.low_stock_count.toLocaleString()} color="yellow" />
          <SummaryCard label="Out of Stock" value={summary.out_of_stock_count.toLocaleString()} color="red" />
          <SummaryCard label="Total On Hand" value={summary.total_on_hand.toLocaleString()} color="purple" />
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <UiIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name, ID or location…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="Healthy">Healthy</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {ROW_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <button
          onClick={loadAll}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Refresh
        </button>
        {!loading && (
          <span className="ml-auto text-sm text-gray-500">
            Showing {pageRows.length} of {filtered.length} {search.trim() || statusFilter !== 'all' ? 'matching records' : 'records'}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-md">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading inventory…</div>
        ) : (
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">On Hand</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Reserved</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Available</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Reorder At</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Coverage</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-sm text-gray-400">
                    {search || statusFilter !== 'all'
                      ? 'No records match your filters.'
                      : 'No inventory records found.'}
                  </td>
                </tr>
              ) : pageRows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold leading-tight text-gray-800">
                        {getInventoryProductName(inv)}
                      </p>
                      <p className="text-xs text-gray-400">#{inv.product_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">{inv.on_hand}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{inv.reserved}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">{inv.available}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{inv.reorder_level}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{inv.location ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {inv.coverage_days != null ? `${inv.coverage_days}d` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAdjustOpen(inv)}
                          className="rounded px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => handleSettingsOpen(inv)}
                          className="rounded px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                        >
                          Settings
                        </button>
                        <button
                          onClick={() => setHistoryTarget(inv)}
                          className="rounded px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-gray-300 px-3 py-1.5 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            {pagesWindow.map((item, idx) =>
              item === '…' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-gray-400">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item)}
                  className={`rounded border px-3 py-1.5 ${currentPage === item ? 'border-primary bg-primary text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {item}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-gray-300 px-3 py-1.5 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Adjust Stock Modal ── */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Adjust Stock</h3>
              <p className="mt-0.5 text-sm text-gray-500">
                {getInventoryProductName(adjustTarget)}
              </p>
            </div>
            <form onSubmit={handleAdjustSubmit} className="space-y-4 px-6 py-5">
              {/* Current stock snapshot */}
              <div className="flex gap-6 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                <div>
                  <p className="text-gray-500">On Hand</p>
                  <p className="text-xl font-bold text-gray-800">{adjustTarget.on_hand}</p>
                </div>
                <div>
                  <p className="text-gray-500">Reserved</p>
                  <p className="text-xl font-bold text-gray-800">{adjustTarget.reserved}</p>
                </div>
                <div>
                  <p className="text-gray-500">Available</p>
                  <p className="text-xl font-bold text-gray-800">{adjustTarget.available}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Quantity Change
                </label>
                <p className="mb-2 text-xs text-gray-400">
                  Positive to add stock (+50), negative to reduce (−10)
                </p>
                <input
                  type="number"
                  value={adjustChange}
                  onChange={(e) => setAdjustChange(e.target.value)}
                  placeholder="e.g. 50 or -10"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
                {adjustChange !== '' && !isNaN(parseInt(adjustChange, 10)) && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    New on-hand will be:{' '}
                    <span className={`font-bold ${adjustPreview <= 0 ? 'text-red-600' : adjustPreview <= adjustTarget.reorder_level ? 'text-yellow-600' : 'text-green-700'}`}>
                      {adjustPreview}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Movement Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {MOVEMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Reason <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. New delivery from supplier"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {adjustSaving ? 'Applying…' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inventory Settings Modal ── */}
      {settingsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Inventory Settings</h3>
              <p className="mt-0.5 text-sm text-gray-500">
                {getInventoryProductName(settingsTarget)}
              </p>
            </div>
            <form onSubmit={handleSettingsSave} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Reorder Level</label>
                  <input
                    type="number" min="0"
                    value={settingsForm.reorder_level}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, reorder_level: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Trigger Low Stock alert below this</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Reorder Qty</label>
                  <input
                    type="number" min="1"
                    value={settingsForm.reorder_qty}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, reorder_qty: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Units to order per replenishment</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Avg Daily Usage</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={settingsForm.avg_daily_usage}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, avg_daily_usage: e.target.value }))}
                    placeholder="e.g. 2.5"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Used to calculate coverage days</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Lead Time (days)</label>
                  <input
                    type="number" min="1"
                    value={settingsForm.lead_time_days}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, lead_time_days: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Days from order to delivery</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Location</label>
                <input
                  type="text"
                  value={settingsForm.location}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Aisle 3, Shelf B"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Supplier</label>
                <input
                  type="text"
                  value={settingsForm.supplier}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, supplier: e.target.value }))}
                  placeholder="e.g. Acme Wholesale"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsTarget(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {settingsSaving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Movement History Modal ── */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Movement History</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {getInventoryProductName(historyTarget)}
                  {' · '}On hand: <span className="font-semibold text-gray-700">{historyTarget.on_hand}</span>
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {historyTarget.movements && historyTarget.movements.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Change</th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Before</th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">After</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyTarget.movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${MOVEMENT_TYPE_COLORS[m.movement_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {m.movement_type}
                          </span>
                        </td>
                        <td className={`py-2 pr-3 text-right font-bold ${m.qty_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-500">{m.qty_before}</td>
                        <td className="py-2 pr-3 text-right text-gray-500">{m.qty_after}</td>
                        <td className="py-2 pr-3 text-gray-500">{m.reason ?? '—'}</td>
                        <td className="py-2 text-gray-500">{m.actor ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-14 text-center text-sm text-gray-400">No movement history yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;
