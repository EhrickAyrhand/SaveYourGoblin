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
**Estimated Time**:

**Why First**: 
- UI buttons already exist showing "not done yet" alerts
- High user value for sharing and archiving content
- No dependencies on other features

**Implementation Steps**:

1. **PDF Export**
   - [ X] Review existing `lib/export.ts` file structure
   - [X ] Enhance PDF generation for all content types:
     - [X ] Character sheets with stats, abilities, equipment
     - [X ] Environment descriptions with features, NPCs
     - [X ] Mission briefs with objectives, rewards
   - [X ] Add proper formatting:
     - [ X] Fonts (maintain theme fonts)
     - [ X] Layout (print-friendly margins, spacing)
     - [ X] Headers/footers with metadata
     - [X ] Page breaks where appropriate
   - [ X] Handle long content (multi-page support)
   - [ X] Add metadata (creation date, tags, notes)
   - [ X] Replace alert in `content-detail-modal.tsx` with actual PDF generation
   - [ X] Test with different content lengths and types

2. **JSON Export** (1-2 days)
   - [ X] Create JSON export function in `lib/export.ts`
   - [X ] Export full content data structure:
     - [ X] Include all metadata (id, type, created_at, tags, notes)
     - [ X] Include complete content_data object
     - [X ] Include scenario_input
     - [X ] Include links if present
   - [ X] Format as clean, readable JSON
   - [ X] Add option for "pretty print" (formatted) vs compact
   - [ X] Replace alert in `content-detail-modal.tsx` with actual JSON export
   - [ X] Test export and re-import scenarios

3. **UI Enhancements** (1 day)
   - [ X] Add loading states during export generation
   - [ X] Add success notifications
   - [ X] Handle errors gracefully
   - [X ] Consider adding export options modal (PDF settings, JSON format)

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
   - [x] Add search suggestions/autocomplete (optional enhancement)
   - [x] Add search history (recent searches) (optional enhancement)
   - [x] Improve search result highlighting (optional enhancement)
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

3. **UI for Section Regeneration** (2-3 days) ✅ COMPLETED
   - [x] Add section selector in content detail modal:
     - [x] Show all regenerable sections for current content type
     - [x] Add "Regenerate" button for each section
     - [x] Show loading state during regeneration
   - [x] Add confirmation before regenerating
   - [x] Allow "regenerate all" option
   - [x] Show diff preview (optional, advanced)
   - [x] Add undo/accept new changes
   - [x] Update content in database after regeneration
   - [x] Handle errors gracefully

---

### Priority 4: Advanced Prompts/Structured Inputs ⭐⭐⭐
**Status**: ✅ COMPLETED  
**Complexity**: High  
**Dependencies**: Generator page, AI generation  
**Estimated Time**: 7-10 days (Completed)

**✅ NOTE**: Generation Parameters (Temperature, Tone, Complexity) were reimplemented and are working: UI in Advanced mode (temperature slider, tone select, complexity select), passed to `lib/ai` as `generationParams`, and wired into prompts (`getToneInstruction`, `getComplexityInstruction`). Temperature is capped at 1.2 to reduce runaway text. Mission difficulty from advanced input is applied when the model omits it. Schema defaults added for mission `difficulty`, `rewardSchema.items`, `choiceBasedRewardSchema.rewards`, and `classFeatureSchema.level` to handle intermittent model omissions.

**Implementation Steps**:

1. **Structured Input Forms** (3-4 days) ✅ COMPLETED
   - [x] Review existing `types/rpg.ts` for AdvancedInput types
   - [x] Create dynamic form components for each content type:
     - [x] Character: level, class, race, background (alignment/personality as separate struct: optional, not implemented)
     - [x] Environment: mood, lighting, npcCount
     - [x] Mission: difficulty, objectiveCount, rewardTypes
   - [x] Add form state management
   - [x] Integrate with generator page
   - [x] Add form validation using Zod schemas (optional; API/backend validates)
   - [x] Create reusable form field components (optional; inline for now)

2. **Prompt Engineering** (2-3 days) ✅ COMPLETED
   - [x] Update `lib/ai.ts` to accept AdvancedInput and AdvancedGenerationParams
   - [x] Build structured prompts from form inputs (`buildAdvancedConstraints`, contentType-specific prompts)
   - [x] Combine structured inputs with free-form scenario
   - [x] Tone and complexity instructions in system prompts; temperature in generateObject
   - [ ] Add prompt preview in generator (optional)

3. **UI Integration** (2-3 days) ✅ COMPLETED
   - [x] Add "Advanced Options" expandable section in generator (⚙️ Advanced mode)
   - [x] Create collapsible form sections (Character, Environment, Mission, Generation Parameters)
   - [x] Add input placeholders and help text under each field
   - [x] Add "Reset to Defaults" button (optional)
   - [x] Save user preferences for structured inputs (optional)

---

### Priority 5: Campaign Builder (Basic) ⭐⭐⭐
**Status**: Not implemented  
**Complexity**: High  
**Dependencies**: Content linking, library structure  
**Estimated Time**: 10-14 days

**Implementation Steps**:

1. **Database Schema** (2-3 days)
   - [X ] Create `campaigns` table:
     - [X ] id, user_id, name, description
     - [ X] created_at, updated_at
     - [ X] settings (JSONB for flexible config)
   - [ X] Create `campaign_content` junction table:
     - [ X] campaign_id, content_id
     - [ X ] notes (content-specific to campaign)
   - [X ] Add RLS policies
   - [ X] Create migration file

2. **API Routes** (3-4 days)
   - [ X] `app/api/campaigns/route.ts`:
     - [X ] GET: List user's campaigns
     - [ X] POST: Create new campaign
   - [X ] `app/api/campaigns/[id]/route.ts`:
     - [X ] GET: Get campaign details with content
     - [X ] PATCH: Update campaign
     - [X ] DELETE: Delete campaign
   - [X ] `app/api/campaigns/[id]/content/route.ts`:
     - [X ] POST: Add content to campaign
     - [ X] DELETE: Remove content from campaign
     - [ X] PATCH: Update content order/notes

3. **Campaign Management UI** (3-4 days)
   - [ X] Create campaigns page: `app/[locale]/campaigns/page.tsx`
   - [ X] Campaign list view:
     - [ X] Show all user campaigns
     - [ X] Create new campaign button
     - [ X] Edit/delete actions
   - [ X] Campaign detail view:
     - [ X] Campaign info and settings
     - [ X] Linked content list (with drag-to-reorder)
     - [ X] Add content button (opens library selector)
     - [ X] Content notes per campaign

4. **Integration** (2-3 days)
   - [X ] Add "Add to Campaign" button in content detail modal
   - [X ] Create campaign selector modal
   - [X ] Show campaign tags on content cards
   - [X] Filter library by campaign
   - [ X] Add campaign context to content generation

---

### Priority 6: Session Notes ⭐⭐
**Status**: Not implemented  
**Complexity**: Medium  
**Dependencies**: Campaign builder (optional but recommended)  
**Estimated Time**: 4-5 days

**Implementation Steps**:

1. **Database Schema** (1 day)
   - [X ] Create `session_notes` table:
     - [X ] id, user_id, campaign_id (optional)
     - [X ] title, content, session_date
     - [X ] created_at, updated_at
     - [X ] linked_content_ids (array of UUIDs)
   - [ X] Add RLS policies
   - [ X] Create migration file

2. **API Routes** (2 days)
   - [ X] `app/api/sessions/route.ts`:
     - [X ] GET: List user's session notes
     - [ X] POST: Create new session note
   - [ X] `app/api/sessions/[id]/route.ts`:
     - [X ] GET: Get session note
     - [X ] PATCH: Update session note
     - [X ] DELETE: Delete session note

3. **Session Notes UI** (2 days)
   - [X ] Create session notes page or section
   - [X ] Session note editor:
     - [X ] Rich text editor (Markdown support)
     - [X ] Date picker
     - [ X] Link to content items
     - [ X] Link to campaigns
   - [ X] Session notes list/timeline view
   - [ X] Search and filter session notes

---

### Priority 7: Content History/Versioning ⭐
**Status**: Not implemented  
**Complexity**: High  
**Dependencies**: Content update system  
**Estimated Time**: 8-10 days

**Implementation Steps**:

1. **Database Schema** (2-3 days)
   - [X ] Create `content_versions` table:
     - [X ] id, content_id, user_id
     - [ X] version_number, content_data (snapshot)
     - [ X] change_summary, changed_by
     - [ X] created_at
   - [X ] Modify content update flow to create versions
   - [ X] Add RLS policies
   - [ X] Create migration file

2. **Version Management API** (3-4 days)
   - [X ] Auto-create versions on content updates:
     - [X ] Detect what changed
     - [X ] Create snapshot
     - [X ] Store change summary
   - [X ] `app/api/content/[id]/versions/route.ts`:
     - [X ] GET: List all versions for content
     - [X ] GET `/[versionId]`: Get specific version
     - [X ] POST: Restore to version (create new version)
   - [X ] Add version comparison endpoint

3. **Version History UI** (3 days)
   - [X ] Add "Version History" section in content detail modal
   - [X ] Show version timeline with changes
   - [ X] Add "View Version" button
   - [X ] Add "Restore Version" with confirmation
   - [ X] Add version notes/comments

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
