## ADDED Requirements

### Requirement: Marketing landing page mirrors prototype
The system SHALL provide a marketing / landing page at `/` whose layout, typography, and interactions closely match the `j16z-fe-mock` `LandingPage` component and the "Design2" specification.

#### Scenario: Landing renders terminal-style hero
- **WHEN** a user loads `/`
- **THEN** they see the "THE SIGNAL IN THE NOISE" hero, terminal-style visualizations, and institutional branding consistent with the existing mock
- **AND** the navigation includes links to sections (Features, Workflow, Pricing) and a CTA that routes to `/login`.

### Requirement: Login terminal mirrors prototype
The system SHALL provide a login screen at `/login` with the "J16Z TERMINAL" aesthetic from the existing mock, including Analyst ID and Passkey fields and the animated beam/cursor treatment.

#### Scenario: Login form present and routes into app shell
- **WHEN** a user loads `/login`
- **THEN** they see the login terminal UI (fields, labels, encryption badge) matching the prototype
- **AND** submitting the form (with any values during this phase) SHALL route the user to `/app` without throwing errors.

### Requirement: Authenticated app shell mirrors prototype
The system SHALL provide an authenticated app shell at `/app` that reproduces the mock's sidebar, header, and overall layout.

#### Scenario: App shell layout loaded at /app
- **WHEN** a user navigates to `/app`
- **THEN** they see the left sidebar with logo, sections (Platform, Research), nav items (Dashboard, Live Monitor, Deal Intelligence, AI Analyst, Prediction Mkts, Risk Radar, Settings)
- **AND** the top header shows system status (SYSTEM_NOMINAL, latency) and plan badge, consistent with the mock.

### Requirement: Analyst dashboard view mirrors prototype
The system SHALL provide a dashboard view at `/app` that matches the `Dashboard` component from the mock (metrics grid, ingestion chart, watchlist, data feeds sidebar).

#### Scenario: Dashboard renders core widgets
- **WHEN** a user loads `/app`
- **THEN** they see system metrics cards, ingestion volume chart, priority watchlist, and data feeds panel with mock data values matching or closely approximating the existing constants.

### Requirement: Feed manager view mirrors prototype
The system SHALL provide a feed manager view at `/app/feed` that matches the `FeedManager` component layout and interactions.

#### Scenario: Feed manager lists data sources
- **WHEN** a user loads `/app/feed`
- **THEN** they see a table of data sources (SEC EDGAR, CourtListener, Reuters, etc.) with status and controls (play/pause, settings) as in the mock
- **AND** data is driven by the shared `DATA_SOURCES` mock constants.

### Requirement: Intelligence feed and detail view mirror prototype
The system SHALL provide an intelligence feed at `/app/intelligence` with row-based listing and a detail overlay matching `IntelligenceFeed` and `DetailView` from the mock.

#### Scenario: Intelligence feed lists items and opens detail view
- **WHEN** a user views `/app/intelligence`
- **THEN** they see a tabular list of intelligence items sourced from `MOCK_ITEMS`
- **AND** clicking a row opens a side-panel or overlay showing full document content and AI summary/risk cards as mocked.

### Requirement: AI chat assistant mirrors prototype
The system SHALL provide an AI chat interface at `/app/chat` styled like the existing `ChatAssistant` component and backed by the current Gemini mock service.

#### Scenario: Chat assistant accepts input and shows streamed responses
- **WHEN** a user opens `/app/chat` and submits a prompt
- **THEN** the UI appends the user message
- **AND** shows a streaming model response (using the existing Gemini service or a compatible mock)
- **AND** includes the "Thinking & Searching Google" indicator and citation chips as in the mock.

### Requirement: Settings view mirrors prototype
The system SHALL provide a settings view at `/app/settings` where alert rules, digest configuration, and data connectors are surfaced as in the mock `Settings` component.

#### Scenario: Settings screen renders configuration groups
- **WHEN** a user opens `/app/settings`
- **THEN** they see Monitoring Rules, Intelligence Delivery, and Data Connectors sections
- **AND** toggles, selects, and static values match the prototype (no back-end persistence required in this phase).
