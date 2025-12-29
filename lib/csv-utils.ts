export const normalize_csv_data = (csv_data: any[]): Record<string, any>[] => {
  return csv_data.map((row: any, index: number) => {
    if (Array.isArray(row)) {
      if (index === 0) {
        return null;
      }
      const headers = csv_data[0] as string[];
      if (!Array.isArray(headers)) {
        return null;
      }
      const row_obj: Record<string, any> = {};
      headers.forEach((header: string, col_index: number) => {
        if (header) {
          row_obj[header.trim()] = row[col_index] || "";
        }
      });
      return row_obj;
    }
    return row;
  }).filter((row: any) => row && typeof row === "object" && Object.keys(row).length > 0);
};

export const get_csv_field = (row: Record<string, any>, field_name: string, default_value: string = ""): string => {
  const variations = [
    field_name,
    field_name.charAt(0).toUpperCase() + field_name.slice(1),
    field_name.toUpperCase(),
    field_name.split(" ").map((word, i) => 
      i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    ).join(" "),
    field_name.toLowerCase(),
    field_name.toUpperCase().split(" ").join(" "),
  ];
  
  for (const variation of variations) {
    if (row[variation] !== undefined && row[variation] !== null && row[variation] !== "") {
      return String(row[variation]);
    }
  }
  
  return default_value;
};

