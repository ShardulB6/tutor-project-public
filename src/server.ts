export { TutorAgent } from "./routes/agents/-agents/tutor-agent";

import handler from "@tanstack/react-start/server-entry";

export default {
  fetch: handler.fetch,
};
