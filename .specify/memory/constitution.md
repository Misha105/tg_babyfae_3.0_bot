<!--
SYNC IMPACT REPORT
Version Change: 0.0.0 -> 1.0.0
Modified Principles:
- [PRINCIPLE_1_NAME] -> 1. Simplicity Above All
- [PRINCIPLE_2_NAME] -> 2. Data Reliability is Non-Negotiable
- [PRINCIPLE_3_NAME] -> 3. Mobile-First, Touch-Optimized Design
- [PRINCIPLE_4_NAME] -> 4. Respect Telegram Platform Conventions
- [PRINCIPLE_5_NAME] -> 5. Performance Over Features
Added Sections:
- 6. Privacy by Design
- 7. Graceful Degradation
- 8. Accessibility Matters
- 9. Iterative Development Over Big Releases
- 10. Code Quality and Maintainability
- Technical Standards
- User Experience Standards
- GitHub Copilot Optimization
- Decision Making Framework
- Success Metrics
Templates Requiring Updates:
- .specify/templates/plan-template.md (✅ Constitution Check section exists)
- .specify/templates/spec-template.md (✅ Aligned)
- .specify/templates/tasks-template.md (✅ Aligned)
Follow-up TODOs:
- None.
-->

# Babyfae Constitution

## Core Mission
Babyfae exists to help parents confidently track their infant's daily care activities without stress or complexity. The application must be simple enough to use with one hand while holding a baby, reliable enough to never lose precious care data, and thoughtful enough to anticipate parents' needs during demanding moments.

## Core Principles

### 1. Simplicity Above All
**Principle:** Every feature should be usable by an exhausted parent at 3 AM with one hand.

**Implementation Guidelines:**
- Single-tap actions for recording common activities (feeding, sleep, medication)
- No more than 2 taps to reach any core function
- Large, touch-friendly buttons (minimum 44x44px touch targets)
- Avoid nested menus beyond one level deep
- Default to sensible values (current time, most recent activity type)
- Progressive disclosure: show essential information first, details on demand

**Decision Framework:**
- Before adding any feature, ask: "Can a sleep-deprived parent use this with one hand while holding a baby?"
- If a feature requires more than 3 steps, reconsider the design
- When choosing between power and simplicity, choose simplicity

### 2. Data Reliability is Non-Negotiable
**Principle:** Parents trust us with irreplaceable records of their child's first months. Data loss is unacceptable.

**Implementation Guidelines:**
- Use Telegram CloudStorage API as primary data store (not IndexedDB or localStorage)
- Implement optimistic UI updates with background sync
- Debounce CloudStorage writes to prevent data races (300ms minimum)
- Handle network failures gracefully with retry logic
- Validate all data before saving
- Never silently fail storage operations
- Log all storage errors for debugging

**Decision Framework:**
- All data mutations must go through Zustand store with CloudStorage persistence
- Test data persistence across app restarts, device switches, and network failures
- Never rely on local-only storage for critical data
- If unsure about data safety, add redundant safeguards

### 3. Mobile-First, Touch-Optimized Design
**Principle:** Babyfae lives primarily on mobile devices. Desktop is secondary.

**Implementation Guidelines:**
- Design for mobile screens first (320px minimum width)
- Optimize for thumb-reach zones (bottom 60% of screen for primary actions)
- Support both portrait and landscape orientations
- Use native Telegram theme colors and patterns
- Respect safe areas on notched devices
- Enable haptic feedback for important actions (via Telegram SDK)
- Smooth animations (use Framer Motion sparingly, prefer CSS transitions)
- Full Russian language support

**Decision Framework:**
- Test every UI change on actual mobile devices, not just browser dev tools
- Primary actions should be in thumb-reach (bottom navigation, floating buttons)
- Avoid horizontal scrolling (except for date pickers and carousels)
- Text must remain readable at 16px base font size minimum

### 4. Respect Telegram Platform Conventions
**Principle:** Babyfae should feel native to Telegram, not like a foreign web app.

**Implementation Guidelines:**
- Use Telegram's native theme colors (access via SDK theme params)
- Respect user's dark/light mode preference automatically
- Follow Telegram's animation timing (200-300ms for most transitions)
- Use Telegram's haptic feedback patterns
- Display loading states that match Telegram's style
- Handle Telegram Mini App lifecycle events properly (viewport changes, theme changes)
- Use Telegram's native back button behavior

**Decision Framework:**
- When in doubt, reference official Telegram apps for patterns
- Test appearance in both light and dark themes on every screen
- Never override Telegram's system UI (nav bar, status bar)
- Leverage Telegram features (CloudStorage, haptics, theme) before building custom solutions

### 5. Performance Over Features
**Principle:** A fast, basic app is better than a slow, feature-rich one.

**Implementation Guidelines:**
- Target < 300KB total bundle size (gzipped)
- Initial page load < 2 seconds on 3G connection
- Interactions should respond within 100ms (optimistic updates)
- Lazy load non-critical features (settings, growth charts)
- Code-split by route
- Optimize images (use WebP, compress to < 50KB each)
- Minimize third-party dependencies

**Decision Framework:**
- Before adding a library, check bundle size impact (use bundlephobia.com)
- Profile performance after major changes (use Lighthouse)
- If a feature slows initial load, defer it
- Delete unused dependencies aggressively

### 6. Privacy by Design
**Principle:** Baby care data is deeply personal. Privacy is not optional.

**Implementation Guidelines:**
- All data stored in user's Telegram CloudStorage (not our servers)
- Bot backend stores only minimal notification schedules (user_id + schedule data)
- No analytics, tracking pixels, or telemetry
- No third-party services with access to user data
- Data deletion must be complete and irreversible (clear CloudStorage entirely)
- No data sharing between users (even family members, for now)

**Decision Framework:**
- Before storing any data server-side, justify why CloudStorage is insufficient
- Never log personally identifiable information (PII) in application logs
- Minimize data collected to absolute essentials
- Document all data flows in architecture decisions

### 7. Graceful Degradation
**Principle:** The app should work in imperfect conditions (poor network, old devices, limited storage).

**Implementation Guidelines:**
- Handle offline mode gracefully (queue actions, sync when online)
- Support devices with 5MB CloudStorage filled to 4.5MB (display warning, allow cleanup)
- Work on devices without haptic feedback
- Degrade animations on low-end devices (detect with matchMedia)
- Provide clear error messages when things go wrong
- Never crash—catch and handle all errors

**Decision Framework:**
- Test on lowest-spec supported device (3+ year old Android mid-range)
- Test with network throttling (Slow 3G in DevTools)
- Implement error boundaries for React components
- Log errors to help debug issues users encounter

### 8. Accessibility Matters
**Principle:** New parents include those with visual, motor, or cognitive impairments.

**Implementation Guidelines:**
- Maintain WCAG 2.1 AA contrast ratios minimum (4.5:1 for text)
- Support screen readers (semantic HTML, ARIA labels where needed)
- Keyboard navigation should work (though less critical for mobile)
- Avoid relying solely on color to convey information
- Provide text alternatives for icons
- Support system font size preferences (use rem units)

**Decision Framework:**
- Test with browser screen reader (NVDA on Windows, VoiceOver on iOS)
- Check color contrast with automated tools (Lighthouse)
- Ensure all interactive elements have accessible names
- Avoid auto-playing content or unexpected focus changes

### 9. Iterative Development Over Big Releases
**Principle:** Ship small, test quickly, iterate based on real usage.

**Implementation Guidelines:**
- Minimum Viable Feature (MVF) approach: start with core use case, add complexity later
- Feature flags for experimental functionality
- Deploy to production early and often (after testing)
- Gather feedback from real users before building advanced features
- Don't build features speculatively—validate demand first

**Decision Framework:**
- For new features, ask: "What's the simplest version that provides value?"
- Defer edge cases and power user features to future iterations
- Prioritize features that benefit most users (80/20 rule)
- Be willing to remove features that complicate the experience

### 10. Code Quality and Maintainability
**Principle:** Code is read more than written. Optimize for clarity and future maintainability.

**Implementation Guidelines:**
- TypeScript strict mode enabled (no implicit any)
- Descriptive variable and function names (readability over brevity)
- Small, focused functions (< 50 lines as a guideline)
- Component composition over monolithic components
- Document complex business logic with comments
- Consistent code formatting (Prettier with shared config)
- Meaningful commit messages following conventional commits

**Decision Framework:**
- If you need to explain code in a PR, add that explanation as a code comment
- Refactor when adding third related function to same file (extract module)
- Prefer explicit over clever
- Run linter and type checker before committing

## Technical Standards

### TypeScript Usage
**Standard:** All code must be TypeScript with strict mode enabled.

**Rationale:** Type safety prevents entire classes of bugs, improves IDE support, and makes refactoring safer. This is especially critical given GitHub Copilot will generate much of the code—types help catch Copilot errors early.

**Requirements:**
- No `any` types without explicit justification (use `unknown` instead)
- Define interfaces for all data models
- Use discriminated unions for state variants
- Leverage type inference where obvious, explicit types when clarity benefits

### Component Structure
**Standard:** React components should follow consistent patterns.

**Required Structure:**

```typescript
// 1. Imports (grouped: React, third-party, local)
import { useState } from 'react';
import { format } from 'date-fns';
import { useBabyfaeStore } from '@/store';

// 2. Type definitions
interface ComponentProps {
  // Props definition
}

// 3. Component definition
export function Component({ prop }: ComponentProps) {
  // Hooks first
  const store = useBabyfaeStore();
  const [state, setState] = useState();
  
  // Event handlers
  const handleAction = () => {
    // Implementation
  };
  
  // Render
  return (
    // JSX
  );
}
```

**Best Practices:**
- Extract complex logic into custom hooks
- Keep JSX readable (extract complex conditionals to variables)
- Use meaningful prop names (avoid generic `data`, `info`)

### State Management
**Standard:** Global state lives in Zustand, local state in React hooks.

**Guidelines:**
- Use Zustand for: baby profile, activities, medications, settings, custom activities
- Use React useState for: UI state (modals, forms, temporary selections)
- Never duplicate state between Zustand and React hooks
- Selector functions for derived state (don't store computed values)

**Store Organization:**

```typescript
// Each domain gets a slice
interface BabyfaeStore {
  // Baby profile slice
  babyProfile: BabyProfile | null;
  setBabyProfile: (profile: BabyProfile) => void;
  
  // Activities slice
  activities: ActivityRecord[];
  addActivity: (activity: Omit<ActivityRecord, 'id'>) => void;
  // ... more actions
}
```

### Error Handling
**Standard:** Never let errors crash the app. Handle all failure modes explicitly.

**Required Patterns:**

```typescript
// Async operations
try {
  await cloudStorage.setItem(key, value);
} catch (error) {
  console.error('CloudStorage error:', error);
  // Show user-friendly message
  showToast('Failed to save. Please try again.');
  // Don't lose user data—keep in memory
}

// React Error Boundaries for component errors
// Validation before data mutations
// Fallback UI for loading/error states
```

### Testing Requirements

**Standard:** Test critical business logic and user flows.

**Priority (High to Low):**
1. Data persistence (CloudStorage adapter)
2. Date calculations (sleep duration, age)
3. Notification scheduling logic
4. Activity CRUD operations
5. Form validation
6. UI component interactions

**Testing Philosophy:**
- Write tests for bugs before fixing them
- Focus on integration tests over unit tests (test behavior, not implementation)
- Manual testing checklist for every release (document in tests/manual-checklist.md)

### Dependency Management
**Standard:** Minimize dependencies. Justify every addition.

**Before Adding a Package:**
1. Check bundle size impact (< 50KB compressed is acceptable)
2. Verify active maintenance (updated in last 6 months)
3. Check TypeScript support
4. Consider if functionality can be implemented in < 100 lines (if yes, don't add package)

**Approved Core Dependencies:**
- React, TypeScript, Vite (build tools)
- Zustand (state management)
- @telegram-apps/sdk-react (Telegram integration)
- date-fns (date utilities)
- Shadcn/UI + Tailwind (UI components/styling)

**Process for New Dependencies:**
- Document justification in PR description
- Consider bundle size impact
- Evaluate alternatives

## User Experience Standards

### Loading States
**Standard:** Never leave users wondering if something is happening.

**Requirements:**
- Show loading indicator for operations > 200ms
- Use skeleton screens for initial page loads
- Optimistic updates for user actions (show result immediately, sync in background)
- Disable buttons during async operations (prevent double-submission)

### Error Messages

**Standard:** Error messages should be human-readable and actionable.

**Good Example:** "Couldn't save feeding record. Check your internet connection and try again."

**Bad Example:** "CloudStorage.setItem() failed with error code 500"

**Guidelines:**
- Explain what happened in plain language
- Suggest a remedy when possible
- Avoid technical jargon
- Never show raw error stack traces to users

### Notifications
**Standard:** Notifications must be timely, relevant, and non-intrusive.

**Requirements:**
- Arrive 5 minutes before scheduled activity (configurable)
- Clear, actionable message ("Time to feed baby. Tap to record feeding.")
- Include quick action button to record activity
- Respect user's notification preferences (honor Do Not Disturb)
- No spammy notifications (max 1 per 30 minutes for same activity type)

### Data Entry
**Standard:** Minimize typing. Maximize tapping.

**Requirements:**
- Default to current time for all activities
- Provide quick-select buttons for common values
- Allow editing timestamp after recording (users often forget)
- Save drafts automatically (don't lose data if user closes app)
- Validate input inline (show errors immediately, not on submit)

## GitHub Copilot Optimization

### Writing Copilot-Friendly Code
**Principle:** Structure code to maximize Copilot's effectiveness.

**Best Practices:**
- Write clear function signatures with TypeScript types (Copilot uses these as context)
- Use descriptive names (Copilot predicts better with semantic names)
- Add JSDoc comments for complex functions (helps Copilot understand intent)
- Follow consistent patterns (Copilot learns from project conventions)
- Keep functions focused (easier for Copilot to generate correctly)

**Example:**

```typescript
/**
 * Calculates total sleep duration for a given date
 * @param activities - Array of all activities
 * @param date - Target date in ISO format
 * @returns Total minutes slept on that date
 */
function calculateDailySleepDuration(
  activities: ActivityRecord[],
  date: string
): number {
  // Copilot will generate accurate implementation
}
```

### Reviewing Copilot Suggestions
**Standard:** Never accept Copilot suggestions blindly.

**Review Checklist:**
- [ ] Does it match TypeScript types?
- [ ] Are there edge cases it missed?
- [ ] Is error handling included?
- [ ] Does it follow project conventions?
- [ ] Is it the simplest solution?
- [ ] Would you write this code yourself?

**Common Copilot Pitfalls:**
- Over-engineering solutions
- Ignoring error handling
- Using deprecated APIs
- Not respecting TypeScript strict mode
- Generating inefficient algorithms

## Decision Making Framework

### When Facing Uncertainty
Use this decision tree:

1. **Does it align with core mission?** (Simple, reliable infant care tracking)
   - If no → Don't build it
   - If yes → Continue

2. **Does it compromise data reliability?**
   - If yes → Find alternative approach
   - If no → Continue

3. **Will exhausted parents understand it?**
   - If no → Simplify or defer
   - If yes → Continue

4. **Is it the simplest solution?**
   - If no → Explore simpler alternatives
   - If yes → Build it

### Trade-off Resolution
**When forced to choose between:**

- **Simplicity vs. Power** → Choose simplicity
- **Performance vs. Features** → Choose performance  
- **Privacy vs. Convenience** → Choose privacy
- **Reliability vs. Speed** → Choose reliability
- **Native patterns vs. Custom design** → Choose native

## Success Metrics
**We know we've succeeded when:**

1. Parents can record feeding in < 3 seconds with one hand
2. Zero data loss reports from users
3. App loads and is interactive in < 2 seconds on 3G
4. 90%+ of users enable notifications and find them helpful
5. Users describe the app as "simple" and "reliable" in feedback

**We've failed if:**
- Users report losing data
- Commonly requested feature: "make it simpler"
- App feels slow or laggy
- Users find notification timing confusing
- Code becomes unmaintainable (high bug rate, slow feature development)

## Governance

This constitution is not set in stone. As we learn from real usage and encounter new challenges, we will evolve these principles. However, the core mission—helping parents track infant care simply and reliably—remains constant.

**Amendment Process:**
- Propose changes in team discussions
- Document rationale for changes
- Update constitution with date and reasoning
- Ensure GitHub Copilot and all developers are aware of updates

**Version**: 1.0.0 | **Ratified**: 2025-11-22 | **Last Amended**: 2025-11-22
