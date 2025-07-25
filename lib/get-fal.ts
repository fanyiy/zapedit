import { fal } from "@fal-ai/client";

export function configureFal(userAPIKey: string | null) {
  if (userAPIKey) {
    fal.config({
      credentials: userAPIKey,
    });
  } else if (process.env.FAL_KEY) {
    fal.config({
      credentials: process.env.FAL_KEY,
    });
  }
  
  return fal;
}