// Event.js
class CalendarEvent {
  constructor(id, title, startDate, endDate, description = '') {
    this.id = id;
    this.title = title;
    this.startDate = startDate;
    this.endDate = endDate;
    this.description = description;
  }
}
