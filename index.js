#!/usr/bin/env node
import { getWeather } from "./src/app.js";
import argv from "minimist";

const args = argv(process.argv.slice(2));

const weather = await getWeather(args);
if (weather) {
  console.log(weather);
}
