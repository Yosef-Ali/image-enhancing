import { GoogleGenAI, Chat, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const createChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: "You are a helpful and friendly assistant. Keep your responses concise and easy to understand.",
    }
  });
};

export const enhanceImage = async (
  base64Image: string,
  mimeType: string,
  prompt?: string
): Promise<string> => {
  try {
    const enhancementPrompt = prompt || "Automatically enhance this image by adjusting brightness, contrast, saturation, and sharpness for a professional, high-quality look. Fix any lighting issues and make the colors more vibrant.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                {
                    text: enhancementPrompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image data found in the response");
  } catch (error) {
    console.error("Error enhancing image:", error);
    throw new Error("Failed to enhance image. Please try again.");
  }
};


export const removeObjectFromImage = async (
    base64Image: string,
    mimeType: string,
    base64Mask: string
): Promise<string> => {
    try {
        const maskData = base64Mask.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: "You are an expert photo editor. In the first image provided, please completely remove the object highlighted in white in the second image (the mask). Fill the area where the object was with a realistic and context-aware background that seamlessly blends with the surrounding image.",
                    },
                    {
                        inlineData: {
                            data: maskData,
                            mimeType: 'image/png',
                        },
                    }
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData) {
            return part.inlineData.data;
          }
        }
        throw new Error("No image data found in the response from object removal");
    } catch (error) {
        console.error("Error removing object from image:", error);
        throw new Error("Failed to remove object from image. Please try again.");
    }
}