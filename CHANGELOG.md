# Changelog

All notable changes to the Z∞ Calendar project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of the circular zoomable calendar
- Year, month, week, day, and hour views
- Smooth transitions between zoom levels
- Keyboard controls (z for zoom in, x for zoom out, Esc for zoom out)
- Mouse wheel zooming
- Basic event handling structure

### Changed
- Refactored code to separate rendering logic into CalendarRenderer class
- Improved date handling and transitions between zoom levels

### Fixed
- Corrected date display issues when zooming between different views
- Fixed debounce issue with keyboard zoom controls

## [0.1.0] - YYYY-MM-DD
- Initial release of Z∞ Calendar

[Unreleased]: https://github.com/YourUsername/z-infinity-calendar/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YourUsername/z-infinity-calendar/releases/tag/v0.1.0
