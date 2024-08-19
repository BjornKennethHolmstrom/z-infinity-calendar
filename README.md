# Z∞ Calendar

Z∞ (Z-Infinity) is an innovative, zoomable circular calendar implementation. It provides a unique way to visualize and interact with calendar data, allowing users to seamlessly zoom from year view down to hour view.

## Features

- Circular calendar visualization
- Zoomable interface from year to hour view
- Smooth animations between zoom levels
- Integration with iCal data
- Event display across all zoom levels

## Getting Started

### Prerequisites

- Modern web browser
- Node.js and npm (for running the calendar proxy server)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/BjornKennethHolmstrom/z-infinity-calendar.git
   cd z-infinity-calendar
   ```

2. Set up the calendar proxy server:
   ```
   cd calendar-proxy
   npm install
   ```

3. Start the proxy server:
   ```
   node server.mjs
   ```

4. Open `index.html` in your web browser.

## Usage

- Click on a segment to zoom in (year → month → week → day → hour)
- Press 'Esc' key to zoom out
- Click the "Set Calendar URL" button to provide an iCal URL for event display

## Development

The main calendar logic is contained in `calendar.js`. To modify or extend the calendar functionality, edit this file.

## License

This project is licensed under the Z∞ Software License - see the [LICENSE](LICENSE) file for details.

## Contact

Björn Kenneth Holmström - bjorn.kenneth.holmstrom@gmail.com

Project Link: [https://github.com/BjornKennethHolmstrom/z-infinity-calendar](https://github.com/BjornKennethHolmstrom/z-infinity-calendar)
