import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",

    // 10% of traces in production.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Strip sensitive data before sending.
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["stripe-signature"];
      }
      return event;
    },
  });
}
