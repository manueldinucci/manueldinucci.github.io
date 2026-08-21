# V9 acceptance notes

Automated checks cover JavaScript syntax, auction budget/maxBid logic, opponent logic, card formatting, PWA app-shell cache, v9 static UX requirements, and XLSX mapping.

The official 2026/27 XLSX used during development was also tested externally against the parser: header row 2, 505 players, 0 issues, with `Qt.A -> quotazione` and `Qt.I -> quotazione_iniziale`.

Manual iPhone acceptance remains required for touch density, dark-mode visual contrast, Home Screen PWA update behavior, and fully offline interaction.
