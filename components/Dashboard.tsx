
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, DietPlan, WorkoutPlan, DailyTracking, ManualMeal, ManualWorkout, MealItem, WorkoutExercise, ChatMessage } from '../types';
import { generateDietPlan, generateWeeklyWorkoutPlan, swapMeal } from '../services/geminiService';
import { RefreshCw, Calendar, ChevronLeft, ChevronRight, Activity, TrendingDown, TrendingUp, LogOut, Settings, Plus, Dumbbell, Utensils, Award, Flame, Zap, User as UserIcon, Moon, Sun, Lock } from 'lucide-react';
import ChatCoach from './ChatCoach';
import DietCard, { AddMealModal } from './DietCard';
import WorkoutCard, { AddWorkoutModal } from './WorkoutCard';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onEditProfile: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// Simple Ring Progress Component
const ProgressRing: React.FC<{ radius: number; stroke: number; progress: number; color: string }> = ({ radius, stroke, progress, color }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle
          className="stroke-gray-200 dark:stroke-slate-700"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
    </div>
  );
};

// Helper: Estimate calorie burn for an exercise if not explicitly provided
const getEstimatedBurn = (ex: WorkoutExercise | ManualWorkout) => {
  // If we have an explicit estimation from AI or Manual input
  if ('estimatedCaloriesBurned' in ex && ex.estimatedCaloriesBurned) return ex.estimatedCaloriesBurned;
  if ('estimatedCalories' in ex && ex.estimatedCalories) return ex.estimatedCalories;

  // Fallback calculation logic
  const duration = ex.durationMinutes ?? 5; // Default 5 mins for standard set if unknown
  
  let perMin = 6; // moderate
  if (ex.notes?.toLowerCase().includes('intense')) perMin = 10;
  else if (ex.notes?.toLowerCase().includes('light')) perMin = 4;
  
  return Math.round(duration * perMin);
};

// Helper: Compute total burn today
const computeBurnedToday = (
  workoutPlan: WorkoutPlan | null,
  manualWorkouts: ManualWorkout[],
  completedIds: string[]
): number => {
  const idSet = new Set(completedIds);
  let total = 0;

  // Sum from AI Plan
  if (workoutPlan?.exercises) {
    workoutPlan.exercises.forEach(ex => {
      if (idSet.has(ex.id)) {
        total += getEstimatedBurn(ex);
      }
    });
  }

  // Sum from Manual Workouts
  manualWorkouts.forEach(mw => {
    if (idSet.has(mw.id)) {
      total += getEstimatedBurn(mw);
    }
  });

  return total;
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEditProfile, theme, onToggleTheme }) => {
  // Date State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'meal' | 'workout' | null>(null);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  
  // Unified Tab State
  const [activeSection, setActiveSection] = useState<'meals' | 'workout' | 'coach'>('meals');

  // Data persistence by Date
  const [dietHistory, setDietHistory] = useState<Record<string, DietPlan>>({});
  const [workoutHistory, setWorkoutHistory] = useState<Record<string, WorkoutPlan>>({});
  const [trackingHistory, setTrackingHistory] = useState<Record<string, DailyTracking>>({});
  
  // Manual Entries History
  const [manualMealsHistory, setManualMealsHistory] = useState<Record<string, ManualMeal[]>>({});
  const [manualWorkoutsHistory, setManualWorkoutsHistory] = useState<Record<string, ManualWorkout[]>>({});

  // Chat History Persistence
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Loading States
  const [loadingDiet, setLoadingDiet] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(false);

  // Storage Keys Helpers
  const getDietKey = (date: string) => `aiCoachDiet_${user.uid}_${date}`;
  const getWorkoutKey = (date: string) => `aiCoachWorkout_${user.uid}_${date}`;
  const getTrackingKey = (date: string) => `aiCoachTracking_${user.uid}_${date}`;
  const getManualMealsKey = (date: string) => `aiCoachManualMeals_${user.uid}_${date}`;
  const getManualWorkoutsKey = (date: string) => `aiCoachManualWorkouts_${user.uid}_${date}`;
  const getChatKey = () => `aiCoachChat_${user.uid}`;

  // --- Date Logic Helpers ---
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;
  const isFuture = selectedDate > todayStr;

  // --- Handlers (Defined before useEffect to be used inside) ---

  const initTrackingIfMissing = (date: string, targetCalories: number) => {
    const key = getTrackingKey(date);
    const saved = localStorage.getItem(key);
    if (saved) {
      setTrackingHistory(prev => ({ ...prev, [date]: JSON.parse(saved) }));
    } else {
      const newTracking: DailyTracking = {
        date: date,
        completedMealIds: [],
        completedExerciseIds: [],
        totalTargetCalories: targetCalories,
        totalEstimatedCaloriesConsumed: 0,
        totalEstimatedCaloriesBurned: 0,
        calorieDeficit: 0,
        netCalories: 0
      };
      localStorage.setItem(key, JSON.stringify(newTracking));
      setTrackingHistory(prev => ({ ...prev, [date]: newTracking }));
    }
  };

  const handleGenerateDiet = useCallback(async () => {
    // RESTRICTION: Only allow generation for Today.
    if (!isToday) {
      return; 
    }

    const dietKey = getDietKey(selectedDate);
    
    // FAIL-SAFE: Check storage first to prevent overwriting existing data
    const existing = localStorage.getItem(dietKey);
    if (existing) {
      const parsedPlan = JSON.parse(existing);
      setDietHistory(prev => ({ ...prev, [selectedDate]: parsedPlan }));
      // Ensure tracking is initialized for this existing plan
      initTrackingIfMissing(selectedDate, parsedPlan.totalCalories);
      return; 
    }

    setLoadingDiet(true);
    try {
      const plan = await generateDietPlan(user);
      const planWithDate = { ...plan, date: selectedDate };
      
      localStorage.setItem(dietKey, JSON.stringify(planWithDate));
      setDietHistory(prev => ({ ...prev, [selectedDate]: planWithDate }));
      
      // Init tracking target
      initTrackingIfMissing(selectedDate, plan.totalCalories);

    } catch (error) {
      console.error(error);
      alert('Failed to generate diet plan');
    } finally {
      setLoadingDiet(false);
    }
  }, [selectedDate, user, isToday]);

  const handleGenerateWorkout = useCallback(async () => {
    // RESTRICTION: Only allow generation for Today.
    if (!isToday) return;

    // 1. Check if workout already exists for TODAY
    const workoutKey = getWorkoutKey(selectedDate);
    const existing = localStorage.getItem(workoutKey);
    if (existing) {
      setWorkoutHistory(prev => ({ ...prev, [selectedDate]: JSON.parse(existing) }));
      return;
    }

    // 2. If NOT, generate a full Weekly Split starting from today
    setLoadingWorkout(true);
    try {
      // Call service to get 7 days of workouts
      const weekPlans = await generateWeeklyWorkoutPlan(user, selectedDate);
      
      // 3. Save ALL 7 days to localStorage
      const startDate = new Date(selectedDate);
      
      weekPlans.forEach((dayPlan, index) => {
          // Calculate the specific date for this plan
          const d = new Date(startDate);
          d.setDate(d.getDate() + index);
          const dateStr = d.toISOString().split('T')[0];
          
          const planWithDate = { ...dayPlan, date: dateStr };
          const key = getWorkoutKey(dateStr);
          
          // Only overwrite if not exists (or we can overwrite to ensure the split is cohesive)
          localStorage.setItem(key, JSON.stringify(planWithDate));
          
          // Update local state if it matches current selected date
          if (dateStr === selectedDate) {
              setWorkoutHistory(prev => ({ ...prev, [dateStr]: planWithDate }));
          }
      });

    } catch (error) {
      console.error(error);
      alert('Failed to generate workout plan');
    } finally {
      setLoadingWorkout(false);
    }
  }, [selectedDate, user, isToday]);

  const updateChatHistory = (newMessages: ChatMessage[]) => {
    setChatHistory(newMessages);
    localStorage.setItem(getChatKey(), JSON.stringify(newMessages));
  };

  // --- Unified Data Loading & Synchronization ---
  useEffect(() => {
    const loadAndSync = async () => {
      // 1. Load Manual Entries (Always load these first as they don't depend on AI)
      const mmKey = getManualMealsKey(selectedDate);
      const mwKey = getManualWorkoutsKey(selectedDate);
      const savedMM = localStorage.getItem(mmKey);
      const savedMW = localStorage.getItem(mwKey);
      
      if (savedMM) setManualMealsHistory(prev => ({...prev, [selectedDate]: JSON.parse(savedMM)}));
      if (savedMW) setManualWorkoutsHistory(prev => ({...prev, [selectedDate]: JSON.parse(savedMW)}));

      // 2. Load Diet Plan
      const dietKey = getDietKey(selectedDate);
      const savedDiet = localStorage.getItem(dietKey);
      let dietLoaded = false;
      
      if (savedDiet) {
        const parsedDiet = JSON.parse(savedDiet);
        setDietHistory(prev => ({...prev, [selectedDate]: parsedDiet}));
        dietLoaded = true;
        // Ensure tracking exists
        initTrackingIfMissing(selectedDate, parsedDiet.totalCalories);
      } 

      // 3. Load Workout Plan
      const workoutKey = getWorkoutKey(selectedDate);
      const savedWorkout = localStorage.getItem(workoutKey);
      let workoutLoaded = false;
      
      if (savedWorkout) {
        setWorkoutHistory(prev => ({...prev, [selectedDate]: JSON.parse(savedWorkout)}));
        workoutLoaded = true;
      }

      // 4. Load Tracking
      const trackKey = getTrackingKey(selectedDate);
      const savedTrack = localStorage.getItem(trackKey);
      if (savedTrack) {
        setTrackingHistory(prev => ({...prev, [selectedDate]: JSON.parse(savedTrack)}));
      }

      // 5. Load Chat History (once)
      if (chatHistory.length === 0) {
        const savedChat = localStorage.getItem(getChatKey());
        if (savedChat) {
          setChatHistory(JSON.parse(savedChat));
        } else {
          // Initialize default chat
          const initialMsg: ChatMessage = {
             role: 'model',
             text: `Namaste ${user.name}! I am your AI Coach. I can help swap meals, explain exercises, or give motivation.`,
             timestamp: Date.now()
          };
          setChatHistory([initialMsg]);
          // Don't save to localStorage yet, wait for user interaction or save explicitly
        }
      }

      // 6. Auto-Generate ONLY if Today and Missing (and not already loading)
      if (isToday) {
        if (!dietLoaded && !savedDiet && !loadingDiet) {
           handleGenerateDiet();
        }
        if (!workoutLoaded && !savedWorkout && !loadingWorkout) {
           handleGenerateWorkout();
        }
      }
    };

    loadAndSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user.uid]); // Minimal deps to avoid loops

  // --- Derived State for Current View ---
  const currentDietPlan = dietHistory[selectedDate] || null;
  const currentWorkoutPlan = workoutHistory[selectedDate] || null;
  const currentManualMeals = manualMealsHistory[selectedDate] || [];
  const currentManualWorkouts = manualWorkoutsHistory[selectedDate] || [];
  
  const currentTracking = trackingHistory[selectedDate] || {
    date: selectedDate,
    completedMealIds: [],
    completedExerciseIds: [],
    totalTargetCalories: currentDietPlan?.totalCalories || 0,
    totalEstimatedCaloriesConsumed: 0,
    totalEstimatedCaloriesBurned: 0,
    calorieDeficit: 0,
    netCalories: 0
  };

  // --- Persist Tracking Helper ---
  const saveTracking = (tracking: DailyTracking) => {
    setTrackingHistory(prev => ({ ...prev, [selectedDate]: tracking }));
    localStorage.setItem(getTrackingKey(selectedDate), JSON.stringify(tracking));
  };

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleSwapMeal = async (mealId: string) => {
    const mealToSwap = currentDietPlan?.meals.find(m => m.id === mealId);
    if (!mealToSwap || !currentDietPlan) return;

    setSwappingMealId(mealId);
    try {
      const newMeal = await swapMeal(user, mealToSwap);
      
      // Update plan
      const updatedMeals = currentDietPlan.meals.map(m => m.id === mealId ? newMeal : m);
      const updatedPlan = { ...currentDietPlan, meals: updatedMeals };
      
      // Save
      localStorage.setItem(getDietKey(selectedDate), JSON.stringify(updatedPlan));
      setDietHistory(prev => ({ ...prev, [selectedDate]: updatedPlan }));

    } catch (error) {
      console.error(error);
      alert("Failed to swap meal. Please try again.");
    } finally {
      setSwappingMealId(null);
    }
  };

  // --- Meal Logic ---

  const toggleMeal = (mealId: string, calories: number) => {
    const isCompleted = currentTracking.completedMealIds.includes(mealId);
    const newIds = isCompleted 
      ? currentTracking.completedMealIds.filter(id => id !== mealId)
      : [...currentTracking.completedMealIds, mealId];
    
    // We can stick to incremental or recalculate logic for meals too, but let's stick to existing for now for meals
    // Or better yet, be consistent:
    const newConsumed = isCompleted 
      ? currentTracking.totalEstimatedCaloriesConsumed - calories
      : currentTracking.totalEstimatedCaloriesConsumed + calories;

    const burned = currentTracking.totalEstimatedCaloriesBurned; // Will update this dynamically for display
    const target = currentTracking.totalTargetCalories || 0;

    const updatedTracking: DailyTracking = {
      ...currentTracking,
      completedMealIds: newIds,
      totalEstimatedCaloriesConsumed: newConsumed,
      // We don't change burned here directly, wait for next render or if shared calculation needed
      // Actually safe to keep existing value here as we update exercise toggle separately
    };
    // Recalculate deficit/net
    updatedTracking.calorieDeficit = target - newConsumed;
    updatedTracking.netCalories = newConsumed - burned;

    saveTracking(updatedTracking);
  };

  const addManualMeal = (meal: ManualMeal) => {
    const updatedManuals = [...currentManualMeals, meal];
    setManualMealsHistory(prev => ({ ...prev, [selectedDate]: updatedManuals }));
    localStorage.setItem(getManualMealsKey(selectedDate), JSON.stringify(updatedManuals));
    toggleMeal(meal.id, meal.calories);
    setActiveModal(null);
  };

  // --- Workout Logic ---

  const toggleExercise = (exerciseId: string) => {
    const isCompleted = currentTracking.completedExerciseIds.includes(exerciseId);
    const newIds = isCompleted 
      ? currentTracking.completedExerciseIds.filter(id => id !== exerciseId)
      : [...currentTracking.completedExerciseIds, exerciseId];
    
    // Recalculate total burned from scratch to ensure accuracy
    const newBurned = computeBurnedToday(currentWorkoutPlan, currentManualWorkouts, newIds);
    
    const consumed = currentTracking.totalEstimatedCaloriesConsumed;
    
    const updatedTracking: DailyTracking = {
      ...currentTracking,
      completedExerciseIds: newIds,
      totalEstimatedCaloriesBurned: newBurned,
      totalEstimatedCaloriesConsumed: consumed,
      calorieDeficit: (currentTracking.totalTargetCalories || 0) - consumed,
      netCalories: consumed - newBurned
    };

    saveTracking(updatedTracking);
  };

  const addManualWorkout = (workout: ManualWorkout) => {
    const updatedWorkouts = [...currentManualWorkouts, workout];
    setManualWorkoutsHistory(prev => ({ ...prev, [selectedDate]: updatedWorkouts }));
    localStorage.setItem(getManualWorkoutsKey(selectedDate), JSON.stringify(updatedWorkouts));
    
    // Auto-complete the new manual workout
    toggleExercise(workout.id); // This will include the new workout in calculation
    setActiveModal(null);
  };

  // --- Helpers & Visual Logic ---
  const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', { 
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  const getGoalColor = (goal: string) => {
    switch(goal) {
      case 'Fat Loss': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'Muscle Gain': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'General Fitness': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Recalculate burnedToday for render (ensure sync with current tracking state)
  const burnedToday = computeBurnedToday(currentWorkoutPlan, currentManualWorkouts, currentTracking.completedExerciseIds);
  // Also sum planned
  const plannedBurnToday = (currentWorkoutPlan?.exercises || []).reduce((acc, ex) => acc + getEstimatedBurn(ex), 0);

  const currentNet = currentTracking.totalEstimatedCaloriesConsumed - burnedToday;
  const currentTarget = currentTracking.totalTargetCalories || 0;

  // Progress Ring Percents
  const eatenPercent = currentTarget > 0 ? Math.min((currentTracking.totalEstimatedCaloriesConsumed / currentTarget) * 100, 100) : 0;
  // Use plannedBurnToday as target for the ring if available, else 500
  const burnTarget = plannedBurnToday > 0 ? plannedBurnToday : 500;
  const burnPercent = Math.min((burnedToday / burnTarget) * 100, 100);

  // Verdicts
  let netVerdict = "Net calories today";
  if (currentTarget > 0) {
    if (currentNet <= currentTarget) {
      netVerdict = user.goal === 'Fat Loss' ? "Healthy deficit – supports fat loss" : "Within daily range";
    } else {
      netVerdict = "Above daily target today";
    }
  }

  // Badge / Stats Calculation
  const getBadgeStats = () => {
    let streak = 0;
    let mealsCount = 0;
    let activeMinutes = 0;
    
    const today = new Date();
    
    // Streak (Last 30 days)
    for (let i = 0; i < 30; i++) {
       const d = new Date(today);
       d.setDate(today.getDate() - i);
       const dateStr = d.toISOString().split('T')[0];
       const saved = localStorage.getItem(getTrackingKey(dateStr));
       const track = saved ? JSON.parse(saved) : null;
       
       if (track && (track.completedMealIds.length > 0 || track.completedExerciseIds.length > 0)) {
         streak++;
       } else if (i === 0 && !track) {
         continue; 
       } else {
         break;
       }
    }

    // Weekly totals (Last 7 days)
    for (let i = 0; i < 7; i++) {
       const d = new Date(today);
       d.setDate(today.getDate() - i);
       const dateStr = d.toISOString().split('T')[0];
       
       const savedTrack = localStorage.getItem(getTrackingKey(dateStr));
       const track = savedTrack ? JSON.parse(savedTrack) : null;
       
       if (track) {
         mealsCount += track.completedMealIds.length;
         
         // Calculate active minutes
         const savedManual = localStorage.getItem(getManualWorkoutsKey(dateStr));
         const manualWorkouts: ManualWorkout[] = savedManual ? JSON.parse(savedManual) : [];
         
         if (track.completedExerciseIds) {
           track.completedExerciseIds.forEach((id: string) => {
              if (id.startsWith('manual_')) {
                 const mw = manualWorkouts.find(m => m.id === id);
                 if (mw) activeMinutes += mw.durationMinutes;
              } else {
                 // Heuristic for AI exercises if duration not explicit
                 activeMinutes += 5;
              }
           });
         }
       }
    }
    return { streak, mealsCount, activeMinutes };
  };

  const badgeStats = getBadgeStats();

  // Weekly Stats Calculation
  const getWeeklyData = () => {
    let totalTarget = 0;
    let totalConsumed = 0;
    let totalBurned = 0;
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      let track = trackingHistory[dateStr];
      if (!track) {
         const saved = localStorage.getItem(getTrackingKey(dateStr));
         if (saved) track = JSON.parse(saved);
      }
      
      if (track) {
        totalTarget += track.totalTargetCalories || 0;
        totalConsumed += track.totalEstimatedCaloriesConsumed || 0;
        totalBurned += track.totalEstimatedCaloriesBurned || 0;
      }
    }
    return { 
      totalTarget, 
      totalConsumed, 
      totalBurned,
      net: totalConsumed - totalBurned,
    };
  };

  const weeklyStats = getWeeklyData();
  
  // Weekly Verdict
  let weeklyVerdict = "Keep tracking!";
  if (user.goal === 'Fat Loss' && weeklyStats.net < weeklyStats.totalTarget) {
    weeklyVerdict = "You’re roughly in a weekly deficit – great consistency.";
  } else if (weeklyStats.net > weeklyStats.totalTarget) {
    weeklyVerdict = "Slightly above target this week – tighten up a bit.";
  }

  // Render Empty State Logic
  const renderEmptyState = (handler: () => void, label: string) => {
    if (isPast) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Lock className="w-8 h-8 mb-2 opacity-50" />
          <p className="mb-4">No plan was recorded for this date.</p>
        </div>
      );
    }
    if (isFuture) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Lock className="w-8 h-8 mb-2 opacity-50" />
          <p className="mb-4">Plan locked. Come back on this day to generate.</p>
        </div>
      );
    }
    // Only show Generate button if isToday
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="mb-4">No {label} plan generated.</p>
        <button onClick={handler} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          Generate {label} Plan
        </button>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col font-inter text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header - White, Clean, Minimal */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Row 1: Brand & Profile (Mobile optimized layout) */}
            <div className="flex items-center justify-between w-full sm:w-auto">
               <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">I</span>
                    Indian AI Coach
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-10 -mt-1">
                    Namaste, {user.name ? user.name.split(' ')[0] : 'Friend'}
                  </p>
               </div>
               
               {/* Mobile Profile Toggle */}
               <div className="sm:hidden relative flex items-center gap-3">
                   {/* Mobile Theme Toggle */}
                   <button
                    onClick={onToggleTheme}
                    className="w-9 h-9 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                   >
                     {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                   </button>
                   
                   <button
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm border border-gray-200 dark:border-slate-700"
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </button>
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl text-sm z-20">
                        <button onClick={() => { setIsMenuOpen(false); onEditProfile(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-gray-400" /> Edit Profile
                        </button>
                        <button onClick={() => { setIsMenuOpen(false); onLogout(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </>
                  )}
               </div>
            </div>

            {/* Row 2: Controls (Date, Streak, Desktop Profile) */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                
                {/* Date Navigator */}
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700 shadow-inner">
                  <button onClick={() => handleDateChange(-1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition shadow-sm hover:shadow">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center px-3 text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[100px] justify-center">
                    <Calendar className="w-3 h-3 mr-1.5 opacity-60" />
                    {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <button onClick={() => handleDateChange(1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition shadow-sm hover:shadow">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full border border-orange-100 dark:border-orange-900/50 shadow-sm whitespace-nowrap">
                   <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                   <span className="text-xs font-bold">{badgeStats.streak}-day streak</span>
                </div>

                {/* Desktop Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-gray-600 dark:text-gray-200 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {/* Desktop Profile */}
                <div className="hidden sm:block relative">
                   <button
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    >
                      <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </button>

                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl text-sm z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                            <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email || 'User'}</p>
                          </div>
                          <button onClick={() => { setIsMenuOpen(false); onEditProfile(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-gray-400" /> Edit Profile
                          </button>
                          <button onClick={() => { setIsMenuOpen(false); onLogout(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700">
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      </>
                    )}
                </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 pb-24">
        
        {/* Top Summary: Rich Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Card 1: Today */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex flex-col justify-between transition-colors duration-300">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide mb-1">
                 {isToday ? "Today" : "Selected Date"}
              </p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{formattedDate}</h3>
            </div>
            <div className="mt-4">
               <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getGoalColor(user.goal)}`}>
                 {user.goal}
               </span>
               <p className="text-xs text-gray-400 mt-2 font-medium">Your progress at a glance</p>
            </div>
          </div>

          {/* Card 2: Calories In (Ring) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 flex items-center gap-4 transition-colors duration-300">
            <div className="shrink-0">
               <ProgressRing radius={36} stroke={6} progress={eatenPercent} color="#f97316" />
            </div>
            <div>
               <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide mb-0.5">Calories In</p>
               <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                 {currentTracking.totalEstimatedCaloriesConsumed.toLocaleString()}
               </div>
               <p className="text-xs text-gray-400 mt-1 font-medium">
                 {currentTarget > 0 ? `of ${currentTarget.toLocaleString()} target` : "No target set"}
               </p>
            </div>
          </div>

          {/* Card 3: Calories Out (Ring) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 flex items-center gap-4 transition-colors duration-300">
            <div className="shrink-0">
               <ProgressRing radius={36} stroke={6} progress={burnPercent} color="#10b981" />
            </div>
            <div>
               <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide mb-0.5">Calories Out</p>
               <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                 {burnedToday.toLocaleString()}
               </div>
               <p className="text-xs text-gray-400 mt-1 font-medium">
                 {plannedBurnToday > 0 ? `of ${plannedBurnToday} kcal planned` : "No workout planned yet"}
               </p>
            </div>
          </div>

          {/* Card 4: Net */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex flex-col justify-between transition-colors duration-300">
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">Net Calories</p>
               </div>
               <div className={`text-3xl font-bold ${currentNet > currentTarget ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                 {currentNet > 0 ? '+' : ''}{currentNet.toLocaleString()} 
               </div>
            </div>
            <p className={`text-xs font-medium ${currentNet <= currentTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
               {netVerdict}
            </p>
          </div>
        </div>

        {/* Unified Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl mb-6 transition-colors duration-300 overflow-x-auto">
           {(['meals', 'workout', 'coach'] as const).map(section => (
             <button 
               key={section}
               onClick={() => setActiveSection(section)}
               className={`flex-1 min-w-[100px] py-2.5 text-sm font-medium rounded-lg transition-all duration-200 capitalize ${
                 activeSection === section 
                   ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                   : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
               }`}
             >
               {section}
             </button>
           ))}
        </div>

        {/* Content Area - Full Width */}
        <div className="min-h-[500px]">
           {activeSection === 'meals' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden min-h-[500px] flex flex-col">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                     <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <Utensils className="w-4 h-4 text-orange-500" />
                       Your Meals
                     </h2>
                     {/* Removed Refresh Button per request */}
                  </div>
                  
                  <div className="flex-1 p-4">
                    {loadingDiet ? (
                       <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                          <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                          <p>Chef AI is cooking...</p>
                       </div>
                    ) : currentDietPlan ? (
                      <DietCard 
                        plan={currentDietPlan} 
                        manualMeals={currentManualMeals}
                        completedMealIds={currentTracking.completedMealIds}
                        onToggleMeal={toggleMeal}
                        onAddManualMeal={addManualMeal}
                        onSwapMeal={handleSwapMeal}
                        swappingMealId={swappingMealId}
                      />
                    ) : (
                      renderEmptyState(handleGenerateDiet, "diet")
                    )}
                  </div>
                </div>
             </div>
           )}

           {activeSection === 'workout' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden min-h-[500px] flex flex-col">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                     <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <Dumbbell className="w-4 h-4 text-blue-500" />
                       Your Workout
                     </h2>
                     {/* Removed Refresh Button per request */}
                  </div>
                  
                  <div className="flex-1 p-4">
                     {loadingWorkout ? (
                       <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                          <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                          <p>Training AI is preparing a weekly split...</p>
                       </div>
                    ) : currentWorkoutPlan ? (
                      <WorkoutCard 
                        plan={currentWorkoutPlan} 
                        manualWorkouts={currentManualWorkouts}
                        completedExerciseIds={currentTracking.completedExerciseIds}
                        onToggleExercise={toggleExercise}
                        onAddManualWorkout={addManualWorkout}
                        userWeight={user.weight}
                      />
                    ) : (
                      renderEmptyState(handleGenerateWorkout, "workout")
                    )}
                  </div>
                </div>
             </div>
           )}

           {activeSection === 'coach' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[600px]">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
                  <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 font-bold text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2">
                     <Award className="w-4 h-4 text-yellow-500" /> Ask Guru-ji
                  </div>
                  <div className="flex-1 overflow-hidden">
                     <ChatCoach 
                      user={user} 
                      messages={chatHistory} 
                      onUpdateMessages={updateChatHistory} 
                    />
                  </div>
                </div>
             </div>
           )}
        </div>

        {/* FAB (Floating Action Button) */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
           {isFabOpen && (
              <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
                 <button onClick={() => { setActiveModal('meal'); setIsFabOpen(false); }} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    <Utensils className="w-4 h-4 text-orange-500" /> Log Food
                 </button>
                 <button onClick={() => { setActiveModal('workout'); setIsFabOpen(false); }} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    <Dumbbell className="w-4 h-4 text-blue-500" /> Log Workout
                 </button>
              </div>
           )}
           <button 
             onClick={() => setIsFabOpen(!isFabOpen)}
             className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-all transform hover:scale-105 ${isFabOpen ? 'bg-gray-800 dark:bg-slate-700 rotate-45' : 'bg-indigo-600 dark:bg-indigo-500'}`}
           >
              <Plus className="w-7 h-7" />
           </button>
        </div>

        {/* Modals from FAB */}
        {activeModal === 'meal' && (
           <AddMealModal onClose={() => setActiveModal(null)} onSave={addManualMeal} />
        )}
        {activeModal === 'workout' && (
           <AddWorkoutModal weight={user.weight} onClose={() => setActiveModal(null)} onSave={addManualWorkout} />
        )}

      </main>
    </div>
  );
};

export default Dashboard;
