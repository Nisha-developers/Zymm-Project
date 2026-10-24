import { createContext, useContext } from "react";
// Tiny stack navigator: go("job", { job }), back(), home().
export const NAVIGATION_STORAGE_KEY = "zymm-navigation";
const SCREENS = new Set(["home", "assistant", "topics", "job", "library", "resumeBuilder", "apply"]);

export function readNavigationStack(storage) {
  const saved = storage.getItem(NAVIGATION_STORAGE_KEY);
  if (!saved) return [{ name: "home" }];

  try {
    const stack = JSON.parse(saved);
    if (Array.isArray(stack) && stack.length > 0 && stack.every((screen) =>
      screen && typeof screen === "object" && SCREENS.has(screen.name)
    )) {
      return stack;
    }
  } catch (error) {
    console.warn("Unable to restore saved navigation; opening Home.", error);
  }

  storage.removeItem(NAVIGATION_STORAGE_KEY);
  return [{ name: "home" }];
}

export const NavContext = createContext({ go() {}, back() {}, home() {} });
export const useNav = () => useContext(NavContext);