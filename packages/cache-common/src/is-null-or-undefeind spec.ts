import { isNullOrUndefined } from "./is-null-or-undefeind";

describe("isNullOrUndefined", () => {
  it("should return false", () => {
    expect(isNullOrUndefined(0)).toBeFalsy();
    expect(isNullOrUndefined("")).toBeFalsy();
    expect(isNullOrUndefined("a")).toBeFalsy();
    expect(isNullOrUndefined(1)).toBeFalsy();
    expect(isNullOrUndefined({})).toBeFalsy();
  });

  it("should return true", () => {
    expect(isNullOrUndefined(undefined)).toBeTruthy();
    expect(isNullOrUndefined(null)).toBeTruthy();
  });
});
