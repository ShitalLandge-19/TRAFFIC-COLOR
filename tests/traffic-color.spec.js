const { test, expect } = require('@playwright/test');
const { VectorTile } = require('@mapbox/vector-tile');
const Pbf = require('pbf').default;

const APP_BASE_URL = 'https://review-mf-tfc-dem-n01jvo-review.dev-dcadcx.michelin.fr/traffic-color/';
const MAP_CENTER = '48.8581/2.3727';
const LEFT_MAP_CANVAS = '#before canvas.maplibregl-canvas';
const REVIEW_TRAFFIC_HOST = 'review-mf-maps-tr-gl8a3w-review.dev-dcadcx.michelin.fr';

const TRAFFIC_COLOR_CODES = {
  BLACK: 1,
  RED: 2,
  ORANGE: 3
};

function buildMapUrl(zoom) {
  return `${APP_BASE_URL}#${zoom}/${MAP_CENTER}`;
}

function isReviewTrafficTileUrl(url) {
  return url.includes(REVIEW_TRAFFIC_HOST) && url.includes('/trafficolor/');
}

async function openMapAtZoom(page, zoom) {
  await page.goto(buildMapUrl(zoom), { waitUntil: 'networkidle' });
  await expect(page.locator(LEFT_MAP_CANVAS)).toBeVisible();
}

async function switchBothPanelsToReviewMartinSource(page) {
  await page.selectOption('#left-source-selector', 'martin');
  await page.selectOption('#right-source-selector', 'martin');
  await page.selectOption('#left-martin-tile-selector', 'review');
  await page.selectOption('#right-martin-tile-selector', 'review');

  // Allow map style reloading and tile fetching after source changes.
  await page.waitForTimeout(6000);
}

async function countReviewTrafficRequests(page, zoom) {
  const uniqueTrafficTileRequests = new Set();

  const onRequest = (request) => {
    const url = request.url();
    if (isReviewTrafficTileUrl(url)) {
      uniqueTrafficTileRequests.add(url);
    }
  };

  page.on('request', onRequest);
  try {
    await openMapAtZoom(page, zoom);
    await switchBothPanelsToReviewMartinSource(page);
    await page.waitForTimeout(4000);
    return uniqueTrafficTileRequests.size;
  } finally {
    page.off('request', onRequest);
  }
}

function addColorCodesFromTile(tileBuffer, colorCodes) {
  const tile = new VectorTile(new Pbf(tileBuffer));
  const layerNames = Object.keys(tile.layers);

  for (const layerName of layerNames) {
    const layer = tile.layers[layerName];
    for (let featureIndex = 0; featureIndex < layer.length; featureIndex += 1) {
      const feature = layer.feature(featureIndex);
      const colorCode = feature.properties && feature.properties.color;
      if (Number.isInteger(colorCode)) {
        colorCodes.add(colorCode);
      }
    }
  }
}

async function collectRenderedTrafficColorCodes(page, zoom) {
  const colorCodes = new Set();
  const responseParsingTasks = [];

  const onResponse = (response) => {
    if (!isReviewTrafficTileUrl(response.url()) || response.status() !== 200) {
      return;
    }

    responseParsingTasks.push(
      (async () => {
        try {
          const tileBuffer = await response.body();
          addColorCodesFromTile(tileBuffer, colorCodes);
        } catch {
          // Ignore occasional decode errors from non-tile responses.
        }
      })()
    );
  };

  page.on('response', onResponse);
  try {
    await openMapAtZoom(page, zoom);
    await switchBothPanelsToReviewMartinSource(page);
    await page.waitForTimeout(6000);
    await Promise.all(responseParsingTasks);
    return colorCodes;
  } finally {
    page.off('response', onResponse);
  }
}

test('Traffic requests are absent before zoom 2 and present from zoom 2 to 19', async ({ page }) => {
  const zoom0Requests = await countReviewTrafficRequests(page, 0);
  const zoom1Requests = await countReviewTrafficRequests(page, 1);
  const zoom2Requests = await countReviewTrafficRequests(page, 2);
  const zoom19Requests = await countReviewTrafficRequests(page, 19);

  expect(zoom0Requests).toBe(0);
  expect(zoom1Requests).toBe(0);
  expect(zoom2Requests).toBeGreaterThan(0);
  expect(zoom19Requests).toBeGreaterThan(0);
});

test('Traffic tiles contain black, red, and orange categories in review environment', async ({ page }) => {
  const colorCodes = await collectRenderedTrafficColorCodes(page, 9);

  expect(colorCodes.has(TRAFFIC_COLOR_CODES.BLACK)).toBeTruthy();
  expect(colorCodes.has(TRAFFIC_COLOR_CODES.RED)).toBeTruthy();
  expect(colorCodes.has(TRAFFIC_COLOR_CODES.ORANGE)).toBeTruthy();
});
