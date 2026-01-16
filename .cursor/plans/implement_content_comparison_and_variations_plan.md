---
name: Implement Content Comparison and Content Variations
overview: Implement two Phase 1 enrichment features: Content Comparison (side-by-side comparison of two content items) and Content Variations (generate variations of existing content).
todos:
  - id: "1"
    content: Create variation generation API endpoint
    status: pending
  - id: "2"
    content: Add variation generation function to lib/ai.ts
    status: pending
  - id: "3"
    content: Add Generate Variation button to library cards
    status: pending
  - id: "4"
    content: Add Generate Variation button to content detail modal
    status: pending
  - id: "5"
    content: Add variation handler to library page
    status: pending
  - id: "6"
    content: Create content comparison modal component
    status: pending
  - id: "7"
    content: Add comparison state and handler to library page
    status: pending
  - id: "8"
    content: Add Compare button to bulk actions (when 2 items selected)
    status: pending
  - id: "9"
    content: Add translation keys for both features
    status: pending
---

# Plan: Implement Content Comparison and Content Variations

## Overview

Implement two Phase 1 enrichment features:
1. **Content Comparison**: Allow users to compare two pieces of content side-by-side
2. **Content Variations**: Generate variations of existing content items

## Feature 1: Content Comparison

### User Flow
1. User selects items in library using checkboxes
2. When exactly 2 items of the same type are selected, show "Compare" button
3. Clicking "Compare" opens a modal with side-by-side view
4. Modal displays both items with their full details
5. Only same-type items can be compared (character vs character, environment vs environment, mission vs mission)

### Implementation Details

#### 1. Create Comparison Modal Component
**File**: `components/rpg/content-comparison-modal.tsx` (new file)

- Props:
  - `items: [LibraryContentItem, LibraryContentItem]` - The two items to compare
  - `isOpen: boolean` - Modal visibility state
  - `onClose: () => void` - Close handler
- Layout:
  - Side-by-side on desktop (grid-cols-2)
  - Stacked on mobile (flex-col)
  - Use existing card components: `CharacterCard`, `EnvironmentCard`, `MissionCard`
  - Show metadata (date, tags, notes) for both items
- Features:
  - Close button and escape key support
  - Responsive design
  - Scrollable content areas

#### 2. Update Library Page
**File**: `app/[locale]/library/page.tsx`

- Add state:
  ```typescript
  const [itemsToCompare, setItemsToCompare] = useState<LibraryContentItem[]>([])
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)
  ```
- Add handler:
  ```typescript
  function handleCompare() {
    const selected = filteredContent.filter(item => selectedIds.has(item.id))
    if (selected.length !== 2) return
    if (selected[0].type !== selected[1].type) {
      setError("Can only compare items of the same type")
      return
    }
    setItemsToCompare(selected as [LibraryContentItem, LibraryContentItem])
    setIsComparisonOpen(true)
  }
  ```
- Add "Compare" button in bulk actions area (visible when exactly 2 items selected)
- Import and render `ContentComparisonModal`

#### 3. Update Library Card
**File**: `components/rpg/library-card.tsx`

- Ensure checkbox selection works properly (already implemented)
- No changes needed if checkbox already works

### Files to Create/Modify
- **Create**: `components/rpg/content-comparison-modal.tsx`
- **Modify**: `app/[locale]/library/page.tsx`

## Feature 2: Content Variations

### User Flow
1. User views a content item (in library card or detail modal)
2. Clicks "Generate Variation" button
3. System generates a new variation using original content as context
4. Variation is saved as new content item
5. User can view/edit the variation

### Implementation Details

#### 1. Create Variation Generation API
**File**: `app/api/generate/variation/route.ts` (new file)

- Endpoint: `POST /api/generate/variation`
- Request body:
  ```typescript
  {
    originalContentId: string
    contentType: ContentType
    variationPrompt?: string // Optional custom variation instructions
  }
  ```
- Logic:
  1. Fetch original content from database
  2. Call `generateContentVariation()` from `lib/ai.ts`
  3. Save variation to database
  4. Return new content item
- Authentication: Require verified email (use `requireVerifiedEmail`)

#### 2. Add Variation Generation Function
**File**: `lib/ai.ts`

- Add function:
  ```typescript
  export async function generateContentVariation(
    originalContent: GeneratedContent,
    contentType: ContentType,
    variationPrompt?: string
  ): Promise<GeneratedContent>
  ```
- Logic:
  - Build prompt that includes original content summary
  - Example: "Generate a variation of this [type]: [original summary]. Create a similar but different version. [variationPrompt]"
  - Use existing `generateRPGContent` with modified prompt
  - Maintain same structure but with different details

#### 3. Update Library Card
**File**: `components/rpg/library-card.tsx`

- Add prop: `onGenerateVariation?: (item: LibraryContentItem) => void`
- Add "Generate Variation" button (visible on hover, similar to duplicate)
- Button icon: 🔄
- Loading state: `const [isGeneratingVariation, setIsGeneratingVariation] = useState(false)`

#### 4. Update Content Detail Modal
**File**: `components/rpg/content-detail-modal.tsx`

- Add prop: `onGenerateVariation?: (item: LibraryContentItem) => void`
- Add "Generate Variation" button in action buttons area
- Same functionality as library card

#### 5. Update Library Page
**File**: `app/[locale]/library/page.tsx`

- Add handler:
  ```typescript
  async function handleGenerateVariation(item: LibraryContentItem) {
    try {
      setIsGeneratingVariation(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      
      if (!accessToken) throw new Error("Not authenticated")
      
      const response = await fetch("/api/generate/variation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          originalContentId: item.id,
          contentType: item.type,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate variation")
      }
      
      const result = await response.json()
      
      // Refresh content list
      await fetchContent()
      await fetchAllContent()
      
      // Optionally open the new variation
      if (result.data) {
        setSelectedItem(result.data)
        setIsModalOpen(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate variation")
    } finally {
      setIsGeneratingVariation(false)
    }
  }
  ```
- Pass handler to `LibraryCard` and `ContentDetailModal`

### Files to Create/Modify
- **Create**: `app/api/generate/variation/route.ts`
- **Modify**: `lib/ai.ts` - Add `generateContentVariation` function
- **Modify**: `components/rpg/library-card.tsx` - Add variation button
- **Modify**: `components/rpg/content-detail-modal.tsx` - Add variation button
- **Modify**: `app/[locale]/library/page.tsx` - Add variation handler

## Translation Keys

Add to `messages/en.json`, `messages/pt-BR.json`, `messages/es.json`:

```json
{
  "library": {
    "compare": "Compare",
    "comparing": "Comparing...",
    "compareItems": "Compare Items",
    "selectTwoItems": "Select exactly 2 items of the same type to compare",
    "generateVariation": "Generate Variation",
    "generatingVariation": "Generating Variation...",
    "variationSuccess": "Variation generated successfully!",
    "variationError": "Failed to generate variation"
  },
  "comparison": {
    "title": "Content Comparison",
    "close": "Close",
    "item1": "Item 1",
    "item2": "Item 2",
    "sameTypeRequired": "Both items must be of the same type"
  }
}
```

## Implementation Order

### Phase 1: Content Variations (Simpler)
1. Create variation API endpoint
2. Add variation generation function to `lib/ai.ts`
3. Add variation button to library card
4. Add variation handler to library page
5. Add variation button to detail modal
6. Test variation generation

### Phase 2: Content Comparison
1. Create comparison modal component
2. Add comparison state to library page
3. Add compare button to bulk actions
4. Add comparison handler
5. Test comparison display

## Database Schema (Optional Future Enhancement)

Consider adding `parent_content_id` to track variations:
```sql
ALTER TABLE generated_content 
ADD COLUMN parent_content_id UUID REFERENCES generated_content(id);
```

This would allow:
- Showing "variations" in detail modal
- Filtering by original vs variation
- Tracking variation relationships

**Note**: This is optional and can be added later. For now, variations are just new content items.

## UI/UX Details

### Comparison Modal
- Layout: CSS Grid with `grid-cols-1 md:grid-cols-2`
- Each side shows full content using existing card components
- Scrollable content areas
- Close button in header
- Escape key closes modal

### Variation Generation
- Button shows loading spinner while generating
- Success: Show success message (toast/banner)
- Error: Show error message
- After generation: Optionally auto-open detail modal for new variation

## Testing Checklist

- [ ] Generate variation for character
- [ ] Generate variation for environment
- [ ] Generate variation for mission
- [ ] Variation saves correctly to database
- [ ] Compare two characters
- [ ] Compare two environments
- [ ] Compare two missions
- [ ] Compare button disabled when 0, 1, or 3+ items selected
- [ ] Compare button disabled when items are different types
- [ ] Comparison modal responsive on mobile
- [ ] Error handling for both features
- [ ] Loading states work correctly
