// wait for all promises to resolve and throws if any error occurs
export async function allSettled<T>(promises: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(failed.map((r: any) => r.reason).join(''));
  }

  return results.map((r: any) => r.value) as T[];
}
