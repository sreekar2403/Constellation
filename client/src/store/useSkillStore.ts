/**
 * useSkillStore — Skill and SkillTrigger state.
 *
 * Hydrates from GET /api/skills on first render.
 * WebSocket: skill:created, skill:triggered.
 *
 * Skills are read-heavy; archiving is the only mutation exposed.
 */
import { create } from 'zustand';
import type { Skill, SkillTrigger } from '@constellation/shared';

interface SkillStore {
  skills: Record<string, Skill>;
  triggers: SkillTrigger[];
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  archiveSkill: (id: string) => Promise<Skill>;

  handleCreated: (payload: unknown) => void;
  handleTriggered: (payload: unknown) => void;

  _applySkill: (skill: Skill) => void;
  _appendTrigger: (trigger: SkillTrigger) => void;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: {},
  triggers: [],
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const [skillsRes, triggersRes] = await Promise.all([
        fetch('/api/skills'),
        fetch('/api/skills?triggers=true'), // fetch triggers separately if needed
      ]);
      if (!skillsRes.ok) throw new Error(`GET /api/skills failed: ${skillsRes.statusText}`);

      const skills: Skill[] = await skillsRes.json();
      set({
        skills: Object.fromEntries(skills.map((s) => [s.id, s])),
        loading: false,
      });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  _applySkill: (skill) =>
    set((s) => ({ skills: { ...s.skills, [skill.id]: skill } })),

  _appendTrigger: (trigger) =>
    set((s) => ({ triggers: [...s.triggers, trigger].slice(-500) })), // keep last 500

  archiveSkill: async (id) => {
    const res = await fetch(`/api/skills/${id}/archive`, { method: 'POST' });
    if (!res.ok) throw new Error(`POST /api/skills/${id}/archive failed`);
    const skill: Skill = await res.json();
    get()._applySkill(skill);
    return skill;
  },

  handleCreated: (payload) => {
    const data = (payload as { skill?: Skill })?.skill;
    if (data?.id) get()._applySkill(data);
  },

  handleTriggered: (payload) => {
    const data = payload as { trigger?: SkillTrigger; skill?: Skill };
    if (data.trigger) get()._appendTrigger(data.trigger);
    if (data.skill?.id) get()._applySkill(data.skill);
  },
}));