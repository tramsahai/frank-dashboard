// This is the list of exams. Month numbers start at 0, so November is 10 and December is 11.
var EXAMS = [
  { name: "Maths 511", year: 2026, month: 10, day: 16, timeText: "09:00 to 16:30" },
  { name: "Networks 511", year: 2026, month: 10, day: 18, timeText: "09:00 to 16:30" },
  { name: "Web Technology 511", year: 2026, month: 10, day: 23, timeText: "09:00 to 16:30" },
  { name: "Information Systems 511", year: 2026, month: 10, day: 25, timeText: "09:00 to 16:30" },
  { name: "Programming 511", year: 2026, month: 11, day: 3, timeText: "Time to be confirmed" }
];

// This is made up sample data so we can test the agenda. Step 3 replaces it with your real calendar.
var SAMPLE_AGENDA = [
  { title: "Study Maths 511", startH: 8, startM: 0, endH: 10, endM: 0 },
  { title: "Web Technology assignment", startH: 11, startM: 0, endH: 13, endM: 0 },
  { title: "Lunch", startH: 13, startM: 0, endH: 14, endM: 0 },
  { title: "Networks 511 revision", startH: 14, startM: 30, endH: 16, endM: 30 },
  { title: "Gym", startH: 18, startM: 0, endH: 19, endM: 0 },
  { title: "Frank dashboard", startH: 20, startM: 0, endH: 21, endM: 30 }
];

// The exam ring starts filling up this many days before the exam.
var EXAM_WINDOW_DAYS = 60;

// Set this to false to freeze the sky if the old iPhone feels slow. The sky still shows, it just stops moving.
var SKY_ANIMATIONS = true;

// These control how many stars and rain drops are drawn. Lower numbers are easier on the phone.
var STAR_COUNT = 28;
var RAIN_COUNT = 28;

// This is how many clouds each kind of weather gets during the day.
var CLOUD_COUNTS = { clear: 2, partly: 4, cloudy: 7, rain: 7, storm: 7 };

// This asks the weather service for Johannesburg. It needs no key. The is_day value tells us if the sun is up.
var WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=-26.2041&longitude=28.0473&current=temperature_2m,apparent_temperature,weather_code,is_day&hourly=precipitation_probability&timezone=Africa%2FJohannesburg&forecast_days=2";

var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// This remembers the last weather answer so we can redraw things every minute without asking again.
var lastWeather = null;

// This is used for testing the sky by hand. When it is not null, it overrides the real weather and time.
var forcedSky = null;

// This remembers which sky is on screen, so we only rebuild it when something actually changes.
var lastSkyKey = "";

// This adds a zero in front of single digit numbers, so 7 becomes 07.
function pad(number) {
  if (number < 10) {
    return "0" + number;
  }
  return String(number);
}

// This is a short way to find an element on the page by its id.
function getEl(id) {
  return document.getElementById(id);
}

// This makes text safe to place inside HTML, which matters once titles come from a real calendar.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// This gives a random number between the two numbers you pass in.
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// This updates the big clock and the date. It runs every second.
function updateClock() {
  var now = new Date();
  getEl("clockTime").textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
  getEl("clockDate").textContent = DAY_NAMES[now.getDay()] + " " + now.getDate() + " " + MONTH_NAMES[now.getMonth()];
}

// This picks the small greeting above "Hey Thasmei" based on the time of day.
function updateGreeting() {
  var hour = new Date().getHours();
  var text = "Good evening";
  if (hour < 12) {
    text = "Good morning";
  } else if (hour < 18) {
    text = "Good afternoon";
  }
  getEl("greetingSmall").textContent = text;
}

// This dims the page between 22:00 and 06:00 by adding a night class to the body.
function updateNightMode() {
  var hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    document.body.classList.add("night");
  } else {
    document.body.classList.remove("night");
  }
}

// This tells us if the sky should be dark. It uses the sun data from the weather service when we have it.
function isDarkNow() {
  if (forcedSky !== null) {
    return forcedSky.isDark;
  }
  if (lastWeather !== null && lastWeather.current.is_day !== undefined) {
    return lastWeather.current.is_day === 0;
  }
  var hour = new Date().getHours();
  return hour >= 19 || hour < 6;
}

// This turns a weather code into one of five simple kinds of sky.
function skyKindFromCode(code) {
  if (code === 0 || code === 1) {
    return "clear";
  }
  if (code === 2) {
    return "partly";
  }
  if (code >= 95) {
    return "storm";
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "rain";
  }
  return "cloudy";
}

// This finds the kind of sky we should show right now.
function currentSkyKind() {
  if (forcedSky !== null) {
    return forcedSky.kind;
  }
  if (lastWeather === null) {
    return "clear";
  }
  return skyKindFromCode(lastWeather.current.weather_code);
}

// This makes the stars. Each one gets a random size, place and twinkle timing.
function buildStars(count) {
  var html = "";
  for (var i = 0; i < count; i++) {
    var size = randomBetween(1, 3).toFixed(1);
    var duration = randomBetween(2, 5).toFixed(1);
    var delay = randomBetween(0, 5).toFixed(1);
    html += '<div class="star" style="left:' + randomBetween(0, 100).toFixed(1) + '%;top:' + randomBetween(0, 70).toFixed(1) + '%;' +
      'width:' + size + 'px;height:' + size + 'px;' +
      'animation-duration:' + duration + 's;animation-delay:-' + delay + 's;"></div>';
  }
  return html;
}

// This makes the clouds. The negative delay means they are already spread across the screen when the page opens.
function buildClouds(count) {
  var html = "";
  for (var i = 0; i < count; i++) {
    var duration = randomBetween(80, 150);
    var delay = randomBetween(0, duration);
    html += '<div class="cloud" style="top:' + randomBetween(2, 60).toFixed(0) + '%;' +
      'font-size:' + randomBetween(12, 22).toFixed(0) + 'px;' +
      'animation-duration:' + duration.toFixed(0) + 's;animation-delay:-' + delay.toFixed(0) + 's;"></div>';
  }
  return html;
}

// This makes the rain drops. Each one falls at a slightly different speed.
function buildRain(count) {
  var html = "";
  for (var i = 0; i < count; i++) {
    var duration = randomBetween(0.8, 1.4);
    var delay = randomBetween(0, duration);
    html += '<div class="drop" style="left:' + randomBetween(0, 100).toFixed(1) + '%;' +
      'animation-duration:' + duration.toFixed(2) + 's;animation-delay:-' + delay.toFixed(2) + 's;"></div>';
  }
  return html;
}

// This builds everything inside the sky for one kind of weather. The order matters, because later items sit on top.
function buildSky(dark, kind) {
  var html = "";
  var showBody = (kind === "clear" || kind === "partly");

  if (dark) {
    var starCount = 0;
    if (kind === "clear") {
      starCount = STAR_COUNT;
    } else if (kind === "partly") {
      starCount = Math.round(STAR_COUNT / 2);
    } else if (kind === "cloudy") {
      starCount = Math.round(STAR_COUNT / 4);
    }
    html += buildStars(starCount);
  }

  if (showBody) {
    if (dark) {
      html += '<div class="moon"></div>';
    } else {
      html += '<div class="sun"></div>';
    }
  }

  var cloudCount = CLOUD_COUNTS[kind];
  if (dark && kind === "clear") {
    cloudCount = 0;
  }
  html += buildClouds(cloudCount);

  if (kind === "rain" || kind === "storm") {
    html += buildRain(RAIN_COUNT);
  }
  if (kind === "storm") {
    html += '<div class="flash"></div>';
  }

  return html;
}

// This updates the sky. It only rebuilds when day, night or the weather kind has changed.
function updateSky() {
  var dark = isDarkNow();
  var kind = currentSkyKind();
  var key = (dark ? "night" : "day") + kind + (SKY_ANIMATIONS ? "move" : "still");

  if (key === lastSkyKey) {
    return;
  }
  lastSkyKey = key;

  var sky = getEl("sky");
  var classes = "sky " + (dark ? "night" : "day") + " " + kind;
  if (!SKY_ANIMATIONS) {
    classes += " still";
  }
  sky.className = classes;
  sky.innerHTML = buildSky(dark, kind);

  if (dark) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

// This is for testing in the browser console. Try previewSky("night", "rain"). Call previewSky() with nothing to go back to real weather.
function previewSky(time, kind) {
  if (time === undefined) {
    forcedSky = null;
  } else {
    var allKinds = ["clear", "partly", "cloudy", "rain", "storm"];
    if (allKinds.indexOf(kind) === -1 || (time !== "day" && time !== "night")) {
      console.log("Use previewSky(day or night, then clear, partly, cloudy, rain or storm).");
      return;
    }
    forcedSky = { isDark: time === "night", kind: kind };
  }
  lastSkyKey = "";
  updateSky();
  if (lastWeather !== null) {
    showWeather(lastWeather);
  }
}

// This draws the agenda and marks each item as done, happening now, or coming up.
function updateAgenda() {
  var now = new Date();
  var nowMinutes = now.getHours() * 60 + now.getMinutes();
  var html = "";

  for (var i = 0; i < SAMPLE_AGENDA.length; i++) {
    var ev = SAMPLE_AGENDA[i];
    var startMinutes = ev.startH * 60 + ev.startM;
    var endMinutes = ev.endH * 60 + ev.endM;
    var state = "upcoming";

    if (nowMinutes >= endMinutes) {
      state = "done";
    } else if (nowMinutes >= startMinutes) {
      state = "now";
    }

    var startText = pad(ev.startH) + ":" + pad(ev.startM);
    var endText = pad(ev.endH) + ":" + pad(ev.endM);

    html += '<div class="agendaItem ' + state + '">' +
      '<div class="agendaTime">' + startText + '</div>' +
      '<div class="agendaBody">' +
      '<div class="agendaTitle">' + escapeHtml(ev.title) + '</div>' +
      '<div class="agendaRange">' + startText + ' to ' + endText + '</div>' +
      '</div></div>';
  }

  if (html === "") {
    html = '<div class="emptyText">Nothing on today</div>';
  }
  getEl("agendaList").innerHTML = html;
}

// This works out how many whole calendar days are left until an exam.
function daysUntil(exam) {
  var today = new Date();
  var todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var examMidnight = new Date(exam.year, exam.month, exam.day);
  return Math.round((examMidnight.getTime() - todayMidnight.getTime()) / 86400000);
}

// This builds the SVG ring. The closer the exam, the more the ring fills. Close exams turn orange.
function ringHtml(days) {
  var radius = 24;
  var circumference = 2 * Math.PI * radius;
  var progress = 1 - days / EXAM_WINDOW_DAYS;

  if (progress < 0) {
    progress = 0;
  }
  if (progress > 1) {
    progress = 1;
  }

  var offset = circumference * (1 - progress);
  var color = "#1fb5a3";
  if (days <= 7) {
    color = "#f59e3b";
  }
  var cap = "round";
  if (progress === 0) {
    cap = "butt";
  }

  return '<svg width="60" height="60" viewBox="0 0 60 60">' +
    '<circle cx="30" cy="30" r="24" fill="none" stroke="#e3ecee" stroke-width="6"></circle>' +
    '<circle cx="30" cy="30" r="24" fill="none" stroke="' + color + '" stroke-width="6"' +
    ' stroke-linecap="' + cap + '" stroke-dasharray="' + circumference + '"' +
    ' stroke-dashoffset="' + offset + '" transform="rotate(270 30 30)"></circle>' +
    '<text x="30" y="36" text-anchor="middle" font-size="18" font-weight="600" fill="#1b2b33">' + days + '</text>' +
    '</svg>';
}

// This draws the exam list, the exams left tile, and the next exam text.
function updateExams() {
  var upcoming = [];

  for (var i = 0; i < EXAMS.length; i++) {
    var days = daysUntil(EXAMS[i]);
    if (days >= 0) {
      upcoming.push({ exam: EXAMS[i], days: days });
    }
  }

  upcoming.sort(function (a, b) {
    return a.days - b.days;
  });

  getEl("examsLeftText").textContent = upcoming.length;

  if (upcoming.length === 0) {
    getEl("nextExamText").textContent = "All done";
    getEl("examList").innerHTML = '<div class="emptyText">No exams left</div>';
    return;
  }

  var first = upcoming[0];
  getEl("nextExamText").textContent = "Next: " + first.exam.name;

  var html = "";
  for (var j = 0; j < upcoming.length; j++) {
    var item = upcoming[j];
    var date = new Date(item.exam.year, item.exam.month, item.exam.day);
    var dateText = DAY_NAMES[date.getDay()].slice(0, 3) + " " + item.exam.day + " " + MONTH_NAMES[item.exam.month].slice(0, 3);

    html += '<div class="examRow">' +
      '<div class="examRing">' + ringHtml(item.days) + '</div>' +
      '<div>' +
      '<div class="examName">' + escapeHtml(item.exam.name) + '</div>' +
      '<div class="examMeta">' + dateText + '</div>' +
      '<div class="examMeta">' + escapeHtml(item.exam.timeText) + '</div>' +
      '</div></div>';
  }
  getEl("examList").innerHTML = html;
}

// This shows how much of today is left in the battery style tile.
function updateDayLeft() {
  var now = new Date();
  var minutesPassed = now.getHours() * 60 + now.getMinutes();
  var leftPercent = Math.round((1 - minutesPassed / 1440) * 100);

  getEl("dayLeftText").textContent = leftPercent + "%";
  getEl("dayFill").style.width = leftPercent + "%";

  if (leftPercent < 20) {
    getEl("dayFill").style.background = "#f59e3b";
  } else {
    getEl("dayFill").style.background = "#1fb5a3";
  }
}

// This turns weather codes into words and an emoji. Clear nights get a moon.
function weatherInfo(code, isDark) {
  if (code === 0) {
    if (isDark) {
      return { text: "Clear night", icon: "\uD83C\uDF19" };
    }
    return { text: "Sunny", icon: "\u2600\uFE0F" };
  }
  if (code === 1) {
    return { text: "Mostly clear", icon: "\uD83C\uDF24\uFE0F" };
  }
  if (code === 2) {
    return { text: "Partly cloudy", icon: "\u26C5" };
  }
  if (code === 3) {
    return { text: "Overcast", icon: "\u2601\uFE0F" };
  }
  if (code === 45 || code === 48) {
    return { text: "Foggy", icon: "\uD83C\uDF2B\uFE0F" };
  }
  if (code >= 51 && code <= 57) {
    return { text: "Drizzle", icon: "\uD83C\uDF26\uFE0F" };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { text: "Rain", icon: "\uD83C\uDF27\uFE0F" };
  }
  if (code >= 71 && code <= 77) {
    return { text: "Snow", icon: "\uD83C\uDF28\uFE0F" };
  }
  if (code >= 95) {
    return { text: "Thunderstorm", icon: "\u26C8\uFE0F" };
  }
  return { text: "Unknown", icon: "\uD83C\uDF21\uFE0F" };
}

// This puts the weather data on the page. The hourly list starts at midnight, so the current hour number is the right spot in the list.
function showWeather(data) {
  var hour = new Date().getHours();
  var info = weatherInfo(data.current.weather_code, isDarkNow());

  getEl("weatherIcon").textContent = info.icon;
  getEl("weatherTemp").textContent = Math.round(data.current.temperature_2m) + "\u00B0";
  getEl("weatherText").textContent = info.text;
  getEl("weatherFeels").innerHTML = "Feels like<br>" + Math.round(data.current.apparent_temperature) + "\u00B0";

  var chances = data.hourly.precipitation_probability;
  var html = "";

  for (var i = 0; i < 6; i++) {
    var value = chances[hour + i];
    if (value === undefined || value === null) {
      value = 0;
    }

    var label = "Now";
    if (i > 0) {
      label = pad((hour + i) % 24) + ":00";
    }

    var barColor = "#1fb5a3";
    if (value >= 50) {
      barColor = "#f59e3b";
    }
    var barHeight = Math.max(4, Math.round(value * 0.44));

    html += '<div class="rainCol">' +
      '<div class="rainBarBox"><div class="rainBar" style="height:' + barHeight + 'px;background:' + barColor + ';"></div></div>' +
      '<div class="rainPct">' + value + '%</div>' +
      '<div class="rainHour">' + label + '</div>' +
      '</div>';
  }
  getEl("rainStrip").innerHTML = html;
}

// This asks the weather service for fresh weather. If it fails, we show a message and try again at the next timer tick.
function loadWeather() {
  fetch(WEATHER_URL)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Weather request failed");
      }
      return response.json();
    })
    .then(function (data) {
      lastWeather = data;
      showWeather(data);
      updateSky();
    })
    .catch(function () {
      if (lastWeather === null) {
        getEl("weatherText").textContent = "Weather unavailable";
      }
    });
}

// This refreshes everything that only needs to change once a minute.
function updateEveryMinute() {
  updateGreeting();
  updateNightMode();
  updateAgenda();
  updateExams();
  updateDayLeft();
  updateSky();
  if (lastWeather !== null) {
    showWeather(lastWeather);
  }
}

// This runs once when the page opens, then the timers keep everything fresh.
updateClock();
updateEveryMinute();
loadWeather();

setInterval(updateClock, 1000);
setInterval(updateEveryMinute, 60000);
setInterval(loadWeather, 600000);