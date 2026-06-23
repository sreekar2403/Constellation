import React, { useEffect, useState } from 'react';

export const WorkspaceTab: React.FC = () => {
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPath, setNewPath] = useState<string>('');

  useEffect(() => {
    const fetchWorkspace = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/workspace');
        if (!res.ok) throw new Error(`Failed to fetch workspace: ${res.statusText}`);
        const data: { path: string } = await res.json();
        setWorkspacePath(data.path);
      } catch (err) {
        setError(String(err));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, []);

  const handleChangeWorkspace = async () => {
    if (!newPath.trim()) {
      alert('Please enter a valid path');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath }),
      });
      if (!res.ok) throw new Error(`Failed to update workspace: ${res.statusText}`);
      // Update the displayed path
      setWorkspacePath(newPath);
      setNewPath('');
      alert('Workspace updated successfully');
    } catch (err) {
      setError(String(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading workspace...</div>;
  }

  if (error) {
    return <div className="text-center text-error py-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Current Workspace</h2>
        <p className="text-text-tertiary break-all">{workspacePath || '(not set)'}</p>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Change Workspace</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter new workspace path (absolute)"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            className="input input-bordered w-full"
          />
          <div className="flex justify-end">
            <button
              onClick={handleChangeWorkspace}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Updating...' : 'Change Workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};