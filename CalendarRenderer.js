// CalendarRenderer.js

class CalendarRenderer {
  constructor(ctx, canvas, colors, innerRadiusRatio, year, getMonthName, getStartOfWeek, eventManager) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.colors = colors;
    this.innerRadiusRatio = innerRadiusRatio;
    this.year = year;
    this.getMonthName = getMonthName;
    this.getStartOfWeek = getStartOfWeek;
    this.eventManager = eventManager;
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
  }

  drawMonthView(currentSegment) {
    if (!currentSegment || typeof currentSegment.month === 'undefined') {
      console.error('Invalid currentSegment in drawMonthView:', currentSegment);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    const currentMonth = currentSegment.month;
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
  }

  drawWeekView(currentSegment, selectedDayInWeek) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 10;
    const innerRadius = outerRadius * this.innerRadiusRatio;

    if (!currentSegment || typeof currentSegment.week === 'undefined') {
      console.error('Invalid currentSegment in drawWeekView:', currentSegment);
      return [];
    }

    const startDate = this.getStartOfWeek(this.year, currentSegment.week);
    const weekSegments = [];

    for (let i = 0; i < 7; i++) {
      const startAngle = (i / 7) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / 7) * 2 * Math.PI - Math.PI / 2;

      this.ctx.fillStyle = (i === selectedDayInWeek) ? this.colors.highlight : this.colors.segment;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      this.ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = this.colors.border;
      this.ctx.stroke();

      // Store the path for later hit detection
      const segment = new Path2D();
      segment.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      segment.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      segment.closePath();
      weekSegments.push(segment);

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

    // Add week range in the center
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const dateRangeText = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
    
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(dateRangeText, centerX, centerY - 10);

    // Calculate and display the week number
    const weekNumber = currentSegment.week + 1; // Convert back to 1-based index for display
    this.ctx.font = '14px Arial';
    this.ctx.fillText(`Week ${weekNumber}`, centerX, centerY + 15);

    return weekSegments;
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  drawDayView(currentSegment) {
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

    // Use the date provided in currentSegment
    if (currentSegment && currentSegment.date) {
      const currentDate = currentSegment.date;

      // Add date in the center
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(currentDate.toDateString(), centerX, centerY);
    } else {
      console.error('Invalid currentSegment in drawDayView:', currentSegment);
    }

    // Display events for this day
    this.displayDayEvents(currentSegment.date);
  }

  drawHourView(currentSegment) {
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

    // Use the date provided in currentSegment
    if (currentSegment && currentSegment.date) {
      const currentDate = currentSegment.date;

      // Add hour and date in the center
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${currentDate.toDateString()} ${currentDate.getHours()}:00`, centerX, centerY);
    } else {
      console.error('Invalid currentSegment in drawHourView:', currentSegment);
    }

    // Display events for this hour (implementation needed)
    // this.calendar.displayHourEvents(this.currentSegment.hour);
  }

  displayDayEvents(date) {
    console.log('Displaying events for date:', date);
    this.eventManager.getEventsForDate(date).then(events => {
      console.log('Events for date:', events);
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const outerRadius = Math.min(centerX, centerY) - 10;
      const innerRadius = outerRadius * this.innerRadiusRatio;

      events.forEach(event => {
        const startHour = event.start.getHours() + event.start.getMinutes() / 60;
        const endHour = event.end.getHours() + event.end.getMinutes() / 60;

        const startAngle = (startHour / 24) * 2 * Math.PI - Math.PI / 2;
        const endAngle = (endHour / 24) * 2 * Math.PI - Math.PI / 2;

        // Draw event arc
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, (outerRadius + innerRadius) / 2, startAngle, endAngle);
        this.ctx.lineWidth = outerRadius - innerRadius;
        this.ctx.strokeStyle = this.colors.event;
        this.ctx.stroke();

        // Draw event description
        const midAngle = (startAngle + endAngle) / 2;
        const textRadius = (outerRadius + innerRadius) / 2;
        const textX = centerX + textRadius * Math.cos(midAngle);
        const textY = centerY + textRadius * Math.sin(midAngle);

        this.ctx.save();
        this.ctx.translate(textX, textY);
        this.ctx.rotate(midAngle + Math.PI / 2);
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.fillText(event.description, 0, 0);
        this.ctx.restore();
      });
    });
  }

}
