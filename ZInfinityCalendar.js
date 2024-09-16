// ZInfinityCalendar.js

class ZInfinityCalendar {
  constructor(canvasId, year) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.year = year;
    this.currentView = 'year';
    this.zoomLevels = ['year', 'month', 'week', 'day', 'hour'];
    this.events = [];
    this.colors = {
      background: '#f0f0f0',
      segment: '#ffffff',
      border: '#000000',
      text: '#333333',
      event: '#4285f4',
      highlight: '#e0e0e0'
    };
    this.currentSegment = null;
    this.innerRadiusRatio = 0.6;
    this.selectedDayInWeek = null;
    this.selectedDayInMonth = null;
    this.lastZoomTime = 0; // Initialize lastZoomTime
    this.zoomDelay = 300; // 300 milliseconds delay between zoom actions

    this.lastTouchY = 0;
    this.touchStartDistance = 0;
    this.isTimeZooming = false;
    this.hoveredSegment = null;

    this.initEventListeners();

    this.eventManager = new EventManager();
    //this.loadSampleData();

    this.renderer = new CalendarRenderer(
      this.ctx,
      this.canvas,
      this.colors,
      this.innerRadiusRatio,
      this.year,
      this.getMonthName.bind(this),
      this.getStartOfWeek.bind(this),
      this.eventManager
    );
  }

  initEventListeners() {
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  getMonthName(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
  }

  loadSampleData() {
    fetch('tito-sample-database.json')
      .then(response => response.json())
      .then(data => {
        console.log('Sample data loaded:', data); // Debug log
        data.timeEntries.forEach(entry => {
          const event = new CalendarEvent(
            entry.id,
            entry.projectId,
            entry.start,
            entry.end,
            entry.duration,
            entry.description,
            entry.order
          );
          this.eventManager.addEvent(event);
        });
        console.log('Events added to manager:', this.eventManager.events); // Debug log
        this.drawCurrentView();
      })
      .catch(error => console.error('Error loading sample data:', error));
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    if (this.currentView === 'week' && this.weekSegments.length > 0) {
      for (let i = 0; i < this.weekSegments.length; i++) {
        if (this.ctx.isPointInPath(this.weekSegments[i], this.mouseX, this.mouseY)) {
          if (this.selectedDayInWeek !== i) {
            this.selectedDayInWeek = i;
            this.drawCurrentView(); // Redraw to show the new highlight
          }
          break;
        }
      }
    }
  }

  handleWheel(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('Wheel event:', { x, y, deltaY: event.deltaY });

    if (event.deltaY < 0) {
      // Scroll up - zoom in
      console.log('Scrolling up - zooming in');
      this.zoomInToPosition(x, y);
    } else {
      // Scroll down - zoom out
      console.log('Scrolling down - zooming out');
      this.zoomOut();
    }
  }

  handleKeyDown(event) {
    console.log('Key pressed:', event.key);
    const currentTime = Date.now(); // Use Date.now() for consistency

    if (event.key === 'z') {
      // Zoom in
      if (currentTime - this.lastZoomTime > this.zoomDelay) {
        console.log('Z key pressed - zooming in', { x: this.mouseX, y: this.mouseY });
        this.zoomInToPosition(this.mouseX, this.mouseY);
        this.lastZoomTime = currentTime;
      } else {
        console.log('Zoom action ignored due to debounce');
      }
    } else if (event.key === 'x') {
      // Zoom out
      if (currentTime - this.lastZoomTime > this.zoomDelay) {
        console.log('X key pressed - zooming out');
        this.zoomOut();
        this.lastZoomTime = currentTime;
      } else {
        console.log('Zoom action ignored due to debounce');
      }
    }
  }


  handleTouchStart(event) {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.touchStartDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    }
  }

  handleTouchMove(event) {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      
      if (this.touchStartDistance && currentDistance) {
        if (currentDistance > this.touchStartDistance * 1.1) {
          // Zoom in
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;
          const rect = this.canvas.getBoundingClientRect();
          this.zoomInToPosition(centerX - rect.left, centerY - rect.top);
          this.touchStartDistance = currentDistance;
        } else if (currentDistance < this.touchStartDistance * 0.9) {
          // Zoom out
          this.zoomOut();
          this.touchStartDistance = currentDistance;
        }
      }
    }
  }

  handleTouchEnd() {
    this.touchStartDistance = 0;
  }

  zoomInToPosition(x, y) {
    console.log('zoomInToPosition called', { x, y });
    const segment = this.getSegmentFromPosition(x, y);
    console.log('Segment calculated:', segment);
    if (segment !== null) {
      this.zoomIn(segment);
    } else {
      console.log('No valid segment found for position');
    }
  }

  getSegmentFromPosition(x, y) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    console.log('getSegmentFromPosition', { x, y, distance, innerRadius, outerRadius });

    if (distance <= outerRadius && distance >= innerRadius) {
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;
      angle = (angle + Math.PI / 2) % (2 * Math.PI);

      let totalSegments;
      switch (this.currentView) {
        case 'year':
          totalSegments = 12;
          break;
        case 'month':
          totalSegments = new Date(this.year, this.currentSegment.month + 1, 0).getDate();
          break;
        case 'week':
          totalSegments = 7;
          break;
        case 'day':
          totalSegments = 24;
          break;
        default:
          return null;
      }

      const segment = Math.floor((angle / (2 * Math.PI)) * totalSegments);
      console.log('Calculated segment', { angle, totalSegments, segment });
      return segment;
    }

    console.log('Click outside of the calendar ring');
    return null;
  }

  animate(draw, duration, onComplete) {
    const start = performance.now();

    const animateFrame = (time) => {
      let timeFraction = (time - start) / duration;
      if (timeFraction > 1) timeFraction = 1;

      draw(timeFraction);

      if (timeFraction < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateFrame);
  }

  fetchEvents() {
    if (!this.icalUrl) {
      console.error('No iCal URL provided.');
      return;
    }

    const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(this.icalUrl)}`;

    fetch(proxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(icalData => {
        const jcalData = ICAL.parse(icalData);
        const vcalendar = new ICAL.Component(jcalData);
        this.events = vcalendar.getAllSubcomponents('vevent').map(vevent => new ICAL.Event(vevent));
        this.drawCurrentView();
      })
      .catch(error => {
        console.error('Error fetching or parsing iCal data:', error);
        alert('Failed to fetch calendar data. Please check your URL and try again.');
      });
  }

  displayEvents() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    this.events.forEach(event => {
      const startDate = event.startDate.toJSDate();
      if (startDate.getFullYear() === this.year) {
        const monthIndex = startDate.getMonth();
        const dayOfMonth = startDate.getDate();

        const startAngle = (monthIndex / 12) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((monthIndex + 1) / 12) * 2 * Math.PI - Math.PI / 2;
        const eventAngle = startAngle + (dayOfMonth / 31) * (endAngle - startAngle);

        const eventRadius = innerRadius + (outerRadius - innerRadius) * 0.5; // Middle of the "doughnut"
        const eventX = centerX + eventRadius * Math.cos(eventAngle);
        const eventY = centerY + eventRadius * Math.sin(eventAngle);

        // Draw event dot
        this.ctx.fillStyle = this.colors.event;
        this.ctx.beginPath();
        this.ctx.arc(eventX, eventY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    });
  }

  handleClick(x, y) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= outerRadius && distance >= innerRadius) {
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;
      angle = (angle + Math.PI / 2) % (2 * Math.PI);

      let segment;
      let totalSegments;

      switch (this.currentView) {
        case 'year':
          totalSegments = 12;
          break;
        case 'month':
          totalSegments = new Date(this.year, this.currentSegment.month + 1, 0).getDate();
          break;
        case 'week':
          totalSegments = 7;
          break;
        case 'day':
          totalSegments = 24;
          break;
        case 'hour':
          totalSegments = 60;
          break;
        default:
          return;
      }

      segment = Math.floor((angle / (2 * Math.PI)) * totalSegments);
      this.zoomIn(segment);
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  zoomIn(segment) {
    console.log('zoomIn called', { segment, currentView: this.currentView });
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex < this.zoomLevels.length - 1) {
      const nextView = this.zoomLevels[currentViewIndex + 1];
      const prevView = this.currentView;
      this.currentView = nextView;
      
      console.log('Zooming from', prevView, 'to', nextView);

      // Update currentSegment structure
      switch (nextView) {
        case 'month':
          if (prevView === 'year') {
            this.currentSegment = { month: segment };
          }
          break;
        case 'week':
          if (prevView === 'year') {
            const date = new Date(this.year, segment, 1);
            this.currentSegment = { 
              month: segment,
              week: this.getWeekNumber(date) - 1 // Adjust to 0-based index
            };
          } else if (prevView === 'month') {
            const clickedDate = new Date(this.year, this.currentSegment.month, segment + 1);
            this.currentSegment = { 
              month: this.currentSegment.month,
              week: this.getWeekNumber(clickedDate) - 1 // Adjust to 0-based index
            };
          }
          break;
        case 'day':
          if (prevView === 'week') {
            const startOfWeek = this.getStartOfWeek(this.year, this.currentSegment.week);
            const selectedDate = new Date(startOfWeek);
            selectedDate.setDate(startOfWeek.getDate() + segment);
            this.currentSegment = {
              ...this.currentSegment,
              day: segment,
              date: selectedDate
            };
            this.selectedDayInWeek = segment;
          } else if (prevView === 'month') {
            const clickedDate = new Date(this.year, this.currentSegment.month, segment + 1);
            this.currentSegment = {
              month: this.currentSegment.month,
              week: this.getWeekNumber(clickedDate) - 1, // Adjust to 0-based index
              day: clickedDate.getDay(),
              date: clickedDate
            };
          }
          break;
        case 'hour':
          if (prevView === 'day') {
            const currentDate = new Date(this.currentSegment.date);
            currentDate.setHours(segment);
            this.currentSegment = { 
              ...this.currentSegment,
              hour: segment,
              date: currentDate
            };
          }
          break;
      }

      console.log('Updated currentSegment', this.currentSegment);
      this.clearCanvas();
      this.drawCurrentView();
    } else {
      console.log('Already at maximum zoom level');
    }
  }

  zoomOut() {
    const prevViewIndex = this.zoomLevels.indexOf(this.currentView) - 1;
    if (prevViewIndex >= 0) {
      const prevView = this.currentView;
      const prevSegment = { ...this.currentSegment };  // Clone the current segment
      this.currentView = this.zoomLevels[prevViewIndex];

      console.log('Zooming out from', prevView, 'to', this.currentView);

      // Update currentSegment based on the view we're zooming out to
      switch (this.currentView) {
        case 'year':
          this.currentSegment = { date: new Date(this.year, 0, 1) };
          break;
        case 'month':
          if (prevSegment.date) {
            this.currentSegment = { 
              month: prevSegment.date.getMonth(),
              date: new Date(prevSegment.date.getFullYear(), prevSegment.date.getMonth(), 1)
            };
          } else if (prevSegment.month !== undefined) {
            this.currentSegment = {
              month: prevSegment.month,
              date: new Date(this.year, prevSegment.month, 1)
            };
          } else {
            console.error('Invalid prevSegment when zooming out to month view:', prevSegment);
            this.currentSegment = { month: 0, date: new Date(this.year, 0, 1) };
          }
          break;
        case 'week':
          if (prevSegment.date) {
            const weekStart = new Date(prevSegment.date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
            this.currentSegment = {
              month: weekStart.getMonth(),
              week: this.getWeekNumber(weekStart),
              date: weekStart
            };
          } else if (prevSegment.week !== undefined) {
            const weekStart = this.getStartOfWeek(this.year, prevSegment.week);
            this.currentSegment = {
              month: weekStart.getMonth(),
              week: prevSegment.week,
              date: weekStart
            };
          } else {
            console.error('Invalid prevSegment when zooming out to week view:', prevSegment);
            this.currentSegment = { 
              month: 0, 
              week: 0, 
              date: this.getStartOfWeek(this.year, 0) 
            };
          }
          break;
        case 'day':
          if (prevSegment.date) {
            this.currentSegment = {
              month: prevSegment.date.getMonth(),
              week: this.getWeekNumber(prevSegment.date) - 1, // Adjust to 0-based index
              day: prevSegment.date.getDay(),
              date: new Date(prevSegment.date)
            };
          } else {
            console.error('Invalid prevSegment when zooming out to day view:', prevSegment);
            this.currentSegment = { 
              month: 0, 
              week: 0, 
              day: 0, 
              date: new Date(this.year, 0, 1) 
            };
          }
          break;
      }

      console.log('Zoomed out to', this.currentView, 'with segment:', this.currentSegment);
      this.clearCanvas();
      this.drawCurrentView();
    }
  }

  // Add these helper methods to your class
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  // Updated getStartOfWeek method
  getStartOfWeek(year, week) {
    // January 4th is always in week 1 (according to ISO 8601)
    const jan4 = new Date(year, 0, 4);
    // Get the Monday of week 1
    const firstMonday = new Date(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
    // Add the necessary number of weeks
    const targetDate = new Date(firstMonday.getTime() + (week * 7) * 86400000);
    return targetDate;
  }

  drawTransition(fromView, toView, fromSegment, toSegment, progress) {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the "from" view slightly faded
    this.ctx.globalAlpha = 1 - progress;
    this.drawView(fromView, fromSegment);

    // Draw the "to" view fading in
    this.ctx.globalAlpha = progress;
    this.drawView(toView, toSegment);

    // Reset global alpha
    this.ctx.globalAlpha = 1;
  }

  drawCurrentView() {
    this.clearCanvas();
    switch (this.currentView) {
      case 'year':
        this.renderer.drawYearView();
        break;
      case 'month':
        this.renderer.drawMonthView(this.currentSegment);
        break;
      case 'week':
        this.weekSegments = this.renderer.drawWeekView(this.currentSegment, this.selectedDayInWeek);
        break;
      case 'day':
        this.renderer.drawDayView(this.currentSegment);
        break;
      case 'hour':
        this.renderer.drawHourView(this.currentSegment);
        break;
    }
  }

  drawView(view, segment) {
    const originalSegment = this.currentSegment;
    this.currentSegment = segment;  // Temporarily set the segment for drawing

    switch (view) {
      case 'year':
        this.renderer.drawYearView();
        break;
      case 'month':
        this.renderer.drawMonthView(segment ? segment.month : 0);
        break;
      case 'week':
        if (segment && segment.week !== undefined) {
          this.renderer.drawWeekView(segment);
        } else {
          // Fallback to month view if week is not defined
          this.renderer.drawMonthView(segment ? segment.month : 0);
        }
        break;
      case 'day':
        if (segment && segment.day !== undefined) {
          this.renderer.drawDayView(segment);
        } else {
          // Fallback to week or month view if day is not defined
          if (segment && segment.week !== undefined) {
            this.renderer.drawWeekView(segment);
          } else {
            this.renderer.drawMonthView(segment ? segment.month : 0);
          }
        }
        break;
      case 'hour':
        this.renderer.drawHourView(segment);
        break;
    }

    this.currentSegment = originalSegment;  // Restore the original segment
  }

  displayMonthEvents(monthIndex) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const daysInMonth = new Date(this.year, monthIndex + 1, 0).getDate();

    this.events.forEach(event => {
      const startDate = event.startDate.toJSDate();
      if (startDate.getFullYear() === this.year && startDate.getMonth() === monthIndex) {
        const dayOfMonth = startDate.getDate() - 1; // Adjust for 0-based index

        const startAngle = (dayOfMonth / daysInMonth) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((dayOfMonth + 1) / daysInMonth) * 2 * Math.PI - Math.PI / 2;
        const eventAngle = (startAngle + endAngle) / 2;

        const eventRadius = innerRadius + (outerRadius - innerRadius) * 0.5; // Middle of the "doughnut"
        const eventX = centerX + eventRadius * Math.cos(eventAngle);
        const eventY = centerY + eventRadius * Math.sin(eventAngle);

        // Draw event dot
        this.ctx.fillStyle = this.colors.event;
        this.ctx.beginPath();
        this.ctx.arc(eventX, eventY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    });
  }

  // Add placeholder methods for event display in different views
  displayWeekEvents(startDate, endDate) {
    console.log("Displaying events for week:", startDate, "to", endDate);
    // Implement week events display logic here
  }

  displayHourEvents(hourIndex) {
    console.log("Displaying events for hour:", hourIndex);
    // Implement hour events display logic here
  }

  // Add this method to help with debugging
  logCurrentSegment() {
    console.log('Current Segment:', JSON.stringify(this.currentSegment));
    if (this.currentSegment && this.currentSegment.week !== undefined) {
      const startDate = this.getStartOfWeek(this.year, this.currentSegment.week);
      console.log('Start of Week:', startDate.toISOString());
    }
  }

  addEvent(title, startDate, endDate, description = '') {
    const event = new CalendarEvent(Date.now(), title, startDate, endDate, description);
    this.eventManager.addEvent(event);
    this.redraw();
  }

  removeEvent(eventId) {
    this.eventManager.removeEvent(eventId);
    this.redraw();
  }

  updateEvent(eventId, updatedEvent) {
    this.eventManager.updateEvent(eventId, updatedEvent);
    this.redraw();
  }

  redraw() {
    // Call the appropriate draw method based on the current view
    switch (this.currentView) {
      case 'year':
        this.renderer.drawYearView();
        break;
      case 'month':
        this.renderer.drawMonthView();
        break;
      case 'week':
        this.renderer.drawWeekView();
      case 'day':
        this.renderer.drawDayView();
      case 'hour':
        this.renderer.drawHourView();
    }
  }

  clearDatabase() {
    this.eventManager.clearEvents().then(() => {
      console.log("Database cleared");
      this.drawCurrentView();
    }).catch(error => {
      console.error("Error clearing database:", error);
    });
  }

  importData(data) {
    console.log('Importing data:', data);
    this.eventManager.clearEvents().then(() => {
      const promises = data.timeEntries.map(entry => {
        const event = new CalendarEvent(
          entry.id,
          entry.projectId,
          entry.start,
          entry.end,
          entry.duration,
          entry.description,
          entry.order
        );
        return this.eventManager.addEvent(event);
      });
      return Promise.all(promises);
    }).then(() => {
      console.log('Events after import:', this.eventManager.events);
      this.drawCurrentView();
    }).catch(error => {
      console.error("Error importing data:", error);
    });
  }

  exportData() {
    const data = {
      timeEntries: this.eventManager.events.map(event => ({
        id: event.id,
        projectId: event.projectId,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        duration: event.duration,
        description: event.description,
        order: event.order
      }))
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar_data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  parseICalData(icalData) {
    const jcalData = ICAL.parse(icalData);
    const vcalendar = new ICAL.Component(jcalData);
    const events = vcalendar.getAllSubcomponents('vevent').map(vevent => {
      const event = new ICAL.Event(vevent);
      return new CalendarEvent(
        event.uid,
        null, // projectId (not available in iCal)
        event.startDate.toJSDate(),
        event.endDate.toJSDate(),
        event.duration.toSeconds() * 1000, // Convert to milliseconds
        event.summary,
        0 // order (not available in iCal)
      );
    });
    return events;
  }

}

