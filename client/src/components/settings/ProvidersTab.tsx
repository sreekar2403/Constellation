import React, { useEffect, useState } from 'react';
import type { ProviderConfig } from '@constellation/shared';

export const ProvidersTab: React.FC = () => {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProvider, setEditedProvider] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/providers');
        if (!res.ok) throw new Error(`Failed to fetch providers: ${res.statusText}`);
        const data: ProviderConfig[] = await res.json();
        setProviders(data);
      } catch (err) {
        setError(String(err));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading providers...</div>;
  }

  if (error) {
    return <div className="text-center text-error py-8">Error: {error}</div>;
  }

  const handleStartEdit = (provider: ProviderConfig) => {
    setEditingId(provider.id);
    setEditedProvider({ ...provider });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedProvider(null);
  };

  const handleSaveEdit = async () => {
    if (!editedProvider) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${editedProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProvider),
      });
      if (!res.ok) throw new Error(`Failed to update provider: ${res.statusText}`);
      const updated: ProviderConfig = await res.json();
      // Update the list
      setProviders(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      );
      setEditingId(null);
      setEditedProvider(null);
      alert('Provider updated successfully');
    } catch (err) {
      setError(String(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Provider List</h2>
        {providers.length === 0 ? (
          <p className="text-center text-text-tertiary py-4">No providers configured.</p>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="border rounded-lg p-4"
                {...(editingId === provider.id ? {} : { onClick: () => handleStartEdit(provider) })}
                style={{ cursor: editingId === provider.id ? 'default' : 'pointer' }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
                    {/* We can use the provider's icon, but for now we'll use the first letter */}
                    <span className="text-accent-secondary font-bold">
                      {provider.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-accent-secondary">{provider.displayName}</h3>
                    <p className="text-text-tertiary line-clamp-2">
                      {provider.type} • {provider.id}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="badge badge-outline">
                        {provider.type}
                      </span>
                      <span className={
                        provider.healthStatus === 'live'
                          ? 'badge badge-success'
                          : provider.healthStatus === 'idle'
                            ? 'badge badge-warning'
                            : 'badge badge-error'
                      }>
                        {provider.healthStatus}
                      </span>
                    </div>
                  </div>
                </div>
                {editingId === provider.id ? (
                  <div className="mt-4 pt-4 border-t border-border-secondary">
                    <h4 className="font-medium mb-2">Edit Provider</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={editedProvider?.displayName || ''}
                          onChange={(e) => {
                            setEditedProvider(prev =>
                              prev ? { ...prev, displayName: e.target.value } : null
                            );
                          }}
                          className="input input-bordered w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Binary Path
                        </label>
                        <input
                          type="text"
                          value={editedProvider?.binary || ''}
                          onChange={(e) => {
                            setEditedProvider(prev =>
                              prev ? { ...prev, binary: e.target.value } : null
                            );
                          }}
                          className="input input-bordered w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Arguments (space-separated)
                        </label>
                        <input
                          type="text"
                          value={editedProvider?.args?.join(' ') || ''}
                          onChange={(e) => {
                            setEditedProvider(prev =>
                              prev
                                ? {
                                    ...prev,
                                    args: e.target.value.trim().split(' ').filter(Boolean),
                                  }
                                : null
                            );
                          }}
                          className="input input-bordered w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Environment Variables (KEY=VALUE, one per line)
                        </label>
                        <textarea
                          value={
                            editedProvider?.env
                              ? Object.entries(editedProvider.env)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join('\n')
                              : ''
                          }
                          onChange={(e) => {
                            const lines = e.target.value
                              .split('\n')
                              .map((line) => line.trim())
                              .filter((line) => line.length > 0);
                            const envObj: Record<string, string> = {};
                            lines.forEach((line) => {
                              const [key, value] = line.split('=');
                              if (key && value !== undefined) {
                                envObj[key] = value;
                              }
                            });
                            setEditedProvider(prev =>
                              prev ? { ...prev, env: envObj } : null
                            );
                          }}
                          className="textarea textarea-bordered w-full"
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-outline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="btn btn-primary"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => handleStartEdit(provider)}
                      className="btn btn-xs btn-outline"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};