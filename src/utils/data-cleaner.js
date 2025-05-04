import _ from "lodash";

export class DataCleaner {
  /**
   * Removes duplicate objects from an array based on deep equality.
   * @param {Array} data - The array of objects to clean.
   * @returns {Array} - The array with duplicates removed.
   */
  static removeDuplicates(data) {
    return _.uniqWith(data, _.isEqual);
  }

  /**
   * Cleans up text fields by trimming whitespace and normalizing case.
   * @param {Array} data - The array of objects to clean.
   * @param {Array} fields - The fields to clean in each object.
   * @returns {Array} - The cleaned array of objects.
   */
  static cleanTextFields(data, fields) {
    return data.map((item) => {
      const cleanedItem = { ...item };
      fields.forEach((field) => {
        if (cleanedItem[field] && typeof cleanedItem[field] === "string") {
          cleanedItem[field] = cleanedItem[field].trim();
        }
      });
      return cleanedItem;
    });
  }

  /**
   * Filters out objects with missing or invalid values for specified fields.
   * @param {Array} data - The array of objects to filter.
   * @param {Array} fields - The fields to validate.
   * @returns {Array} - The filtered array of objects.
   */
  static filterInvalidEntries(data, fields) {
    return data.filter((item) =>
      fields.every((field) => item[field] !== null && item[field] !== "N/A")
    );
  }
}
