import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { generateImage } from '../../actions';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, activeImageUrl, imageData } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    maxSteps: 5,
    messages,
    tools: {
      editImage: tool({
        description: 'Edit an image based on user instructions. Use this when the user wants to modify, enhance, or change aspects of the current image. This will actually generate a new edited version of the image.',
        parameters: z.object({
          prompt: z.string().describe('The editing instructions for the image - be specific and detailed'),
          imageUrl: z.string().optional().describe('The URL of the image to edit (defaults to current image)'),
          width: z.number().optional().describe('The width of the image (defaults to current image width)'),
          height: z.number().optional().describe('The height of the image (defaults to current image height)'),
        }),
        execute: async ({ prompt, imageUrl: providedImageUrl, width: providedWidth, height: providedHeight }) => {
          // Use provided values or fall back to current image context
          const finalImageUrl = providedImageUrl || activeImageUrl;
          const finalWidth = providedWidth || imageData?.width || 1024;
          const finalHeight = providedHeight || imageData?.height || 768;

          if (!finalImageUrl) {
            return {
              action: 'edit_image',
              prompt,
              success: false,
              error: 'No image available to edit',
              message: 'Please upload an image first before requesting edits.'
            };
          }
                      try {
              const result = await generateImage({
                imageUrl: finalImageUrl,
                prompt,
                width: finalWidth,
                height: finalHeight,
              });

            if (result.success) {
              return {
                action: 'edit_image',
                prompt,
                imageUrl: result.url,
                success: true,
                message: `Successfully edited the image: "${prompt}". The new version has been created.`
              };
            } else {
              return {
                action: 'edit_image',
                prompt,
                success: false,
                error: result.error,
                message: `Failed to edit the image: ${result.error}`
              };
            }
          } catch (error) {
            return {
              action: 'edit_image',
              prompt,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              message: `Error editing the image: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),
      
      generateSuggestions: tool({
        description: 'Generate creative suggestions for image editing based on the current image and user context',
        parameters: z.object({
          imageUrl: z.string().optional().describe('The URL of the current image (defaults to current image)'),
          context: z.string().optional().describe('Additional context about what the user is looking for'),
          style: z.enum(['creative', 'professional', 'artistic', 'technical']).optional().describe('The style of suggestions to generate'),
        }),
        execute: async ({ imageUrl: providedImageUrl, context = '', style = 'creative' }) => {
          const finalImageUrl = providedImageUrl || activeImageUrl;
          const suggestionSets = {
            creative: [
              "Add magical sparkles and fairy lights",
              "Transform into a watercolor painting style",
              "Add dramatic storm clouds in the background",
              "Apply a cyberpunk neon aesthetic",
              "Turn into a vintage poster design",
              "Add fantasy elements like dragons or unicorns"
            ],
            professional: [
              "Enhance lighting for a professional headshot",
              "Remove background distractions",
              "Adjust colors for corporate branding",
              "Add subtle depth of field effect",
              "Improve skin tone and complexion",
              "Create a clean, minimalist composition"
            ],
            artistic: [
              "Convert to impressionist painting style",
              "Add abstract geometric patterns",
              "Apply oil painting texture",
              "Create a surreal dreamlike atmosphere",
              "Add artistic brush stroke effects",
              "Transform into pop art style"
            ],
            technical: [
              "Enhance image sharpness and clarity",
              "Adjust contrast and brightness levels",
              "Remove noise and grain",
              "Color correct for accurate reproduction",
              "Enhance shadow and highlight details",
              "Apply professional retouching techniques"
            ]
          };
          
          const baseSuggestions = suggestionSets[style];
          const suggestions = context 
            ? [...baseSuggestions.slice(0, 4), `Apply a ${context} style to the image`, `Create a ${context}-themed variation`]
            : baseSuggestions;
          
          return {
            action: 'suggestions',
            suggestions: suggestions.slice(0, 6),
            style,
            context,
            message: `Here are some ${style} editing suggestions for your image:`
          };
        },
      }),

      analyzeImage: tool({
        description: 'Analyze the current image to understand its contents, style, and suggest relevant edits',
        parameters: z.object({
          imageUrl: z.string().optional().describe('The URL of the image to analyze (defaults to current image)'),
        }),
        execute: async ({ imageUrl: providedImageUrl }) => {
          const finalImageUrl = providedImageUrl || activeImageUrl;
          // This is a mock analysis - in a real implementation, you could use vision models
          return {
            action: 'analysis',
            analysis: {
              subject: 'The image contains various elements that can be enhanced',
              lighting: 'Current lighting could be optimized',
              composition: 'Composition has potential for improvement',
              style: 'The style appears to be realistic',
              suggestions: [
                'The lighting could be enhanced for better mood',
                'Background elements could be refined',
                'Color balance might benefit from adjustment',
                'Adding visual interest to empty areas could improve composition'
              ]
            },
            message: 'I\'ve analyzed your image and identified several areas for potential enhancement.'
          };
        },
      }),

      undoLastEdit: tool({
        description: 'Provide guidance on reverting to a previous version of the image',
        parameters: z.object({
          reason: z.string().optional().describe('Why the user wants to undo the edit'),
        }),
        execute: async ({ reason = '' }) => {
          return {
            action: 'undo_guidance',
            message: 'To undo the last edit, you can navigate to a previous version using the thumbnail gallery on the left side of the screen. Use the arrow keys or click on an earlier version thumbnail to switch back.',
            reason
          };
        },
      }),
    },
    system: `You are an AI image editing assistant with actual image editing capabilities. You help users edit and enhance their images through conversation and tool usage.

CURRENT IMAGE CONTEXT:
${activeImageUrl ? `- Current image URL: ${activeImageUrl}` : '- No image currently loaded'}
${imageData ? `- Image dimensions: ${imageData.width}x${imageData.height}` : ''}

IMPORTANT CAPABILITIES:
- You can actually edit images using the editImage tool - this creates real new versions
- You can generate contextual suggestions using generateSuggestions tool
- You can analyze images to provide insights using analyzeImage tool
- You can help users navigate their edit history using undoLastEdit tool

FORMATTING INSTRUCTIONS:
- **ALWAYS format your responses using Markdown** for better readability
- **DO NOT use emojis** - use descriptive text or icons instead
- Use headers (##, ###) to organize information
- Use **bold** for emphasis and important points
- Use *italics* for subtle emphasis
- Use \`code blocks\` for technical terms or specific values
- Use bullet points (-) or numbered lists (1.) for step-by-step instructions
- Use > blockquotes for tips or important notes
- Use tables when presenting structured information
- Use --- for horizontal rules to separate sections

INTERACTION GUIDELINES:
- When users ask to edit their image, use the editImage tool with the current image URL and dimensions
- ALWAYS use the current image URL (${activeImageUrl}) when calling editImage tool
- Be creative but practical in your editing suggestions
- Ask clarifying questions if the user's request is vague
- Use the analyzeImage tool when you need to understand the image better
- Suggest the generateSuggestions tool when users ask for ideas
- Be conversational and encouraging
- Explain what you're doing as you use tools

EDITING BEST PRACTICES:
- Make prompts specific and detailed for better results
- Consider the image context when suggesting edits
- Offer multiple approaches when possible
- Help users understand why certain edits might work well
- Always use the provided image URL and dimensions for consistency

Remember: You have the power to actually create new edited versions of images, not just suggest changes! The user has an image loaded and ready for editing.`,
  });

  return result.toDataStreamResponse();
}