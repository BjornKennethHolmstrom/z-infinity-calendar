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
    this.calendarGroup.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoomLevel})`);
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
    const rect = this.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const newHoveredSegment = this.getSegmentFromPosition(x, y);
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
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const segment = this.getSegmentFromPosition(x, y);
      if (segment !== null) {
        this.zoomInToPosition(x, y);
      }
    }
    this.hasDragged = false;
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
          this.currentSegment = { year: this.currentYear };
          break;
        case 'month':
          this.currentSegment = { 
            year: this.currentYear, 
            month: this.currentSegment.date ? this.currentSegment.date.getMonth() : 0
          };
          break;
        case 'week':
          const weekStart = new Date(this.currentSegment.date || this.currentYear, this.currentSegment.month || 0, 1);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          this.currentSegment = {
            year: this.currentYear,
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
        this.currentSegment = { year: this.currentYear };
        break;
      case 'month':
        this.currentSegment = { 
          year: this.currentYear,
          month: segment
        };
        break;
      case 'week':
        const weekStart = this.getStartOfWeek(this.currentYear, segment);
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
          const weekStart = this.getStartOfWeek(this.currentYear, this.currentSegment.week);
          dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + segment);
        } else {
          dayDate = new Date(this.currentYear, this.currentSegment.month, segment + 1);
        }
        this.currentSegment = {
          year: this.currentYear,
          month: dayDate.getMonth(),
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
    const centerX = 500; // center of the SVG viewBox
    const centerY = 500;
    const outerRadius = 490;
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
      this.zoomIn(segment);
      
      // Calculate the new center point
      const svgPoint = this.svg.createSVGPoint();
      svgPoint.x = x;
      svgPoint.y = y;
      const transformedPoint = svgPoint.matrixTransform(this.calendarGroup.getCTM().inverse());
      
      // Animate the centering
      const centerX = 500;
      const centerY = 500;
      const dx = centerX - transformedPoint.x;
      const dy = centerY - transformedPoint.y;
      
      this.animateTransform(dx, dy);
      
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

  zoomIn(segment) {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex < this.zoomLevels.length - 1) {
      const nextView = this.zoomLevels[currentViewIndex + 1];
      this.currentView = nextView;
      this.updateCurrentSegment(segment);
      this.renderer.setCurrentView(this.currentView, this.currentSegment);
      this.animateViewTransition(this.currentView, this.currentSegment);
    }
  }

  zoomOut() {
    const currentViewIndex = this.zoomLevels.indexOf(this.currentView);
    if (currentViewIndex > 0) {
      const prevView = this.zoomLevels[currentViewIndex - 1];
      this.currentView = prevView;
      this.updateCurrentSegment(this.currentSegment[prevView]);
      this.renderer.setCurrentView(this.currentView, this.currentSegment);
      this.animateViewTransition(this.currentView, this.currentSegment);
    }
  }

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
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  getStartOfWeek(week) {
    const jan4 = new Date(this.currentYear, 0, 4);
    const firstMonday = new Date(jan4.getTime() - ((jan4.getDay() + 6) % 7) * 86400000);
    return new Date(firstMonday.getTime() + (week * 7) * 86400000);
  }

  // Placeholder for other methods (to be implemented later)
  getMonthName(monthIndex) {}
}

