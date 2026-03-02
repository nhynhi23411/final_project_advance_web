import { registerAs } from "@nestjs/config";

export interface AppConfig {
  maxClaimsLimit: number;
  expiryThreshold: number;
  maxRejects24h: number;
}

// using registerAs to namespace config (optional)
export default registerAs(
  "app",
  (): AppConfig => ({
    maxClaimsLimit: Number(process.env.MAX_CLAIMS_LIMIT) || 3,
    expiryThreshold: Number(process.env.EXPIRY_THRESHOLD) || 60,
    maxRejects24h: Number(process.env.MAX_REJECTS_24H) || 3,
  }),
);
