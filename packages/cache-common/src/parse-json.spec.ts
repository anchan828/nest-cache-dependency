import { parseJSON } from "./parse-json";

describe("parseJSON", () => {
  it("should return undefined", () => {
    expect(parseJSON()).toBeUndefined();
  });
  it("should return undefined", () => {
    expect(parseJSON("<")).toBeUndefined();
  });

  it("should parse", () => {
    const data = { id: 1, name: "name" };
    expect(parseJSON(JSON.stringify(data))).toStrictEqual(data);
  });

  it("should parse date", () => {
    const data = { id: 1, name: "name 1", date: new Date() };
    expect(parseJSON(JSON.stringify(data))).toStrictEqual(data);
  });
});
