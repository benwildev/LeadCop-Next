export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadDomainCache } = await import("@/lib/backend/domain-cache");
    const { startBulkWorker } = await import("@/lib/backend/workers");
    const { logger } = await import("@/lib/backend/logger");

    try {
      logger.info("Initializing LeadCop backend services via instrumentation...");
      await loadDomainCache();
      startBulkWorker();

      // Start periodic domain sync (every 24 hours)
      const { syncDomainsFromGitHub } = await import("@/lib/backend/domain-cache");
      setInterval(async () => {
        try {
          logger.info("Starting automatic domain database synchronization...");
          const { added, total } = await syncDomainsFromGitHub();
          logger.info({ added, total }, "Automatic domain database synchronization completed.");
        } catch (err) {
          logger.error({ err }, "Automatic domain database synchronization failed.");
        }
      }, 24 * 60 * 60 * 1000);

      logger.info("LeadCop backend services initialized successfully.");
    } catch (err) {
      logger.error({ err }, "Failed to initialize backend services");
    }
  }
}
