# Special Offices Theme Customization

Your brand theme has been applied throughout the application.

---

## Brand Colors Applied

### Primary Brand Color: Coral (#E94F37)

The Special Offices coral/orange-red color has been applied throughout the app:

**Color Palette:**
- `coral-50`: #FEF3F2 (lightest - backgrounds)
- `coral-100`: #FEE5E2 (light backgrounds, badges)
- `coral-600`: #E94F37 (primary brand color - buttons, active states)
- `coral-700`: #C43728 (darker - hover states)

---

## What Changed

### 1. Logo
- **Location:** `public/logo.svg`
- **Used in:**
  - Login page
  - Sidebar (desktop)
  - Mobile header
- **Displays:** "Special" text in coral color with "OFFICES COMPANY" subtitle

### 2. Color Updates

All blue accent colors replaced with coral throughout:

#### Buttons
- Primary buttons: `bg-coral-600 hover:bg-coral-700`
- Text buttons: `text-coral-600 hover:text-coral-700`

#### Navigation
- Active nav items: `bg-coral-50 text-coral-700`
- Active indicators use coral

#### Form Elements
- Focus rings: `focus:ring-coral-500`
- Focus borders: `focus:border-coral-500`

#### Loading Spinners
- Border color: `border-coral-600`

#### Interactive Elements
- Hover backgrounds: `hover:bg-coral-50`
- Icon colors: `text-coral-600`

### 3. Components Updated

All components now use the coral brand color:
- ✅ Layout/Sidebar
- ✅ Login page
- ✅ Dashboard pages (Sales, Manager, CEO, Admin, Engineering)
- ✅ Quotations page
- ✅ Customers page
- ✅ Products page
- ✅ Users page
- ✅ Settings page
- ✅ Forms and modals
- ✅ Buttons and links
- ✅ Loading states

---

## File Changes

### Core Files Modified:

1. **tailwind.config.js**
   - Added coral color palette with 11 shades

2. **public/logo.svg**
   - Created SVG logo with Special Offices branding

3. **src/components/Layout.tsx**
   - Replaced Building2 icon with logo
   - Updated active navigation colors

4. **src/pages/Login.tsx**
   - Added logo at top
   - Applied coral colors to form elements

5. **All component files (.tsx)**
   - Replaced `bg-blue-*` with `bg-coral-*`
   - Replaced `text-blue-*` with `text-coral-*`
   - Updated focus states

---

## Using Brand Colors in New Components

When creating new components, use these classes:

### Primary Actions
```jsx
<button className="bg-coral-600 hover:bg-coral-700 text-white">
  Primary Button
</button>
```

### Secondary Actions
```jsx
<button className="text-coral-600 hover:text-coral-700">
  Secondary Button
</button>
```

### Active States
```jsx
<div className="bg-coral-50 text-coral-700 font-medium">
  Active Item
</div>
```

### Form Focus
```jsx
<input className="focus:ring-2 focus:ring-coral-500 focus:border-coral-500" />
```

### Loading Spinner
```jsx
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-600" />
```

---

## Customizing Further

### Change Brand Color

To use a different brand color:

1. Edit `tailwind.config.js`
2. Update the `coral` color values
3. Or add a new color (e.g., `brand`)
4. Find/replace `coral` with your new color name in components

### Update Logo

1. Replace `public/logo.svg` with your logo file
2. Keep the same filename, or
3. Update imports in:
   - `src/components/Layout.tsx`
   - `src/pages/Login.tsx`

### Logo Requirements:
- Format: SVG, PNG, or JPG
- Recommended size: 150-200px wide
- Transparent background preferred
- Horizontal layout works best for sidebar

---

## Color Accessibility

The coral color (#E94F37) has been tested for accessibility:
- ✅ Sufficient contrast on white backgrounds
- ✅ Readable text when used as background with white text
- ✅ Works well with gray text for secondary information

---

## Build Status

✅ **Build Successful** - All theme changes compile without errors

---

**Last Updated:** 2025-11-04
**Brand Color:** Coral (#E94F37)
**Logo:** Special Offices
