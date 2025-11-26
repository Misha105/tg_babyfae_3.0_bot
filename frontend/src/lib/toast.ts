/**
 * Toast notification system for Telegram Mini App
 * - Slides in from the right
 * - Respects Telegram safe areas
 * - Uses app's design system (slate colors, rounded corners, backdrop blur)
 * - Includes haptic feedback
 */

interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

// Icon SVGs for each toast type
const ICONS = {
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

// Colors matching app design system
const COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', icon: '#10b981', text: '#6ee7b7' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', icon: '#ef4444', text: '#fca5a5' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6', text: '#93c5fd' },
};

class ToastManager {
  private container: HTMLDivElement | null = null;
  private activeToasts: Set<HTMLDivElement> = new Set();
  private styleInjected = false;

  private injectStyles() {
    if (this.styleInjected) return;
    
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes toastSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
    this.styleInjected = true;
  }

  private ensureContainer() {
    if (!this.container) {
      this.injectStyles();
      
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      // Position: top-right, below Telegram header with safe area
      // Using CSS variable for safe area top
      this.container.style.cssText = `
        position: fixed;
        top: calc(3.5rem + var(--tg-safe-area-top, 0px));
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
        max-width: calc(100vw - 2rem);
        width: 320px;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private triggerHaptic(type: 'success' | 'error' | 'info') {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'success') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } else if (type === 'error') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      }
    } catch {
      // Haptic feedback not available
    }
  }

  show(message: string, options: ToastOptions = {}) {
    const { duration = 3000, type = 'info' } = options;
    
    this.triggerHaptic(type);
    
    const container = this.ensureContainer();
    const toast = document.createElement('div');
    const colors = COLORS[type];
    
    // Toast container with app design system
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: ${colors.bg};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid ${colors.border};
      color: white;
      padding: 0.875rem 1rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      animation: toastSlideIn 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      pointer-events: auto;
      max-width: 100%;
      word-wrap: break-word;
    `;
    
    // Icon wrapper
    const iconWrapper = document.createElement('div');
    iconWrapper.style.cssText = `
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${colors.icon};
    `;
    iconWrapper.innerHTML = ICONS[type];
    
    // Message text
    const messageSpan = document.createElement('span');
    messageSpan.style.cssText = `
      flex: 1;
      color: ${colors.text};
      line-height: 1.4;
    `;
    messageSpan.textContent = message;
    
    toast.appendChild(iconWrapper);
    toast.appendChild(messageSpan);
    
    container.appendChild(toast);
    this.activeToasts.add(toast);
    
    // Auto remove with slide-out animation
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.activeToasts.delete(toast);
      }, 250);
    }, duration);
  }

  success(message: string, duration?: number) {
    this.show(message, { type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show(message, { type: 'error', duration });
  }

  info(message: string, duration?: number) {
    this.show(message, { type: 'info', duration });
  }
}

export const toast = new ToastManager();
