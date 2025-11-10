/**
 * Accessibility Utilities
 *
 * Helpers for WCAG 2.1 AA compliance, ARIA labels, and keyboard navigation
 */

/**
 * Generate unique IDs for accessibility
 */
let idCounter = 0;

export function generateA11yId(prefix: string = 'a11y'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (!element) return false;

  const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  const isFocusableTag = focusableTags.includes(element.tagName);
  const hasTabIndex = element.hasAttribute('tabindex') && element.tabIndex >= 0;

  return (
    (isFocusableTag || hasTabIndex) &&
    !element.hasAttribute('disabled') &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Trap focus within a modal or dialog
 */
export function trapFocus(container: HTMLElement): () => void {
  if (!container) return () => {};

  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Simple RGB parsing (hex format)
    const rgb = color.match(/\w\w/g)?.map((hex) => parseInt(hex, 16)) || [0, 0, 0];
    const [r, g, b] = rgb.map((val) => {
      const normalized = val / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Keyboard navigation helper
 */
export interface KeyboardHandlers {
  onEnter?: (e: KeyboardEvent) => void;
  onSpace?: (e: KeyboardEvent) => void;
  onEscape?: (e: KeyboardEvent) => void;
  onArrowUp?: (e: KeyboardEvent) => void;
  onArrowDown?: (e: KeyboardEvent) => void;
  onArrowLeft?: (e: KeyboardEvent) => void;
  onArrowRight?: (e: KeyboardEvent) => void;
  onTab?: (e: KeyboardEvent) => void;
}

export function handleKeyboardNav(handlers: KeyboardHandlers) {
  return (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        handlers.onEnter?.(e);
        break;
      case ' ':
      case 'Spacebar':
        handlers.onSpace?.(e);
        break;
      case 'Escape':
      case 'Esc':
        handlers.onEscape?.(e);
        break;
      case 'ArrowUp':
      case 'Up':
        handlers.onArrowUp?.(e);
        break;
      case 'ArrowDown':
      case 'Down':
        handlers.onArrowDown?.(e);
        break;
      case 'ArrowLeft':
      case 'Left':
        handlers.onArrowLeft?.(e);
        break;
      case 'ArrowRight':
      case 'Right':
        handlers.onArrowRight?.(e);
        break;
      case 'Tab':
        handlers.onTab?.(e);
        break;
    }
  };
}

/**
 * Generate ARIA label for form field
 */
export function generateAriaLabel(
  fieldName: string,
  isRequired: boolean = false,
  error?: string
): { [key: string]: string } {
  const label: { [key: string]: string } = {
    'aria-label': fieldName,
  };

  if (isRequired) {
    label['aria-required'] = 'true';
  }

  if (error) {
    label['aria-invalid'] = 'true';
    label['aria-describedby'] = `${fieldName}-error`;
  }

  return label;
}

/**
 * Create skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, text: string = 'Skip to main content'): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'skip-link';
  skipLink.textContent = text;
  skipLink.style.cssText = `
    position: absolute;
    left: -9999px;
    z-index: 999;
    padding: 1rem;
    background: #000;
    color: #fff;
    text-decoration: none;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.left = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.left = '-9999px';
  });

  return skipLink;
}

/**
 * Handle focus management for modals
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  save(): void {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  restore(): void {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
  }

  moveTo(element: HTMLElement): void {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

/**
 * Validate ARIA attributes
 */
export function validateAriaAttribute(element: HTMLElement, attribute: string): boolean {
  const validAriaAttributes = [
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'aria-hidden',
    'aria-live',
    'aria-atomic',
    'aria-busy',
    'aria-controls',
    'aria-current',
    'aria-disabled',
    'aria-expanded',
    'aria-haspopup',
    'aria-invalid',
    'aria-pressed',
    'aria-required',
    'aria-selected',
  ];

  return validAriaAttributes.includes(attribute) && element.hasAttribute(attribute);
}

/**
 * Create accessible button props
 */
export function createButtonProps(
  label: string,
  onClick: () => void,
  options: {
    disabled?: boolean;
    pressed?: boolean;
    expanded?: boolean;
    controls?: string;
  } = {}
): Record<string, any> {
  return {
    'aria-label': label,
    onClick,
    onKeyDown: handleKeyboardNav({
      onEnter: (e) => {
        e.preventDefault();
        onClick();
      },
      onSpace: (e) => {
        e.preventDefault();
        onClick();
      },
    }),
    role: 'button',
    tabIndex: options.disabled ? -1 : 0,
    'aria-disabled': options.disabled ? 'true' : undefined,
    'aria-pressed': options.pressed !== undefined ? String(options.pressed) : undefined,
    'aria-expanded': options.expanded !== undefined ? String(options.expanded) : undefined,
    'aria-controls': options.controls,
  };
}

/**
 * Focus visible utility - only show focus ring for keyboard users
 */
export function setupFocusVisible(): () => void {
  let hadKeyboardEvent = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      hadKeyboardEvent = true;
    }
  };

  const handleMouseDown = () => {
    hadKeyboardEvent = false;
  };

  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (hadKeyboardEvent && target) {
      target.setAttribute('data-focus-visible', 'true');
    }
  };

  const handleBlur = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target) {
      target.removeAttribute('data-focus-visible');
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('focus', handleFocus, true);
    document.removeEventListener('blur', handleBlur, true);
  };
}
