import { chunk } from "./chunk";

describe("chunk", () => {
  it("should split array", () => {
    expect(chunk([0, 1, 2, 3], 1)).toEqual([[0], [1], [2], [3]]);
    expect(chunk(Array(10000).fill("00000000000000000000000000000000000000000000000000000000000000"), 1)).toEqual(
      expect.arrayContaining([["00000000000000000000000000000000000000000000000000000000000000"]]),
    );
  });
});
