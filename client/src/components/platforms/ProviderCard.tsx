import React, { useState } from 'react';
import {
  Server, Bot, Gem, Code2, Sparkles, MessageCircle, Moon,
  Loader2, CheckCircle2, XCircle, Wifi, WifiOff, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProviderType, ProviderCapability } from '@constellation/shared';
import { useProviderStore } from '../../store/useProviderStore';

/* ── Icon map ───────────────────────────────────────────────────────────────── */

export const PROVIDER_ICONS: Record<string, React.ComponentType<{
  size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties;
}>> = {
  Server,
  Bot,
  Gem,
  Code2,
  Sparkles,
  MessageCircle,
  Moon,
  Globe: Server,
  Terminal: Code2,
};

/* ── Capability pill colour ──────────────────────────────────────────────────── */

const CAP_COLOR: Record<string, string> = {
  'code-edit':        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'code-review':     'bg-amber-500/15   text-amber-400   border-amber-500/30',
  'terminal':        'bg-sky-500/15     text-sky-400     border-sky-500/30',
  'file-read':       'bg-violet-500/15  text-violet-400  border-violet-500/30',
  'file-write':      'bg-violet-500/15  text-violet-400  border-violet-500/30',
  'web-search':      'bg-blue-500/15    text-blue-400    border-blue-500/30',
  'image-gen':       'bg-pink-500/15    text-pink-400    border-pink-500/30',
  'long-context':    'bg-cyan-500/15    text-cyan-400    border-cyan-500/30',
  'streaming':       'bg-teal-500/15    text-teal-400    border-teal-500/30',
  'tool-use':        'bg-orange-500/15  text-orange-400  border-orange-500/30',
  'local-runtime':   'bg-green-500/15   text-green-400   border-green-500/30',
  'mcp':             'bg-rose-500/15    text-rose-400    border-rose-500/30',
  'plan-mode':       'bg-indigo-500/15  text-indigo-400  border-indigo-500/30',
  'cloud-runtime':   'bg-sky-500/15     text-sky-400     border-sky-500/30',
};

function CapPill({ cap }: { cap: ProviderCapability }) {
  const color = CAP_COLOR[cap] ?? 'bg-glass-elevated text-text-secondary border-border-primary';
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      {cap}
    </span>
  );
}

/* ── Status indicator ───────────────────────────────────────────────────────── */

function StatusDot({ live, error }: { live: boolean; error: boolean | string }) {
  if (error) return <XCircle size={12} className="text-red-400" />;
  if (live) return <Wifi size={12} className="text-emerald-400" />;
  return <WifiOff size={12} className="text-text-tertiary" />;
}

/* ── Props ───────────────────────────────────────────────────────────────────── */

export interface ProviderMeta {
  id: string;
  displayName: string;
  icon: string;
  brandColor: string;
  type: ProviderType;
  description: string;
  defaultEndpoint?: string;
  capabilities: ProviderCapability[];
  isLive: boolean;
  error: string | null;
}

interface ProviderCardProps {
  meta: ProviderMeta;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export const ProviderCard: React.FC<ProviderCardProps> = ({ meta }) => {
  const [connecting, setConnecting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const { providers, register } = useProviderStore();
  const navigate = useNavigate();

  // Merge: meta has static data + isLive; WS store has healthStatus
  const storeProvider = providers[meta.id];
  const live = storeProvider?.healthStatus === 'live' || meta.isLive;
  const error = storeProvider?.healthStatus === 'offline'
    ? (storeProvider as unknown as { _error?: string })._error ?? meta.error
    : meta.error;

  const Icon = PROVIDER_ICONS[meta.icon] ?? Bot;

  const handleConnect = async () => {
    if (live) {
      // Disconnect — call registry.disconnect() via DELETE endpoint
      try {
        setConnecting(true);
        setCardError(null);
        const res = await fetch(`/api/providers/${meta.id}/connect`, {
          method: 'DELETE',
        });
        if (!res.ok && res.status !== 204) {
          throw new Error(`HTTP ${res.status}`);
        }
        // WS event will fire: provider:disconnected → store updates → card re-renders
      } catch (e) {
        setCardError(String(e));
      } finally {
        setConnecting(false);
      }
      return;
    }

    try {
      setConnecting(true);
      setCardError(null);
      const res = await fetch('/api/providers/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meta.id }),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`HTTP ${res.status}`);
      }
      // WS event will update store + re-render this card
    } catch (e) {
      setCardError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="group relative bg-glass rounded-xl p-4 interactive-surface hover:bg-glass-elevated hover:border-accent-primary/30 transition-all duration-200 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Icon badge */}
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: `${meta.brandColor}18`,
            borderColor: `${meta.brandColor}40`,
          }}
        >
          <Icon
            size={18}
            strokeWidth={1.8}
            style={{ color: meta.brandColor }}
          />
        </div>

        {/* Name + type + description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">
              {meta.displayName}
            </span>
            <StatusDot live={live} error={!!error} />
            {/* Chat button */}
            <button
              onClick={() => navigate(`/chat/${meta.id}`)}
              disabled={!live}
              title="Chat with provider"
              className="ml-2 p-1 rounded hover:bg-glass-elevated"
            >
              <MessageCircle size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: meta.brandColor }}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
              {meta.type}
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed line-clamp-2">
            {meta.description}
          </p>
        </div>
      </div>

      {/* Capability pills */}
      <div className="flex flex-wrap gap-1">
        {meta.capabilities.slice(0, 6).map((cap) => (
          <CapPill key={cap} cap={cap} />
        ))}
        {meta.capabilities.length > 6 && (
          <span className="text-[9px] font-mono text-text-tertiary px-1.5 py-0.5">
            +{meta.capabilities.length - 6}
          </span>
        )}
      </div>

      {/* Error message */}
      {cardError && (
        <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
          {cardError}
        </div>
      )}

      {/* Endpoint for HTTP providers */}
      {meta.defaultEndpoint && meta.type === 'Local HTTP' && (
        <div className="text-[10px] font-mono text-text-tertiary truncate">
          {meta.defaultEndpoint}
        </div>
      )}

      {/* Footer row — connect button */}
      <div className="flex items-center justify-between pt-2 border-t border-border-primary mt-auto">
        <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          {live ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400">connected</span>
            </>
          ) : error ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="text-red-400">error</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
              <span>not connected</span>
            </>
          )}
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={
            live
              ? {
                  backgroundColor: `${meta.brandColor}15`,
                  border: `1px solid ${meta.brandColor}40`,
                  color: meta.brandColor,
                }
              : {
                  background: `linear-gradient(135deg, ${meta.brandColor}cc, ${meta.brandColor}66)`,
                  color: '#fff',
                  boxShadow: `0 0 12px ${meta.brandColor}40`,
                }
          }
        >
          {connecting ? (
            <Loader2 size={11} className="animate-spin" />
          ) : live ? (
            <span className="flex items-center gap-1">
              Disconnect <ChevronRight size={10} />
            </span>
          ) : (
            <span className="flex items-center gap-1">
              Connect
            </span>
          )}
        </button>
      </div>
    </div>
  );
}