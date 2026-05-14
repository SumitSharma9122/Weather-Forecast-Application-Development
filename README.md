# Weather Dashboard 🌤️

A weather forecast application built from scratch using **HTML**, **Tailwind CSS**, and **vanilla JavaScript**. It fetches real-time weather data from the OpenWeatherMap API and displays current conditions along with a 5-day forecast for any city in the world.

## Features

### Search & Location
- **City Search** — Type any city name and hit Search (or press Enter) to get weather data
- **Current Location** — Click "Use Current Location" to automatically detect your position using browser geolocation
- **Recently Searched** — A dropdown that remembers your last 8 searched cities using localStorage. Clicking any city in the dropdown instantly loads its weather

### Weather Display
- **Current Weather** — Shows city name, date, temperature, wind speed, humidity, weather icon, and condition description
- **5-Day Forecast** — Displays upcoming 5 days in individual cards, each showing date, temperature, wind speed, humidity, and a weather icon
- **Temperature Toggle** — Switch between °C and °F for today's temperature with a single click

### Dynamic Effects
- **Rainy Background** — When the weather condition is rainy, drizzle, or thunderstorm, the background shifts to a darker, moodier gradient and animated rain drops fall across the screen
- **Extreme Heat Alert** — If the temperature exceeds 40°C, a custom popup warns the user about extreme heat conditions
- **Weather Icons** — Uses OpenWeatherMap's official weather icons to visually represent conditions (sunny, cloudy, rainy, snowy, etc.)

### Error Handling
- All errors are shown as **custom toast notifications** that slide in from the right — no JavaScript `alert()` is used anywhere
- Handles invalid city names, empty input, network errors, denied location permissions, and API issues gracefully
- Input validation prevents empty or invalid searches with inline error messages

### Responsive Design
- Fully responsive layout tested on:
  - **Desktop** (1280px+)
  - **iPad Mini** (768px)
  - **iPhone SE** (375px)
- Uses CSS Grid with Tailwind for flexible column layout that stacks on smaller screens

## Tech Stack

| Technology | Usage |
|------------|-------|
| HTML5 | Page structure and semantic markup |
| Tailwind CSS (CDN) | Utility-first responsive styling |
| Vanilla CSS | Custom animations, glassmorphism, rain effect |
| JavaScript (ES5/ES6) | API calls, DOM manipulation, event handling |
| OpenWeatherMap API | Weather data provider (free tier) |
| localStorage | Persisting recently searched cities |

## Project Structure

```
Weather Forecast Application Development/
├── index.html      → Main HTML page with all UI sections
├── style.css       → Custom CSS (animations, glass effect, rain, toasts)
├── script.js       → All JavaScript logic (API, search, forecast, validation)
└── README.md       → This documentation file
```

## Setup Instructions

### 1. Get an API Key
1. Go to [OpenWeatherMap](https://openweathermap.org/) and create a free account
2. Navigate to your API Keys section and copy your key
3. Open `script.js` and replace the `API_KEY` value on line 7 with your own key

### 2. Run the Application
1. Clone or download this repository
2. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari)
3. That's it — no build tools, no npm install, no server needed

### 3. Using the App
1. Type a city name (e.g., "London", "New York", "Mumbai") in the search box
2. Click **Search** or press **Enter**
3. View the current weather and 5-day forecast
4. Click **Use Current Location** to get weather for your current position
5. Use the **°C / °F** button to toggle temperature units
6. Select a previously searched city from the **Recently Searched** dropdown

## API Endpoints Used

- **Current Weather**: `GET /data/2.5/weather?q={city}&appid={key}&units=metric`
- **5-Day Forecast**: `GET /data/2.5/forecast?q={city}&appid={key}&units=metric`
- **By Coordinates**: Same endpoints with `lat={lat}&lon={lon}` instead of `q={city}`

## Browser Compatibility

Tested and working on:
- Google Chrome 90+
- Mozilla Firefox 88+
- Microsoft Edge 90+
- Safari 14+

## Notes

- The free OpenWeatherMap API allows 60 calls per minute, which is more than enough for normal usage
- Recently searched cities persist across browser sessions through localStorage
- The rain animation uses pure CSS with dynamically created DOM elements — no external animation libraries
- All weather icons are loaded from OpenWeatherMap's CDN (`openweathermap.org/img/wn/`)
