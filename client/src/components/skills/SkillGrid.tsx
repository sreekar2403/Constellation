import React from 'react';
import type { Skill } from '@constellation/shared';

interface SkillGridProps {
  skills: Skill[];
  onSkillSelect?: (skill: Skill) => void;
}

export const SkillGrid: React.FC<SkillGridProps> = ({ skills, onSkillSelect }) => {
  if (skills.length === 0) {
    return (
      <div className="col-span-full text-center py-8">
        No skills found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <div
          key={skill.id}
          className="skill-card border rounded-lg p-4 hover:border-accent-secondary cursor-pointer transition-colors"
          onClick={() => onSkillSelect?.(skill)}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
              <span className="text-accent-secondary font-bold">{skill.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="font-semibold text-accent-secondary">{skill.name}</h3>
              <p className="text-text-tertiary line-clamp-2">{skill.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="badge badge-outline">Gen {skill.generation}</span>
                <span className={
                  skill.status === 'active'
                    ? 'badge badge-success'
                    : 'badge badge-error'
                }>
                  {skill.status.toUpperCase()}
                </span>
                <span className="badge badge-outline">
                  Used {skill.usageCount}×
                </span>
                <span className="badge badge-outline">
                  Saved {skill.totalTokensSaved} tokens
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-text-tertiary">
            <strong>Provider:</strong> {skill.providerId}
          </div>
        </div>
      ))}
    </div>
  );
};