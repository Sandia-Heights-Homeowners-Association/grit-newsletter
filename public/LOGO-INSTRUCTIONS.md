# Logo Instructions

## Adding Your Logo

To add your custom logo to the newsletter submission system:

1. **Prepare your logo file:**
   - Recommended format: PNG or SVG
   - Recommended size: 400x400 pixels minimum
   - Transparent background works best
   - Save as `logo.png` or `logo.svg`

2. **Add to the project:**
   - Place your logo file in the `/public` directory
   - Name it `logo.png` (or `logo.svg`)

3. **Update the homepage:**
   - Open `/app/page.tsx`
   - Find the logo placeholder section (around line 30)
   - Uncomment the `<Image>` component:

```tsx
<Image 
  src="/logo.png" 
  alt="The GRIT Logo" 
  width={120} 
  height={120}
  className="rounded-full"
/>
```

4. **Remove the placeholder:**
   - Delete or comment out the placeholder `<div>` that shows "GRIT"

## Current Placeholder

The homepage currently shows a circular placeholder with "GRIT" text in the center. This will be automatically replaced when you add your logo file and uncomment the Image component.

## Logo Display

The logo appears:
- At the top of the homepage
- Inside a circular frame with southwestern-colored border
- 120x120 pixels display size
- Circular crop applied

## Customization

If you want to adjust the logo styling:
- Size: Change `width` and `height` values
- Border: Modify the `bg-gradient-to-br` colors
- Shape: Remove `rounded-full` for square logo

## Example with SVG

If using SVG format:
```tsx
<Image 
  src="/logo.svg" 
  alt="The GRIT Logo" 
  width={120} 
  height={120}
  className="rounded-full"
  priority
/>
```

The `priority` prop ensures faster loading for the logo.
