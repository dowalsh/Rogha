// src/lib/swr.ts

export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new FetchError(`Request to ${url} failed`, res.status);
  }
  return res.json();
};
