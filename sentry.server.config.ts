// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6f978ecb515fb9d7930e23f48dd596b7@o4510964620263424.ingest.us.sentry.io/4510964624850944",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  integrations: [
      Sentry.vercelAIIntegration,//to keep check of the tokens expended via vercel AI SDK
      Sentry.consoleLoggingIntegration({levels: ['log','warn','error']})//logs shows up in the console itself
    ],
});
