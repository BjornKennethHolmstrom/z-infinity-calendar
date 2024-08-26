class ZInfinityCalendar {
  constructor(canvasId, year) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.year = year;
    this.currentView = 'year';
    this.zoomLevels = ['year', 'month', 'week', 'day', 'hour'];
    this.icalUrl = null;
    this.events = [];
    this.colors = {
      background: '#f0f0f0',
      segment: '#ffffff',
      border: '#000000',
      text: '#333333',
      event: '#4285f4',
      highlight: '#e0e0e0'
    };
    this.animationDuration = 500;
    this.animationStartTime = null;
    this.animationStartState = null;
    this.animationEndState = null;
    this.currentSegment = null;
    this.innerRadiusRatio = 0.6;
    this.selectedDayInWeek = null;
    this.selectedDayInMonth = null;

    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.touchStartDistance = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.lastZoomTime = 0;
    this.zoomDelay = 300; // 300 milliseconds delay between zoom actions
  }
  
  drawYearView() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    // Draw background "doughnut"
    this.ctx.fillStyle = this.colors.background;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, true);
    this.ctx.fill();

    // Draw month segments
    for (let i = 0; i < 12; i++) {
      const startAngle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / 12) * 2 * Math.PI - Math.PI / 2;

      this.ctx.fillStyle = this.colors.segment;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = this.colors.border;
      this.ctx.stroke();

      // Add month labels
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.getMonthName(i), labelX, labelY);
    }

    // Add year display in the center
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.year.toString(), centerX, centerY);

    this.displayEvents();
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    // Existing handleMouseMove logic for week view...
    if (this.currentView === 'week') {
      for (let i = 0; i < 7; i++) {
        if (this.ctx.isPointInPath(this.weekSegments[i], this.mouseX, this.mouseY)) {
          if (this.selectedDayInWeek !== i) {
            this.selectedDayInWeek = i;
            this.drawWeekView(); // Redraw to show the new highlight
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
    const currentTime = new Date().getTime();

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

  getMonthName(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
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
              day: segment
            };
            this.selectedDayInWeek = segment;
          } else if (prevView === 'month') {
            const clickedDate = new Date(this.year, this.currentSegment.month, segment + 1);
            this.currentSegment = {
              month: this.currentSegment.month,
              week: this.getWeekNumber(clickedDate) - 1, // Adjust to 0-based index
              day: clickedDate.getDay()
            };
          }
          break;
        case 'hour':
          if (prevView === 'day') {
            this.currentSegment = { 
              ...this.currentSegment,
              hour: segment 
            };
          }
          break;
      }

      console.log('Updated currentSegment', this.currentSegment);
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

      // Update currentSegment based on the view we're zooming out to
      switch (this.currentView) {
        case 'year':
          this.currentSegment = {};
          break;
        case 'month':
          this.currentSegment = { month: prevSegment.month };
          break;
        case 'week':
          if (prevView === 'day') {
            // Maintain the current week when zooming out from day to week
            this.currentSegment = {
              month: prevSegment.month,
              week: prevSegment.week
            };
          } else {
            // Default case (should not typically occur)
            const currentDate = new Date(this.year, prevSegment.month, 1);
            this.currentSegment = {
              month: prevSegment.month,
              week: this.getWeekNumber(currentDate) - 1 // Adjust to 0-based index
            };
          }
          break;
        case 'day':
          this.currentSegment = {
            month: prevSegment.month,
            week: prevSegment.week,
            day: prevSegment.day
          };
          break;
      }

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
    switch (this.currentView) {
      case 'year':
        this.drawYearView();
        break;
      case 'month':
        this.drawMonthView();
        break;
      case 'week':
        this.drawWeekView();
        break;
      case 'day':
        this.drawDayView();
        break;
      case 'hour':
        this.drawHourView();
        break;
    }
  }

  drawView(view, segment) {
    const originalSegment = this.currentSegment;
    this.currentSegment = segment;  // Temporarily set the segment for drawing

    switch (view) {
      case 'year':
        this.drawYearView();
        break;
      case 'month':
        this.drawMonthView(segment ? segment.month : 0);
        break;
      case 'week':
        if (segment && segment.week !== undefined) {
          this.drawWeekView(segment);
        } else {
          // Fallback to month view if week is not defined
          this.drawMonthView(segment ? segment.month : 0);
        }
        break;
      case 'day':
        if (segment && segment.day !== undefined) {
          this.drawDayView(segment);
        } else {
          // Fallback to week or month view if day is not defined
          if (segment && segment.week !== undefined) {
            this.drawWeekView(segment);
          } else {
            this.drawMonthView(segment ? segment.month : 0);
          }
        }
        break;
      case 'hour':
        this.drawHourView(segment);
        break;
    }

    this.currentSegment = originalSegment;  // Restore the original segment
  }

  drawMonthView(monthIndex) {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    // Ensure we're using the correct month from currentSegment
    const currentMonth = this.currentSegment.month;
    const daysInMonth = new Date(this.year, currentMonth + 1, 0).getDate();

    // Draw the circular segments for each day
    for (let i = 0; i < daysInMonth; i++) {
      const startAngle = (i / daysInMonth) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / daysInMonth) * 2 * Math.PI - Math.PI / 2;

      //this.ctx.fillStyle = (i === this.selectedDayInMonth) ? this.colors.highlight : this.colors.segment;
      this.ctx.fillStyle = this.colors.segment;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = this.colors.border;
      this.ctx.stroke();

      // Add day labels
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(i + 1, labelX, labelY);
    }

    // Update the month name and year display in the center
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${this.getMonthName(currentMonth)}, ${this.year}`, centerX, centerY);

    // Display events for this month
    this.displayMonthEvents(currentMonth);
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

  drawWeekView() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    if (!this.currentSegment || typeof this.currentSegment.week === 'undefined') {
      console.error('Invalid currentSegment:', this.currentSegment);
      return;
    }

    // Calculate the correct start date of the week
    const startDate = this.getStartOfWeek(this.year, this.currentSegment.week);

    for (let i = 0; i < 7; i++) {
      const startAngle = (i / 7) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / 7) * 2 * Math.PI - Math.PI / 2;

      this.ctx.fillStyle = (i === this.selectedDayInWeek) ? this.colors.highlight : this.colors.segment;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = this.colors.border;
      this.ctx.stroke();

      // Store the path for later hit detection
      this.weekSegments = this.weekSegments || [];
      this.weekSegments[i] = new Path2D();
      this.weekSegments[i].arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.weekSegments[i].arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.weekSegments[i].closePath();

      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      // Display weekday
      this.ctx.fillText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDate.getDay()], labelX, labelY - 10);

      // Display date
      this.ctx.font = '12px Arial';
      this.ctx.fillText(currentDate.getDate().toString(), labelX, labelY + 10);
    }

    // Calculate the end date of the week
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Add week range in the center
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateRangeText = `${formatDate(startDate)} to ${formatDate(endDate)}`;
    
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(dateRangeText, centerX, centerY - 10);

    // Calculate and display the week number
    const weekNumber = this.currentSegment.week + 1; // Convert back to 1-based index for display
    this.ctx.font = '14px Arial';
    this.ctx.fillText(`Week ${weekNumber}`, centerX, centerY + 15);

    // Display events for this week (implementation needed)
    // this.displayWeekEvents(startDate, endDate);
  }

  drawDayView() {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    for (let i = 0; i < 24; i++) {
      const startAngle = (i / 24) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / 24) * 2 * Math.PI - Math.PI / 2;

      this.ctx.fillStyle = this.colors.segment;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = this.colors.border;
      this.ctx.stroke();

      // Add hour labels
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${i}:00`, labelX, labelY);
    }

    // Calculate the correct date
    let currentDate;
    if (this.currentSegment.week !== undefined && this.selectedDayInWeek !== null) {
      // Coming from week view
      const startOfYear = new Date(this.year, 0, 1);
      const daysToAdd = this.currentSegment.week * 7 + this.selectedDayInWeek;
      currentDate = new Date(startOfYear);
      currentDate.setDate(startOfYear.getDate() + daysToAdd);
    } else if (this.currentSegment.month !== undefined && this.selectedDayInMonth !== null) {
      // Coming from month view
      currentDate = new Date(this.year, this.currentSegment.month, this.selectedDayInMonth + 1);
    } else {
      console.error('Invalid current segment:', this.currentSegment);
      return;
    }

    // Add date in the center
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(currentDate.toDateString(), centerX, centerY);

    // Display events for this day (implementation needed)
  }

  drawHourView() {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    // Draw 60 segments for minutes
    for (let i = 0; i < 60; i++) {
      const startAngle = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / 60) * 2 * Math.PI - Math.PI / 2;

      this.ctx.fillStyle = this.colors.segment;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = this.colors.border;
      this.ctx.stroke();

      // Add minute labels for every 5 minutes
      if (i % 5 === 0) {
        const labelRadius = (outerRadius + innerRadius) / 2;
        const labelAngle = (startAngle + endAngle) / 2;
        const labelX = centerX + labelRadius * Math.cos(labelAngle);
        const labelY = centerY + labelRadius * Math.sin(labelAngle);

        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${i}`, labelX, labelY);
      }
    }

    // Calculate the correct date and hour
    let currentDate;
    if (this.currentSegment.week !== undefined && this.selectedDayInWeek !== null) {
      // Coming from week view
      const startOfYear = new Date(this.year, 0, 1);
      const daysToAdd = this.currentSegment.week * 7 + this.selectedDayInWeek;
      currentDate = new Date(startOfYear);
      currentDate.setDate(startOfYear.getDate() + daysToAdd);
    } else if (this.currentSegment.month !== undefined && this.selectedDayInMonth !== null) {
      // Coming from month view
      currentDate = new Date(this.year, this.currentSegment.month, this.selectedDayInMonth + 1);
    } else {
      console.error('Invalid current segment:', this.currentSegment);
      return;
    }

    currentDate.setHours(this.currentSegment.hour, 0, 0, 0);

    // Add hour and date in the center
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${currentDate.toDateString()} ${this.currentSegment.hour}:00`, centerX, centerY);

    // Display events for this hour (implementation needed)
    // this.displayHourEvents(this.currentSegment.hour);
  }

  // Add this method to help with debugging
  logCurrentSegment() {
    console.log('Current Segment:', JSON.stringify(this.currentSegment));
    if (this.currentSegment && this.currentSegment.week !== undefined) {
      const startDate = this.getStartOfWeek(this.year, this.currentSegment.week);
      console.log('Start of Week:', startDate.toISOString());
    }
  }
}

// Usage
const calendar = new ZInfinityCalendar('calendarCanvas', 2024);
calendar.drawYearView();


document.getElementById('calendarCanvas').addEventListener('click', (event) => {
  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  calendar.handleClick(x, y);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    calendar.zoomOut();
  } else {
    calendar.handleKeyDown(event);
  }
});
