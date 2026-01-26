# Test Cases

## TC-001 - Generate Character Basic -- Passed✅
Steps:
1. Open generator
2. Select Character
3. Click Generate

Expected:
- Character content is generated
---

## TC-002 - Advanced mode invalid Character Level -- Passed✅
Steps:
1. Enable advanced mode
2. Set level = 50
3. Click Generate

Expected:
- Validation error shown
---

## TC-003 - Advanced mode invalid Character Class -- Fixed✅
Steps:
1. Enable advanced mode
2. Set class = anything
3. Click Generate

Expected:
- Validation error shown

Actual:
- Generate what's typed like: asjfjwadjad
    the output is class: asjfjwadjad
---

## TC-004 - Advanced mode invalid Character Race -- Fixed✅
Steps:
1. Enable advanced mode
2. Set Race = anything
3. Click Generate

Expected:
- Validation error shown

Actual:
- Generate what's typed like: asjfjwadjad
    the output is class: asjfjwadjad
---

## TC-005 - Advanced mode invalid Character Background -- Fixed✅
Steps:
1. Enable advanced mode
2. Set Background = anything
3. Click Generate

Expected:
- Validation error shown

Actual:
- Generate what's typed like: asjfjwadjad
    the output is class: asjfjwadjad
---

## TC-005 - Advanced mode invalid environment Mood -- Fixed✅
Steps:
1. Enable advanced mode
2. Set Mood = anything
3. Click Generate

Expected:
- Validation error shown

Actual:
- Generate what's typed like: asjfjwadjad
    the output is class: asjfjwadjad
---

## TC-006 - Advanced mode invalid environment Lighting -- Fixed✅
Steps:
1. Enable advanced mode
2. Set Lighting = anything
3. Click Generate

Expected:
- Validation error shown

Actual:
- Generate what's typed like: asjfjwadjad
    the output is class: asjfjwadjad
---

## TC-007 - Library searching with filters -- Fixed✅
Steps:
1. Choose one of the filter by type (Character - Envrionment - Quests - Favorites)
2. After selected search something that is not the filter
3. Press enter

Expected:
- Validation error shown: No saved content yet

Actual:
- It ignores the filter and searches even if it's not from the same filter.
---

## TC-008 - Library compare option -- Failed❎
Steps:
1. Choose two cards
2. After selected click in the compare button

Expected:
- Open the contents in the screen to compare

Actual:
- It open the contents correclty but don't follow the users page it only opens in the top of the page.
---

## TC-009 - Campaign dropbox background color -- Fixed✅
Steps:
1. Create a Campaign
2. After go for linekd content and click in add content 
3. Click in all types

Expected:
- Open the dropbox with the correct background (Following the preffered theme)

Actual:
- It open the dropbox correclty but don't follow the users preffered theme the background is always white.
---