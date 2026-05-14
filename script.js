// ===== Weather Dashboard - Main JavaScript =====
// This file handles all weather API interactions, UI updates,
// event handling, validation, and dynamic features.

// ===== API Configuration =====
// Using Open-Meteo API (free, no API key required)
// Geocoding API to convert city names to coordinates
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// ===== WMO Weather Code to Description & Icon Mapping =====
// Maps Open-Meteo weather codes to human-readable descriptions and icon URLs
// Icons served from OpenWeatherMap's free CDN for visual quality
var weatherCodeMap = {
    0:  { description: "Clear Sky",           icon: "01d", main: "Clear" },
    1:  { description: "Mainly Clear",        icon: "02d", main: "Clear" },
    2:  { description: "Partly Cloudy",       icon: "03d", main: "Clouds" },
    3:  { description: "Overcast",            icon: "04d", main: "Clouds" },
    45: { description: "Fog",                 icon: "50d", main: "Fog" },
    48: { description: "Depositing Rime Fog", icon: "50d", main: "Fog" },
    51: { description: "Light Drizzle",       icon: "09d", main: "Drizzle" },
    53: { description: "Moderate Drizzle",    icon: "09d", main: "Drizzle" },
    55: { description: "Dense Drizzle",       icon: "09d", main: "Drizzle" },
    56: { description: "Light Freezing Drizzle", icon: "09d", main: "Drizzle" },
    57: { description: "Dense Freezing Drizzle",  icon: "09d", main: "Drizzle" },
    61: { description: "Slight Rain",         icon: "10d", main: "Rain" },
    63: { description: "Moderate Rain",       icon: "10d", main: "Rain" },
    65: { description: "Heavy Rain",          icon: "10d", main: "Rain" },
    66: { description: "Light Freezing Rain", icon: "13d", main: "Rain" },
    67: { description: "Heavy Freezing Rain", icon: "13d", main: "Rain" },
    71: { description: "Slight Snowfall",     icon: "13d", main: "Snow" },
    73: { description: "Moderate Snowfall",   icon: "13d", main: "Snow" },
    75: { description: "Heavy Snowfall",      icon: "13d", main: "Snow" },
    77: { description: "Snow Grains",         icon: "13d", main: "Snow" },
    80: { description: "Slight Rain Showers", icon: "09d", main: "Rain" },
    81: { description: "Moderate Rain Showers", icon: "09d", main: "Rain" },
    82: { description: "Violent Rain Showers", icon: "09d", main: "Rain" },
    85: { description: "Slight Snow Showers", icon: "13d", main: "Snow" },
    86: { description: "Heavy Snow Showers",  icon: "13d", main: "Snow" },
    95: { description: "Thunderstorm",        icon: "11d", main: "Thunderstorm" },
    96: { description: "Thunderstorm with Slight Hail", icon: "11d", main: "Thunderstorm" },
    99: { description: "Thunderstorm with Heavy Hail",  icon: "11d", main: "Thunderstorm" }
};

// ===== State Variables =====
// Stores current temperature in Celsius for unit toggle
var currentTempCelsius = null;
// Tracks current unit: true = Celsius, false = Fahrenheit
var isCelsius = true;

// ===== DOM Element References =====
// Caching all DOM elements used frequently to avoid repeated lookups
var cityInput = document.getElementById("city-input");
var searchBtn = document.getElementById("search-btn");
var locationBtn = document.getElementById("location-btn");
var inputError = document.getElementById("input-error");
var recentSection = document.getElementById("recent-section");
var recentDropdown = document.getElementById("recent-dropdown");
var currentWeatherSection = document.getElementById("current-weather-section");
var forecastSection = document.getElementById("forecast-section");
var welcomeSection = document.getElementById("welcome-section");
var loadingOverlay = document.getElementById("loading-overlay");
var unitToggleBtn = document.getElementById("unit-toggle-btn");
var toastContainer = document.getElementById("toast-container");
var extremeAlertModal = document.getElementById("extreme-alert-modal");
var extremeAlertMessage = document.getElementById("extreme-alert-message");
var closeExtremeAlertBtn = document.getElementById("close-extreme-alert");
var rainContainer = document.getElementById("rain-container");
var appBody = document.getElementById("app-body");

// ===== Event Listeners =====
// Setting up all event listeners for user interactions

// Search button click - fetch weather for entered city
searchBtn.addEventListener("click", function () {
    handleCitySearch();
});

// Enter key press in input field triggers search
cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        handleCitySearch();
    }
});

// Clear validation error when user starts typing
cityInput.addEventListener("input", function () {
    hideInputError();
});

// Escape key clears the input field for quick reset
cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        cityInput.value = "";
        hideInputError();
        cityInput.blur();
    }
});

// Use Current Location button - fetch weather using browser geolocation
locationBtn.addEventListener("click", function () {
    getCurrentLocationWeather();
});

// Recently searched dropdown - selecting a city fetches its weather
recentDropdown.addEventListener("change", function () {
    var selectedCity = recentDropdown.value;
    if (selectedCity) {
        cityInput.value = selectedCity;
        fetchWeatherByCity(selectedCity);
    }
});

// Temperature unit toggle button (°C / °F)
unitToggleBtn.addEventListener("click", function () {
    toggleTemperatureUnit();
});

// Close extreme temperature alert modal
closeExtremeAlertBtn.addEventListener("click", function () {
    extremeAlertModal.classList.add("hidden");
});

// ===== Load recently searched cities from localStorage on page load =====
renderRecentSearches();

// =========================================================================
//                          CORE FUNCTIONS
// =========================================================================

// ===== Handle City Search =====
// Validates the user input and triggers weather data fetch
function handleCitySearch() {
    var city = cityInput.value.trim();

    // Validate: check if input is empty
    if (city === "") {
        showInputError("Please enter a city name.");
        return;
    }

    // Validate: check if input contains only valid characters (letters, spaces, hyphens)
    var cityPattern = /^[a-zA-Z\s\-,.]+$/;
    if (!cityPattern.test(city)) {
        showInputError("Invalid city name. Use only letters, spaces, or hyphens.");
        return;
    }

    // Input is valid, hide any previous errors
    hideInputError();

    // Check for internet connectivity before making API call
    if (!navigator.onLine) {
        showToast("You appear to be offline. Please check your internet connection.", "error");
        return;
    }

    fetchWeatherByCity(city);
}

// ===== Fetch Weather by City Name =====
// First geocodes the city name to coordinates, then fetches weather data
function fetchWeatherByCity(city) {
    showLoading();

    // Step 1: Geocode city name to get latitude, longitude, and official city name
    var geoURL = GEO_URL + "?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json";

    fetch(geoURL)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to search for city. Please try again later.");
            }
            return response.json();
        })
        .then(function (geoData) {
            // Check if any results were found
            if (!geoData.results || geoData.results.length === 0) {
                throw new Error("City not found. Please check the spelling and try again.");
            }

            var location = geoData.results[0];
            var lat = location.latitude;
            var lon = location.longitude;
            var cityName = location.name;
            var country = location.country || "";

            // Step 2: Fetch weather data using coordinates
            return fetchWeatherData(lat, lon, cityName, country);
        })
        .catch(function (error) {
            hideLoading();
            showToast(error.message, "error");
        });
}

// ===== Fetch Weather Data from Open-Meteo =====
// Gets current weather and 7-day forecast using lat/lon coordinates
function fetchWeatherData(lat, lon, cityName, country) {
    // Build the Open-Meteo API URL with all required parameters
    var weatherURL = WEATHER_URL +
        "?latitude=" + lat +
        "&longitude=" + lon +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_mean" +
        "&timezone=auto" +
        "&forecast_days=6";

    return fetch(weatherURL)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to fetch weather data. Please try again.");
            }
            return response.json();
        })
        .then(function (weatherData) {
            // Display current weather on the UI
            displayCurrentWeather(weatherData, cityName, country);

            // Display 5-day forecast (skip today, show next 5 days)
            displayForecast(weatherData);

            // Add city to recently searched list in localStorage
            addToRecentSearches(cityName);

            // Check weather condition for rain effect
            var currentCode = weatherData.current.weather_code;
            var weatherInfo = getWeatherInfo(currentCode);
            handleRainyBackground(weatherInfo.main);

            // Check for extreme temperature (above 40°C)
            checkExtremeTemperature(weatherData.current.temperature_2m);

            hideLoading();
        })
        .catch(function (error) {
            hideLoading();
            showToast(error.message, "error");
        });
}

// ===== Fetch Weather by Coordinates (Geolocation) =====
// Called when the user clicks "Use Current Location" button
function fetchWeatherByCoords(lat, lon) {
    showLoading();

    // First, reverse geocode to get city name from coordinates
    var reverseGeoURL = GEO_URL + "?name=city&count=1&language=en&format=json";

    // Use a simple approach: fetch weather directly and use coordinates as identifier
    // Then use Open-Meteo's geocoding to find the nearest city
    var weatherURL = WEATHER_URL +
        "?latitude=" + lat +
        "&longitude=" + lon +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,relative_humidity_2m_mean" +
        "&timezone=auto" +
        "&forecast_days=6";

    // Use Nominatim for reverse geocoding (free, no key needed)
    var nominatimURL = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lon + "&format=json";

    // Fetch weather and city name in parallel
    Promise.all([
        fetch(weatherURL),
        fetch(nominatimURL)
    ])
        .then(function (responses) {
            if (!responses[0].ok) {
                throw new Error("Unable to fetch weather for your location. Please try again.");
            }
            return Promise.all([responses[0].json(), responses[1].json()]);
        })
        .then(function (results) {
            var weatherData = results[0];
            var locationData = results[1];

            // Extract city name from reverse geocoding result
            var cityName = "Your Location";
            var country = "";
            if (locationData && locationData.address) {
                cityName = locationData.address.city ||
                    locationData.address.town ||
                    locationData.address.village ||
                    locationData.address.state ||
                    "Your Location";
                country = locationData.address.country || "";
            }

            // Display weather data
            displayCurrentWeather(weatherData, cityName, country);
            displayForecast(weatherData);
            addToRecentSearches(cityName);

            var currentCode = weatherData.current.weather_code;
            var weatherInfo = getWeatherInfo(currentCode);
            handleRainyBackground(weatherInfo.main);
            checkExtremeTemperature(weatherData.current.temperature_2m);

            // Update the input field with the detected city name
            cityInput.value = cityName;

            hideLoading();
        })
        .catch(function (error) {
            hideLoading();
            showToast(error.message, "error");
        });
}

// ===== Get Current Location Weather =====
// Uses browser Geolocation API to get user's coordinates
function getCurrentLocationWeather() {
    // Check if geolocation is supported by the browser
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "error");
        return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
        // Success callback - received coordinates
        function (position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            fetchWeatherByCoords(lat, lon);
        },
        // Error callback - user denied or error occurred
        function (error) {
            hideLoading();
            if (error.code === error.PERMISSION_DENIED) {
                showToast("Location access denied. Please allow location access in your browser settings.", "error");
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                showToast("Location information is unavailable. Try searching by city name instead.", "error");
            } else if (error.code === error.TIMEOUT) {
                showToast("Location request timed out. Please try again.", "error");
            } else {
                showToast("An unknown error occurred while getting your location.", "error");
            }
        },
        // Options for geolocation request
        { timeout: 10000, enableHighAccuracy: false }
    );
}

// =========================================================================
//                          DISPLAY FUNCTIONS
// =========================================================================

// ===== Display Current Weather =====
// Updates the current weather section with data from the API response
function displayCurrentWeather(data, cityName, country) {
    // Store temperature in Celsius for unit toggle feature
    currentTempCelsius = data.current.temperature_2m;
    isCelsius = true;

    // Get today's formatted date
    var today = new Date();
    var dateString = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    // Get weather description and icon from the weather code
    var weatherInfo = getWeatherInfo(data.current.weather_code);
    var iconURL = "https://openweathermap.org/img/wn/" + weatherInfo.icon + "@2x.png";

    // Build display name with country if available
    var displayName = cityName;
    if (country) {
        displayName = cityName + ", " + country;
    }

    // Update DOM elements with weather data
    document.getElementById("city-name").textContent = displayName + " (" + dateString + ")";
    document.getElementById("weather-date").textContent = getFullDateString(today);
    document.getElementById("current-temp").textContent = data.current.temperature_2m.toFixed(1) + "°C";
    document.getElementById("current-wind").textContent = (data.current.wind_speed_10m / 3.6).toFixed(2) + " M/S";
    document.getElementById("current-humidity").textContent = data.current.relative_humidity_2m + "%";
    document.getElementById("current-feels-like").textContent = data.current.apparent_temperature.toFixed(1) + "°C";
    document.getElementById("weather-condition").textContent = weatherInfo.description;

    // Set weather icon
    document.getElementById("weather-icon").src = iconURL;
    document.getElementById("weather-icon").alt = weatherInfo.description;

    // Show current weather section and hide the welcome message
    currentWeatherSection.classList.remove("hidden");
    welcomeSection.classList.add("hidden");
}

// ===== Display 5-Day Forecast =====
// Parses the daily forecast data and creates forecast cards
function displayForecast(data) {
    var forecastCards = document.getElementById("forecast-cards");
    // Clear any existing forecast cards
    forecastCards.innerHTML = "";

    // Open-Meteo daily data starts from today - skip index 0 (today) and show next 5 days
    var daily = data.daily;
    var startIndex = 1; // skip today since we show it as current weather
    var endIndex = Math.min(daily.time.length, 6); // up to 5 days

    for (var i = startIndex; i < endIndex; i++) {
        var card = createForecastCard(
            daily.time[i],
            daily.weather_code[i],
            daily.temperature_2m_max[i],
            daily.temperature_2m_min[i],
            daily.wind_speed_10m_max[i],
            daily.relative_humidity_2m_mean ? daily.relative_humidity_2m_mean[i] : null
        );
        forecastCards.appendChild(card);
    }

    // Show the forecast section
    forecastSection.classList.remove("hidden");
}

// ===== Create a Single Forecast Card =====
// Builds and returns a DOM element for one forecast day
function createForecastCard(dateStr, weatherCode, tempMax, tempMin, windMax, humidity) {
    var card = document.createElement("div");
    card.className = "forecast-card";

    // Get weather info from the code
    var weatherInfo = getWeatherInfo(weatherCode);
    var iconURL = "https://openweathermap.org/img/wn/" + weatherInfo.icon + "@2x.png";

    // Calculate average temperature from min and max
    var avgTemp = ((tempMax + tempMin) / 2).toFixed(1);

    // Convert wind from km/h to m/s for consistency
    var windMS = (windMax / 3.6).toFixed(2);

    // Build the card HTML content with icons for temp, wind, humidity
    var humidityHTML = "";
    if (humidity !== null && humidity !== undefined) {
        humidityHTML = '<div class="forecast-detail"><span>💧</span> Humidity: ' + Math.round(humidity) + '%</div>';
    }

    card.innerHTML =
        '<div class="forecast-date">(' + dateStr + ')</div>' +
        '<img src="' + iconURL + '" alt="' + weatherInfo.description + '" class="forecast-icon">' +
        '<div class="forecast-detail"><span>🌡️</span> Temp: ' + avgTemp + '°C</div>' +
        '<div class="forecast-detail"><span>💨</span> Wind: ' + windMS + ' M/S</div>' +
        humidityHTML;

    return card;
}

// ===== Get Weather Info from WMO Code =====
// Looks up the weather code in our mapping table
function getWeatherInfo(code) {
    if (weatherCodeMap[code]) {
        return weatherCodeMap[code];
    }
    // Default fallback for unknown codes
    return { description: "Unknown", icon: "03d", main: "Clouds" };
}

// =========================================================================
//                     TEMPERATURE UNIT TOGGLE
// =========================================================================

// ===== Toggle between Celsius and Fahrenheit =====
// Only applies to today's current temperature display
function toggleTemperatureUnit() {
    // Don't toggle if no weather data has been loaded yet
    if (currentTempCelsius === null) {
        showToast("Search for a city first to toggle temperature units.", "warning");
        return;
    }

    var tempDisplay = document.getElementById("current-temp");

    if (isCelsius) {
        // Convert Celsius to Fahrenheit: (C * 9/5) + 32
        var fahrenheit = (currentTempCelsius * 9 / 5) + 32;
        tempDisplay.textContent = fahrenheit.toFixed(1) + "°F";
        isCelsius = false;
    } else {
        // Switch back to Celsius
        tempDisplay.textContent = currentTempCelsius.toFixed(1) + "°C";
        isCelsius = true;
    }
}

// =========================================================================
//                     RECENTLY SEARCHED CITIES
// =========================================================================

// ===== Add a City to Recently Searched List =====
// Stores in localStorage and updates the dropdown
function addToRecentSearches(city) {
    // Get existing list from localStorage
    var recentCities = getRecentSearches();

    // Remove the city if it already exists (to avoid duplicates)
    var index = recentCities.indexOf(city);
    if (index !== -1) {
        recentCities.splice(index, 1);
    }

    // Add city to the beginning of the array (most recent first)
    recentCities.unshift(city);

    // Keep only the last 8 cities to avoid the list getting too long
    if (recentCities.length > 8) {
        recentCities = recentCities.slice(0, 8);
    }

    // Save updated list to localStorage
    localStorage.setItem("recentCities", JSON.stringify(recentCities));

    // Re-render the dropdown
    renderRecentSearches();
}

// ===== Get Recently Searched Cities from localStorage =====
function getRecentSearches() {
    var saved = localStorage.getItem("recentCities");
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

// ===== Render the Recently Searched Dropdown =====
// Reads from localStorage and populates the dropdown select element
function renderRecentSearches() {
    var recentCities = getRecentSearches();

    // If no recent searches, hide the dropdown section entirely
    if (recentCities.length === 0) {
        recentSection.classList.add("hidden");
        return;
    }

    // Show the dropdown section
    recentSection.classList.remove("hidden");

    // Clear existing options (keep the first "Select a city" option)
    recentDropdown.innerHTML = '<option value="" disabled selected>Select a city</option>';

    // Add each city as a dropdown option
    for (var i = 0; i < recentCities.length; i++) {
        var option = document.createElement("option");
        option.value = recentCities[i];
        option.textContent = recentCities[i];
        recentDropdown.appendChild(option);
    }
}

// =========================================================================
//                     RAINY BACKGROUND EFFECT
// =========================================================================

// ===== Handle Rainy Background =====
// If weather condition is rainy/drizzle/thunderstorm, activate rain animation
function handleRainyBackground(weatherMain) {
    // Check if the weather condition indicates rain
    var rainyConditions = ["Rain", "Drizzle", "Thunderstorm"];
    var isRainy = rainyConditions.indexOf(weatherMain) !== -1;

    if (isRainy) {
        // Add rainy background class to body
        appBody.classList.add("rainy-weather");
        // Show rain drops animation
        activateRainEffect();
    } else {
        // Remove rainy effects
        appBody.classList.remove("rainy-weather");
        deactivateRainEffect();
    }
}

// ===== Activate Rain Drop Animation =====
// Creates multiple rain drop elements with random positions and speeds
function activateRainEffect() {
    // Clear any existing rain drops
    rainContainer.innerHTML = "";
    rainContainer.classList.remove("hidden");

    // Create 80 rain drops with randomized properties for realistic effect
    for (var i = 0; i < 80; i++) {
        var drop = document.createElement("div");
        drop.className = "rain-drop";

        // Randomize horizontal position across the screen
        drop.style.left = Math.random() * 100 + "%";

        // Randomize animation duration (speed) between 0.8s and 1.8s
        var duration = 0.8 + Math.random() * 1;
        drop.style.animationDuration = duration + "s";

        // Randomize animation delay so drops don't all start at once
        drop.style.animationDelay = Math.random() * 2 + "s";

        // Randomize opacity for depth effect
        drop.style.opacity = 0.3 + Math.random() * 0.5;

        // Vary the height of rain drops for realism
        var dropHeight = 10 + Math.random() * 15;
        drop.style.height = dropHeight + "px";

        rainContainer.appendChild(drop);
    }
}

// ===== Deactivate Rain Effect =====
// Removes all rain drops and hides the container
function deactivateRainEffect() {
    rainContainer.innerHTML = "";
    rainContainer.classList.add("hidden");
}

// =========================================================================
//                     EXTREME TEMPERATURE ALERT
// =========================================================================

// ===== Check for Extreme Temperature =====
// Shows a custom alert popup when temperature exceeds 40°C
function checkExtremeTemperature(tempCelsius) {
    if (tempCelsius > 40) {
        extremeAlertMessage.textContent =
            "The current temperature is " + tempCelsius.toFixed(1) + "°C! " +
            "This is extremely hot. Stay hydrated, avoid direct sun exposure, " +
            "and seek shade or air-conditioned spaces.";
        extremeAlertModal.classList.remove("hidden");
    }
}

// =========================================================================
//                     TOAST NOTIFICATION SYSTEM
// =========================================================================

// ===== Show Toast Notification =====
// Creates a custom pop-up message (replaces JavaScript alert())
// type can be: "error", "success", or "warning"
function showToast(message, type) {
    // Create toast element
    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    // Choose icon based on toast type
    var icon = "❌";
    if (type === "success") icon = "✅";
    if (type === "warning") icon = "⚠️";

    // Build toast content with message, close button, and auto-dismiss progress bar
    toast.innerHTML =
        '<span>' + icon + '</span>' +
        '<span>' + message + '</span>' +
        '<button class="toast-close">&times;</button>' +
        '<div class="toast-progress"></div>';
    toast.style.position = "relative";
    toast.style.overflow = "hidden";

    // Append toast to the container
    toastContainer.appendChild(toast);

    // Close button removes the toast when clicked
    var closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", function () {
        removeToast(toast);
    });

    // Auto-remove after 5 seconds
    setTimeout(function () {
        removeToast(toast);
    }, 5000);
}

// ===== Remove Toast with Slide-out Animation =====
function removeToast(toast) {
    // Prevent removing an already-removed toast
    if (!toast.parentElement) return;

    toast.style.animation = "toastSlideOut 0.3s ease-out forwards";
    setTimeout(function () {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// =========================================================================
//                     INPUT VALIDATION HELPERS
// =========================================================================

// ===== Show Input Error Message =====
// Displays a validation error below the city input field
function showInputError(message) {
    inputError.textContent = message;
    inputError.classList.remove("hidden");
    // Add red border to input for visual feedback
    cityInput.classList.add("border-red-500/50");
    cityInput.classList.remove("border-white/10");
}

// ===== Hide Input Error Message =====
function hideInputError() {
    inputError.classList.add("hidden");
    inputError.textContent = "";
    // Restore default border
    cityInput.classList.remove("border-red-500/50");
    cityInput.classList.add("border-white/10");
}

// =========================================================================
//                     LOADING OVERLAY HELPERS
// =========================================================================

// ===== Show Loading Overlay =====
function showLoading() {
    loadingOverlay.classList.remove("hidden");
}

// ===== Hide Loading Overlay =====
function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

// =========================================================================
//                     UTILITY FUNCTIONS
// =========================================================================

// ===== Get Full Date String =====
// Formats a date object into a readable string like "Wednesday, April 23, 2024"
function getFullDateString(date) {
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return days[date.getDay()] + ", " +
        months[date.getMonth()] + " " +
        date.getDate() + ", " +
        date.getFullYear();
}
