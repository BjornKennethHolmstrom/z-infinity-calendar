// ZInfinityCalendar.js

class ZInfinityCalendar {
  constructor(containerId, year) {
    this.container = document.getElementById(containerId);
    this.currentYear = year;
    this.currentSegment = { year: this.currentYear };
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
    this.innerRadiusRatio = 0.6;
    this.selectedDayInWeek = null;
    this.selectedDayInMonth = null;

    this.lastTouchY = 0;
    this.touchStartDistance = 0;
    this.isTimeZooming = false;
    this.hoveredSegment = null;

    this.initSVG();
    this.initEventListeners();

    this.eventManager = new EventManager();
    
    this.renderer = new CalendarRenderer(
      this.svg,
      this.calendarGroup,
      this.colors,
      this.innerRadiusRatio,
      this.currentYear,
      this.getMonthName.bind(this),
      this.getStartOfWeek.bind(this),
      this.eventManager
    );

    this.drawCurrentView();
    this.currentSegment = { year: year };
  }

  initSVG() {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.setAttribute("viewBox", "0 0 1000 1000");
    this.container.appendChild(this.svg);


    // Create a group for the entire calendar
    this.calendarGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.calendarGroup);

    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

initEventListeners() {
  this.svg.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
  document.addEventListener('keydown', this.handleKeyDown.bind(this));
  this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
  this.svg.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  this.svg.addEventListener('click', this.handleClick.bind(this));
  this.svg.addEventListener('touchstart', this.handleTouchStart.bind(this));
  this.svg.addEventListener('touchmove', this.handleTouchMove.bind(this));
  this.svg.addEventListener('touchend', this.handleTouchEnd.bind(this));
}

  drawCurrentView() {
    while (this.calendarGroup.firstChild) {
      this.calendarGroup.removeChild(this.calendarGroup.firstChild);
    }

    this.renderer.setCurrentView(this.currentView, this.currentSegment);
    this.renderer.drawCurrentView();
  }

  handleWheel(event) {
    event.preventDefault();
    const rect = this.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1; // Zoom out (0.9) or in (1.1)
    this.zoomTo(this.zoomLevel * zoomFactor, x, y);
  }

  handleKeyDown(event) {
    switch (event.key) {
      case 'z':
        if (this.hoveredSegment !== null) {
          this.zoomInTimeView(this.hoveredSegment);
        }
        break;
      case 'x':
      case 'Escape':
        this.zoomOutTimeView();
        break;
    }
  }

  handleMouseMove(event) {
    const rect = this.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const newHoveredSegment = this.getSegmentFromPosition(x, y);
    if (newHoveredSegment !== this.hoveredSegment) {
      this.hoveredSegment = newHoveredSegment;
      this.renderer.setHoveredSegment(this.hoveredSegment);
    }
  }

  handleMouseLeave() {
    this.hoveredSegment = null;
    this.renderer.setHoveredSegment(null);
  }

  handleClick(event) {
    const rect = this.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const segment = this.getSegmentFromPosition(x, y);
    if (segment !== null) {
      this.zoomInToPosition(x, y);
    }
  }

  handleTouchStart(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.svg.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.touchStartSegment = this.getSegmentFromPosition(x, y);
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    } else if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.touchStartDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      this.lastTouchX = (touch1.clientX + touch2.clientX) / 2;
      this.lastTouchY = (touch1.clientY + touch2.clientY) / 2;
    }
  }

  handleTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.svg.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const currentSegment = this.getSegmentFromPosition(x, y);
      
      if (currentSegment !== this.touchStartSegment) {
        // Handle segment change if needed
        this.touchStartSegment = currentSegment;
      }
      
      const dx = touch.clientX - this.lastTouchX;
      const dy = touch.clientY - this.lastTouchY;
      this.pan(dx / this.zoomLevel, dy / this.zoomLevel);
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    } else if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      const zoomFactor = currentDistance / this.touchStartDistance;
      this.zoomTo(this.zoomLevel * zoomFactor, centerX, centerY);
      
      this.touchStartDistance = currentDistance;
      this.lastTouchX = centerX;
      this.lastTouchY = centerY;
    }
  }

  handleTouchEnd() {

  }

  zoomInTimeView(segment) {
    console.log('zoomInTimeView called', { segment, currentView: this.currentView });
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
            this.currentSegment = { year: this.currentYear, month: segment };
          }
          break;
        case 'week':
          if (prevView === 'year') {
            const date = new Date(this.currentYear, segment, 1);
            this.currentSegment = { 
              year: this.currentYear,
              month: segment,
              week: this.getWeekNumber(date) - 1 // Adjust to 0-based index
            };
          } else if (prevView === 'month') {
            const clickedDate = new Date(this.currentYear, this.currentSegment.month, segment + 1);
            this.currentSegment = { 
              year: this.currentYear,
              month: this.currentSegment.month,
              week: this.getWeekNumber(clickedDate) - 1 // Adjust to 0-based index
            };
          }
          break;
        case 'day':
          if (prevView === 'week') {
            const startOfWeek = this.getStartOfWeek(this.currentYear, this.currentSegment.week + 1);
            const selectedDate = new Date(startOfWeek);
            selectedDate.setDate(startOfWeek.getDate() + segment);
            this.currentSegment = {
              ...this.currentSegment,
              day: segment,
              date: selectedDate
            };
          } else if (prevView === 'month') {
            const clickedDate = new Date(this.currentYear, this.currentSegment.month, segment + 1);
            this.currentSegment = {
              year: this.currentYear,
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
      this.clearSVG(); // Make sure to implement this method
      this.drawCurrentView();
    } else {
      console.log('Already at maximum zoom level');
    }
  }


  zoomOutTimeView() {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex > 0) {
      const prevView = this.currentView;
      const prevSegment = { ...this.currentSegment };  // Clone the current segment
      this.currentView = this.zoomLevels[currentViewIndex - 1];

      console.log('Zooming out from', prevView, 'to', this.currentView);

      // Update currentSegment based on the view we're zooming out to
      switch (this.currentView) {
        case 'year':
          this.currentSegment = { year: this.currentYear, date: new Date(this.currentYear, 0, 1) };
          break;
        case 'month':
          if (prevSegment.date) {
            this.currentSegment = { 
              year: this.currentYear,
              month: prevSegment.date.getMonth(),
              date: new Date(prevSegment.date.getFullYear(), prevSegment.date.getMonth(), 1)
            };
          } else if (prevSegment.month !== undefined) {
            this.currentSegment = {
              year: this.currentYear,
              month: prevSegment.month,
              date: new Date(this.currentYear, prevSegment.month, 1)
            };
          } else {
            console.error('Invalid prevSegment when zooming out to month view:', prevSegment);
            this.currentSegment = { year: this.currentYear, month: 0, date: new Date(this.currentYear, 0, 1) };
          }
          break;
        case 'week':
          if (prevSegment.date) {
            const weekStart = new Date(prevSegment.date);
            weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Set to Monday
            this.currentSegment = {
              year: this.currentYear,
              month: weekStart.getMonth(),
              week: this.getWeekNumber(weekStart) - 1, // Adjust to 0-based index
              date: weekStart
            };
          } else if (prevSegment.week !== undefined) {
            const weekStart = this.getStartOfWeek(this.currentYear, prevSegment.week + 1);
            this.currentSegment = {
              year: this.currentYear,
              month: weekStart.getMonth(),
              week: prevSegment.week,
              date: weekStart
            };
          } else {
            console.error('Invalid prevSegment when zooming out to week view:', prevSegment);
            this.currentSegment = { 
              year: this.currentYear,
              month: 0, 
              week: 0, 
              date: this.getStartOfWeek(this.currentYear, 0) 
            };
          }
          break;
        case 'day':
          if (prevSegment.date) {
            this.currentSegment = {
              year: this.currentYear,
              month: prevSegment.date.getMonth(),
              week: this.getWeekNumber(prevSegment.date) - 1, // Adjust to 0-based index
              day: prevSegment.date.getDay(),
              date: new Date(prevSegment.date)
            };
          } else {
            console.error('Invalid prevSegment when zooming out to day view:', prevSegment);
            this.currentSegment = { 
              year: this.currentYear,
              month: 0, 
              week: 0, 
              day: 0, 
              date: new Date(this.currentYear, 0, 1) 
            };
          }
          break;
      }

      console.log('Zoomed out to', this.currentView, 'with segment:', this.currentSegment);
      this.clearSVG();
      this.drawCurrentView();
    }
  }

  clearSVG() {
    while (this.calendarGroup.firstChild) {
      this.calendarGroup.removeChild(this.calendarGroup.firstChild);
    }
  }

  updateCurrentSegment(segment) {
    switch (this.currentView) {
      case 'year':
        this.currentSegment = { year: this.currentYear };
        break;
      case 'month':
        if (segment) {
          this.currentSegment = { 
            year: this.currentYear, 
            month: segment 
          };
        } else if (!this.currentSegment.month) {
          this.currentSegment.month = 0; // Default to January
        }
        break;
      case 'week':
        // Preserve month if available
        const weekStart = this.getStartOfWeek(segment);
        this.currentSegment = {
          year: this.currentYear,
          month: weekStart.getMonth(),
          week: segment,
          date: weekStart
        };
        break;
      case 'day':
        let dayDate;
        if (this.currentSegment.week !== undefined) {
          const weekStart = this.getStartOfWeek(this.currentSegment.week);
          dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + segment);
        } else {
          dayDate = new Date(this.currentYear, this.currentSegment.month, segment + 1);
        }
        this.currentSegment = {
          year: this.currentYear,
          month: dayDate.getMonth(),
          week: this.getWeekNumber(dayDate) - 1,
          day: segment,
          date: dayDate
        };
        break;
      case 'hour':
        const hourDate = new Date(this.currentSegment.date);
        hourDate.setHours(segment);
        this.currentSegment = {
          ...this.currentSegment,
          hour: segment,
          date: hourDate
        };
        break;
    }
    this.renderer.setCurrentView(this.currentView, this.currentSegment);
  }

  getSegmentFromPosition(x, y) {
    const svgRect = this.svg.getBoundingClientRect();
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    // Transform mouse coordinates to SVG coordinate system
    const svgPoint = this.svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;
    const transformedPoint = svgPoint.matrixTransform(this.svg.getScreenCTM().inverse());

    const dx = transformedPoint.x - centerX;
    const dy = transformedPoint.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

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
          totalSegments = new Date(this.currentYear, this.currentSegment.month + 1, 0).getDate();
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
          return null;
      }

      return Math.floor((angle / (2 * Math.PI)) * totalSegments);
    }

    return null;
  }

  zoomInToPosition(x, y) {
    const segment = this.getSegmentFromPosition(x, y);
    if (segment !== null) {
      this.zoomInTimeView(segment);
      this.drawCurrentView();
    }
  }

  zoomTo(scale, centerX, centerY) {
    const oldZoom = this.zoomLevel;
    this.zoomLevel = Math.max(0.1, Math.min(10, scale)); // Limit zoom level between 0.1 and 10

    // Adjust pan to keep the center point stationary
    this.panX -= (centerX - this.panX) * (this.zoomLevel - oldZoom) / oldZoom;
    this.panY -= (centerY - this.panY) * (this.zoomLevel - oldZoom) / oldZoom;

    this.updateTransform();
  }

  animateTransform(dx, dy) {
     // Do nothing for now
  };

/*  zoomIn(segment) {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex < this.zoomLevels.length - 1) {
      const nextView = this.zoomLevels[currentViewIndex + 1];
      this.currentView = nextView;
      this.updateCurrentSegment(segment);
      this.renderer.setCurrentView(this.currentView, this.currentSegment);
      this.animateViewTransition(this.currentView, this.currentSegment);
    }
  }*/

  animateViewTransition(toView, toSegment) {
    // Implement transition animation logic here
    // This could involve fading out the current view and fading in the new view
    // or other smooth transition effects
    this.renderer.drawCurrentView();
  }  

  pan(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.updateTransform();
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  getStartOfWeek(year, week) {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - firstDayOfYear.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    return new Date(firstMonday.getTime() + ((week - 1) * 7) * 86400000);
  }

  // Placeholder for other methods (to be implemented later)
  getMonthName(monthIndex) {}
}

