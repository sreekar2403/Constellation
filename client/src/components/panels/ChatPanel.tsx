import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui';
import { useProviderStore } from '../../store/useProviderStore';

export const ChatPanel: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { providers, fetchModels } = useProviderStore();
  const provider = providers[providerId ?? ''];

  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch models for the selected provider when providerId changes
  useEffect(() => {
    if (!providerId) {
      setModelOptions([]);
      setSelectedModel('');
      return;
    }
    setLoadingModels(true);
    fetchModels(providerId)
      .then((models) => {
        setModelOptions(models);
        // Optionally set default to first model if none selected
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0]);
        }
      })
      .finally(() => setLoadingModels(false));
  }, [providerId, fetchModels, selectedModel]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!providerId) return;

    const userMsg = { role: 'user' as const, text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/providers/${providerId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          model: selectedModel || undefined, // send model if selected
        }),
      });
      if (!res.ok) {
        // If 404, maybe endpoint not implemented; show friendly error
        if (res.status === 404) {
          throw new Error('Chat endpoint not implemented for this provider.');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      // Expect { response: string } or maybe { text: string }
      const reply = (data.response ?? data.text ?? '') as string;
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!providerId) {
    return (
      <div className="flex flex-col h-full p-4">
        <p className="text-text-tertiary">No provider selected.</p>
        <button
          onClick={() => navigate('/platforms')}
          className="mt-2 px-3 py-1 text-xs rounded bg-glass hover:bg-glass-elevated text-text-primary"
        >
          Go to Providers
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}
          >
            <div
              className={`rounded-lg px-3 py-2 ${msg.role === 'user'
                ? 'bg-accent-primary/20 text-text-primary'
                : 'bg-accent-secondary/20 text-text-primary'}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary"></span>
            <span className="text-xs text-text-tertiary">Thinking...</span>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1">
            Model (optional)
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50"
              disabled={loadingModels}
            >
              <option value="">-- default model --</option>
              {modelOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            {loadingModels && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-b-2 border-accent-primary"></span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-mono uppercase text-text-tertiary mb-1">
            Message
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded border border-border-primary bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            disabled={loading}
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={sendMessage}
          disabled={loading || loadingModels}
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};