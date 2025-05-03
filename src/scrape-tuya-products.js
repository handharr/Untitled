import puppeteer from "puppeteer";
import { exportToCSV } from "./utils/saveCSV.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeTokopedia(keyword, maxPages = 15) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();
  await page.goto("https://www.tokopedia.com", { waitUntil: "networkidle2" });

  // Check and close the ad using the provided XPath
  const adCloseButton = await page.$("div.css-11hzwo5 > button");
  if (adCloseButton) {
    console.log("Ad detected. Closing...");
    await adCloseButton.click();
    await delay(2000); // Wait for the ad to disappear
  } else {
    console.log("No ad detected.");
  }

  // Wait for the search input
  await page.waitForSelector('input[aria-label="Cari di Tokopedia"]');

  // Focus and type the search keyword
  await page.type('input[aria-label="Cari di Tokopedia"]', keyword);

  // Press Enter to submit the search
  await page.keyboard.press("Enter");

  // Wait for the search results info element
  try {
    await page.waitForSelector('div.css-q72k9b[data-testid="dSRPSearchInfo"]', {
      timeout: 10000, // Wait up to 10 seconds
    });
    console.log("Search results info element found.");
  } catch (error) {
    console.error("Search results info element not found within timeout.");
    await browser.close();
    return []; // Exit the function if the element is not found
  }

  // Initialize an array to store all products
  let allProducts = [];
  let currentPage = 1;

  while (currentPage <= maxPages) {
    // Wait for the search results info element
    try {
      await page.waitForSelector(
        'div.css-q72k9b[data-testid="dSRPSearchInfo"]',
        {
          timeout: 10000, // Wait up to 10 seconds
        }
      );
      console.log("Search results info element found.");
    } catch (error) {
      console.error("Search results info element not found within timeout.");
      await browser.close();
      return []; // Exit the function if the element is not found
    }

    console.log(`Scraping page ${currentPage}`);

    // Scroll until the element with class 'css-vc6jc2' is visible
    await autoScroll(page, 200);

    // Scrape products on the current page
    const products = await processProducts(page);

    // Add the scraped products to the main array
    allProducts = allProducts.concat(products);

    // Try to go to the next page
    const hasNextPage = await goToNextPage(page);
    if (!hasNextPage) {
      console.log("No more pages to scrape.");
      break; // Exit the loop if no more pages
    } else {
      currentPage++;
      console.log(`Moving to page ${currentPage}...`);
    }
  }

  await browser.close();
  return allProducts;
}

async function processProducts(page) {
  const products = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(".WABnq4pXOYQihv0hUfQwOg\\=\\=")
    ).map((item) => {
      const priceText =
        item.querySelector(".XvaCkHiisn2EZFq0THwVug\\=\\=")?.innerText || "N/A";

      // Split the price if it contains two values
      const prices = priceText
        .replace(/Rp/g, "") // Remove "Rp"
        .replace(/\./g, "") // Remove dots
        .split(/\s+/) // Split by whitespace
        .map((price) => parseInt(price, 10)) // Convert to integers
        .filter((price) => !isNaN(price)); // Filter out invalid numbers

      let price = "N/A";
      let priceAfterDiscount = "N/A";

      if (prices.length === 2) {
        // If there are two prices, assign max to price and min to priceAfterDiscount
        price = Math.max(...prices);
        priceAfterDiscount = Math.min(...prices);
      } else if (prices.length === 1) {
        // If there is only one price, assign it to both columns
        price = prices[0];
        priceAfterDiscount = prices[0];
      }

      // Determine the shop badge
      const badgeImg = item.querySelector("img.YtXczlnkXDXQ59u3vhDxiA\\=\\=");
      let shopBadge = "N/A";
      if (badgeImg) {
        const badgeSrc = badgeImg.src;
        if (badgeSrc.includes("PM%20Pro%20Small.png")) {
          shopBadge = "Power Shop";
        } else if (badgeSrc.includes("official_store_badge.png")) {
          shopBadge = "Mall";
        }
      }

      return {
        title:
          item.querySelector("._0T8-iGxMpV6NEsYEhwkqEg\\=\\=")?.innerText ||
          "N/A",
        price: price !== "N/A" ? `Rp${price.toLocaleString("id-ID")}` : "N/A",
        priceAfterDiscount:
          priceAfterDiscount !== "N/A"
            ? `Rp${priceAfterDiscount.toLocaleString("id-ID")}`
            : "N/A",
        sold:
          item.querySelector(".se8WAnkjbVXZNA8mT\\+Veuw\\=\\=")?.innerText ||
          "N/A",
        store:
          item.querySelector(".T0rpy-LEwYNQifsgB-3SQw\\=\\=")?.innerText ||
          "N/A",
        shopBadge: shopBadge,
      };
    });
  });

  // Remove duplicate products
  const uniqueProducts = products.filter(
    (product, index, self) =>
      index ===
      self.findIndex((p) => JSON.stringify(p) === JSON.stringify(product))
  );

  return uniqueProducts;
}

async function goToNextPage(page) {
  console.log("Checking pagination container...");

  // Check if the pagination container exists
  const paginationContainer = await page.waitForSelector(
    "ul.css-1ni9y5x-unf-pagination-items",
    { timeout: 10000 } // Wait up to 10 seconds
  );
  if (!paginationContainer) {
    console.log("Pagination container not found. Ending function.");
    return; // End the function if the pagination container is not found
  }

  // Select the "Next" button inside the pagination container
  const nextPageButton = await page.waitForSelector(
    "ul.css-1ni9y5x-unf-pagination-items > li > button.css-dzvl4q-unf-pagination-item[aria-label='Laman berikutnya']"
  );

  if (nextPageButton) {
    // Check if the button is disabled
    const isDisabled = await page.evaluate((button) => {
      return button.hasAttribute("disabled");
    }, nextPageButton);

    if (!isDisabled) {
      console.log("Next page button is enabled. Clicking...");
      await nextPageButton.click();
      await delay(2000); // Wait for the next page to load
      return true;
    } else {
      console.log("Next page button is disabled. No more pages.");
      return false;
    }
  } else {
    console.log("Next page button not found.");
    return false; // No more pages
  }
}

async function autoScroll(page, maxScrolls) {
  await page.evaluate(async (maxScrolls) => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 100;
      var scrolls = 0; // scrolls counter
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        scrolls++; // increment counter

        // stop scrolling if reached the end or the maximum number of scrolls
        if (
          totalHeight >= scrollHeight - window.innerHeight ||
          scrolls >= maxScrolls
        ) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }, maxScrolls); // pass maxScrolls to the function
}

export async function runScrap(keyword = "tuya smart lamp", maxPages = 1000) {
  const filename = `tokopedia_${keyword}_${Date.now()}.csv`;

  const products = await scrapeTokopedia(keyword, maxPages);
  exportToCSV(products, filename);
}
