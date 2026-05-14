// ===== Weather Dashboard - Main JavaScript =====
// This file handles all weather API interactions, UI updates,
// event handling, validation, and dynamic features.

// ===== API Configuration =====
// Using OpenWeatherMap free tier API
const API_KEY = "a29ef0a3edd01e80f36e8e01a0e46252";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ===== State Variables =====
// Stores current temperature in Celsius for unit toggle
let currentTempCelsius = null;
// Tracks current unit: true = Celsius, false = Fahrenheit
let isCelsius = true;

// ===== DOM Element References =====
// Caching all DOM elements used frequently to avoid repeated lookups
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const inputError = document.getElementById("input-error");
const recentSection = document.getElementById("recent-section");
const recentDropdown = document.getElementById("recent-dropdown");
const currentWeatherSection = document.getElementById("current-weather-section");
const forecastSection = document.getElementById("forecast-section");
const welcomeSection = document.getElementById("welcome-section");
const loadingOverlay = document.getElementById("loading-overlay");
const unitToggleBtn = document.getElementById("unit-toggle-btn");
const toastContainer = document.getElementById("toast-container");
const extremeAlertModal = document.getElementById("extreme-alert-modal");
const extremeAlertMessage = document.getElementById("extreme-alert-message");
const closeExtremeAlertBtn = document.getElementById("close-extreme-alert");
const rainContainer = document.getElementById("rain-container");
const appBody = document.getElementById("app-body");

// ===== Event Listeners =====
// Setting up all event listeners when the DOM is fully loaded

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

// Escape key clears the input field
cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        cityInput.value = "";
        hideInputError();
        cityInput.blur();
    }
});

// Use Current Location button - fetch weather using geolocation
locationBtn.addEventListener("click", function () {
    getCurrentLocationWeather();
});

// Recently searched dropdown - clicking a city fetches its weather
recentDropdown.addEventListener("change", function () {
    let selectedCity = recentDropdown.value;
    if (selectedCity) {
        cityInput.value = selectedCity;
        fetchWeatherByCity(selectedCity);
    }
});

// Temperature unit toggle button
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
// Validates input and triggers weather fetch for the entered city name
function handleCitySearch() {
    let city = cityInput.value.trim();

    // Validate: check if input is empty
    if (city === "") {
        showInputError("Please enter a city name.");
        return;
    }

    // Validate: check if input contains only valid characters (letters, spaces, hyphens)
    let cityPattern = /^[a-zA-Z\s\-,.]+$/;
    if (!cityPattern.test(city)) {
        showInputError("Invalid city name. Use only letters, spaces, or hyphens.");
        return;
    }

    // Input is valid, hide any previous errors and fetch weather
    hideInputError();

    // Check for internet connectivity before making API call
    if (!navigator.onLine) {
        showToast("You appear to be offline. Please check your internet connection.", "error");
        return;
    }

    fetchWeatherByCity(city);
}

// ===== Fetch Weather by City Name =====
// Calls OpenWeatherMap API with the city name for current weather and forecast
function fetchWeatherByCity(city) {
    showLoading();

    // Build API URLs for current weather and 5-day forecast
    let currentURL = BASE_URL + "/weather?q=" + encodeURIComponent(city) + "&appid=" + API_KEY + "&units=metric";
    let forecastURL = BASE_URL + "/forecast?q=" + encodeURIComponent(city) + "&appid=" + API_KEY + "&units=metric";

    // Fetch both current weather and forecast data in parallel
    Promise.all([
        fetch(currentURL),
        fetch(forecastURL)
    ])
        .then(function (responses) {
            // Check if the current weather response is OK
            if (!responses[0].ok) {
                if (responses[0].status === 404) {
                    throw new Error("City not found. Please check the spelling and try again.");
                } else if (responses[0].status === 401) {
                    throw new Error("API key is invalid. Please check your API configuration.");
                } else {
                    throw new Error("Failed to fetch weather data. Server returned status: " + responses[0].status);
                }
            }
            // Parse both responses as JSON
            return Promise.all([responses[0].json(), responses[1].json()]);
        })
        .then(function (data) {
            let currentData = data[0];
            let forecastData = data[1];

            // Display weather information on the UI
            displayCurrentWeather(currentData);
            displayForecast(forecastData);

            // Add city to recently searched list
            addToRecentSearches(currentData.name);

            // Check if weather is rainy and toggle rain effect
            handleRainyBackground(currentData.weather[0].main);

            // Check for extreme temperature (above 40 degrees Celsius)
            checkExtremeTemperature(currentData.main.temp);

            hideLoading();
        })
        .catch(function (error) {
            hideLoading();
            // Display error using custom toast notification (no alert())
            showToast(error.message, "error");
        });
}

// ===== Fetch Weather by Coordinates (Geolocation) =====
// Called when user clicks "Use Current Location" button
function fetchWeatherByCoords(lat, lon) {
    showLoading();

    // Build API URLs using latitude and longitude
    let currentURL = BASE_URL + "/weather?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY + "&units=metric";
    let forecastURL = BASE_URL + "/forecast?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY + "&units=metric";

    // Fetch both endpoints in parallel
    Promise.all([
        fetch(currentURL),
        fetch(forecastURL)
    ])
        .then(function (responses) {
            if (!responses[0].ok) {
                throw new Error("Unable to fetch weather for your location. Please try again.");
            }
            return Promise.all([responses[0].json(), responses[1].json()]);
        })
        .then(function (data) {
            let currentData = data[0];
            let forecastData = data[1];

            displayCurrentWeather(currentData);
            displayForecast(forecastData);
            addToRecentSearches(currentData.name);
            handleRainyBackground(currentData.weather[0].main);
            checkExtremeTemperature(currentData.main.temp);

            // Update the input field with the detected city name
            cityInput.value = currentData.name;

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
            let lat = position.coords.latitude;
            let lon = position.coords.longitude;
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
        // Options for geolocation
        { timeout: 10000, enableHighAccuracy: false }
    );
}

// =========================================================================
//                          DISPLAY FUNCTIONS
// =========================================================================

// ===== Display Current Weather =====
// Updates the current weather section with data from the API
function displayCurrentWeather(data) {
    // Store temperature in Celsius for unit toggle feature
    currentTempCelsius = data.main.temp;
    isCelsius = true;

    // Get today's formatted date
    let today = new Date();
    let dateString = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    // Update DOM elements with weather data
    document.getElementById("city-name").textContent = data.name + " (" + dateString + ")";
    document.getElementById("weather-date").textContent = getFullDateString(today);
    document.getElementById("current-temp").textContent = data.main.temp.toFixed(1) + "°C";
    document.getElementById("current-wind").textContent = data.wind.speed.toFixed(2) + " M/S";
    document.getElementById("current-humidity").textContent = data.main.humidity + "%";
    document.getElementById("current-feels-like").textContent = data.main.feels_like.toFixed(1) + "°C";
    document.getElementById("weather-condition").textContent = data.weather[0].description;

    // Set weather icon from OpenWeatherMap
    let iconCode = data.weather[0].icon;
    let iconURL = "https://openweathermap.org/img/wn/" + iconCode + "@2x.png";
    document.getElementById("weather-icon").src = iconURL;
    document.getElementById("weather-icon").alt = data.weather[0].description;

    // Show current weather section and hide the welcome message
    currentWeatherSection.classList.remove("hidden");
    welcomeSection.classList.add("hidden");
}

// ===== Display 5-Day Forecast =====
// Parses the forecast API response and creates forecast cards
function displayForecast(data) {
    let forecastCards = document.getElementById("forecast-cards");
    // Clear any existing forecast cards
    forecastCards.innerHTML = "";

    // OpenWeatherMap returns 3-hour interval data for 5 days (40 entries)
    // We pick one entry per day (at around 12:00 noon) for the 5-day view
    let dailyForecasts = getDailyForecasts(data.list);

    // Create a card for each day's forecast
    for (let i = 0; i < dailyForecasts.length; i++) {
        let day = dailyForecasts[i];
        let card = createForecastCard(day);
        forecastCards.appendChild(card);
    }

    // Show the forecast section
    forecastSection.classList.remove("hidden");
}

// ===== Extract One Forecast Entry Per Day =====
// Filters the 3-hourly forecast list to get one per day (preferring 12:00)
function getDailyForecasts(list) {
    let dailyMap = {};
    let today = new Date().toISOString().split("T")[0]; // today's date string

    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        let dateStr = item.dt_txt.split(" ")[0]; // extract YYYY-MM-DD
        let timeStr = item.dt_txt.split(" ")[1]; // extract HH:MM:SS

        // Skip today's date since we already show current weather
        if (dateStr === today) continue;

        // If this date hasn't been added yet, or this is the noon entry, prefer it
        if (!dailyMap[dateStr] || timeStr === "12:00:00") {
            dailyMap[dateStr] = item;
        }
    }

    // Convert map to array and take only 5 days
    let result = [];
    let keys = Object.keys(dailyMap).sort();
    for (let i = 0; i < Math.min(keys.length, 5); i++) {
        result.push(dailyMap[keys[i]]);
    }

    return result;
}

// ===== Create a Single Forecast Card =====
// Builds and returns a DOM element for one forecast day
function createForecastCard(dayData) {
    let card = document.createElement("div");
    card.className = "forecast-card";

    // Extract date from the forecast entry
    let dateStr = dayData.dt_txt.split(" ")[0];

    // Weather icon URL
    let iconCode = dayData.weather[0].icon;
    let iconURL = "https://openweathermap.org/img/wn/" + iconCode + "@2x.png";

    // Build the card HTML content with icons for temp, wind, humidity
    card.innerHTML =
        '<div class="forecast-date">(' + dateStr + ')</div>' +
        '<img src="' + iconURL + '" alt="' + dayData.weather[0].description + '" class="forecast-icon">' +
        '<div class="forecast-detail"><span>🌡️</span> Temp: ' + dayData.main.temp.toFixed(1) + '°C</div>' +
        '<div class="forecast-detail"><span>💨</span> Wind: ' + dayData.wind.speed.toFixed(2) + ' M/S</div>' +
        '<div class="forecast-detail"><span>💧</span> Humidity: ' + dayData.main.humidity + '%</div>';

    return card;
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

    let tempDisplay = document.getElementById("current-temp");

    if (isCelsius) {
        // Convert Celsius to Fahrenheit: (C * 9/5) + 32
        let fahrenheit = (currentTempCelsius * 9 / 5) + 32;
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
    let recentCities = getRecentSearches();

    // Remove the city if it already exists (to avoid duplicates)
    let index = recentCities.indexOf(city);
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
    let saved = localStorage.getItem("recentCities");
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

// ===== Render the Recently Searched Dropdown =====
// Reads from localStorage and populates the dropdown select element
function renderRecentSearches() {
    let recentCities = getRecentSearches();

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
    for (let i = 0; i < recentCities.length; i++) {
        let option = document.createElement("option");
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
    let rainyConditions = ["Rain", "Drizzle", "Thunderstorm"];
    let isRainy = rainyConditions.indexOf(weatherMain) !== -1;

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

    // Create 80 rain drops with randomized properties
    for (let i = 0; i < 80; i++) {
        let drop = document.createElement("div");
        drop.className = "rain-drop";

        // Randomize horizontal position across the screen
        drop.style.left = Math.random() * 100 + "%";

        // Randomize animation duration (speed) between 0.8s and 1.8s
        let duration = 0.8 + Math.random() * 1;
        drop.style.animationDuration = duration + "s";

        // Randomize animation delay so drops don't all start at once
        drop.style.animationDelay = Math.random() * 2 + "s";

        // Randomize opacity for depth effect
        drop.style.opacity = 0.3 + Math.random() * 0.5;

        // Vary the height of rain drops for realism
        let dropHeight = 10 + Math.random() * 15;
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
    let toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    // Choose icon based on toast type
    let icon = "❌";
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

    // Close button removes the toast
    let closeBtn = toast.querySelector(".toast-close");
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
    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return days[date.getDay()] + ", " +
        months[date.getMonth()] + " " +
        date.getDate() + ", " +
        date.getFullYear();
}
