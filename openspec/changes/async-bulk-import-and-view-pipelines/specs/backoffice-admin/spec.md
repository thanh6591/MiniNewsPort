## ADDED Requirements

### Requirement: Bulk import submission UI
The system SHALL provide an authenticated admin bulk import screen with a textarea for one URL per line and a required target category selector.

#### Scenario: Admin submits a valid bulk import batch
- **WHEN** the admin pastes between 1 and 100 URLs, selects a target category, and submits the form
- **THEN** the system accepts the batch, shows a success notification indicating that background processing has started, and redirects the admin to the batch progress dashboard

#### Scenario: Submission rejects too many URLs
- **WHEN** the admin submits more than 100 non-empty lines in the textarea
- **THEN** the form shows a validation error and no batch request is sent

#### Scenario: Category selection is required
- **WHEN** the admin submits URLs without selecting a target category
- **THEN** the form shows a validation error and keeps the entered URLs intact

### Requirement: Bulk import progress dashboard
The system SHALL provide an authenticated admin dashboard that tracks the lifecycle status of each imported URL in near real time.

#### Scenario: Dashboard shows per-item lifecycle states
- **WHEN** the admin opens the progress dashboard for a submitted batch
- **THEN** the page lists each imported URL with its current status as `Pending`, `Processing`, `Published`, or `Failed`

#### Scenario: Dashboard refreshes background progress
- **WHEN** background workers update item statuses while the dashboard is open
- **THEN** the page reflects those updates without requiring the admin to resubmit the batch

#### Scenario: Failure details are visible
- **WHEN** an imported URL reaches `Failed`
- **THEN** the dashboard shows the failure reason for that item so the admin can distinguish issues such as selector mismatch, timeout, or not found