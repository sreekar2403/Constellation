import React, { useEffect, useState } from 'react';

interface SkillSettings {
  similarityThreshold: number; // threshold for triggering a skill (0-1)
  maxGenerations: number; // maximum skill generations allowed
  archivePolicy: string; // e.g., 'after_30_days', 'never', etc.
}

export const SkillsTab: React.FC = () => {
  const [settings, setSettings] = useState<SkillSettings>({
    similarityThreshold: 0.85,
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
        const res = await fetch('/api/skills/settings');
        if (!res.ok) throw new Error(`Failed to fetch skill settings: ${res.statusText}`);
        const data: SkillSettings = await res.json();
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
      const res = await fetch('/api/skills/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`Failed to update skill settings: ${res.statusText}`);
      alert('Skill settings updated successfully');
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
        <h2 className="text-lg font-semibold mb-4">Skill Matching</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Skill Similarity Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.similarityThreshold}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    similarityThreshold: parseFloat(e.target.value),
                  }));
                }}
                className="range range-primary"
              />
              <span className="text-xs font-mono">{settings.similarityThreshold.toFixed(2)}</span>
            </div>
            <p className="text-text-tertiary text-sm mt-1">
              Minimum similarity score between a task and a skill's trigger for the skill to be
              considered a match. Higher values require closer matches.
            </p>
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