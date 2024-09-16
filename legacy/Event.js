// Event.js

class CalendarEvent {
  constructor(id, projectId, start, end, duration, description, order) {
    this.id = id;
    this.projectId = projectId;
    this.start = new Date(start);
    this.end = new Date(end);
    this.duration = duration;
    this.description = description;
    this.order = order;
  }
}

