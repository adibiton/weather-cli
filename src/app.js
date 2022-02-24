import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url) });

import util from "util";
import axios from "axios";
import cp from "child_process";

const exec = util.promisify(cp.exec);
const apiKey = process.env.OPEN_WEATHER_MAP_API_KEY;

const weatherEmoji = {
  Clouds: "☁️",
  Rain: "🌧️☔🌧️",
  Default: "😎",
};

async function getMacAddressOfAccessPoints() {
  const { stderr, stdout } = await exec("netsh wlan show networks mode=bssid");
  if (stderr) {
    throw new Error("Enable to get Mac address with: ", stderr);
  }
  const pattern =
    /(?:BSSID\s\d+\s+:\s+)([a-zA-Z0-9]{2}:[a-zA-Z0-9]{2}:[a-zA-Z0-9]{2}:[a-zA-Z0-9]{2}:[a-zA-Z0-9]{2}:[a-zA-Z0-9]{2})/g;
  const results = stdout.matchAll(pattern);
  return Array.from(results).map((result) => result[1]);
}

async function fetchUserLocationWith(macAddresses) {
  const response = await axios({
    url: `https://www.googleapis.com/geolocation/v1/geolocate?key=${process.env.GOOGLE_MAPS_API_KEY}`,
    data: {
      considerIp: "True",
      wifiAccessPoints: macAddresses.map((address) => ({
        macAddress: address,
      })),
    },
    method: "Post",
    headers: { "Content-Type": "application/json" },
  });
  return response.data.location;
}

async function getTodayWeatherOn(location) {
  const { lat, lng } = location;
  const getWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  const response = await axios.get(getWeatherUrl);
  return response.data;
}

async function getForcastWeatherOn(location) {
  const { lat, lng } = location;
  const getWeatherUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  const response = await axios.get(getWeatherUrl);
  return response.data;
}

function _getWeatherEmoji(weather) {
  return weatherEmoji[weather] ?? weatherEmoji.Default;
}

function buildTodayWeatherOutput(weather) {
  return `${weather.name} ${weather.main.temp}°C ${_getWeatherEmoji(weather.weather[0].main)}`;
}

function buildForecastOutput(forecast, todayWeather) {
  const daily = forecast.daily.map((day) => ` ${day.temp.day}°C ${_getWeatherEmoji(day.weather[0]?.main)}\n`).join("");
  return `${todayWeather.name} forecast for the next days: \n` + daily.toString();
}

async function getUserLocation() {
  try {
    const macAddresses = await getMacAddressOfAccessPoints();
    return await fetchUserLocationWith(macAddresses);
  } catch (e) {
    console.error(e);
  }
}

async function getWeather(argv) {
  const location = await getUserLocation();
  if (argv.t) {
    const [forecast, todayWeather] = await Promise.all([getForcastWeatherOn(location), getTodayWeatherOn(location)]);
    return buildForecastOutput(forecast, todayWeather);
  } else {
    const weather = await getTodayWeatherOn(location);
    return buildTodayWeatherOutput(weather);
  }
}
export { getWeather };
