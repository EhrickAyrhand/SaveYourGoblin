🔥 Smoke Test — Full Application Flows
Purpose

Verify that the main application flows work correctly after a build or deployment, ensuring the system is stable enough for deeper testing.

1. Authentication
1.1 Sign Up

 [X]User can access the Sign Up page

 [X]User can create an account with valid data

 [X]Validation errors appear for invalid inputs

 [X]Successful sign up redirects user correctly

1.2 Login

 [X]User can access the Login page

 [X]User can log in with valid credentials

 [X]Error message appears for invalid credentials

 [X]Logged-in user is redirected to the correct page

1.3 Logout

 [X]User can log out successfully

 [X]User session is cleared after logout

 [X]User is redirected to Login or Home page

2. User Profile
2.1 Profile Page

 [X]Profile page loads without errors

 [X]User data is displayed correctly

2.2 Edit Profile

 [X]User can update profile information

 [X]Avatar style selection works

 [X]Changes persist after page reload

 [X]Save confirmation or feedback is displayed

3. Localization (i18n)

 [X]Default language loads correctly

 [X]User can switch languages

 [X]All visible labels and buttons are translated

 [X]No hardcoded text appears after language switch

4. Core Application Features
4.1 Main Feature Access

 [X]Main feature page loads successfully

 [X]User can interact with primary actions

 [X]No console errors during interaction

4.2 Data Handling

 [X]Data is saved correctly

 [X]Data is retrieved and displayed correctly

 [ ]No data loss on refresh

5. Navigation

 [X]All main navigation links work

 [X]Back and forward navigation works correctly

 [X]Invalid routes show a proper error or fallback page

6. UI & Layout

 [X]Layout renders correctly on desktop

 [X]Buttons, inputs, and forms are clickable

 [X]No broken or overlapping UI elements

 [X]Icons and images load correctly

7. Error Handling

 [X]Application does not crash on invalid actions

 [X]Error messages are user-friendly

 [X]Application recovers gracefully from errors

8. Performance (Basic)

 [X]Pages load within acceptable time

 [X]No infinite loading states

 [X]No major performance bottlenecks observed

9. Browser Compatibility (Basic)

 [X]Works in Chrome

 [X]Works in Firefox

 [X]Works in Edge

✅ Smoke Test Result

✅Build Status: ⬜ Passed

Tested By: Ehrick Koczak

Date: 01/23/2026

Notes / Issues Found: 
In generator if have generated content in the page and accidently refresh the page you lost your content