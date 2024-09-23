class CalendarRenderer {
  constructor(svg, calendarGroup, colors, innerRadiusRatio, currentYear, getMonthName, getStartOfWeek, eventManager) {
    this.svg = svg;
    this.calendarGroup = calendarGroup;
    this.colors = colors;
    this.innerRadiusRatio = innerRadiusRatio;
    this.outerLabelOffset = 20;
    this.viewBoxPadding = 50;
    this.currentYear = currentYear;
    this.currentSegment = { year: this.currentYear };
    this.getMonthName = getMonthName;
    this.getStartOfWeek = getStartOfWeek;
    this.hoveredSegment = null;
    this.dayNames = ['Sun','Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.eventManager = eventManager;
    this.eventManager = eventManager;
    this.dragStartHandler = this.dragStartHandler.bind(this);
    this.dragHandler = this.dragHandler.bind(this);
    this.dragEndHandler = this.dragEndHandler.bind(this);
    this.isDragging = false;
    this.dragStartPosition = null;
    this.dragStartYOffset = 100;
  }

  drawYearView(centerX, centerY, outerRadius, innerRadius) {

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    this.drawSegments(12, (index, startAngle, endAngle) => {
      this.drawMonthSegment(index, startAngle, endAngle, centerX, centerY, outerRadius, innerRadius);
    });

    // Add year display in the center
    const yearText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yearText.setAttribute("x", centerX);
    yearText.setAttribute("y", centerY);
    yearText.setAttribute("text-anchor", "middle");
    yearText.setAttribute("dominant-baseline", "middle");
    yearText.setAttribute("fill", this.colors.text);
    yearText.setAttribute("font-size", "24");
    yearText.textContent = this.currentYear.toString();
    this.calendarGroup.appendChild(yearText);
  }

  drawBackground(centerX, centerY, outerRadius, innerRadius) {
    const background = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    background.setAttribute("cx", centerX);
    background.setAttribute("cy", centerY);
    background.setAttribute("r", outerRadius);
    background.setAttribute("fill", this.colors.background);
    this.calendarGroup.appendChild(background);

    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    innerCircle.setAttribute("cx", centerX);
    innerCircle.setAttribute("cy", centerY);
    innerCircle.setAttribute("r", innerRadius);
    innerCircle.setAttribute("fill", "white");
    this.calendarGroup.appendChild(innerCircle);
  }

  createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle) {
    const outerStartX = centerX + outerRadius * Math.cos(startAngle);
    const outerStartY = centerY + outerRadius * Math.sin(startAngle);
    const outerEndX = centerX + outerRadius * Math.cos(endAngle);
    const outerEndY = centerY + outerRadius * Math.sin(endAngle);

    const innerStartX = centerX + innerRadius * Math.cos(endAngle);
    const innerStartY = centerY + innerRadius * Math.sin(endAngle);
    const innerEndX = centerX + innerRadius * Math.cos(startAngle);
    const innerEndY = centerY + innerRadius * Math.sin(startAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

    const d = [
      "M", outerStartX, outerStartY,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 1, outerEndX, outerEndY,
      "L", innerStartX, innerStartY,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerEndX, innerEndY,
      "Z"
    ].join(" ");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    return path;
  }

  drawMonthView(currentSegment, centerX, centerY, outerRadius, innerRadius) {

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    const daysInMonth = new Date(currentSegment.year, currentSegment.month + 1, 0).getDate();

    this.drawSegments(daysInMonth, (index, startAngle, endAngle) => {
      this.drawDaySegment(index, startAngle, endAngle, currentSegment.month, centerX, centerY, outerRadius, innerRadius);
    });

    // Add month name and year in the center
    const monthYearText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    monthYearText.setAttribute("x", centerX);
    monthYearText.setAttribute("y", centerY);
    monthYearText.setAttribute("text-anchor", "middle");
    monthYearText.setAttribute("dominant-baseline", "middle");
    monthYearText.setAttribute("fill", this.colors.text);
    monthYearText.setAttribute("font-size", "20");
    monthYearText.textContent = `${this.monthNames[currentSegment.month]}, ${currentSegment.year}`;
    this.calendarGroup.appendChild(monthYearText);
  }

  drawWeekView(currentSegment, centerX, centerY, outerRadius, innerRadius) {
    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    if (!currentSegment || typeof currentSegment.week === 'undefined') {
      console.error('Invalid currentSegment in drawWeekView:', currentSegment);
      return;
    }

    const startDate = this.getStartOfWeek(this.currentYear, currentSegment.week + 1);

    // Adjust the starting angle to shift the days counter-clockwise
    const angleOffset = -Math.PI / 7; // Shift by -1/7 of a full circle

    this.drawSegments(7, (index, startAngle, endAngle) => {
      // Apply the angle offset
      const adjustedStartAngle = startAngle + angleOffset;
      const adjustedEndAngle = endAngle + angleOffset;

      // No need to adjust the index anymore
      const adjustedIndex = index;

      this.drawWeekDaySegment(
        adjustedIndex,
        adjustedStartAngle,
        adjustedEndAngle,
        startDate,
        centerX,
        centerY,
        outerRadius,
        innerRadius
      );
    });

    // Add week range in the center
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const dateRangeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dateRangeText.setAttribute("x", centerX);
    dateRangeText.setAttribute("y", centerY - 15);
    dateRangeText.setAttribute("text-anchor", "middle");
    dateRangeText.setAttribute("dominant-baseline", "middle");
    dateRangeText.setAttribute("fill", this.colors.text);
    dateRangeText.setAttribute("font-size", "20");
    dateRangeText.textContent = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
    this.calendarGroup.appendChild(dateRangeText);

    // Calculate and display the week number
    const weekNumber = currentSegment.week + 1; // Convert back to 1-based index for display
    const weekNumberText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    weekNumberText.setAttribute("x", centerX);
    weekNumberText.setAttribute("y", centerY + 15);
    weekNumberText.setAttribute("text-anchor", "middle");
    weekNumberText.setAttribute("dominant-baseline", "middle");
    weekNumberText.setAttribute("fill", this.colors.text);
    weekNumberText.setAttribute("font-size", "20");
    weekNumberText.textContent = `Week ${weekNumber}`;
    this.calendarGroup.appendChild(weekNumberText);
  }

  drawDayView(currentSegment, centerX, centerY, outerRadius, innerRadius) {

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    this.drawSegments(24, (index, startAngle, endAngle) => {
      this.drawHourSegment(index, startAngle, endAngle, centerX, centerY, outerRadius, innerRadius);
    });

    if (currentSegment && currentSegment.date) {
      const fullDateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      fullDateText.setAttribute("x", centerX);
      fullDateText.setAttribute("y", centerY);
      fullDateText.setAttribute("text-anchor", "middle");
      fullDateText.setAttribute("dominant-baseline", "middle");
      fullDateText.setAttribute("fill", this.colors.text);
      fullDateText.setAttribute("font-size", "24");
      fullDateText.textContent = currentSegment.date.toDateString();
      this.calendarGroup.appendChild(fullDateText);
    }

    this.drawAddEventButton(centerX, centerY, innerRadius);
    this.displayDayEvents(currentSegment.date, centerX, centerY, outerRadius, innerRadius);
  }

  drawHourView(currentSegment, centerX, centerY, outerRadius, innerRadius) {

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    this.drawSegments(60, (index, startAngle, endAngle) => {
      this.drawMinuteSegment(index, startAngle, endAngle, centerX, centerY, outerRadius, innerRadius);
    });

    // Display hour and date in the center
    if (currentSegment && currentSegment.date) {
      const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      dateText.setAttribute("x", centerX);
      dateText.setAttribute("y", centerY - 15);
      dateText.setAttribute("text-anchor", "middle");
      dateText.setAttribute("dominant-baseline", "middle");
      dateText.setAttribute("fill", this.colors.text);
      dateText.setAttribute("font-size", "20");
      dateText.textContent = currentSegment.date.toDateString();
      this.calendarGroup.appendChild(dateText);

      const hourText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      hourText.setAttribute("x", centerX);
      hourText.setAttribute("y", centerY + 15);
      hourText.setAttribute("text-anchor", "middle");
      hourText.setAttribute("dominant-baseline", "middle");
      hourText.setAttribute("fill", this.colors.text);
      hourText.setAttribute("font-size", "20");
      hourText.textContent = `Hour ${currentSegment.date.getHours()}`;
      this.calendarGroup.appendChild(hourText);
    }

    // TODO: Implement event display for this hour
    // this.displayHourEvents(currentSegment.hour);
  }

  drawMonthSegment(index, startAngle, endAngle, centerX, centerY, outerRadius, innerRadius) {
    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add month name label
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = outerRadius + this.outerLabelOffset;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);


    const monthText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    monthText.setAttribute("x", labelX);
    monthText.setAttribute("y", labelY);
    monthText.setAttribute("text-anchor", "middle");
    monthText.setAttribute("dominant-baseline", "middle");
    monthText.setAttribute("fill", this.colors.text);
    monthText.setAttribute("font-size", "14");
    monthText.textContent = this.monthNames[index];
    this.calendarGroup.appendChild(monthText);
 
    return path;
  }

  drawDaySegment(index, startAngle, endAngle, month, centerX, centerY, outerRadius, innerRadius) {
    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add day number label
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = outerRadius + this.outerLabelOffset;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);


    const dayText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dayText.setAttribute("x", labelX);
    dayText.setAttribute("y", labelY);
    dayText.setAttribute("text-anchor", "middle");
    dayText.setAttribute("dominant-baseline", "middle");
    dayText.setAttribute("fill", this.colors.text);
    dayText.setAttribute("font-size", "12");
    dayText.textContent = (index + 1).toString();
    this.calendarGroup.appendChild(dayText);

    return path;
  }

  drawWeekDaySegment(index, startAngle, endAngle, startDate, centerX, centerY, outerRadius, innerRadius) {
    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add day name and date
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = outerRadius + this.outerLabelOffset;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);

    const dayText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dayText.setAttribute("x", labelX);
    dayText.setAttribute("y", labelY - 10);
    dayText.setAttribute("text-anchor", "middle");
    dayText.setAttribute("dominant-baseline", "middle");
    dayText.setAttribute("fill", this.colors.text);
    dayText.setAttribute("font-size", "12");
    dayText.textContent = this.dayNames[currentDate.getDay()];
    this.calendarGroup.appendChild(dayText);

    const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dateText.setAttribute("x", labelX);
    dateText.setAttribute("y", labelY + 10);
    dateText.setAttribute("text-anchor", "middle");
    dateText.setAttribute("dominant-baseline", "middle");
    dateText.setAttribute("fill", this.colors.text);
    dateText.setAttribute("font-size", "10");
    dateText.textContent = currentDate.getDate().toString();
    this.calendarGroup.appendChild(dateText);

    return path;
  }

  drawHourSegment(index, startAngle, endAngle, centerX, centerY, outerRadius, innerRadius) {
    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add hour label
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = outerRadius + this.outerLabelOffset;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const hourText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    hourText.setAttribute("x", labelX);
    hourText.setAttribute("y", labelY);
    hourText.setAttribute("text-anchor", "middle");
    hourText.setAttribute("dominant-baseline", "middle");
    hourText.setAttribute("fill", this.colors.text);
    hourText.setAttribute("font-size", "12");
    hourText.textContent = `${index}:00`;
    this.calendarGroup.appendChild(hourText);

    return path;
  }

  drawMinuteSegment(index, startAngle, endAngle, centerX, centerY, outerRadius, innerRadius) {
    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add minute label for every 5 minutes
    if (index % 5 === 0) {
      const labelAngle = (startAngle + endAngle) / 2;
      const labelRadius = outerRadius + this.outerLabelOffset;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      const minuteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      minuteText.setAttribute("x", labelX);
      minuteText.setAttribute("y", labelY);
      minuteText.setAttribute("text-anchor", "middle");
      minuteText.setAttribute("dominant-baseline", "middle");
      minuteText.setAttribute("fill", this.colors.text);
      minuteText.setAttribute("font-size", "12");
      minuteText.textContent = index.toString();
      this.calendarGroup.appendChild(minuteText);
    }

    return path;
  }

  drawSegments(totalSegments, drawSegmentFunc) {
    const angleOffset = this.currentView === 'week' ? Math.PI / 7 : 0;
    for (let i = 0; i < totalSegments; i++) {
      const startAngle = (i / totalSegments) * 2 * Math.PI - Math.PI / 2 + angleOffset;
      const endAngle = ((i + 1) / totalSegments) * 2 * Math.PI - Math.PI / 2 + angleOffset;
      const segment = drawSegmentFunc(i, startAngle, endAngle);
      
      // Add click event listener to the segment
      if (segment) {
        segment.addEventListener("click", (e) => {
          // Only zoom in if the click wasn't on an event
          if (!e.target.getAttribute("data-event-id")) {
            this.zoomInTimeView(i);
          }
        });
      }
    }
  }

  setHoveredSegment(segment) {
    this.hoveredSegment = segment;
    this.updateHoveredSegment();
  }

  updateHoveredSegment() {
    // TODO: Implement logic to update only the hovered segment
    // This will be more efficient than redrawing the entire calendar
    // For now, we'll just redraw the current view as a temporary solution
    this.drawCurrentView(this.calendarGroup, this.currentSegment);
  }

  setCurrentView(view, segment) {
    this.currentView = view;
    this.currentSegment = segment;
    this.currentYear = segment.year;
  }

drawCurrentView() {
  // Clear previous content
  while (this.calendarGroup.firstChild) {
    this.calendarGroup.removeChild(this.calendarGroup.firstChild);
  }

  const svgRect = this.svg.getBoundingClientRect();
  const centerX = svgRect.width / 2;
  const centerY = svgRect.height / 2;
  const outerRadius = Math.min(centerX, centerY) - 10;
  const innerRadius = outerRadius * this.innerRadiusRatio;

  switch (this.currentView) {
    case 'year':
      this.drawYearView(centerX, centerY, outerRadius, innerRadius);
      break;
    case 'month':
      this.drawMonthView(this.currentSegment, centerX, centerY, outerRadius, innerRadius);
      break;
    case 'week':
      this.drawWeekView(this.currentSegment, centerX, centerY, outerRadius, innerRadius);
      break;
    case 'day':
      this.drawDayView(this.currentSegment, centerX, centerY, outerRadius, innerRadius);
      break;
    case 'hour':
      this.drawHourView(this.currentSegment, centerX, centerY, outerRadius, innerRadius);
      break;
  }
}

  drawAddEventButton(centerX, centerY, innerRadius) {
    const button = document.createElementNS("http://www.w3.org/2000/svg", "g");
    button.setAttribute("class", "add-event-button");
    button.setAttribute("cursor", "pointer");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", centerX);
    circle.setAttribute("cy", centerY+this.dragStartYOffset);
    circle.setAttribute("r", innerRadius * 0.2);
    circle.setAttribute("fill", this.colors.event);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", centerX);
    text.setAttribute("y", centerY+this.dragStartYOffset);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "white");
    text.setAttribute("font-size", "14");
    text.setAttribute("pointer-events", "none"); // Prevent text from capturing events
    text.textContent = "Drag to add event";

    button.appendChild(circle);
    button.appendChild(text);
    this.calendarGroup.appendChild(button);

    button.addEventListener("mousedown", this.dragStartHandler);
  }

  dragStartHandler(event) {
    event.preventDefault(); // Prevent text selection
    this.isDragging = true;
    const svgRect = this.svg.getBoundingClientRect();
    const scale = svgRect.width / 1000; // Assuming 1000 is the SVG viewBox width
    this.dragStartPosition = {
      x: (event.clientX - svgRect.left) / scale,
      y: (event.clientY - svgRect.top) / scale
    };
    document.addEventListener("mousemove", this.dragHandler);
    document.addEventListener("mouseup", this.dragEndHandler);
  }

  dragHandler(event) {
    if (!this.isDragging) return;
    const svgRect = this.svg.getBoundingClientRect();
    const scale = svgRect.width / 1000;
    const currentX = (event.clientX - svgRect.left) / scale;
    const currentY = (event.clientY - svgRect.top) / scale;

    // Visual feedback: draw a line from start to current position
    if (this.dragLine) {
      this.dragLine.setAttribute("x2", currentX);
      this.dragLine.setAttribute("y2", currentY);
    } else {
      this.dragLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      this.dragLine.setAttribute("x1", this.dragStartPosition.x);
      this.dragLine.setAttribute("y1", this.dragStartPosition.y);
      this.dragLine.setAttribute("x2", currentX);
      this.dragLine.setAttribute("y2", currentY);
      this.dragLine.setAttribute("stroke", this.colors.event);
      this.dragLine.setAttribute("stroke-width", "2");
      this.calendarGroup.appendChild(this.dragLine);
    }
  }

  dragEndHandler(event) {
    if (!this.isDragging) return;
    this.isDragging = false;
    document.removeEventListener("mousemove", this.dragHandler);
    document.removeEventListener("mouseup", this.dragEndHandler);

    if (this.dragLine && this.dragLine.parentNode) {
      this.calendarGroup.removeChild(this.dragLine);
    }
    this.dragLine = null;

    const svgRect = this.svg.getBoundingClientRect();
    const scale = svgRect.width / 1000;
    const endX = (event.clientX - svgRect.left) / scale;
    const endY = (event.clientY - svgRect.top) / scale;
    const endSegment = this.getSegmentFromPosition(endX, endY);
    if (endSegment !== null) {
      this.createNewEvent(endSegment);
    }
  }

  createNewEvent(startSegment) {
    const startDate = new Date(this.currentSegment.date);
    startDate.setHours(startSegment);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration by default

    const newEvent = {
      id: Date.now(), // Simple unique ID
      title: "New Event",
      start: startDate,
      end: endDate
    };

    this.eventManager.addEvent(newEvent).then(() => {
      this.drawCurrentView(); // Redraw to show the new event
    });
  }

  displayDayEvents(date, centerX, centerY, outerRadius, innerRadius) {
    this.eventManager.getEventsForDate(date).then(events => {
      events.forEach(event => {
        this.drawEventArc(event, centerX, centerY, outerRadius, innerRadius);
      });
    });
  }

  drawEventArc(event, centerX, centerY, outerRadius, innerRadius) {
    const startAngle = this.timeToAngle(event.start);
    const endAngle = this.timeToAngle(event.end);
    const eventRadius = (outerRadius + innerRadius) / 2;
    const arcWidth = (outerRadius - innerRadius) * 0.8;

    const path = this.createArcPath(centerX, centerY, eventRadius + arcWidth / 2, eventRadius - arcWidth / 2, startAngle, endAngle);
    path.setAttribute("fill", this.colors.event);
    path.setAttribute("stroke", "none");
    path.setAttribute("data-event-id", event.id);
    path.setAttribute("cursor", "pointer");
    
    // Add click event listener
    path.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the click from reaching the underlying segment
      this.openEventEditDialog(event);
    });
    
    this.calendarGroup.appendChild(path);

    // Add event title
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = eventRadius;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const text = this.createTextElement(labelX, labelY, event.title, "12", (labelAngle * 180 / Math.PI) + 90);
    
    // Add click event listener to the text as well
    text.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the click from reaching the underlying segment
      this.openEventEditDialog(event);
    });
    
    this.calendarGroup.appendChild(text);
  }

  timeToAngle(date) {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return (minutes / 1440) * 2 * Math.PI - Math.PI / 2;
  }

  getSegmentFromPosition(x, y) {
    const svgRect = this.svg.getBoundingClientRect();
    const viewBoxWidth = 1000 + (this.viewBoxPadding * 2); // Adjusted for padding
    const viewBoxHeight = 1000 + (this.viewBoxPadding * 2);
    const scale = svgRect.width / viewBoxWidth;

    // Convert screen coordinates to SVG viewBox coordinates
    const svgX = (x / scale) - this.viewBoxPadding;
    const svgY = (y / scale) - this.viewBoxPadding;

    const centerX = 500; // Center of the original 1000x1000 viewBox
    const centerY = 500;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const dx = svgX - centerX;
    const dy = svgY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= outerRadius && distance >= innerRadius) {
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;
      angle = (angle + Math.PI / 2) % (2 * Math.PI);

      let totalSegments;
      let adjustedAngle = angle;

      switch (this.currentView) {
        case 'year':
          totalSegments = 12;
          break;
        case 'month':
          totalSegments = new Date(this.currentSegment.year, this.currentSegment.month + 1, 0).getDate();
          break;
        case 'week':
          totalSegments = 7;
          // Adjust the angle for the week view to match the drawing offset
          adjustedAngle = (angle - Math.PI / 7 + 2 * Math.PI) % (2 * Math.PI);
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

      const segmentIndex = Math.floor((adjustedAngle / (2 * Math.PI)) * totalSegments);
      return this.getSegmentInfo(segmentIndex);
    }

    return null;
  }

  getSegmentInfo(segmentIndex) {
    switch (this.currentView) {
      case 'year':
        return { type: 'month', index: segmentIndex };
      case 'month':
        return { type: 'day', index: segmentIndex };
      case 'week':
        return { type: 'weekday', index: segmentIndex };
      case 'day':
        return { type: 'hour', index: segmentIndex };
      case 'hour':
        return { type: 'minute', index: segmentIndex };
      default:
        return null;
    }
  }

  createNewEvent(segment) {
    if (!segment) return;

    let startDate = new Date(this.currentSegment.date);
    let endDate = new Date(startDate);

    switch (segment.type) {
      case 'month':
        startDate.setMonth(segment.index);
        endDate.setMonth(segment.index + 1);
        break;
      case 'day':
        startDate.setDate(segment.index + 1);
        endDate.setDate(segment.index + 1);
        endDate.setHours(startDate.getHours() + 1);
        break;
      case 'weekday':
        const weekStart = this.getStartOfWeek(this.currentSegment.year, this.currentSegment.week);
        startDate = new Date(weekStart);
        startDate.setDate(weekStart.getDate() + segment.index);
        endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1);
        break;
      case 'hour':
        startDate.setHours(segment.index);
        endDate.setHours(segment.index + 1);
        break;
      case 'minute':
        startDate.setHours(startDate.getHours(), segment.index);
        endDate.setHours(startDate.getHours(), segment.index + 15); // 15-minute event duration
        break;
    }

    const newEvent = {
      id: Date.now(),
      title: "New Event",
      start: startDate,
      end: endDate
    };

    this.eventManager.addEvent(newEvent).then(() => {
      this.drawCurrentView();
    });
  }

  openEventEditDialog(event) {
    // Implement event editing dialog
    console.log("Edit event:", event);
    // You can create a custom dialog or use the browser's prompt for simplicity
    const newTitle = prompt("Edit event title:", event.title);
    if (newTitle !== null) {
      event.title = newTitle;
      this.eventManager.updateEvent(event.id, event).then(() => {
        this.drawCurrentView(); // Redraw to show the updated event
      });
    }
  }

  createTextElement(x, y, content, fontSize, rotate = 0) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", this.colors.text);
    text.setAttribute("font-size", fontSize);
    
    if (rotate !== 0) {
      text.setAttribute("transform", `rotate(${rotate}, ${x}, ${y})`);
    }

    const lines = this.wrapText(content, 10);
    lines.forEach((line, index) => {
      const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspan.setAttribute("x", x);
      tspan.setAttribute("dy", index === 0 ? "0" : "1.2em");
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    return text;
  }

  wrapText(text, maxLength) {
    if (text.length <= maxLength) return [text];
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      if ((currentLine + ' ' + words[i]).length <= maxLength) {
        currentLine += ' ' + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
  }

  openEventEditDialog(event) {
    const dialog = document.getElementById('event-edit-dialog');
    const form = document.getElementById('event-edit-form');
    const titleInput = document.getElementById('event-title');
    const startInput = document.getElementById('event-start');
    const endInput = document.getElementById('event-end');
    const deleteButton = document.getElementById('delete-event');
    const closeButton = document.getElementById('close-dialog');

    titleInput.value = event.title;
    startInput.value = this.formatDateTimeLocal(event.start);
    endInput.value = this.formatDateTimeLocal(event.end);

    dialog.style.display = 'block';

    form.onsubmit = (e) => {
      e.preventDefault();
      const updatedEvent = {
        ...event,
        title: titleInput.value,
        start: new Date(startInput.value),
        end: new Date(endInput.value)
      };
      this.eventManager.updateEvent(event.id, updatedEvent).then(() => {
        dialog.style.display = 'none';
        this.drawCurrentView();
      });
    };

    deleteButton.onclick = () => {
      if (confirm('Are you sure you want to delete this event?')) {
        this.eventManager.removeEvent(event.id).then(() => {
          dialog.style.display = 'none';
          this.drawCurrentView();
        });
      }
    };

    closeButton.onclick = () => {
      dialog.style.display = 'none';
    };
  }

  formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  formatDateTimeLocal(date) {
    return date.toISOString().slice(0, 16);
  }

  getMonthName(month) {
    return this.monthNames[month];
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

}
