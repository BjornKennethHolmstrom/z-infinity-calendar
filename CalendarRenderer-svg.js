class CalendarRenderer {
  constructor(svg, calendarGroup, colors, innerRadiusRatio, year, getMonthName, getStartOfWeek, eventManager) {
    this.svg = svg;
    this.calendarGroup = calendarGroup;
    this.colors = colors;
    this.innerRadiusRatio = innerRadiusRatio;
    this.year = year;
    this.getMonthName = getMonthName;
    this.getStartOfWeek = getStartOfWeek;
    this.eventManager = eventManager;
    this.hoveredSegment = null;
    this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  drawYearView() {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    // Draw month segments
    for (let i = 0; i < 12; i++) {
      const startAngle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / 12) * 2 * Math.PI - Math.PI / 2;

      const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
      path.setAttribute("fill", this.colors.segment);
      path.setAttribute("stroke", this.colors.border);
      this.calendarGroup.appendChild(path);

      // Add month labels
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelAngle = (startAngle + endAngle) / 2;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", labelX);
      text.setAttribute("y", labelY);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", this.colors.text);
      text.textContent = this.getMonthName(i);
      this.calendarGroup.appendChild(text);
    }

    // Add year display in the center
    const yearText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yearText.setAttribute("x", centerX);
    yearText.setAttribute("y", centerY);
    yearText.setAttribute("text-anchor", "middle");
    yearText.setAttribute("dominant-baseline", "middle");
    yearText.setAttribute("fill", this.colors.text);
    yearText.setAttribute("font-size", "24");
    yearText.textContent = this.year.toString();
    this.calendarGroup.appendChild(yearText);

    this.drawSegments(12, (index, startAngle, endAngle) => {
      this.drawMonthSegment(index, startAngle, endAngle);
    });
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

  drawMonthView(currentSegment) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    const currentMonth = currentSegment.month;
    const daysInMonth = new Date(this.year, currentMonth + 1, 0).getDate();

    this.drawSegments(daysInMonth, (index, startAngle, endAngle) => {
      this.drawDaySegment(index, startAngle, endAngle, currentMonth);
    });

    // Add month name and year in the center
    const monthYearText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    monthYearText.setAttribute("x", centerX);
    monthYearText.setAttribute("y", centerY);
    monthYearText.setAttribute("text-anchor", "middle");
    monthYearText.setAttribute("dominant-baseline", "middle");
    monthYearText.setAttribute("fill", this.colors.text);
    monthYearText.setAttribute("font-size", "20");
    monthYearText.textContent = `${this.getMonthName(currentMonth)}, ${this.year}`;
    this.calendarGroup.appendChild(monthYearText);
  }

  drawWeekView(currentSegment, selectedDayInWeek) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    const startDate = this.getStartOfWeek(this.year, currentSegment.week);

    this.drawSegments(7, (index, startAngle, endAngle) => {
      this.drawWeekDaySegment(index, startAngle, endAngle, startDate, selectedDayInWeek);
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
    dateRangeText.setAttribute("font-size", "16");
    dateRangeText.textContent = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
    this.calendarGroup.appendChild(dateRangeText);

    // Add week number
    const weekNumber = this.getWeekNumber(startDate);
    const weekNumberText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    weekNumberText.setAttribute("x", centerX);
    weekNumberText.setAttribute("y", centerY + 15);
    weekNumberText.setAttribute("text-anchor", "middle");
    weekNumberText.setAttribute("dominant-baseline", "middle");
    weekNumberText.setAttribute("fill", this.colors.text);
    weekNumberText.setAttribute("font-size", "14");
    weekNumberText.textContent = `Week ${weekNumber}`;
    this.calendarGroup.appendChild(weekNumberText);
  }

  drawDayView(currentSegment) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    this.drawSegments(24, (index, startAngle, endAngle) => {
      this.drawHourSegment(index, startAngle, endAngle);
    });

    // Display date in the center
    if (currentSegment && currentSegment.date) {
      const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      dateText.setAttribute("x", centerX);
      dateText.setAttribute("y", centerY);
      dateText.setAttribute("text-anchor", "middle");
      dateText.setAttribute("dominant-baseline", "middle");
      dateText.setAttribute("fill", this.colors.text);
      dateText.setAttribute("font-size", "20");
      dateText.textContent = currentSegment.date.toDateString();
      this.calendarGroup.appendChild(dateText);
    }

    // Call method to display events for this day
    this.displayDayEvents(currentSegment.date);
  }

  // Add this method to display events (implementation needed)
  displayDayEvents(group, date) {
    // TODO: Implement event display logic
    console.log('Displaying events for date:', date);
    // This method will be implemented when we add event handling
  }

  drawHourView(currentSegment) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    this.drawBackground(centerX, centerY, outerRadius, innerRadius);

    this.drawSegments(60, (index, startAngle, endAngle) => {
      this.drawMinuteSegment(index, startAngle, endAngle);
    });

    // Display hour and date in the center
    if (currentSegment && currentSegment.date) {
      const dateHourText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      dateHourText.setAttribute("x", centerX);
      dateHourText.setAttribute("y", centerY);
      dateHourText.setAttribute("text-anchor", "middle");
      dateHourText.setAttribute("dominant-baseline", "middle");
      dateHourText.setAttribute("fill", this.colors.text);
      dateHourText.setAttribute("font-size", "20");
      dateHourText.textContent = `${currentSegment.date.toDateString()} ${currentSegment.date.getHours()}:00`;
      this.calendarGroup.appendChild(dateHourText);
    }

    // TODO: Implement event display for this hour
    // this.displayHourEvents(currentSegment.hour);
  }

  drawMonthSegment(index, startAngle, endAngle) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add month name label
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelAngle = (startAngle + endAngle) / 2;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const monthText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    monthText.setAttribute("x", labelX);
    monthText.setAttribute("y", labelY);
    monthText.setAttribute("text-anchor", "middle");
    monthText.setAttribute("dominant-baseline", "middle");
    monthText.setAttribute("fill", this.colors.text);
    monthText.setAttribute("font-size", "14");
    monthText.textContent = this.getMonthName(index);
    this.calendarGroup.appendChild(monthText);
  }

  drawDaySegment(index, startAngle, endAngle, month) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add day number label
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelAngle = (startAngle + endAngle) / 2;
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

    // Add date (e.g., "Jan 1")
    const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dateText.setAttribute("x", labelX);
    dateText.setAttribute("y", labelY + 15);
    dateText.setAttribute("text-anchor", "middle");
    dateText.setAttribute("dominant-baseline", "middle");
    dateText.setAttribute("fill", this.colors.text);
    dateText.setAttribute("font-size", "10");
    dateText.textContent = `${this.getMonthName(month)} ${index + 1}`;
    this.calendarGroup.appendChild(dateText);
  }

  drawWeekDaySegment(index, startAngle, endAngle, startDate, selectedDayInWeek) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === selectedDayInWeek ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add day name and date
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelAngle = (startAngle + endAngle) / 2;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const dayText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dayText.setAttribute("x", labelX);
    dayText.setAttribute("y", labelY - 10);
    dayText.setAttribute("text-anchor", "middle");
    dayText.setAttribute("dominant-baseline", "middle");
    dayText.setAttribute("fill", this.colors.text);
    dayText.setAttribute("font-size", "12");
    dayText.textContent = this.dayNames[index];
    this.calendarGroup.appendChild(dayText);

    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dateText.setAttribute("x", labelX);
    dateText.setAttribute("y", labelY + 10);
    dateText.setAttribute("text-anchor", "middle");
    dateText.setAttribute("dominant-baseline", "middle");
    dateText.setAttribute("fill", this.colors.text);
    dateText.setAttribute("font-size", "10");
    dateText.textContent = this.formatDate(date);
    this.calendarGroup.appendChild(dateText);
  }

  drawHourSegment(index, startAngle, endAngle) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add hour label
    const labelRadius = (outerRadius + innerRadius) / 2;
    const labelAngle = (startAngle + endAngle) / 2;
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
  }

  drawMinuteSegment(index, startAngle, endAngle) {
    const centerX = 500;
    const centerY = 500;
    const outerRadius = 490;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const path = this.createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle);
    path.setAttribute("fill", index === this.hoveredSegment ? this.colors.highlight : this.colors.segment);
    path.setAttribute("stroke", this.colors.border);
    path.setAttribute("data-segment", index);
    this.calendarGroup.appendChild(path);

    // Add minute label for every 5 minutes
    if (index % 5 === 0) {
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelAngle = (startAngle + endAngle) / 2;
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
  }

  drawSegments(totalSegments, drawSegmentFunc) {
    for (let i = 0; i < totalSegments; i++) {
      const startAngle = (i / totalSegments) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / totalSegments) * 2 * Math.PI - Math.PI / 2;
      drawSegmentFunc(i, startAngle, endAngle);
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
  }

  drawCurrentView() {
    while (this.calendarGroup.firstChild) {
      this.calendarGroup.removeChild(this.calendarGroup.firstChild);
    }

    switch (this.currentView) {
      case 'year':
        this.drawYearView();
        break;
      case 'month':
        this.drawMonthView(this.currentSegment);
        break;
      case 'week':
        this.drawWeekView(this.currentSegment, this.selectedDayInWeek);
        break;
      case 'day':
        this.drawDayView(this.currentSegment);
        break;
      case 'hour':
        this.drawHourView(this.currentSegment);
        break;
    }
  }

  formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  getMonthName(month) {
    return this.monthNames[month];
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

}
