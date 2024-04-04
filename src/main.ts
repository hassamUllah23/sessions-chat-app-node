import { run_server } from "./server";
import { close_session } from "./modules";

(async () => {
  const args = process.argv[2];
  if (args === "-cs" || args === "--close-session") {
    try {
      const sessionIdIndex = process.argv.indexOf("--sessionId");
      const sessionId = process.argv[sessionIdIndex + 1];
      console.log({ sessionId });

      await close_session({ sessionId: sessionId });
    } catch (error) {
      console.log(error);
    } finally {
      process.exit(0);
    }
  } else if (args === "-s" || args === "--server") {
    await run_server();
  }
})();
