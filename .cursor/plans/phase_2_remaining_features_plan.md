---
name: Phase 2 Remaining Features Implementation Plan
overview: Comprehensive plan for implementing the remaining Phase 2 Core Enhancement features for SaveYourGoblin
priority: high
estimated_time: "4-6 weeks"
---

# Phase 2 Remaining Features Implementation Plan

## Overview

This plan outlines the implementation strategy for the remaining Phase 2 Core Enhancement features:
- Export features (PDF, JSON)
- Advanced prompts/structured inputs
- Content search improvements
- Regenerate sections
- Campaign builder (basic)
- Session notes
- Content history/versioning

## Implementation Priority Order

### Priority 1: Export Features (PDF, JSON) ⭐⭐⭐
**Status**: UI ready, functionality missing  
**Complexity**: Medium  
**Dependencies**: None  
**Estimated Time**: 3-5 days

**Why First**: 
- UI buttons already exist showing "not done yet" alerts
- High user value for sharing and archiving content
- No dependencies on other features

**Implementation Steps**:

1. **PDF Export** (2-3 days)
   - [ ] Review existing `lib/export.ts` file structure
   - [ ] Enhance PDF generation for all content types:
     - [ ] Character sheets with stats, abilities, equipment
     - [ ] Environment descriptions with features, NPCs
     - [ ] Mission briefs with objectives, rewards
   - [ ] Add proper formatting:
     - [ ] Fonts (maintain theme fonts)
     - [ ] Layout (print-friendly margins, spacing)
     - [ ] Headers/footers with metadata
     - [ ] Page breaks where appropriate
   - [ ] Handle long content (multi-page support)
   - [ ] Add metadata (creation date, tags, notes)
   - [ ] Replace alert in `content-detail-modal.tsx` with actual PDF generation
   - [ ] Test with different content lengths and types

2. **JSON Export** (1-2 days)
   - [ ] Create JSON export function in `lib/export.ts`
   - [ ] Export full content data structure:
     - [ ] Include all metadata (id, type, created_at, tags, notes)
     - [ ] Include complete content_data object
     - [ ] Include scenario_input
     - [ ] Include links if present
   - [ ] Format as clean, readable JSON
   - [ ] Add option for "pretty print" (formatted) vs compact
   - [ ] Replace alert in `content-detail-modal.tsx` with actual JSON export
   - [ ] Test export and re-import scenarios

3. **UI Enhancements** (1 day)
   - [ ] Add loading states during export generation
   - [ ] Add success notifications
   - [ ] Handle errors gracefully
   - [ ] Consider adding export options modal (PDF settings, JSON format)

---

### Priority 2: Content Search Improvements ⭐⭐⭐
**Status**: ✅ COMPLETED  
**Complexity**: Medium  
**Dependencies**: None  
**Estimated Time**: 4-5 days (Completed)

**Why Second**:
- Improves user experience significantly
- Builds on existing search infrastructure
- No complex dependencies

**Implementation Steps**:

1. **Enhanced Search Functionality** (2-3 days) ✅ COMPLETED
   - [x] Review current search implementation in `app/api/content/route.ts`
   - [x] Add full-text search in content_data JSONB:
     - [x] Search in character names, descriptions, abilities
     - [x] Search in environment names, descriptions, features
     - [x] Search in mission titles, descriptions, objectives
   - [x] Add tag-based filtering (multiple tags support)
   - [x] Add type filtering (already exists, enhance UI)
   - [x] Add date range filtering
   - [x] Add favorite-only filter
   - [x] Combine filters (AND/OR logic)

2. **Search UI Improvements** (1-2 days) ✅ COMPLETED
   - [x] Add advanced search panel/modal:
     - [x] Type selector (character/environment/mission/all)
     - [x] Tag multi-select
     - [x] Date range picker
     - [x] Favorite checkbox
     - [x] Clear filters button
   - [ ] Add search suggestions/autocomplete (optional enhancement)
   - [ ] Add search history (recent searches) (optional enhancement)
   - [ ] Improve search result highlighting (optional enhancement)
   - [x] Add "no results" message with suggestions

3. **Search Performance** (1 day) ✅ COMPLETED
   - [x] Add search debouncing for real-time search
   - [x] Optimize database queries with proper indexes
   - [x] Add pagination for large result sets (via limit/offset)
   - [x] Add result count display

---

### Priority 3: Regenerate Sections ⭐⭐
**Status**: API implemented, UI missing  
**Complexity**: Medium-High  
**Dependencies**: AI generation, content structure  
**Estimated Time**: 2-3 days remaining

**Implementation Steps**:

1. **Section Identification** (1-2 days) ✅ COMPLETED
   - [x] Analyze content structure for all types:
     - [x] Characters: spells, skills, traits, racialTraits, classFeatures, background, personality
     - [x] Environments: npcs, features, adventureHooks, currentConflict
     - [x] Missions: objectives, rewards, relatedNPCs, context, hooks
   - [x] Create section mapping interface (defined in `lib/ai.ts` with schemas)
   - [x] Identify which sections can be regenerated independently

2. **Regeneration API** (2-3 days) ✅ COMPLETED
   - [x] Create API route: `app/api/generate/regenerate/route.ts`
   - [x] Design prompt system for section-specific regeneration:
     - [x] Take original content as context
     - [x] Generate prompt for specific section
     - [x] Maintain consistency with rest of content
   - [x] Handle partial content updates
   - [x] Validate regenerated section structure (using Zod schemas)
   - [x] Merge new section with existing content

3. **UI for Section Regeneration** (2-3 days) ⚠️ IN PROGRESS
   - [ ] Add section selector in content detail modal:
     - [ ] Show all regenerable sections for current content type
     - [ ] Add "Regenerate" button for each section
     - [ ] Show loading state during regeneration
   - [ ] Add confirmation before regenerating
   - [ ] Allow "regenerate all" option
   - [ ] Show diff preview (optional, advanced)
   - [ ] Add undo/accept new changes
   - [ ] Update content in database after regeneration
   - [ ] Handle errors gracefully

---

### Priority 4: Advanced Prompts/Structured Inputs ⭐⭐⭐
**Status**: Partially started  
**Complexity**: High  
**Dependencies**: Generator page, AI generation  
**Estimated Time**: 7-10 days

**Implementation Steps**:

1. **Structured Input Forms** (3-4 days)
   - [ ] Review existing `types/rpg.ts` for AdvancedInput types
   - [ ] Create dynamic form components for each content type:
     - [ ] Character: race, class, level, alignment, personality traits
     - [ ] Environment: setting type, mood, size, era, culture
     - [ ] Mission: difficulty, length, type, themes
   - [ ] Add form validation using Zod schemas
   - [ ] Create reusable form field components
   - [ ] Add form state management
   - [ ] Integrate with generator page

2. **Prompt Engineering** (2-3 days)
   - [ ] Update `lib/ai.ts` to accept AdvancedInput
   - [ ] Build structured prompts from form inputs
   - [ ] Combine structured inputs with free-form scenario
   - [ ] Test prompt variations for quality
   - [ ] Add prompt preview in generator

3. **UI Integration** (2-3 days)
   - [ ] Add "Advanced Options" expandable section in generator
   - [ ] Create collapsible form sections
   - [ ] Add input examples/placeholders
   - [ ] Add tooltips explaining each field
   - [ ] Add "Reset to Defaults" button
   - [ ] Save user preferences for structured inputs

---

### Priority 5: Campaign Builder (Basic) ⭐⭐⭐
**Status**: Not implemented  
**Complexity**: High  
**Dependencies**: Content linking, library structure  
**Estimated Time**: 10-14 days

**Implementation Steps**:

1. **Database Schema** (2-3 days)
   - [ ] Create `campaigns` table:
     - [ ] id, user_id, name, description
     - [ ] created_at, updated_at
     - [ ] settings (JSONB for flexible config)
   - [ ] Create `campaign_content` junction table:
     - [ ] campaign_id, content_id
     - [ ] order/sequence
     - [ ] notes (content-specific to campaign)
   - [ ] Add RLS policies
   - [ ] Create migration file

2. **API Routes** (3-4 days)
   - [ ] `app/api/campaigns/route.ts`:
     - [ ] GET: List user's campaigns
     - [ ] POST: Create new campaign
   - [ ] `app/api/campaigns/[id]/route.ts`:
     - [ ] GET: Get campaign details with content
     - [ ] PATCH: Update campaign
     - [ ] DELETE: Delete campaign
   - [ ] `app/api/campaigns/[id]/content/route.ts`:
     - [ ] POST: Add content to campaign
     - [ ] DELETE: Remove content from campaign
     - [ ] PATCH: Update content order/notes

3. **Campaign Management UI** (3-4 days)
   - [ ] Create campaigns page: `app/[locale]/campaigns/page.tsx`
   - [ ] Campaign list view:
     - [ ] Show all user campaigns
     - [ ] Create new campaign button
     - [ ] Edit/delete actions
   - [ ] Campaign detail view:
     - [ ] Campaign info and settings
     - [ ] Linked content list (with drag-to-reorder)
     - [ ] Add content button (opens library selector)
     - [ ] Content notes per campaign

4. **Integration** (2-3 days)
   - [ ] Add "Add to Campaign" button in content detail modal
   - [ ] Create campaign selector modal
   - [ ] Show campaign tags on content cards
   - [ ] Filter library by campaign
   - [ ] Add campaign context to content generation

---

### Priority 6: Session Notes ⭐⭐
**Status**: Not implemented  
**Complexity**: Medium  
**Dependencies**: Campaign builder (optional but recommended)  
**Estimated Time**: 4-5 days

**Implementation Steps**:

1. **Database Schema** (1 day)
   - [ ] Create `session_notes` table:
     - [ ] id, user_id, campaign_id (optional)
     - [ ] title, content, session_date
     - [ ] created_at, updated_at
     - [ ] linked_content_ids (array of UUIDs)
   - [ ] Add RLS policies
   - [ ] Create migration file

2. **API Routes** (2 days)
   - [ ] `app/api/sessions/route.ts`:
     - [ ] GET: List user's session notes
     - [ ] POST: Create new session note
   - [ ] `app/api/sessions/[id]/route.ts`:
     - [ ] GET: Get session note
     - [ ] PATCH: Update session note
     - [ ] DELETE: Delete session note

3. **Session Notes UI** (2 days)
   - [ ] Create session notes page or section
   - [ ] Session note editor:
     - [ ] Rich text editor (Markdown support)
     - [ ] Date picker
     - [ ] Link to content items
     - [ ] Link to campaigns
   - [ ] Session notes list/timeline view
   - [ ] Search and filter session notes

---

### Priority 7: Content History/Versioning ⭐
**Status**: Not implemented  
**Complexity**: High  
**Dependencies**: Content update system  
**Estimated Time**: 8-10 days

**Implementation Steps**:

1. **Database Schema** (2-3 days)
   - [ ] Create `content_versions` table:
     - [ ] id, content_id, user_id
     - [ ] version_number, content_data (snapshot)
     - [ ] change_summary, changed_by
     - [ ] created_at
   - [ ] Modify content update flow to create versions
   - [ ] Add RLS policies
   - [ ] Create migration file

2. **Version Management API** (3-4 days)
   - [ ] Auto-create versions on content updates:
     - [ ] Detect what changed
     - [ ] Create snapshot
     - [ ] Store change summary
   - [ ] `app/api/content/[id]/versions/route.ts`:
     - [ ] GET: List all versions for content
     - [ ] GET `/[versionId]`: Get specific version
     - [ ] POST: Restore to version (create new version)
   - [ ] Add version comparison endpoint

3. **Version History UI** (3 days)
   - [ ] Add "Version History" section in content detail modal
   - [ ] Show version timeline with changes
   - [ ] Add "View Version" button
   - [ ] Add "Restore Version" with confirmation
   - [ ] Show diff view (optional, advanced)
   - [ ] Add version notes/comments

---

## Implementation Notes

### Technical Considerations

1. **Database Migrations**
   - All new features require migrations
   - Test migrations on development first
   - Backup production data before migrations

2. **API Consistency**
   - Follow existing API patterns
   - Use consistent error handling
   - Add proper authentication/authorization

3. **UI/UX Consistency**
   - Follow existing component patterns
   - Maintain theme and styling
   - Ensure mobile responsiveness

4. **Testing Strategy**
   - Test each feature independently
   - Integration testing for dependent features
   - User acceptance testing before production

### Dependencies Between Features

- **Campaign Builder** benefits from:
  - Content linking (already done) ✅
  - Advanced search (for finding content to add)

- **Session Notes** benefits from:
  - Campaign builder (for campaign context)
  - Content linking (for referencing content)

- **Content History** benefits from:
  - All update features (regenerate, edit, etc.)

### Risk Assessment

**Low Risk**:
- Export features (isolated functionality)
- Search improvements (enhancement of existing)

**Medium Risk**:
- Regenerate sections (complex AI prompts)
- Session notes (new feature but isolated)

**High Risk**:
- Campaign builder (complex relationships)
- Content history (data integrity concerns)
- Advanced prompts (AI quality dependency)

## Timeline Estimate

**Total Estimated Time**: 4-6 weeks (assuming 1 developer, full-time)

**Recommended Sprint Breakdown**:
- **Sprint 1 (1 week)**: Export features + Search improvements
- **Sprint 2 (1 week)**: Regenerate sections
- **Sprint 3 (1-2 weeks)**: Advanced prompts/structured inputs
- **Sprint 4 (1-2 weeks)**: Campaign builder (basic)
- **Sprint 5 (1 week)**: Session notes + Content history (if time permits)

## Success Criteria

Each feature should:
- ✅ Work correctly with existing content
- ✅ Follow existing code patterns and conventions
- ✅ Have proper error handling
- ✅ Be mobile responsive
- ✅ Include proper internationalization (i18n)
- ✅ Have basic tests (unit/integration where applicable)
