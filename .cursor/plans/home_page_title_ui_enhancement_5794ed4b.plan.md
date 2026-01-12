---
name: Home Page Title UI Enhancement
overview: Enhance the home page title "SaveYourGoblin" with animated effects (fade-in, glow, subtle motion) and improved visual styling while maintaining the centered position and medieval/RPG theme.
todos:
  - id: add-css-animations
    content: Add custom CSS animations (fadeInUp, glow) to app/globals.css
    status: completed
  - id: enhance-title-styling
    content: Update title in app/[locale]/page.tsx with gradient text, glow effects, and animation classes
    status: completed
  - id: enhance-divider
    content: Improve the gradient divider line with animation or enhanced styling
    status: completed
  - id: test-responsiveness
    content: Test animations and styling across different screen sizes and devices
    status: completed
  - id: update-legacy-page
    content: Apply same enhancements to app/page.tsx if it is still being used
    status: completed
---

# Home Page Title UI Enhancement

## Overview

Transform the "SaveYourGoblin" title on the home page with animated effects and enhanced visual styling to create a more engaging, eye-catching hero section.

## Current State

- Title is currently a simple large text (text-5xl to text-8xl) with bold font
- Centered with a gradient divider line below
- No animations or special effects
- Located in `app/[locale]/page.tsx` (lines 84-89)

## Implementation Plan

### 1. Enhanced Title Styling

**File: `app/[locale]/page.tsx`**

- Add gradient text effect using CSS gradient classes
- Implement text shadow/glow effects for depth
- Add letter spacing adjustments for better readability
- Consider adding a subtle background glow or halo effect

**Key changes:**

- Replace simple `font-bold` with gradient text classes
- Add `bg-gradient-to-r` with theme-appropriate colors
- Apply `text-shadow` or `drop-shadow` for glow effect
- Add `animate-pulse` or custom animation for subtle motion

### 2. Animation Effects

**File: `app/[locale]/page.tsx`** and **File: `app/globals.css`**

- Fade-in animation on page load
- Subtle glow/pulse effect
- Optional: Letter-by-letter reveal animation
- Smooth transitions

**Implementation:**

- Use CSS keyframes in `globals.css` for custom animations
- Apply `animate-fade-in` or similar Tailwind animation classes
- Add `hover:` effects for interactivity
- Ensure animations are performant (use `transform` and `opacity`)

### 3. Decorative Elements

**File: `app/[locale]/page.tsx`**

- Enhance the existing gradient divider line
- Add decorative elements around the title (optional icons, borders)
- Maintain medieval/RPG theme consistency

**Options:**

- Animated gradient divider
- Decorative corner elements
- Subtle background pattern or texture

### 4. Responsive Considerations

- Ensure animations work well on mobile devices
- Adjust animation intensity for smaller screens if needed
- Test performance on various devices

## Technical Details

### CSS Animations (in `app/globals.css`)

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes glow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5);
  }
  50% {
    text-shadow: 0 0 20px rgba(var(--primary-rgb), 0.8);
  }
}
```

### Title Component Structure

- Wrap title in a container with animation classes
- Apply gradient text using `bg-clip-text` and `text-transparent`
- Add glow effects via `drop-shadow` or `text-shadow`
- Use `animate-` classes from Tailwind or custom animations

## Files to Modify

1. **`app/[locale]/page.tsx`** (lines 84-89)

   - Update title styling and add animation classes
   - Enhance the gradient divider
   - Add wrapper divs for animation containers

2. **`app/globals.css`**

   - Add custom keyframe animations
   - Define glow and fade-in effects
   - Ensure theme compatibility

3. **`app/page.tsx`** (optional, if still used)

   - Apply same changes for consistency

## Success Criteria

- Title has smooth fade-in animation on page load
- Subtle glow/pulse effect that's not distracting
- Gradient text effect that matches the theme
- Maintains readability and accessibility
- Works responsively across all screen sizes
- Performance is smooth (60fps animations)
- Maintains the medieval/RPG aesthetic

## Additional UI Improvements (Optional)

If time permits, consider:

- Improving spacing and layout around the title
- Enhancing the hero section overall
- Adding subtle background effects
- Improving button styling to match the enhanced title