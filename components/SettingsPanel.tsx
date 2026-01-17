'use client';

import { useEffect, useRef, useCallback } from 'react';
import { dashboardTheme } from '@/lib/dashboardTheme';
import { CustomDataSource } from '@/lib/types/customSource';
import { DashboardSection } from '@/lib/types';
import { DataSourcesTab } from './settings/DataSourcesTab';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  customSources: CustomDataSource[];
  sections: DashboardSection[];
  onSourceAdded: (sourceId: string, sectionId: string) => Promise<void>;
  onSourceRemoved: (sourceId: string) => Promise<void>;
  onSourceUpdated: () => void;
  onRefreshSources: () => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  customSources,
  sections,
  onSourceAdded,
  onSourceRemoved,
  onSourceUpdated,
  onRefreshSources,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    // Focus the close button when panel opens
    closeButtonRef.current?.focus();

    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Refresh sources when panel opens
  useEffect(() => {
    if (isOpen) {
      onRefreshSources();
    }
  }, [isOpen, onRefreshSources]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  };

  const panelStyle: React.CSSProperties = {
    width: '400px',
    maxWidth: '100vw',
    height: '100%',
    backgroundColor: dashboardTheme.colors.surface,
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideIn 0.2s ease-out',
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: `1px solid ${dashboardTheme.colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: dashboardTheme.colors.text,
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: dashboardTheme.colors.textMuted,
    transition: 'background-color 0.15s ease',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
      <div
        style={backdropStyle}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
      >
        <div ref={panelRef} style={panelStyle}>
          <div style={headerStyle}>
            <h2 id="settings-panel-title" style={titleStyle}>Settings</h2>
            <button
              ref={closeButtonRef}
              style={closeButtonStyle}
              onClick={onClose}
              aria-label="Close settings"
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = dashboardTheme.colors.surfaceAlt;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div style={contentStyle}>
            <DataSourcesTab
              customSources={customSources}
              sections={sections}
              onSourceAdded={onSourceAdded}
              onSourceRemoved={onSourceRemoved}
              onSourceUpdated={onSourceUpdated}
            />
          </div>
        </div>
      </div>
    </>
  );
}
