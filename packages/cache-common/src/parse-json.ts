const dateRegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * parse json string to javascript object.
 * JSON.parse has receiver for Date.parse.
 * @param json
 */
export const parseJSON = <T>(json?: string): T | undefined => {
  if (!json) {
    return;
  }

  try {
    return JSON.parse(json, (_: string, value: any): any => {
      if (typeof value === "string" && dateRegExp.test(value)) {
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
