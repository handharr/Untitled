import { runScrap } from "./src/scrape-tuya-products.js";

console.log("NODE_PATH:", process.env.NODE_PATH);

runScrap("tuya smart lamp", 2);
// runScrap("tuya smart lamp", 1000);
