## ADDED Requirements

### Requirement: Desktop hero layout preserves headline hierarchy
The landing page hero MUST preserve clear visual hierarchy between the primary headline block and the floating terminal/cards on desktop viewports.

#### Scenario: No overlap between headline and cards at desktop
- **GIVEN** the user views `/` at a desktop width (≥ 1280px)
- **WHEN** the hero renders with the headline on the left and the card stack on the right
- **THEN** no part of the card stack visually overlaps or obscures the main headline or subcopy
- **AND** there is visible negative space separating the text column from the card stack, consistent with the reference design.

#### Scenario: Cards can shift but text stays legible on smaller widths
- **GIVEN** the user views `/` on a viewport narrower than the primary design width
- **WHEN** the hero layout responsively adjusts
- **THEN** the cards may resize, stack, or shift position
- **BUT** the main headline and supporting copy remain fully legible and are not covered by the cards.
