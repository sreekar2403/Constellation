import React, { useEffect, useState } from 'react';

interface DispatcherSettings {
  patternThreshold: number; // similarity threshold for detecting patterns (0-1)
  autoCrystallise: boolean; // automatically crystallize when success rate > 90%
  maxGenerations: number; // maximum skill generations allowed
  archivePolicy: string; // e.g., 'after_30_days', 'never', etc.
}

export const DispatcherTab: React.FC = () => {
  const [settings, setSettings] = useState<DispatcherSettings>({
    patternThreshold: 0.85,
    autoCrystallise: true,
    maxGenerations: 5,
    archivePolicy: 'after_30_days',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/dispatcher/settings');
        if (!res.ok) throw new Error(`Failed to fetch dispatcher settings: ${res.statusText}`);
        const data: DispatcherSettings = await res.json();
        setSettings(data);
      } catch (err) {
        setError(String(err));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleUpdateSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dispatcher/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`Failed to update dispatcher settings: ${res.statusText}`);
      alert('Dispatcher settings updated successfully');
    } catch (err) {
      setError(String(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-center text-error py-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Pattern Detection</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Pattern Similarity Threshold (τ)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.patternThreshold}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, patternThreshold: parseFloat(e.target.value) }));
                }}
                className="range range-primary"
              />
              <span className="text-xs font-mono">{settings.patternThreshold.toFixed(2)}</span>
            </div>
            <p className="text-text-tertiary text-sm mt-1">
              Minimum similarity score to consider a task observation as part of a pattern.
              Higher values mean stricter matching.
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Auto-Crystallisation</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                id="autoCrystallise"
                checked={settings.autoCrystallise}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, autoCrystallise: e.target.checked }));
                }}
                className="checkbox checkbox-primary"
              />
            </div>
            <div>
              <label htmlFor="autoCrystallise" className="cursor-pointer font-medium">
                Automatically crystallize skills when success rate is greater than 90%
              </label>
              <p className="text-xs text-text-tertiary">
                If enabled, the system will automatically create a new skill from a detected pattern
                when the pattern's success rate exceeds 90%. If disabled, you will be prompted for
                confirmation before crystallisation.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Skill Evolution Limits</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Maximum Skill Generations
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxGenerations}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, maxGenerations: parseInt(e.target.value) }));
              }}
              className="input input-bordered w-full"
            />
            <p className="text-text-tertiary text-sm mt-1">
              Prevents infinite evolution chains. A skill can only be mutated this many times
              before it is considered terminal.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Archive Policy
            </label>
            <select
              value={settings.archivePolicy}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, archivePolicy: e.target.value }));
              }}
              className="select select-bordered w-full"
            >
              <option value="after_30_days">Archive after 30 days of inactivity</option>
              <option value="after_60_days">Archive after 60 days of inactivity</option>
              <option value="never">Never archive automatically</option>
              <option value="manual">Manual archive only</option>
            </select>
            <p className="text-text-tertiary text-sm mt-1">
              Determines when skills are automatically archived due to inactivity.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleUpdateSettings}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};