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

// This is the new function that uses the ModelScope API
export async function generateImageV2(
  unsafeData: z.infer<typeof schema>,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const { imageUrl, prompt } = schema.parse(unsafeData);

  if (ratelimit) {
    const ipAddress = await getIPAddress();
    const { success } = await ratelimit.limit(ipAddress);
    if (!success) {
      return {
        success: false,
        error: "Rate limit exceeded. Please try again in 24h.",
      };
    }
  }

  if (!process.env.MODELSCOPE_SDK_TOKEN) {
    return {
      success: false,
      error: "ModelScope SDK token not configured.",
    };
  }

  try {
    const response = await fetch('https://api-inference.modelscope.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MODELSCOPE_SDK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-Kontext-dev',
        prompt,
        image_url: imageUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ModelScope API error:', response.status, errorText);
      return {
        success: false,
        error: `ModelScope API error: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    
    if (result.images && result.images[0] && result.images[0].url) {
      return { success: true, url: result.images[0].url };
    } else {
      return {
        success: false,
        error: "No image URL returned from ModelScope API.",
      };
    }
  } catch (e: any) {
    console.error('ModelScope API request failed:', e);
    return {
      success: false,
      error: e.message || "Image could not be generated. Please try again.",
    };
  }
}