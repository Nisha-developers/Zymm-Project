import { NAVIGATION_STORAGE_KEY, readNavigationStack } from "../lib/nav";

describe("readNavigationStack", () => {
  it("restores the saved navigation stack and screen parameters", () => {
    const stack = [{ name: "home" }, { name: "job", job: { id: "job-1" } }];
    const storage = {
      getItem: () => JSON.stringify(stack),
      removeItem: vi.fn(),
    };

    expect(readNavigationStack(storage)).toEqual(stack);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("starts at Home and clears an invalid saved stack", () => {
    const storage = {
      getItem: () => JSON.stringify([{ name: "unknown" }]),
      removeItem: vi.fn(),
    };

    expect(readNavigationStack(storage)).toEqual([{ name: "home" }]);
    expect(storage.removeItem).toHaveBeenCalledWith(NAVIGATION_STORAGE_KEY);
  });
});
