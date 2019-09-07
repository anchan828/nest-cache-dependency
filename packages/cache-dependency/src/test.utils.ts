export const wait = async (time: number): Promise<void> =>
  await new Promise((resolve): any => setTimeout((): void => resolve(), time));
