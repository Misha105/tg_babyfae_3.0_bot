/**
 * Simple toast notification system
 * Uses Telegram's HapticFeedback for better UX
 */

interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

class ToastManager {
  private container: HTMLDivElement | null = null;
  private activeToasts: Set<HTMLDivElement> = new Set();

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
        width: calc(100% - 2rem);
        max-width: 400px;
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
    
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    
    toast.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      animation: slideInDown 0.3s ease-out;
      pointer-events: auto;
      max-width: 100%;
      word-wrap: break-word;
    `;
    
    toast.textContent = message;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideOutUp {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-1rem);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    container.appendChild(toast);
    this.activeToasts.add(toast);
    
    // Auto remove
    setTimeout(() => {
      toast.style.animation = 'slideOutUp 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.activeToasts.delete(toast);
      }, 300);
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
