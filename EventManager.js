// EventManager.js
class EventManager {
  constructor() {
    this.events = [];
  }

  addEvent(event) {
    this.events.push(event);
  }

  removeEvent(eventId) {
    this.events = this.events.filter(event => event.id !== eventId);
  }

  updateEvent(eventId, updatedEvent) {
    const index = this.events.findIndex(event => event.id === eventId);
    if (index !== -1) {
      this.events[index] = updatedEvent;
    }
  }

  getEventsForDate(date) {
    return this.events.filter(event => 
      event.startDate <= date && event.endDate >= date
    );
  }
}
