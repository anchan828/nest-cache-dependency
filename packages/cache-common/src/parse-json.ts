export const parseJSON = <T>(json?: string): T | undefined => {
  if (!json) {
    return;
  }

  try {
    return JSON.parse(json, (_: string, value: any): any => {
      if (typeof value === "string") {
        const date = Date.parse(value);
        if (!isNaN(date)) {
          return new Date(date);
        }
      }
      return value;
    });
  } catch {
    return;
  }
};
