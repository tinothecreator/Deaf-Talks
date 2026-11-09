import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  logging: {
    // Next dev logs request URLs and action arguments by default. Keep auth
    // confirmation tokens and submitted authentication data out of those logs.
    incomingRequests: { ignore: [/^\/auth\/confirm(?:\?|$)/, /^\/sign-(?:in|up)(?:\?|$)/] },
  },
};

export default nextConfig;
