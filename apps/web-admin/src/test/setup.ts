import "@testing-library/jest-dom/vitest";

type StorageLike = Pick<Storage, "clear" | "getItem" | "key" | "removeItem" | "setItem"> & {
  readonly length: number;
};

function createStorageShim(): Storage {
  const store = new Map<string, string>();

  const storage: StorageLike = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(String(key)) ?? null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };

  return storage as Storage;
}

function hasStorageApi(value: unknown): value is Storage {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Storage).clear === "function" &&
    typeof (value as Storage).getItem === "function" &&
    typeof (value as Storage).key === "function" &&
    typeof (value as Storage).removeItem === "function" &&
    typeof (value as Storage).setItem === "function",
  );
}

function ensureStorage(name: "localStorage" | "sessionStorage") {
  const currentValue = globalThis[name];

  if (hasStorageApi(currentValue)) {
    return;
  }

  const shim = createStorageShim();

  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: shim,
  });

  if (globalThis.window !== undefined) {
    Object.defineProperty(globalThis.window, name, {
      configurable: true,
      writable: true,
      value: shim,
    });
  }
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");
