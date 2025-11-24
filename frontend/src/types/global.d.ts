export {};

declare global {
  interface Window {
    Telegram?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WebApp: any;
    };
  }
}
