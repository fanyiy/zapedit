import { generateImage, generateImageV2 } from "../../actions";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { prompt, imageUrl, width = 1024, height = 768, provider = "fal" } = await req.json();

    if (!prompt || !imageUrl) {
      return Response.json({ 
        success: false, 
        error: 'prompt and imageUrl are required' 
      }, { status: 400 });
    }

    const generateImageFunction = provider === "modelscope" ? generateImageV2 : generateImage;
    
    const result = await generateImageFunction({
      imageUrl,
      prompt,
      width,
      height,
    });

    if (result.success) {
      return Response.json({
        success: true,
        imageUrl: result.url,
        originalImageUrl: imageUrl, // Include which image was edited
        message: `Successfully edited the image: "${prompt}"`
      });
    } else {
      return Response.json({
        success: false,
        error: result.error,
        message: `Failed to edit the image: ${result.error}`
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Voice edit error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: `Error editing the image: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}