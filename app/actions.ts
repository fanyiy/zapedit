/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { configureFal } from "@/lib/get-fal";
import { getIPAddress, getRateLimiter } from "@/lib/rate-limiter";
import { z } from "zod";

const ratelimit = getRateLimiter();

const schema = z.object({
  imageUrl: z.string(),
  prompt: z.string(),
  width: z.number(),
  height: z.number(),
});

export async function generateImage(
  unsafeData: z.infer<typeof schema>,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const { imageUrl, prompt } =
    schema.parse(unsafeData);

  if (ratelimit) {
    const ipAddress = await getIPAddress();

    const { success } = await ratelimit.limit(ipAddress);
    if (!success) {
      return {
        success: false,
        error:
          "Rate limit exceeded. Please try again in 24h.",
      };
    }
  }

  const fal = configureFal(null);

  let url;
  try {
    const result = await fal.subscribe("fal-ai/flux-kontext/dev", {
      input: {
        prompt,
        image_url: imageUrl,
        num_inference_steps: 28,
        guidance_scale: 2.5,
        num_images: 1,
        enable_safety_checker: false,
        output_format: "jpeg",
        resolution_mode: "match_input",
      },
    });

    url = result.data.images[0]?.url;
  } catch (e: any) {
    console.log(e);
    return {
      success: false,
      error: e.message || "Image could not be generated. Please try again.",
    };
  }

  if (url) {
    return { success: true, url };
  } else {
    return {
      success: false,
      error: "Image could not be generated. Please try again.",
    };
  }
}