import fs from "fs";
import path from "path";
import { Parser } from "json2csv";

export const saveCSV = (csvString, fileName = "tuya_data.csv") => {
  const filePath = path.join(process.cwd(), fileName);
  fs.writeFileSync(filePath, csvString);
  console.log(`✅ CSV saved at: ${filePath}`);
};

export function exportToCSV(data, filename) {
  const parser = new Parser();
  const csv = parser.parse(data);
  fs.writeFileSync(filename, csv);
  console.log(`CSV exported to ${filename}`);
}
