class ZInfinityCalendar {
  constructor(canvasId, year) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.year = year;
    this.currentView = 'year';
    this.zoomLevels = ['year', 'month', 'week', 'day', 'hour'];
    this.currentData = {};
    this.innerRadiusFactor = 0.6;
    this.icalUrl = '';
    this.setupCanvas();
    this.drawYearView();
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.setupCalendarLink();
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupCalendarLink() {
    const link = document.getElementById('calendarLink');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.getAttribute('data-url');
      console.log('Loading calendar from URL:', url);
      this.icalUrl = url;
      this.fetchEvents();
    });
  }

  drawYearView() {
    console.log('Drawing year view... 🌀'); // Using the infinity symbol in comments
    const numMonths = 12;
    const angleStep = (2 * Math.PI) / numMonths;
    const outerRadius = Math.min(this.canvas.width, this.canvas.height) / 2 - 10;
    const innerRadius = outerRadius * this.innerRadiusFactor;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < numMonths; i++) {
      const startAngle = i * angleStep;
      const endAngle = (i + 1) * angleStep;
      const x1 = centerX + outerRadius * Math.cos(startAngle);
      const y1 = centerY + outerRadius * Math.sin(startAngle);
      const x2 = centerX + outerRadius * Math.cos(endAngle);
      const y2 = centerY + outerRadius * Math.sin(endAngle);
      const innerX1 = centerX + innerRadius * Math.cos(startAngle);
      const innerY1 = centerY + innerRadius * Math.sin(startAngle);
      const innerX2 = centerX + innerRadius * Math.cos(endAngle);
      const innerY2 = centerY + innerRadius * Math.sin(endAngle);

      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(innerX1, innerY1);
      this.ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle, true);
      this.ctx.closePath();
      this.ctx.fillStyle = 'lightblue';
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.fill();
      this.ctx.stroke();

      this.currentData[i] = {
        startAngle,
        endAngle,
        outerRadius,
        innerRadius,
        centerX,
        centerY
      };
    }
  }

  handleClick(event) {
    console.log('Canvas clicked:', event);
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log('Click position:', x, y);

    const angle = Math.atan2(y - this.canvas.height / 2, x - this.canvas.width / 2);
    const radius = Math.sqrt((x - this.canvas.width / 2) ** 2 + (y - this.canvas.height / 2) ** 2);

    for (const [segment, data] of Object.entries(this.currentData)) {
      if (this.isWithinSegment(angle, radius, data)) {
        console.log(`Segment clicked: ${segment}`);
        this.zoomIn(segment);
        return;
      }
    }
  }

  isWithinSegment(angle, radius, data) {
    const startAngle = data.startAngle;
    const endAngle = data.endAngle;
    const innerRadius = data.innerRadius;
    const outerRadius = data.outerRadius;
    
    const withinAngle = angle >= startAngle && angle <= endAngle;
    const withinRadius = radius >= innerRadius && radius <= outerRadius;
    
    return withinAngle && withinRadius;
  }

  async fetchEvents() {
    if (!this.icalUrl) {
      console.error('No iCal URL provided.');
      return;
    }

    console.log('Fetching events from URL:', this.icalUrl);

    try {
      const mockIcalData = `
      BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//Your Organization//NONSGML v1.0//EN
      BEGIN:VEVENT
      UID:1234567890@example.com
      DTSTAMP:20240808T090000Z
      DTSTART:20240808T100000Z
      DTEND:20240808T110000Z
      SUMMARY:Test Event
      DESCRIPTION:This is a test event.
      END:VEVENT
      END:VCALENDAR
      `;
      const icalData = mockIcalData;
      const jcalData = ICAL.parse(icalData);
      const vcalendar = new ICAL.Component(jcalData);
      const events = vcalendar.getAllProperties('vevent').map(event => new ICAL.Event(event));
      
      this.displayEvents(events);
    } catch (error) {
      console.error('Error fetching or parsing iCal data:', error);
    }
  }

  displayEvents(events) {
    events.forEach(event => {
      console.log(`Event: ${event.summary} on ${event.startDate.toString()}`);
    });
  }
}

// Usage
const calendar = new ZInfinityCalendar('calendarCanvas', 2024);

