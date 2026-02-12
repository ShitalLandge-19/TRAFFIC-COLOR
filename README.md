# TRAFFIC-COLOR

Playwright automation for Martin review environment traffic checks.

## What is automated

1. Traffic requests are not loaded below zoom 2, and are loaded from zoom 2 to zoom 19.
2. Black, Red, and Orange traffic categories are present in review traffic tiles.

## Install

```bash
npm install
npx playwright install chromium
```

## Run tests

```bash
npm test
```

> Note: In this Linux cloud environment, the map needs WebGL in headed mode.
> `npm test` uses `xvfb-run` to provide a virtual display.