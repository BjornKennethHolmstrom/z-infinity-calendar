// ZInfinityCalendar.js

class ZInfinityCalendar {
  constructor(containerId, year) {
    this.container = document.getElementById(containerId);
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
      this.year,
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
    this.svg.setAttribute("viewBox", "800 -32 1000 1000");
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
    this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.svg.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.svg.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.svg.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.svg.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.svg.addEventListener('click', this.handleClick.bind(this));
  }

  updateTransform() {
    const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    this.calendarGroup.style.transform = transform;
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

  handleMouseDown(event) {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  handleMouseMove(event) {
    const newHoveredSegment = this.getSegmentFromPosition(event.clientX, event.clientY);
    if (newHoveredSegment !== this.hoveredSegment) {
      this.hoveredSegment = newHoveredSegment;
      this.renderer.setHoveredSegment(this.hoveredSegment);
    }

    if (this.isDragging) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      this.panX += dx / this.zoomLevel;
      this.panY += dy / this.zoomLevel;
      this.updateTransform();
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  handleMouseLeave() {
    this.hoveredSegment = null;
    this.renderer.setHoveredSegment(null);
  }

  handleMouseUp(event) {
    this.isDragging = false;
  }

  handleClick(event) {
    if (!this.hasDragged) {
      const rect = this.svg.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.panX) / this.zoomLevel;
      const y = (event.clientY - rect.top - this.panY) / this.zoomLevel;
      this.zoomInToPosition(x, y);
    }
    this.hasDragged = false;
  }

  handleTouchStart(event) {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.touchStartDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      this.lastTouchY = (touch1.clientY + touch2.clientY) / 2;
      this.isTimeZooming = true;
    }
  }

  handleTouchMove(event) {
    if (this.isTimeZooming && event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentTouchY = (touch1.clientY + touch2.clientY) / 2;
      
      if (currentTouchY < this.lastTouchY) {
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const segment = this.getSegmentFromPosition(centerX, centerY);
        if (segment !== null) {
          this.zoomInTimeView(segment);
        }
      } else if (currentTouchY > this.lastTouchY) {
        this.zoomOutTimeView();
      }
      this.lastTouchY = currentTouchY;
    }
  }

  handleTouchEnd() {
    this.isTimeZooming = false;
  }

  zoomInTimeView(segment) {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex < this.zoomLevels.length - 1) {
      const nextView = this.zoomLevels[currentViewIndex + 1];
      this.currentView = nextView;
      this.updateCurrentSegment(segment);
      this.drawCurrentView();
    }
  }

  zoomOutTimeView() {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex > 0) {
      const prevView = this.zoomLevels[currentViewIndex - 1];
      this.currentView = prevView;
      
      switch (this.currentView) {
        case 'year':
          this.currentSegment = { year: this.year };
          break;
        case 'month':
          this.currentSegment = { 
            year: this.year, 
            month: this.currentSegment.date ? this.currentSegment.date.getMonth() : 0
          };
          break;
        case 'week':
          const weekStart = new Date(this.currentSegment.date || this.year, this.currentSegment.month || 0, 1);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          this.currentSegment = {
            year: this.year,
            month: weekStart.getMonth(),
            week: this.getWeekNumber(weekStart) - 1,
            date: weekStart
          };
          break;
        case 'day':
          this.currentSegment = {
            ...this.currentSegment,
            day: this.currentSegment.date ? this.currentSegment.date.getDay() : 0
          };
          break;
      }
      
      this.drawCurrentView();
    }
  }

  updateCurrentSegment(segment) {
    switch (this.currentView) {
      case 'year':
        // No need to update, we're already at the year view
        break;
      case 'month':
        this.currentSegment.month = segment;
        break;
      case 'week':
        if (this.currentSegment.month === undefined) {
          this.currentSegment.month = Math.floor(segment / 4); // Approximate
        }
        this.currentSegment.week = segment;
        break;
      case 'day':
        if (this.currentSegment.week === undefined) {
          this.currentSegment.week = Math.floor(segment / 7);
        }
        this.currentSegment.day = segment;
        break;
      case 'hour':
        this.currentSegment.hour = segment;
        break;
    }
  }

  getSegmentFromPosition(clientX, clientY) {
    const rect = this.svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const centerX = this.svg.viewBox.baseVal.width / 2;
    const centerY = this.svg.viewBox.baseVal.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const dx = x - centerX;
    const dy = y - centerY;
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
          totalSegments = new Date(this.currentSegment.year, this.currentSegment.month + 1, 0).getDate();
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

      return Math.floor((angle / (2 * Math.PI)) * totalSegments);
    }

    return null;
  }

  zoomInToPosition(x, y) {
    const segment = this.getSegmentFromPosition(x, y);
    if (segment !== null) {
      this.zoomIn(segment);
      // Remove the centering logic, as it's causing the jumping effect
      this.drawCurrentView();
    }
  }

  getSegmentFromPosition(x, y) {
    const centerX = this.svg.viewBox.baseVal.width / 2;
    const centerY = this.svg.viewBox.baseVal.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    // Adjust x and y for pan and zoom
    x = (x - this.panX) / this.zoomLevel;
    y = (y - this.panY) / this.zoomLevel;

    const dx = x - centerX;
    const dy = y - centerY;
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
      return segment;
    }

    return null;
  }

  zoomTo(scale, centerX, centerY) {
    const oldZoom = this.zoomLevel;
    this.zoomLevel = Math.max(0.1, Math.min(10, scale)); // Limit zoom level between 0.1 and 10

    // Adjust pan to keep the center point stationary
    this.panX -= (centerX - this.panX) * (this.zoomLevel - oldZoom) / oldZoom;
    this.panY -= (centerY - this.panY) * (this.zoomLevel - oldZoom) / oldZoom;

    this.updateTransform();
  }

  zoomIn(segment) {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex < this.zoomLevels.length - 1) {
      const nextView = this.zoomLevels[currentViewIndex + 1];
      this.currentView = nextView;
      
      // Update currentSegment structure
      switch (nextView) {
        case 'month':
          this.currentSegment = { month: segment };
          break;
        case 'week':
          if (this.currentView === 'year') {
            const date = new Date(this.year, segment, 1);
            this.currentSegment = { 
              month: segment,
              week: this.getWeekNumber(date) - 1
            };
          } else if (this.currentView === 'month') {
            const clickedDate = new Date(this.year, this.currentSegment.month, segment + 1);
            this.currentSegment = { 
              month: this.currentSegment.month,
              week: this.getWeekNumber(clickedDate) - 1
            };
          }
          break;
        case 'day':
          if (this.currentView === 'week') {
            const startOfWeek = this.getStartOfWeek(this.year, this.currentSegment.week);
            const selectedDate = new Date(startOfWeek);
            selectedDate.setDate(startOfWeek.getDate() + segment);
            this.currentSegment = {
              ...this.currentSegment,
              day: segment,
              date: selectedDate
            };
          } else if (this.currentView === 'month') {
            const clickedDate = new Date(this.year, this.currentSegment.month, segment + 1);
            this.currentSegment = {
              month: this.currentSegment.month,
              week: this.getWeekNumber(clickedDate) - 1,
              day: clickedDate.getDay(),
              date: clickedDate
            };
          }
          break;
        case 'hour':
          if (this.currentView === 'day') {
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

      this.drawCurrentView();
    }
  }

  zoomOut() {
    const prevViewIndex = this.zoomLevels.indexOf(this.currentView) - 1;
    if (prevViewIndex >= 0) {
      const prevView = this.currentView;
      const prevSegment = { ...this.currentSegment };
      this.currentView = this.zoomLevels[prevViewIndex];

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
          }
          break;
        case 'week':
          if (prevSegment.date) {
            const weekStart = new Date(prevSegment.date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            this.currentSegment = {
              month: weekStart.getMonth(),
              week: this.getWeekNumber(weekStart) - 1,
              date: weekStart
            };
          } else if (prevSegment.week !== undefined) {
            const weekStart = this.getStartOfWeek(this.year, prevSegment.week);
            this.currentSegment = {
              month: weekStart.getMonth(),
              week: prevSegment.week,
              date: weekStart
            };
          }
          break;
      }

      this.drawCurrentView();
    }
  }

  pan(dx, dy) {
    // Implement panning logic here
    // This could involve updating the SVG viewBox or transforming the calendarGroup
    const viewBox = this.svg.viewBox.baseVal;
    viewBox.x -= dx;
    viewBox.y -= dy;
    this.svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  getStartOfWeek(year, week) {
    // January 4th is always in week 1 (according to ISO 8601)
    const jan4 = new Date(year, 0, 4);
    // Get the Monday of week 1
    const firstMonday = new Date(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
    // Add the necessary number of weeks
    const targetDate = new Date(firstMonday.getTime() + (week * 7) * 86400000);
    return targetDate;
  }

  // Placeholder for other methods (to be implemented later)
  getMonthName(monthIndex) {}
}

