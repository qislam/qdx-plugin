declare module 'csvjson' {
  interface CsvJson {
    toObject(csvString: string, options?: Record<string, unknown>): Array<Record<string, string>>;
    toCSV(jsonString: string, options?: Record<string, unknown>): string;
  }
  const csvjson: CsvJson;
  export = csvjson;
}
