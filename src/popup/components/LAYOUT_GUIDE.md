# Layout Component Guide

## Overview

The `Layout` component provides a consistent UI structure for all extension pages with:

1. **Fixed Top Bar** - Navigation with title, back button, and actions
2. **Scrollable Content Area** - Main content that scrolls independently
3. **Fixed Action Buttons** - Primary actions anchored at bottom

## Layout Structure

```
┌─────────────────────────────────┐
│ Top Bar (fixed, 400x60px)       │
│  ← Back | Title | [Settings ⚙️] │
├─────────────────────────────────┤
│                                 │
│ Content Area (scrollable)       │
│ - Flex-grow to fill space       │
│ - overflow-y: auto              │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Action Buttons (fixed, ~60px)   │
│  [Primary Action Button]        │
└─────────────────────────────────┘
```

## Usage Examples

### Basic Page with Title

```tsx
<Layout title="Page Title" subtitle="Optional subtitle">
  <div>Your scrollable content here</div>
</Layout>
```

### Page with Back Button

```tsx
<Layout
  title="Settings"
  showBack={true}
  onBack={() => navigate('/home')}
>
  <div>Content</div>
</Layout>
```

### Page with Top Bar Actions

```tsx
<Layout
  title="Home"
  topBarRight={
    <button onClick={() => navigate('/settings')}>
      ⚙️
    </button>
  }
>
  <div>Content</div>
</Layout>
```

### Page with Bottom Action Buttons

```tsx
<Layout
  title="Unlock Wallet"
  actions={
    <div className="space-y-2">
      <Button onClick={handleSubmit} className="w-full">
        Submit
      </Button>
      <button onClick={handleCancel} className="w-full text-sm">
        Cancel
      </button>
    </div>
  }
>
  <div>Form content</div>
</Layout>
```

### Full Example (All Features)

```tsx
<Layout
  title="Account Settings"
  subtitle="Manage your account"
  showBack={true}
  onBack={() => navigate(-1)}
  topBarRight={
    <button onClick={handleHelp}>❓</button>
  }
  actions={
    <>
      <Button onClick={handleSave} className="w-full">
        Save Changes
      </Button>
      <Button onClick={handleCancel} variant="outline" className="w-full mt-2">
        Cancel
      </Button>
    </>
  }
>
  {/* Your scrollable content */}
  <div className="space-y-4">
    <Card>...</Card>
    <Card>...</Card>
    {/* Content scrolls if it exceeds available space */}
  </div>
</Layout>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | ReactNode | Main content (scrollable) |
| `title` | string | Page title in top bar |
| `subtitle` | string | Subtitle below title |
| `showBack` | boolean | Show back button |
| `onBack` | function | Back button click handler |
| `topBarRight` | ReactNode | Additional actions in top bar (e.g., settings icon) |
| `actions` | ReactNode | Action buttons for bottom area |

## Design Guidelines

### Top Bar
- Keep titles short (truncates if too long)
- Use topBarRight for secondary actions (settings, help, etc.)
- Back button appears on the left when showBack is true

### Content Area
- Use `space-y-4` for consistent vertical spacing
- Cards and sections will scroll if content exceeds viewport
- No need to manage overflow - handled by layout

### Action Buttons
- Primary action should be prominent (solid button)
- Secondary actions can be outline or text buttons
- Use `w-full` for full-width buttons
- Stack multiple actions with `space-y-2`

## Dimensions

- Popup size: **400px × 600px** (fixed)
- Top bar: **~60px** (depends on subtitle)
- Action area: **~60px** (depends on content)
- Content area: **Remaining space** (scrollable)

## Best Practices

1. ✅ **DO** use consistent spacing (`space-y-4` for content)
2. ✅ **DO** keep action buttons simple and clear
3. ✅ **DO** use the layout for all pages
4. ❌ **DON'T** add your own scroll containers inside content
5. ❌ **DON'T** use absolute/fixed positioning inside content
6. ❌ **DON'T** put action buttons in the content area

## Migration Guide

### Before (Old Layout)
```tsx
<Layout title="Page">
  <div className="max-w-md mx-auto">
    <Card>Content</Card>
    <Button>Submit</Button>
  </div>
</Layout>
```

### After (New Layout)
```tsx
<Layout
  title="Page"
  actions={<Button className="w-full">Submit</Button>}
>
  <Card>Content</Card>
</Layout>
```

The new layout handles spacing, scrolling, and button positioning automatically!
