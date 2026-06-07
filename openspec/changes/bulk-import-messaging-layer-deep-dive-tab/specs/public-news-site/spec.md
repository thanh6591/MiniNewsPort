## ADDED Requirements

### Requirement: Bulk import diagram page supports tabbed instructional content
The system SHALL keep the existing diagram view on `/diagrams/bulk-import-messaging` and additionally provide a tabbed interface that allows users to switch between the visual system diagram and instructional backend deep-dive content.

#### Scenario: Tab switching preserves diagram and reveals deep-dive content
- **WHEN** a user switches between "System Diagram" and "Backend Deep Dive" tabs
- **THEN** the selected tab content is rendered without route change, and the existing Mermaid diagram remains available under the diagram tab

### Requirement: Tabbed learning content remains responsive and readable for beginners
The system SHALL render deep-dive instructional sections with responsive layout and clear typography so that long, code-linked explanations remain readable on mobile and desktop.

#### Scenario: Deep-dive tab is readable on mobile viewport
- **WHEN** a user opens the deep-dive tab on a mobile viewport
- **THEN** the content reflows into a single-column layout with no horizontal overflow and preserves readable hierarchy for steps, function references, and storage notes

### Requirement: Deep-dive tab content is testable with deterministic section markers
The system SHALL expose stable section labels/markers for each instructional step so UI and e2e tests can assert that core walkthrough stages are rendered.

#### Scenario: Automated test verifies presence of all walkthrough stages
- **WHEN** a test loads `/diagrams/bulk-import-messaging` and selects the deep-dive tab
- **THEN** the test can assert deterministic stage markers for intake, enqueue, processing, retry/dead-letter, progress polling, and email notification sections
