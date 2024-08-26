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
      switch (this.currentView) {
        case 'year':
          segment = Math.floor((angle / (2 * Math.PI)) * 12);
          break;
        case 'month':
          segment = Math.floor((angle / (2 * Math.PI)) * 30);
          break;
        case 'week':
          segment = Math.floor((angle / (2 * Math.PI)) * 7);
          break;
        case 'day':
          segment = Math.floor((angle / (2 * Math.PI)) * 24);
          break;
        case 'hour':
          segment = Math.floor((angle / (2 * Math.PI)) * 60);
          break;
      }
      this.zoomIn(segment);
    }
  }

  zoomIn(segment) {
    const nextViewIndex = this.zoomLevels.indexOf(this.currentView) + 1;
    if (nextViewIndex < this.zoomLevels.length) {
      const prevView = this.currentView;
      this.currentView = this.zoomLevels[nextViewIndex];
      
      // Update currentSegment structure
      switch (this.currentView) {
        case 'month':
          this.currentSegment = { month: segment };
          break;
        case 'week':
          this.currentSegment = { 
            month: this.currentSegment.month,
            week: Math.floor(segment / 7) 
          };
          break;
        case 'day':
          this.currentSegment = { 
            month: this.currentSegment.month,
            week: this.currentSegment.week,
            day: segment % 7 
          };
          this.selectedDayInWeek = segment % 7; // Store the selected day
          break;
        case 'hour':
          this.currentSegment = { 
            month: this.currentSegment.month,
            week: this.currentSegment.week,
            day: this.currentSegment.day,
            hour: segment 
          };
          break;
      }

      // Implement animation and drawing logic here
      this.drawCurrentView();
    }
  }

  zoomOut() {
    const prevViewIndex = this.zoomLevels.indexOf(this.currentView) - 1;
    if (prevViewIndex >= 0) {
      const prevView = this.currentView;
      this.currentView = this.zoomLevels[prevViewIndex];

      const startState = { zoom: 1 };
      const endState = { zoom: 0 };

      // Update currentSegment based on the view we're zooming out to
      switch (this.currentView) {
        case 'year':
          // Instead of setting to null, keep the month information
          this.currentSegment = { month: this.currentSegment.month };
          break;
        case 'month':
          this.currentSegment = { month: this.currentSegment.month };
          break;
        case 'week':
          this.currentSegment = { 
            month: this.currentSegment.month,
            week: Math.floor(this.currentSegment.day / 7)
          };
          break;
        case 'day':
          this.currentSegment = {
            month: this.currentSegment.month,
            week: this.currentSegment.week,
            day: this.currentSegment.day
          };
          break;
      }

      this.animate(
        (progress) => {
          const currentState = {
            zoom: startState.zoom + (endState.zoom - startState.zoom) * progress
          };
          this.drawTransition(prevView, this.currentView, this.currentSegment, 1 - currentState.zoom);
        },
        this.animationDuration,
        () => {
          console.log(`Zoomed out to ${this.currentView} view`, this.currentSegment);
          this.drawCurrentView();
        }
      );
    }
  }

  drawTransition(fromView, toView, segment, progress) {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the "from" view slightly faded
    this.ctx.globalAlpha = 1 - progress;
    this.drawView(fromView, segment);

    // Draw the "to" view fading in
    this.ctx.globalAlpha = progress;
    this.drawView(toView, segment);

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
    switch (view) {
      case 'year':
        this.drawYearView();
        break;
      case 'month':
        this.drawMonthView(segment ? segment.month : 0);
        break;
      case 'week':
        this.drawWeekView(segment);
        break;
      case 'day':
        this.drawDayView(segment);
        break;
      case 'hour':
        this.drawHourView(segment);
        break;
    }
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

    if (!this.currentSegment || typeof this.currentSegment.month === 'undefined' || typeof this.currentSegment.week === 'undefined') {
      console.error('Invalid currentSegment:', this.currentSegment);
      return;
    }

    // Calculate the correct start date of the week
    const jan1 = new Date(this.year, 0, 1);
    const daysSinceJan1 = this.currentSegment.week * 7;
    const startDate = new Date(jan1);
    startDate.setDate(jan1.getDate() + daysSinceJan1 - jan1.getDay());

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
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateRangeText = `${startDate.toLocaleDateString('en-CA', dateOptions)} to ${endDate.toLocaleDateString('en-CA', dateOptions)}`;
    
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(dateRangeText, centerX, centerY - 10);

    // Calculate and display the week number
    const weekNumber = this.getWeekNumber(startDate);
    this.ctx.font = '14px Arial';
    this.ctx.fillText(`Week ${weekNumber}`, centerX, centerY + 15);

    // Display events for this week (implementation needed)
    // this.displayWeekEvents(startDate, endDate);
  }

  // Add a helper method to calculate the week number
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
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
    const jan1 = new Date(this.year, 0, 1);
    const daysSinceJan1 = this.currentSegment.week * 7 + this.currentSegment.day;
    const currentDate = new Date(jan1);
    currentDate.setDate(jan1.getDate() + daysSinceJan1 - jan1.getDay());

    // Add date in the center
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(currentDate.toDateString(), centerX, centerY);

    // Display events for this day (implementation needed)
  }

  drawHourView(hourIndex) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

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
        this.ctx.fillText(i.toString().padStart(2, '0'), labelX, labelY);
      }
    }

    // Calculate the correct date
    const startOfMonth = new Date(this.year, this.currentSegment.month, 1);
    const currentDate = new Date(startOfMonth);
    currentDate.setDate(startOfMonth.getDate() + this.currentSegment.week * 7 + this.currentSegment.day);
    currentDate.setHours(this.currentSegment.hour);

    const weekday = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Add weekday, date, and hour in the center
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.font = '18px Arial';
    this.ctx.fillText(weekday, centerX, centerY - 20);
    
    this.ctx.font = '16px Arial';
    this.ctx.fillText(formattedDate, centerX, centerY);
    
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`${this.currentSegment.hour}:00`, centerX, centerY + 25);


    // Display events for this hour (implementation needed)
    this.displayHourEvents(hourIndex);
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
  }
});
