import React, { useState, useMemo, useEffect } from 'react';
import { Check, X, Sparkles, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { SkillGrid } from '@/components/skills/SkillGrid';
import { usePatternStore } from '@/store/usePatternStore';
import { useShallow } from 'zustand/react/shallow';
import type { Skill } from '@constellation/shared';

export const Skills: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [generationFilter, setGenerationFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | ''>('');

  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const {
    pendingReview,
    hydratePending,
    approve,
    reject,
    triggerDetect,
  } = usePatternStore(useShallow((s) => ({
    pendingReview: s.pendingReview,
    hydratePending: s.hydratePending,
    approve: s.approve,
    reject: s.reject,
    triggerDetect: s.triggerDetect,
  })));

  // Fetch skills
  useEffect(() => {
    const fetchSkills = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/skills');
        if (!res.ok) throw new Error(`Failed to fetch skills: ${res.statusText}`);
        const data: Skill[] = await res.json();
        setAllSkills(data);
      } catch (err) {
        setError(String(err));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchSkills();
    void hydratePending();
  }, [hydratePending]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    return allSkills
      .filter((skill) => {
        const matchesSearch =
          skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          skill.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProvider = !providerFilter || skill.providerId === providerFilter;
        const matchesGeneration =
          generationFilter === '' || skill.generation === generationFilter;
        const matchesStatus = !statusFilter || skill.status === statusFilter;
        return matchesSearch && matchesProvider && matchesGeneration && matchesStatus;
      })
      .sort((a, b) => b.generation - a.generation);
  }, [allSkills, searchTerm, providerFilter, generationFilter, statusFilter]);

  const handleApprove = async (patternId: string) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await approve(patternId);
      // refresh skills so newly-crystallised one shows up
      const res = await fetch('/api/skills');
      if (res.ok) setAllSkills(await res.json());
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (patternId: string) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await reject(patternId);
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleManualDetect = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      await triggerDetect();
      await hydratePending();
    } catch (err) {
      setActionError(String(err));
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading skills...</div>;
  }

  if (error) {
    return <div className="text-center text-error py-8">Error: {error}</div>;
  }

  return (
    <PageShell
      title="Skill Inventory"
      subtitle="Flat card grid of all skills — with search and filters"
    >
      <div className="space-y-6">
        {/* Pending Patterns (CEO review queue) */}
        {pendingReview.length > 0 && (
          <section className="border border-accent-secondary/30 rounded-lg p-4 bg-accent-secondary/5">
            <header className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg flex items-center gap-2">
                <Sparkles size={16} className="text-accent-secondary" />
                Pending Patterns ({pendingReview.length})
              </h2>
              <button
                onClick={handleManualDetect}
                disabled={actionBusy}
                className="btn btn-xs btn-ghost gap-1"
              >
                <RefreshCw size={12} />
                Run detector
              </button>
            </header>
            {actionError && (
              <div className="text-error text-xs mb-2">{actionError}</div>
            )}
            <ul className="space-y-2">
              {pendingReview.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-bg-secondary/40 border border-border-primary/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-text-tertiary truncate">
                      {p.id}
                    </div>
                    <div className="text-sm">
                      freq <span className="font-semibold">{p.frequency}</span> ·{' '}
                      success{' '}
                      <span className="font-semibold">
                        {(p.successRate * 100).toFixed(0)}%
                      </span>{' '}
                      · avg tokens{' '}
                      <span className="font-semibold">{p.avgTokens}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={actionBusy}
                    className="btn btn-xs btn-success gap-1"
                  >
                    <Check size={12} />
                    Crystallise
                  </button>
                  <button
                    onClick={() => handleReject(p.id)}
                    disabled={actionBusy}
                    className="btn btn-xs btn-error btn-outline gap-1"
                  >
                    <X size={12} />
                    Reject
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Provider ID..."
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="number"
              placeholder="Generation..."
              value={generationFilter === '' ? '' : generationFilter}
              onChange={(e) => {
                const val = e.target.value;
                setGenerationFilter(val === '' ? '' : Number(val));
              }}
              className="input input-bordered w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="select select-bordered w-full"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px] flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setProviderFilter('');
                setGenerationFilter('');
                setStatusFilter('');
              }}
              className="btn btn-outline"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Skills Grid */}
        <div>
          <SkillGrid
            skills={filteredSkills}
            onSkillSelect={(skill) => {
              console.log('Skill selected:', skill);
            }}
          />
        </div>

        {/* Summary */}
        <div className="text-right text-text-tertiary text-sm">
          Showing {filteredSkills.length} of {allSkills.length} skills
        </div>
      </div>
    </PageShell>
  );
};