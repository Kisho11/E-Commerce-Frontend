import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UiIcon from '../components/UiIcon';

function IndustryManagement() {
  const { authFetch } = useAuth();

  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newName, setNewName] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const flash = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const showDuplicateIndustryWarning = (name) => {
    const duplicateName = name.trim() || 'this industry';
    window.alert(`Warning: "${duplicateName}" already exists. Please use a unique industry name.`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/industries');
      if (!res.ok) throw new Error('Failed to load industries');
      setIndustries(await res.json());
    } catch {
      flash('error', 'Failed to load industries');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await authFetch('/admin/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, is_active: newActive }),
      });
      if (res.status === 409) { showDuplicateIndustryWarning(name); return; }
      if (!res.ok) throw new Error();
      setNewName('');
      setNewActive(true);
      flash('success', `Industry "${name}" added`);
      await load();
    } catch {
      flash('error', 'Failed to add industry');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (industry) => {
    setEditingId(industry.id);
    setEditName(industry.name);
    setEditActive(industry.is_active);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSave = async (id) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await authFetch(`/admin/industries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, is_active: editActive }),
      });
      if (res.status === 409) { showDuplicateIndustryWarning(name); return; }
      if (!res.ok) throw new Error();
      setEditingId(null);
      flash('success', 'Industry updated');
      await load();
    } catch {
      flash('error', 'Failed to update industry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/admin/industries/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDeleteConfirm(null);
      flash('success', 'Industry deleted');
      await load();
    } catch {
      flash('error', 'Failed to delete industry');
    }
  };

  const filtered = industries.filter((ind) =>
    ind.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
          <UiIcon name="tag" className="h-6 w-6" />
          Industry Management
        </h3>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Industry Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Restaurant, Hotel, Retail..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
            <input
              type="checkbox"
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary"
            />
            Active
          </label>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="bg-primary text-white px-5 py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {adding ? 'Adding…' : 'Add Industry'}
          </button>
        </form>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search industries…"
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Industry Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Slug</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      {searchQuery ? 'No industries match your search.' : 'No industries yet. Add one above.'}
                    </td>
                  </tr>
                )}
                {filtered.map((ind) => (
                  <tr key={ind.id} className="border-t border-gray-100 hover:bg-gray-50">
                    {editingId === ind.id ? (
                      <>
                        <td className="px-4 py-3" colSpan={2}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="flex items-center justify-center gap-1 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={editActive}
                              onChange={(e) => setEditActive(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary"
                            />
                            Active
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleSave(ind.id)}
                            disabled={saving || !editName.trim()}
                            className="text-sm font-semibold text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-gray-800">{ind.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{ind.slug}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            ind.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {ind.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-3">
                          <button
                            onClick={() => startEdit(ind)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(ind)}
                            className="text-sm font-semibold text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          {industries.length} {industries.length === 1 ? 'industry' : 'industries'} total
        </p>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-gray-800 mb-2">Delete Industry</h4>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.name}"</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IndustryManagement;
