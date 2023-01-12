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

function isEven(num: number): boolean {
  return num % 2 == 0;
}

function toInt(num: number): number {
  return num | 0;
}

function mean(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// TODO: type for predicate p
export function takeWhile(iterable: Iterable<any>, p: any): any[] {
  const c = [];

  for (const i of iterable) {
    if (p(i)) {
      c.push(i);
      continue;
    }
    break;
  }

  return c;
}
