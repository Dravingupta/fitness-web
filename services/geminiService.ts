
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, DietPlan, WorkoutPlan, MealItem } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const JSON_MIME_TYPE = "application/json";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const analyzeBodyImage = async (base64Image: string): Promise<{ bodyType: string; analysis: string }> => {
  const prompt = `
    Analyze this full-body image for fitness purposes.
    1. Estimate the Somatotype (Ectomorph, Mesomorph, Endomorph).
    2. Provide a brief 2-sentence analysis of body composition and posture.
    3. Be polite, objective, and non-medical.
    Return ONLY JSON.
  `;
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      bodyType: { type: Type.STRING, enum: ["Ectomorph", "Mesomorph", "Endomorph"] },
      analysis: { type: Type.STRING },
    },
    required: ["bodyType", "analysis"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: JSON_MIME_TYPE,
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Body analysis failed:", error);
    throw new Error("Could not analyze image. Please try again.");
  }
};

export const generateDietPlan = async (profile: UserProfile): Promise<DietPlan> => {
  let budgetInstruction = "";
  if (profile.budgetLevel === 'low') {
      budgetInstruction = "Strictly Low Budget. Use cheap, local Indian staples (dal, roti, seasonal sabzi, curd, banana, eggs, poha). Avoid expensive nuts, packaged goods, fancy health foods, or premium fruits.";
  } else if (profile.budgetLevel === 'medium') {
      budgetInstruction = "Medium Budget. Balanced mix of affordable staples and moderate extras (paneer, some almonds, seasonal fruit).";
  } else {
      budgetInstruction = "Flexible Budget. Can include premium ingredients (Greek yogurt, walnuts, berries, multigrain bread, avocado) if beneficial.";
  }

  const prompt = `
    Create a detailed daily diet plan for an Indian user.
    Context:
    - Region: ${profile.region}
    - Preference: ${profile.dietaryPreference}
    - Goal: ${profile.goal}
    - Calories: Target specific calories based on ${profile.weight}kg and ${profile.goal}.
    - Budget Level: ${budgetInstruction}

    Output Requirements:
    - 5 meals: Breakfast, Lunch, Dinner, Snack 1, Snack 2.
    - STRICT JSON format.
    - ESTIMATE MACROS (Protein, Carbs, Fats in grams) for every meal.
    - Include full recipe details (ingredients, steps).
    - Prioritize local cuisine like ${profile.region === 'South India' ? 'Idli, Dosa, Sambar' : 'Roti, Dal, Sabzi'}.
  `;

  // Schema Definition
  const ingredientSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      quantity: { type: Type.STRING },
    },
    required: ["name", "quantity"],
  };

  const recipeDetailSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      ingredients: { type: Type.ARRAY, items: ingredientSchema },
      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      prepTime: { type: Type.STRING },
      cookTime: { type: Type.STRING },
    },
    required: ["ingredients", "steps", "prepTime", "cookTime"],
  };

  const mealItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      type: { type: Type.STRING, enum: ["breakfast", "lunch", "dinner", "snack"] },
      calories: { type: Type.NUMBER },
      proteinGrams: { type: Type.NUMBER },
      carbsGrams: { type: Type.NUMBER },
      fatsGrams: { type: Type.NUMBER },
      protein: { type: Type.STRING }, // Legacy string fallback
      carbs: { type: Type.STRING },   // Legacy string fallback
      fats: { type: Type.STRING },    // Legacy string fallback
      shortDescription: { type: Type.STRING },
      recipeDetail: recipeDetailSchema,
    },
    required: ["name", "type", "calories", "proteinGrams", "carbsGrams", "fatsGrams", "shortDescription", "recipeDetail"],
  };

  const dietPlanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      totalCalories: { type: Type.NUMBER },
      meals: { type: Type.ARRAY, items: mealItemSchema },
      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["totalCalories", "meals", "tips"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: JSON_MIME_TYPE,
        responseSchema: dietPlanSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    // Add client-side IDs
    parsed.meals = parsed.meals.map((m: any) => ({ ...m, id: generateId() }));
    return parsed;
  } catch (error) {
    console.error("Diet generation failed:", error);
    throw error;
  }
};

export const swapMeal = async (profile: UserProfile, currentMeal: MealItem): Promise<MealItem> => {
  const prompt = `
    Suggest ONE alternative meal option to swap with the following meal:
    Current Meal: ${currentMeal.name} (${currentMeal.type}, approx ${currentMeal.calories} kcal).
    
    User Context:
    - Preference: ${profile.dietaryPreference}
    - Region: ${profile.region}
    - Budget: ${profile.budgetLevel}

    Requirements:
    - Same meal type (${currentMeal.type}).
    - Similar calorie count (+/- 100 kcal).
    - Different main ingredients.
    - JSON Output matches the standard meal item schema.
  `;

  // Reuse schemas from generateDietPlan
  const ingredientSchema: Schema = {
    type: Type.OBJECT,
    properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING } },
    required: ["name", "quantity"],
  };
  const recipeDetailSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      ingredients: { type: Type.ARRAY, items: ingredientSchema },
      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      prepTime: { type: Type.STRING },
      cookTime: { type: Type.STRING },
    },
    required: ["ingredients", "steps", "prepTime", "cookTime"],
  };
  const mealItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      type: { type: Type.STRING, enum: ["breakfast", "lunch", "dinner", "snack"] },
      calories: { type: Type.NUMBER },
      proteinGrams: { type: Type.NUMBER },
      carbsGrams: { type: Type.NUMBER },
      fatsGrams: { type: Type.NUMBER },
      protein: { type: Type.STRING }, 
      carbs: { type: Type.STRING },   
      fats: { type: Type.STRING },    
      shortDescription: { type: Type.STRING },
      recipeDetail: recipeDetailSchema,
    },
    required: ["name", "type", "calories", "proteinGrams", "carbsGrams", "fatsGrams", "shortDescription", "recipeDetail"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: JSON_MIME_TYPE,
        responseSchema: mealItemSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    parsed.id = generateId();
    return parsed;
  } catch (error) {
    console.error("Meal swap failed:", error);
    throw error;
  }
};

export const generateWorkoutPlan = async (profile: UserProfile): Promise<WorkoutPlan> => {
  const prompt = `
    Create a daily home workout plan for an Indian user.
    Context:
    - Goal: ${profile.goal}
    - Level: ${profile.activityLevel}
    - Equipment: Mostly bodyweight or common household items.

    Output Requirements:
    - Warmup (3-4 moves), Main Circuit (6-8 exercises), Cooldown (3 moves).
    - Provide 'estimatedCalories' for each exercise assuming average intensity.
    - STRICT JSON.
  `;

  const exerciseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      sets: { type: Type.STRING },
      reps: { type: Type.STRING },
      description: { type: Type.STRING },
      notes: { type: Type.STRING },
      estimatedCalories: { type: Type.NUMBER },
    },
    required: ["name", "sets", "reps", "description", "estimatedCalories"],
  };

  const workoutPlanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      duration: { type: Type.STRING },
      difficulty: { type: Type.STRING, enum: ["beginner", "intermediate", "advanced"] },
      warmup: { type: Type.ARRAY, items: { type: Type.STRING } },
      exercises: { type: Type.ARRAY, items: exerciseSchema },
      cooldown: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["duration", "difficulty", "warmup", "exercises", "cooldown"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: JSON_MIME_TYPE,
        responseSchema: workoutPlanSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    // Add client-side IDs
    parsed.exercises = parsed.exercises.map((e: any) => ({ ...e, id: generateId() }));
    return parsed;
  } catch (error) {
    console.error("Workout generation failed:", error);
    throw error;
  }
};

export const chatWithCoach = async (
  profile: UserProfile, 
  history: {role: string, parts: {text: string}[]}[], 
  message: string
) => {
  const systemInstruction = `
    You are an expert Indian Fitness & Nutrition Coach.
    User Context:
    - Name: ${profile.name}
    - Goal: ${profile.goal}
    - Diet: ${profile.dietaryPreference}
    - Region: ${profile.region}

    Guidelines:
    - Be encouraging, strict but friendly (like a good Indian coach "Guru-ji" style).
    - Provide specific advice on Indian food alternatives.
    - Keep responses concise.
  `;

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    history: history,
    config: { systemInstruction },
  });

  const result = await chat.sendMessage({ message });
  return result.text;
};
