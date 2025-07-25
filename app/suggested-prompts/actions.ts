"use server";

import OpenAI from "openai";
import { getIPAddress, getRateLimiter } from "@/lib/rate-limiter";
import invariant from "tiny-invariant";
import mime from "mime";

const ratelimit = getRateLimiter();

async function convertImageToBase64(
  imageUrl: string,
): Promise<{ data: string; mimeType: string }> {
  // If it's already a data URL, extract the data and mime type
  if (imageUrl.startsWith("data:")) {
    const [header, data] = imageUrl.split(",");
    const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
    return { data, mimeType };
  }

  // For regular URLs, fetch and convert to base64
  try {
    // Add timeout and better fetch configuration
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZapEdit/1.0)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Try to determine mime type from URL or response headers
    const contentType =
      response.headers.get("content-type") ||
      mime.getType(imageUrl) ||
      "image/jpeg";

    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching image:", error);

    // If it's an abort error, it was a timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Image fetch timeout - please try again");
    }

    // For other errors, provide more specific error messages
    if (error instanceof Error) {
      throw new Error(`Failed to fetch image: ${error.message}`);
    }

    throw new Error("Failed to process image");
  }
}

export async function getSuggestions(imageUrl: string): Promise<string[]> {
  invariant(typeof imageUrl === "string");

  if (ratelimit) {
    const ipAddress = await getIPAddress();
    const { success } = await ratelimit.limit(`${ipAddress}-suggestions`);
    if (!success) {
      return [];
    }
  }

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not found");
    return [];
  }

  try {
    // Convert image to base64
    let imageData;
    try {
      imageData = await convertImageToBase64(imageUrl);
    } catch (imageError) {
      console.error("Image processing error:", imageError);
      return [];
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const dataUrl = `data:${imageData.mimeType};base64,${imageData.data}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
            {
              type: "text",
              text: `Analyze this image and suggest exactly 3 specific, creative editing ideas that would enhance or transform it. Focus on realistic modifications like lighting changes, background modifications, style transformations, color adjustments, adding elements, or mood changes.`,
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "string"
                }
              }
            },
            required: ["suggestions"],
            additionalProperties: false
          }
        }
      },
      max_completion_tokens: 300
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(content);
    const suggestions = parsedResponse.suggestions?.slice(0, 3) || [];

    return suggestions;
  } catch (error) {
    console.error("Error generating suggestions with OpenAI:", error);
    return [];
  }
}
