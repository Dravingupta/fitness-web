
export enum DietaryPreference {
  Vegetarian = 'Vegetarian',
  Vegan = 'Vegan',
  NonVeg = 'Non-Veg',
  Jain = 'Jain',
}

export enum Goal {
  FatLoss = 'Fat Loss',
  MuscleGain = 'Muscle Gain',
  GeneralFitness = 'General Fitness',
}

export enum ActivityLevel {
  Sedentary = 'Sedentary',
  LightlyActive = 'Lightly Active',
  Moderate = 'Moderate',
  VeryActive = 'Very Active',
}

export enum BodyType {
  Ectomorph = 'Ectomorph',
  Mesomorph = 'Mesomorph',
  Endomorph = 'Endomorph',
  Unsure = 'Not Sure',
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: string;
  dietaryPreference: DietaryPreference;
  region: string;
  goal: Goal;
  activityLevel: ActivityLevel;
  bodyType: BodyType;
  bodyAnalysis?: string;
  budgetLevel: 'low' | 'medium' | 'flexible';
  notes?: string;
  allergies?: string[];   // list of allergens
  allergyNotes?: string;  // free-text notes
}

// --- Detailed Diet Types ---

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface RecipeDetail {
  ingredients: Ingredient[];
  steps: string[];
  prepTime: string;
  cookTime: string;
}

export interface MealItem {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  // Macros (New)
  proteinGrams?: number;
  carbsGrams?: number;
  fatsGrams?: number;
  shortDescription: string;
  recipeDetail: RecipeDetail;
  source?: 'ai'; 
}

export interface ManualMeal {
  id: string;
  name: string;
  calories: number;
  notes?: string;
  timeOfDay?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  source: 'manual';
}

export interface DietPlan {
  date?: string; // YYYY-MM-DD
  totalCalories: number;
  meals: MealItem[];
  tips: string[];
}

// --- Detailed Workout Types ---

export interface WorkoutExercise {
  id: string;
  name: string;
  sets?: string; // Kept as string for ranges like "3-4"
  reps?: string;
  durationMinutes?: number; // Added for time-based exercises
  description: string;
  notes?: string;
  source?: 'ai';
  estimatedCalories?: number; 
}

export interface ManualWorkout {
  id: string;
  name: string;
  durationMinutes: number;
  intensity: 'light' | 'moderate' | 'intense';
  estimatedCaloriesBurned: number;
  notes?: string;
  source: 'manual';
}

export interface WorkoutPlan {
  date?: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  warmup: string[];
  exercises: WorkoutExercise[];
  cooldown: string[];
}

// --- Tracking Types ---

export interface DailyTracking {
  date: string; // YYYY-MM-DD
  completedMealIds: string[];
  completedExerciseIds: string[];
  totalTargetCalories: number;
  totalEstimatedCaloriesConsumed: number;
  totalEstimatedCaloriesBurned: number;
  calorieDeficit?: number; 
  netCalories?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
