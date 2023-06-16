export function median(numArray: number[]): number {
  const length = numArray.length;

  if (length === 0) {
    throw Error('Unable to get a median of an empty array');
  }

  const n = toInt(length / 2);
  numArray.sort();

  if (isEven(length)) {
    return mean(numArray[n], numArray[n + 1]);
  } else {
    return numArray[n];
  }
}

export function mean(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function isEven(num: number): boolean {
  return num % 2 == 0;
}

function toInt(num: number): number {
  return num | 0;
}

export function takeWhile<T>(
  iterable: Iterable<T>,
  predicate: (value: T) => boolean,
): T[] {
  const c = [];

  for (const i of iterable) {
    if (predicate(i)) {
      c.push(i);
      continue;
    }
    break;
  }

  return c;
}

// simple LRU similar to https://stackoverflow.com/a/46432113,
// but suggested by copilot and updated to generic
export class LRU<K, T> {
  private readonly _cache: Map<K, T>;
  private readonly _maxSize: number;

  constructor(maxSize: number) {
    this._cache = new Map();
    this._maxSize = maxSize;
  }

  public get(key: K): any {
    const value = this._cache.get(key);
    if (value) {
      this._cache.delete(key);
      this._cache.set(key, value);
    }

    return value;
  }

  public set(key: K, value: T): void {
    this._cache.set(key, value);
    if (this._cache.size > this._maxSize) {
      this._cache.delete(this._cache.keys().next().value);
    }
  }
}
