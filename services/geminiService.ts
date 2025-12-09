
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

  // Construct Allergy String
  const allergyList = profile.allergies && profile.allergies.length > 0 ? profile.allergies.join(", ") : "None";
  const allergyContext = `
    CRITICAL ALLERGY WARNING:
    The user is allergic to: ${allergyList}.
    Additional allergy notes: ${profile.allergyNotes || "None"}.
    
    SAFETY INSTRUCTIONS:
    - You MUST NOT include any ingredients from the allergy list or their derivatives.
    - Double-check every recipe. If a typical Indian dish usually contains these allergens, use a safe alternative or pick a different dish entirely.
    - Example: If allergic to nuts, do not use cashews in gravy.
  `;

  // Macro Construction
  let calorieContext = "";
  if (profile.macroMode === 'custom' && profile.customMacros) {
      calorieContext = `
      STRICT MACRO TARGETS:
      - Protein: ${profile.customMacros.protein}g
      - Carbs: ${profile.customMacros.carbs}g
      - Fats: ${profile.customMacros.fats}g
      
      You MUST adjust portion sizes and food choices to hit these targets as closely as possible (within +/- 5%).
      `;
  } else {
      calorieContext = `Calories: Target specific calories based on ${profile.weight}kg and ${profile.goal}. Calculate optimal macros for ${profile.goal}.`;
  }

  const prompt = `
    Create a detailed daily diet plan for an Indian user.
    Context:
    - Region: ${profile.region}
    - Preference: ${profile.dietaryPreference}
    - Goal: ${profile.goal}
    - Budget Level: ${budgetInstruction}
    ${calorieContext}
    ${allergyContext}

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
  const allergyList = profile.allergies && profile.allergies.length > 0 ? profile.allergies.join(", ") : "None";
  
  const prompt = `
    Suggest ONE alternative meal option to swap with the following meal:
    Current Meal: ${currentMeal.name} (${currentMeal.type}, approx ${currentMeal.calories} kcal).
    
    User Context:
    - Preference: ${profile.dietaryPreference}
    - Region: ${profile.region}
    - Budget: ${profile.budgetLevel}
    - ALLERGIES TO AVOID: ${allergyList}
    - Allergy Notes: ${profile.allergyNotes || "None"}

    Requirements:
    - Same meal type (${currentMeal.type}).
    - Similar calorie count (+/- 100 kcal).
    - Different main ingredients.
    - JSON Output matches the standard meal item schema.
    - SAFETY: Do not include allergic ingredients.
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

/**
 * Generates a full 7-day weekly workout plan.
 * Returns an array of WorkoutPlan objects (Day 1 to Day 7).
 */
export const generateWeeklyWorkoutPlan = async (profile: UserProfile, startDateStr: string): Promise<WorkoutPlan[]> => {
  const startDate = new Date(startDateStr);
  
  // Gym Context Construction
  let workoutContext = "";
  if (profile.workoutPreference === 'Gym') {
      workoutContext = `
      LOCATION: GYM
      STRUCTURE: 7-Day Split (Starting from ${startDate.toLocaleDateString('en-US', { weekday: 'long' })})
      
      MANDATORY SPLIT LOGIC:
      - Assign specific muscle groups to specific days of the week.
      - Sunday must be REST or Light Active Recovery.
      - Monday: Chest/Triceps (or Push)
      - Tuesday: Back/Biceps (or Pull)
      - Wednesday: Legs/Shoulders
      - Thursday: Chest/Back or Cardio/Abs
      - Friday: Arms/Shoulders or Lower Body
      - Saturday: Full Body or Functional
      - Sunday: REST
      
      DO NOT mix random exercises (e.g., do not put Planks on Chest day unless it's for abs finisher).
      Use Gym equipment (Barbells, Dumbbells, Machines).
      `;
  } else {
      workoutContext = `
      LOCATION: HOME
      STRUCTURE: 7-Day Routine (Starting from ${startDate.toLocaleDateString('en-US', { weekday: 'long' })})
      Equipment: Bodyweight or common household items.
      Focus: Upper/Lower Split or Full Body Intensity.
      Sunday must be Rest.
      `;
  }

  const prompt = `
    Create a COMPLETE 7-DAY WEEKLY workout plan for an Indian user.
    Context:
    - Goal: ${profile.goal}
    - Level: ${profile.activityLevel}
    ${workoutContext}

    Output Requirements:
    - Return an ARRAY of 7 Daily Workout Plans.
    - Day 1 matches the start day provided.
    - Each day must have: duration, difficulty, warmup, exercises, cooldown.
    - Provide 'estimatedCalories' for each exercise.
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

  const dailyWorkoutSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      dayName: { type: Type.STRING, description: "e.g., Monday - Chest Day" },
      duration: { type: Type.STRING },
      difficulty: { type: Type.STRING, enum: ["beginner", "intermediate", "advanced"] },
      warmup: { type: Type.ARRAY, items: { type: Type.STRING } },
      exercises: { type: Type.ARRAY, items: exerciseSchema },
      cooldown: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["dayName", "duration", "difficulty", "warmup", "exercises", "cooldown"],
  };

  const weeklyPlanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        weekPlan: {
            type: Type.ARRAY,
            items: dailyWorkoutSchema,
            description: "Array of 7 workout plans for the week"
        }
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: JSON_MIME_TYPE,
        responseSchema: weeklyPlanSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    
    // Process each day to add IDs and map dayName to focus
    const processedDays: WorkoutPlan[] = parsed.weekPlan.map((day: any) => ({
        ...day,
        focus: day.dayName, // Map AI's dayName (e.g. Chest Day) to focus field
        exercises: day.exercises.map((e: any) => ({ ...e, id: generateId() }))
    }));

    return processedDays;
  } catch (error) {
    console.error("Weekly workout generation failed:", error);
    throw error;
  }
};

export const chatWithCoach = async (
  profile: UserProfile, 
  history: {role: string, parts: {text: string}[]}[], 
  message: string
) => {
  const allergyList = profile.allergies && profile.allergies.length > 0 ? profile.allergies.join(", ") : "None";
  
  const systemInstruction = `
    You are an expert Indian Fitness & Nutrition Coach.
    User Context:
    - Name: ${profile.name}
    - Goal: ${profile.goal}
    - Diet: ${profile.dietaryPreference}
    - Region: ${profile.region}
    - Allergies: ${allergyList}
    - Allergy Notes: ${profile.allergyNotes || "None"}
    - Workout Location: ${profile.workoutPreference || "Home"}

    Guidelines:
    - Be encouraging, strict but friendly (like a good Indian coach "Guru-ji" style).
    - Provide specific advice on Indian food alternatives.
    - NEVER suggest foods the user is allergic to.
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
