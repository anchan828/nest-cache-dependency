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
      if (typeof value === "string" && value.length === 24 && dateRegExp.test(value)) {
        const date = new Date(value);
        if (+date === +date) {
          return date;
        }
      }
      return value;
    });
  } catch {
    return;
  }
};
