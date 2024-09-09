// EventManager.js

class EventManager {
  constructor() {
    this.dbName = 'ZInfinityCalendarDB';
    this.dbVersion = 1;
    this.storeName = 'events';
    this.db = null;
    this.initDB();
  }

  initDB() {
    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
    };

    request.onsuccess = (event) => {
      this.db = event.target.result;
      console.log("IndexedDB opened successfully");
    };

    request.onupgradeneeded = (event) => {
      this.db = event.target.result;
      const objectStore = this.db.createObjectStore(this.storeName, { keyPath: "id" });
      objectStore.createIndex("start", "start", { unique: false });
      objectStore.createIndex("end", "end", { unique: false });
    };
  }

  addEvent(event) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.add(event);

      request.onerror = (event) => {
        console.error("Error adding event:", event.target.error);
        reject("Error adding event: " + event.target.error);
      };

      request.onsuccess = (event) => {
        console.log("Event added successfully:", event.target.result);
        resolve(event.target.result);
      };
    });
  }

  removeEvent(eventId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(eventId);

      request.onerror = (event) => {
        reject("Error removing event: " + event.target.error);
      };

      request.onsuccess = (event) => {
        resolve();
      };
    });
  }

  updateEvent(eventId, updatedEvent) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put(updatedEvent);

      request.onerror = (event) => {
        reject("Error updating event: " + event.target.error);
      };

      request.onsuccess = (event) => {
        resolve();
      };
    });
  }

  getEventsForDate(date) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index("start");

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const range = IDBKeyRange.bound(startOfDay, endOfDay);
      const request = index.getAll(range);

      request.onerror = (event) => {
        console.error("Error getting events:", event.target.error);
        reject("Error getting events: " + event.target.error);
      };

      request.onsuccess = (event) => {
        console.log("Events retrieved successfully:", event.target.result);
        resolve(event.target.result);
      };
    });
  }

  clearEvents() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = (event) => {
        console.error("Error clearing events:", event.target.error);
        reject("Error clearing events: " + event.target.error);
      };

      request.onsuccess = (event) => {
        console.log("Events cleared successfully");
        resolve();
      };
    });
  }

  getEventsForYear(year) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index("start");

      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

      const range = IDBKeyRange.bound(startOfYear, endOfYear);
      const request = index.getAll(range);

      request.onerror = (event) => {
        reject("Error getting events for year: " + event.target.error);
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }

  getEventsForMonth(year, month) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index("start");

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const range = IDBKeyRange.bound(startOfMonth, endOfMonth);
      const request = index.getAll(range);

      request.onerror = (event) => {
        reject("Error getting events for month: " + event.target.error);
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }

  getEventsForDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index("start");

      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);

      request.onerror = (event) => {
        reject("Error getting events for date range: " + event.target.error);
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }

}

