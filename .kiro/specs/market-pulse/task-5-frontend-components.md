# Task 5: Frontend Core Components and UI Foundation

**Context File:** `.kiro/specs/market-pulse/context/5-context.md`
**Objective:** Build reusable, accessible UI components with consistent design system and responsive behavior
**Exit Criteria:** Component library functional, accessibility compliant, responsive design working, theme switching operational, tests pass
**Git Commits:** Create commits after each major milestone (base components, layout system, theme implementation, accessibility features)

## General Guidelines

**Before starting any task:**

1. Check if `.kiro/specs/market-pulse/context/5-context.md` exists
2. If it exists, load context and resume from last checkpoint
3. If not, create the context file with task objective
4. Perform comprehensive code analysis to identify best approach for implementation or potential issue spots
5. Update context file after every sub-step with progress and changes

**During task execution:**

- Update task context file continuously with objective, gathered context, and changes made
- Run linting, compilation, build, and deployment checks after every change
- Use browser console logs and Puppeteer for validation
- Ensure backend-frontend integration symmetry
- Add timeouts to commands that might hang
- Reference project context file for known failing commands and alternatives
- Follow test-driven development: write tests before implementing components
- Break large files into single-responsibility modules
- Remove unused code and refactor for readability
- **Improve existing functionality** instead of creating alternative versions (no `enhanced*`, `*v2`, `improved*` files)
- **Always modify original files** when enhancing functionality to maintain single source of truth
- **Create git commits** at substantial milestones within each task
- Use conventional commit messages (feat:, fix:, refactor:, test:, docs:)

**Task completion criteria:**

- All linting, compilation, build, and deployment errors resolved
- Application loads cleanly in production (`./script/deploy.sh production`)
- All features work including animations and interactions
- Browser console shows no errors
- Tests pass for implemented functionality
- Context file updated with final status
- No regression in existing functionality
- **Git commit created** with descriptive message following conventional commit format
- Working directory clean and changes properly versioned

**Testing validation requirements:**

- **test-results.md updated** - All test outcomes documented with issues and fixes
- **Systematic test execution** - Run all applicable test categories for the task
- **Issue resolution** - All identified problems fixed and marked complete
- **Zero-error completion** - No test marked done until fully passing
- **Regression testing** - Verify existing functionality still works after changes

**Validation methodology:**

- **test-results.md tracking** - Document all testing progress and outcomes
- **Systematic test execution** - Run applicable tests from 11 test categories
- **Issue-driven development** - Log all problems, fix systematically, mark complete
- Use browser console logs and Puppeteer scripts as primary validation
- Run full test suite after each change
- Validate end-to-end application behavior
- Check responsive design across all device types
- Verify accessibility compliance
- **Zero-error policy** - No task complete until all tests pass

## Subtasks

- [ ] ### 5.1 Create base UI components with accessibility

**Context File:** `.kiro/specs/market-pulse/context/5.1-context.md`
**Exit Criteria:** Base components functional, WCAG-AA compliant, keyboard navigation working, screen reader compatible, tests pass

- [ ] ####  5.1.1 Set up component library infrastructure

**Files to create:** `src/components/ui/index.ts`, `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`
**Commands:** `npm install @headlessui/react @heroicons/react clsx`
**Detailed Implementation:**

- Install UI dependencies: `npm install @headlessui/react @heroicons/react clsx`
- Create component library structure with barrel exports
- Set up component prop interfaces with TypeScript
- Implement component composition patterns
- Create component documentation templates
- Add component story templates for development

**Validation:** Components render correctly, TypeScript types work
**Commit:** `feat: create base UI component library infrastructure`

- [ ] ####  5.1.2 Implement Button component with variants and states

**Files to create:** `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`
**Detailed Implementation:**

- Create Button component with multiple variants (primary, secondary, outline, ghost)
- Implement size variants (sm, md, lg, xl)
- Add loading and disabled states with proper ARIA attributes
- Implement keyboard navigation and focus management
- Add icon support with proper spacing
- Create comprehensive prop interface with TypeScript

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}
```

**Validation:** Button works correctly, accessibility tests pass
**Commit:** `feat: implement accessible Button component with variants`

- [ ] ####  5.1.3 Create Input and Form components

**Files to create:** `src/components/ui/Input.tsx`, `src/components/ui/Label.tsx`, `src/components/ui/FormField.tsx`
**Detailed Implementation:**

- Create Input component with validation states
- Implement Label component with proper association
- Add FormField wrapper for consistent layout
- Implement error message display with ARIA
- Add input types (text, email, password, number, search)
- Create input size variants and styling

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}
```

**Validation:** Form components work correctly, validation functional
**Commit:** `feat: create accessible Input and Form components`

- [ ] ####  5.1.4 Implement Modal and Dialog components

**Files to create:** `src/components/ui/Modal.tsx`, `src/components/ui/Dialog.tsx`, `src/hooks/useModal.ts`
**Detailed Implementation:**

- Create Modal component with Headless UI Dialog
- Implement focus trapping and keyboard navigation
- Add backdrop click and escape key handling
- Create modal size variants and positioning
- Implement custom hook for modal state management
- Add animation and transition support

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}
```

**Validation:** Modal works correctly, accessibility compliant
**Commit:** `feat: implement accessible Modal and Dialog components`

- [ ] ####  5.1.5 Create Dropdown and Menu components

**Files to create:** `src/components/ui/Dropdown.tsx`, `src/components/ui/Menu.tsx`, `src/components/ui/Select.tsx`
**Detailed Implementation:**

- Create Dropdown component with Headless UI Menu
- Implement keyboard navigation (arrow keys, enter, escape)
- Add multi-select and single-select variants
- Create custom Select component with search
- Implement proper ARIA attributes and roles
- Add positioning and overflow handling

```typescript
interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  onSelect?: (item: DropdownItem) => void;
}

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}
```

**Validation:** Dropdown components work correctly, keyboard navigation functional
**Commit:** `feat: create accessible Dropdown and Menu components`

- [ ] ####  5.1.6 Write comprehensive component tests

**Files to create:** `src/components/ui/__tests__/Button.test.tsx`, `src/components/ui/__tests__/Input.test.tsx`, `src/components/ui/__tests__/Modal.test.tsx`
**Detailed Implementation:**

- Create unit tests for all UI components
- Write accessibility tests with jest-axe
- Test keyboard navigation and focus management
- Create interaction tests with user-event
- Test component variants and states
- Add visual regression tests with screenshots

**Validation:** All component tests pass, accessibility verified
**Commit:** `test: add comprehensive UI component tests`

**Requirements:** 6.1, 6.2, 11.1

- [ ] ### 5.2 Implement responsive layout system

**Context File:** `.kiro/specs/market-pulse/context/5.2-context.md`
**Exit Criteria:** Layout system responsive, grid functional, breakpoints working, mobile-first design implemented, tests pass

- [ ] ####  5.2.1 Create responsive grid system

**Files to create:** `src/components/layout/Grid.tsx`, `src/components/layout/Container.tsx`, `src/components/layout/Flex.tsx`
**Detailed Implementation:**

- Create Grid component with CSS Grid and Flexbox
- Implement responsive breakpoints (mobile, tablet, desktop, ultrawide)
- Add grid gap and spacing utilities
- Create Container component with max-width constraints
- Implement Flex component with direction and alignment props
- Add responsive utilities for show/hide at breakpoints

```typescript
interface GridProps {
  cols?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number | string;
  className?: string;
  children: React.ReactNode;
}

interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

**Validation:** Grid system works correctly, responsive behavior verified
**Commit:** `feat: create responsive grid and layout system`

- [ ] ####  5.2.2 Implement Header and Navigation components

**Files to create:** `src/components/layout/Header.tsx`, `src/components/layout/Navigation.tsx`, `src/components/layout/MobileMenu.tsx`
**Detailed Implementation:**

- Create Header component with logo and navigation
- Implement responsive navigation with mobile menu
- Add breadcrumb navigation for deep pages
- Create user menu with profile and settings
- Implement search functionality in header
- Add notification indicators and badges

```typescript
interface HeaderProps {
  user?: User;
  onSearch?: (query: string) => void;
  notifications?: Notification[];
  className?: string;
}

interface NavigationProps {
  items: NavigationItem[];
  currentPath: string;
  mobile?: boolean;
  onItemClick?: (item: NavigationItem) => void;
}
```

**Validation:** Header and navigation work correctly, mobile responsive
**Commit:** `feat: implement responsive Header and Navigation components`

- [ ] ####  5.2.3 Create Sidebar and Panel components

**Files to create:** `src/components/layout/Sidebar.tsx`, `src/components/layout/Panel.tsx`, `src/hooks/useSidebar.ts`
**Detailed Implementation:**

- Create collapsible Sidebar component
- Implement Panel component for content areas
- Add sidebar state management with custom hook
- Create responsive sidebar behavior (overlay on mobile)
- Implement sidebar navigation and menu items
- Add panel resizing and drag functionality

```typescript
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  width?: number;
  collapsible?: boolean;
  overlay?: boolean;
  children: React.ReactNode;
}

interface PanelProps {
  title?: string;
  actions?: React.ReactNode;
  padding?: boolean;
  scrollable?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

**Validation:** Sidebar and panels work correctly, responsive behavior verified
**Commit:** `feat: create responsive Sidebar and Panel components`

- [ ] ####  5.2.4 Implement Footer and utility layout components

**Files to create:** `src/components/layout/Footer.tsx`, `src/components/layout/Spacer.tsx`, `src/components/layout/Divider.tsx`
**Detailed Implementation:**

- Create Footer component with links and information
- Implement Spacer component for consistent spacing
- Add Divider component with orientation variants
- Create utility components for layout assistance
- Implement sticky footer behavior
- Add responsive footer layout

```typescript
interface FooterProps {
  links?: FooterLink[];
  copyright?: string;
  social?: SocialLink[];
  className?: string;
}

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  axis?: 'horizontal' | 'vertical' | 'both';
}
```

**Validation:** Footer and utility components work correctly
**Commit:** `feat: implement Footer and utility layout components`

- [ ] ####  5.2.5 Create responsive breakpoint utilities

**Files to create:** `src/hooks/useBreakpoint.ts`, `src/utils/responsive.ts`, `src/components/layout/Responsive.tsx`
**Detailed Implementation:**

- Create useBreakpoint hook for responsive logic
- Implement responsive utility functions
- Add Responsive component for conditional rendering
- Create breakpoint-based component variants
- Implement responsive image and media components
- Add responsive typography utilities

```typescript
interface UseBreakpointReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isUltrawide: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
}

interface ResponsiveProps {
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  ultrawide?: React.ReactNode;
}
```

**Validation:** Responsive utilities work correctly, breakpoints functional
**Commit:** `feat: create responsive breakpoint utilities and hooks`

- [ ] ####  5.2.6 Write comprehensive layout tests

**Files to create:** `src/components/layout/__tests__/Grid.test.tsx`, `src/components/layout/__tests__/Header.test.tsx`, `src/hooks/__tests__/useBreakpoint.test.ts`
**Detailed Implementation:**

- Create tests for all layout components
- Write responsive behavior tests with viewport changes
- Test breakpoint utilities and hooks
- Create layout composition tests
- Add performance tests for layout rendering
- Test accessibility of layout components

**Validation:** All layout tests pass, responsive behavior verified
**Commit:** `test: add comprehensive layout system tests`

**Requirements:** 6.3, 6.4, 11.2

- [ ] ### 5.3 Create theme system with dark/light mode

**Context File:** `.kiro/specs/market-pulse/context/5.3-context.md`
**Exit Criteria:** Theme system functional, dark/light mode switching smooth, user preferences saved, CSS variables working, tests pass

- [ ] ####  5.3.1 Set up theme infrastructure and CSS variables

**Files to create:** `src/styles/themes.css`, `src/utils/theme.ts`, `src/hooks/useTheme.ts`
**Detailed Implementation:**

- Create CSS custom properties for theme variables
- Define light and dark theme color palettes
- Implement theme switching utilities
- Create theme context and provider
- Add system theme detection
- Implement theme persistence in localStorage

```css
:root {
  --color-primary-50: #f0f9ff;
  --color-primary-500: #0ea5e9;
  --color-primary-900: #0c4a6e;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f8fafc;
  --color-border: #e2e8f0;
}

[data-theme="dark"] {
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  --color-muted: #1e293b;
  --color-border: #334155;
}
```

**Validation:** Theme variables work correctly, switching functional
**Commit:** `feat: create theme system infrastructure with CSS variables`

- [ ] ####  5.3.2 Implement ThemeProvider and theme context

**Files to create:** `src/contexts/ThemeContext.tsx`, `src/providers/ThemeProvider.tsx`
**Detailed Implementation:**

- Create theme context with TypeScript interfaces
- Implement ThemeProvider component
- Add theme state management and persistence
- Create theme switching functions
- Implement system theme detection and sync
- Add theme change event handling

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
  children: React.ReactNode;
}
```

**Validation:** Theme context works correctly, state management functional
**Commit:** `feat: implement ThemeProvider and theme context`

- [ ] ####  5.3.3 Create theme-aware component variants

**Files to create:** `src/components/ui/ThemeToggle.tsx`, `src/utils/themeVariants.ts`
**Detailed Implementation:**

- Create ThemeToggle component with smooth transitions
- Implement theme-aware component variants
- Add theme-specific styling utilities
- Create animated theme transition effects
- Implement theme preview functionality
- Add theme-aware icon and image components

```typescript
interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const themeVariants = {
  light: {
    background: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200',
  },
  dark: {
    background: 'bg-gray-900',
    text: 'text-gray-100',
    border: 'border-gray-700',
  },
};
```

**Validation:** Theme variants work correctly, transitions smooth
**Commit:** `feat: create theme-aware component variants and utilities`

- [ ] ####  5.3.4 Implement smooth theme transitions

**Files to create:** `src/styles/transitions.css`, `src/utils/themeTransitions.ts`
**Commands:** `npm install framer-motion`
**Detailed Implementation:**

- Install animation library: `npm install framer-motion`
- Create CSS transitions for theme changes
- Implement JavaScript-based transition coordination
- Add transition duration and easing customization
- Create transition presets for different components
- Implement reduced motion support

```css
* {
  transition: 
    background-color 0.2s ease-in-out,
    border-color 0.2s ease-in-out,
    color 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

**Validation:** Transitions work smoothly, reduced motion respected
**Commit:** `feat: implement smooth theme transitions with accessibility`

- [ ] ####  5.3.5 Add theme customization and user preferences

**Files to create:** `src/components/settings/ThemeSettings.tsx`, `src/utils/themeCustomization.ts`
**Detailed Implementation:**

- Create theme settings component
- Implement custom color picker for themes
- Add theme preset selection
- Create theme export/import functionality
- Implement user theme preferences storage
- Add theme accessibility options

```typescript
interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  reducedMotion: boolean;
  highContrast: boolean;
}

interface ThemeSettingsProps {
  settings: ThemeSettings;
  onSettingsChange: (settings: ThemeSettings) => void;
}
```

**Validation:** Theme customization works correctly, preferences saved
**Commit:** `feat: add theme customization and user preferences`

- [ ] ####  5.3.6 Write comprehensive theme system tests

**Files to create:** `src/hooks/__tests__/useTheme.test.ts`, `src/components/ui/__tests__/ThemeToggle.test.tsx`
**Detailed Implementation:**

- Create tests for theme context and hooks
- Write tests for theme switching and persistence
- Test theme transitions and animations
- Create tests for theme customization
- Add tests for system theme detection
- Test accessibility features of theme system

**Validation:** All theme tests pass, functionality verified
**Commit:** `test: add comprehensive theme system tests`

**Requirements:** 6.5, 6.6, 11.3

## Requirements Coverage

- 6.1, 6.2: Base UI components and accessibility
- 6.3, 6.4: Responsive layout and navigation
- 6.5, 6.6: Theme system and user preferences
- 11.1, 11.2, 11.3: Accessibility compliance

## Project Context File

Maintain `.kiro/specs/market-pulse/project-context.md` with:

- Commands that have failed and their working alternatives
- Temporary/debug/test files and their purposes
- Validation scripts that can be reused
- Known issues and their solutions
- Components with duplicate implementations that need consolidation