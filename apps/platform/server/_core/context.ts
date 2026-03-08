import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

const isDev = process.env.NODE_ENV === "development";

const DEV_USER: User = {
  id: 1,
  openId: "dev-user",
  name: "Dev Local",
  email: "dev@concrya.com.br",
  loginMethod: "dev",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (isDev) {
    user = DEV_USER;
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
