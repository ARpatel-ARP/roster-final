# Team-wise Roster Delivery & Postman Test Plan

## New workflow
Team -> Day/Week/Month -> Generate -> Preview -> Edit/Delete -> Export

- Automatic daily, weekly and monthly generation requires `teamId`.
- Generation uses only active employees belonging to the selected team.
- Help Desk is excluded from the consolidated CCC/Admin workbook.
- CCC/Admin export contains all other active teams.
- Help Desk export contains only Help Desk.

## Postman

Base URL: `http://localhost:8000/api`

Login first and keep the authenticated cookie.

### 1. Get Team IDs
GET `/teams`
Record IDs for Linux, Windows, Network, Help Desk and one other team.

### 2. Daily generation
POST `/rosters/generate/daily`
```json
{"teamId":"<NETWORK_TEAM_ID>","date":"2026-09-10"}
```
Expected: 201 and only Network employees.

GET `/rosters/generate/daily?teamId=<NETWORK_TEAM_ID>&date=2026-09-10`
Expected: 200 and only Network entries.

Negative:
- missing/invalid teamId -> 400
- nonexistent team -> 404
- inactive team -> 409
- same team/date twice -> 409
- another team for same date -> should work

### 3. Weekly generation
POST `/rosters/generate/weekly`
```json
{"teamId":"<NETWORK_TEAM_ID>","startDate":"2026-09-07"}
```
Expected: 201, 7 days, only Network.

GET `/rosters/generate/weekly?teamId=<NETWORK_TEAM_ID>&startDate=2026-09-07`
Expected: 200, only Network.

Negative:
- missing/invalid teamId -> 400
- same team/week twice -> 409
- another team for same week -> should work

### 4. Monthly generation
POST `/rosters/generate/monthly`
```json
{"teamId":"<NETWORK_TEAM_ID>","month":9,"year":2026}
```
Expected: 201, September entries only for Network.

GET `/rosters/generate/monthly?teamId=<NETWORK_TEAM_ID>&month=9&year=2026`
Expected: 200, only Network.

Negative:
- missing/invalid teamId -> 400
- same team/month twice -> 409
- another team for September -> should work

### 5. Team isolation
Generate Linux and Windows for the same month. Fetch each separately.
Expected: each response contains only its own team's employees and both monthly records coexist.

### 6. Business-rule regression
Verify:
- approved leave -> Leave/Off
- one shift per employee per date
- Night -> Morning restriction
- max six consecutive working days
- Help Desk night recovery
- weekend rules
- staffing shortage is a warning, not a hard failure

### 7. Generated entry update
PUT `/rosters/generate/<ENTRY_ID>`
```json
{"employee":"<EMPLOYEE_ID>","date":"2026-09-10","shift":"<SHIFT_ID>"}
```
Expected: 200 and `manuallyEdited: true`.

### 8. Generated entry delete
DELETE `/rosters/generate/<ENTRY_ID>`
Expected: 200; fetch again and confirm it is gone.

### 9. CCC/Admin Excel
GET `/rosters/export/ccc?month=9&year=2026`

Expected:
- 200 `.xlsx`
- sheet `CCC Admin Roster`
- non-Help-Desk teams present
- September date columns
- M/G/E/N plus WOF/Leave/Holiday where applicable
- Help Desk absent

### 10. Help Desk Excel
GET `/rosters/export/help-desk?month=9&year=2026`

Expected:
- 200 `.xlsx`
- sheet `Help Desk Roster`
- only Help Desk employees
- no CCC/Admin teams

### 11. Published protection
For a published team/month, generation should return 409.

## Final smoke test
Login -> Team Roster -> Network Day -> verify team isolation -> another team Week -> another team Month -> Help Desk Month -> download CCC/Admin -> download Help Desk -> open both in Excel -> production build -> NIC deployment test.
