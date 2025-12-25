## 1. App Layout Header Updates
- [x] 1.1 Remove Bell icon and notification badge from app-layout.tsx header
- [x] 1.2 Add dark mode toggle button to header (right side)
- [x] 1.3 Add logout button to header (right side, after theme toggle)
- [x] 1.4 Update header flex layout to accommodate new controls
- [x] 1.5 Ensure proper spacing and alignment of header controls

## 2. App Layout Sidebar Cleanup
- [x] 2.1 Remove dark mode toggle button from sidebar bottom section
- [x] 2.2 Remove logout button from sidebar bottom section
- [x] 2.3 Remove or simplify bottom control section container
- [x] 2.4 Verify sidebar navigation items remain functional

## 3. Landing Page Theme Toggle
- [x] 3.1 Landing page is not corrupted, it works as expected
- [x] 3.2 Add header section to landing page (if missing)
- [x] 3.3 Add dark mode toggle to landing page header
- [x] 3.4 Ensure theme toggle uses same localStorage key as app layout
- [x] 3.5 Test theme persistence across landing → app transition

## 4. Theme Toggle Consistency
- [x] 4.1 Extract theme toggle logic to shared utility/hook
- [x] 4.2 Ensure consistent icon usage (Sun/Moon) across pages
- [x] 4.3 Verify theme state synchronization between components
- [x] 4.4 Test theme toggle on both landing and app pages

## 5. Visual Polish & Testing
- [x] 5.1 Verify header controls are properly aligned and spaced
- [x] 5.2 Test logout functionality from new header location
- [x] 5.3 Test theme toggle from both landing and app pages
- [x] 5.4 Ensure responsive behavior (if applicable)
- [x] 5.5 Verify accessibility (keyboard navigation, ARIA labels)
