import React from 'react';

export const AboutTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 text-center">
        <h2 className="text-lg font-semibold mb-4">Constellation Agent OS</h2>
        <p className="text-text-tertiary">
          A 3D Neural-Visualization Cockpit for Multi-Agent CLI Orchestration
        </p>
        <div className="flex justify-center space-x-6 mt-6">
          <a
            href="https://github.com/your-org/constellation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-secondary hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://docs.constellation.os"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-secondary hover:underline"
          >
            Documentation
          </a>
          <a
            href="https://discord.gg/constellation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-secondary hover:underline"
          >
            Discord
          </a>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Version</h2>
        <p className="text-text-tertiary">
          v0.1.0 (Development Build)
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Credits</h2>
        <p className="text-text-tertiary">
          Built with React, Three.js, Tailwind CSS, and the Hermes Agent framework.
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">License</h2>
        <p className="text-text-tertiary">
          MIT License © 2026 Constellation Contributors
        </p>
      </div>
    </div>
  );
};