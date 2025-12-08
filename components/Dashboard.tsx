
import React, { useState, useEffect } from 'react';
import { UserProfile, DietPlan, WorkoutPlan, DailyTracking, ManualMeal, ManualWorkout, MealItem, WorkoutExercise } from '../types';
import { generateDietPlan, generateWorkoutPlan, swapMeal } from '../services/geminiService';
import { RefreshCw, Calendar, ChevronLeft, ChevronRight, Activity, TrendingDown, TrendingUp, LogOut, Settings, Plus, Dumbbell, Utensils, Award, Flame, Zap, User as UserIcon } from 'lucide-react';
import ChatCoach from './ChatCoach';
import DietCard, { AddMealModal } from './DietCard';
import WorkoutCard, { AddWorkoutModal } from './WorkoutCard';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onEditProfile: () => void;
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
          stroke="rgb(243 244 246)"
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

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEditProfile }) => {
  // Date State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'meal' | 'workout' | null>(null);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [activeMobileSection, setActiveMobileSection] = useState<'meals' | 'workout' | 'coach'>('meals');

  // Data persistence by Date
  const [dietHistory, setDietHistory] = useState<Record<string, DietPlan>>({});
  const [workoutHistory, setWorkoutHistory] = useState<Record<string, WorkoutPlan>>({});
  const [trackingHistory, setTrackingHistory] = useState<Record<string, DailyTracking>>({});
  
  // Manual Entries History
  const [manualMealsHistory, setManualMealsHistory] = useState<Record<string, ManualMeal[]>>({});
  const [manualWorkoutsHistory, setManualWorkoutsHistory] = useState<Record<string, ManualWorkout[]>>({});

  // Loading States
  const [loadingDiet, setLoadingDiet] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(false);

  // Storage Keys Helpers
  const getDietKey = (date: string) => `aiCoachDiet_${user.uid}_${date}`;
  const getWorkoutKey = (date: string) => `aiCoachWorkout_${user.uid}_${date}`;
  const getTrackingKey = (date: string) => `aiCoachTracking_${user.uid}_${date}`;
  const getManualMealsKey = (date: string) => `aiCoachManualMeals_${user.uid}_${date}`;
  const getManualWorkoutsKey = (date: string) => `aiCoachManualWorkouts_${user.uid}_${date}`;

  // --- Load Data for Selected Date ---
  useEffect(() => {
    const loadDataForDate = () => {
      // 1. Diet Plan
      const savedDiet = localStorage.getItem(getDietKey(selectedDate));
      if (savedDiet) {
        setDietHistory(prev => ({ ...prev, [selectedDate]: JSON.parse(savedDiet) }));
      }

      // 2. Workout Plan
      const savedWorkout = localStorage.getItem(getWorkoutKey(selectedDate));
      if (savedWorkout) {
        setWorkoutHistory(prev => ({ ...prev, [selectedDate]: JSON.parse(savedWorkout) }));
      }

      // 3. Tracking
      const savedTracking = localStorage.getItem(getTrackingKey(selectedDate));
      if (savedTracking) {
        setTrackingHistory(prev => ({ ...prev, [selectedDate]: JSON.parse(savedTracking) }));
      }

      // 4. Manual Meals
      const savedManualMeals = localStorage.getItem(getManualMealsKey(selectedDate));
      if (savedManualMeals) {
        setManualMealsHistory(prev => ({ ...prev, [selectedDate]: JSON.parse(savedManualMeals) }));
      }

      // 5. Manual Workouts
      const savedManualWorkouts = localStorage.getItem(getManualWorkoutsKey(selectedDate));
      if (savedManualWorkouts) {
        setManualWorkoutsHistory(prev => ({ ...prev, [selectedDate]: JSON.parse(savedManualWorkouts) }));
      }
    };

    loadDataForDate();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user.uid]);

  // --- Auto-Generate Logic ---
  useEffect(() => {
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const diet = dietHistory[selectedDate];
    const workout = workoutHistory[selectedDate];

    if (isToday && !diet && !loadingDiet) {
      handleGenerateDiet();
    }
    if (isToday && !workout && !loadingWorkout) {
      handleGenerateWorkout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, dietHistory, workoutHistory]);

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

  // --- Handlers ---

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleGenerateDiet = async () => {
    setLoadingDiet(true);
    try {
      const plan = await generateDietPlan(user);
      const planWithDate = { ...plan, date: selectedDate };
      
      localStorage.setItem(getDietKey(selectedDate), JSON.stringify(planWithDate));
      setDietHistory(prev => ({ ...prev, [selectedDate]: planWithDate }));
      
      // Init tracking target
      setTrackingHistory(prev => {
        const existing = prev[selectedDate] || {
          date: selectedDate,
          completedMealIds: [],
          completedExerciseIds: [],
          totalEstimatedCaloriesConsumed: 0,
          totalEstimatedCaloriesBurned: 0,
        };
        const updated = { ...existing, totalTargetCalories: plan.totalCalories };
        localStorage.setItem(getTrackingKey(selectedDate), JSON.stringify(updated));
        return { ...prev, [selectedDate]: updated };
      });

    } catch (error) {
      console.error(error);
      alert('Failed to generate diet plan');
    } finally {
      setLoadingDiet(false);
    }
  };

  const handleGenerateWorkout = async () => {
    setLoadingWorkout(true);
    try {
      const plan = await generateWorkoutPlan(user);
      const planWithDate = { ...plan, date: selectedDate };
      localStorage.setItem(getWorkoutKey(selectedDate), JSON.stringify(planWithDate));
      setWorkoutHistory(prev => ({ ...prev, [selectedDate]: planWithDate }));
    } catch (error) {
      console.error(error);
      alert('Failed to generate workout plan');
    } finally {
      setLoadingWorkout(false);
    }
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
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', { 
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  const getGoalColor = (goal: string) => {
    switch(goal) {
      case 'Fat Loss': return 'bg-emerald-100 text-emerald-800';
      case 'Muscle Gain': return 'bg-blue-100 text-blue-800';
      case 'General Fitness': return 'bg-violet-100 text-violet-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter text-gray-900">
      {/* Header - White, Clean, Minimal */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Row 1: Brand & Profile (Mobile optimized layout) */}
            <div className="flex items-center justify-between w-full sm:w-auto">
               <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">I</span>
                    Indian AI Coach
                  </h1>
                  <p className="text-xs text-gray-500 font-medium pl-10 -mt-1">
                    Namaste, {user.name ? user.name.split(' ')[0] : 'Friend'}
                  </p>
               </div>
               
               {/* Mobile Profile Toggle */}
               <div className="sm:hidden relative">
                   <button
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm border border-gray-200"
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </button>
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 border border-gray-200 rounded-xl shadow-xl text-sm z-20">
                        <button onClick={() => { setIsMenuOpen(false); onEditProfile(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-gray-400" /> Edit Profile
                        </button>
                        <button onClick={() => { setIsMenuOpen(false); onLogout(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100">
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
                <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
                  <button onClick={() => handleDateChange(-1)} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition shadow-sm hover:shadow">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center px-3 text-xs font-bold text-gray-700 min-w-[100px] justify-center">
                    <Calendar className="w-3 h-3 mr-1.5 opacity-60" />
                    {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <button onClick={() => handleDateChange(1)} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-gray-900 transition shadow-sm hover:shadow">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full border border-orange-100 shadow-sm whitespace-nowrap">
                   <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                   <span className="text-xs font-bold">{badgeStats.streak}-day streak</span>
                </div>

                {/* Desktop Profile */}
                <div className="hidden sm:block relative">
                   <button
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
                    >
                      <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </button>

                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 border border-gray-200 rounded-xl shadow-xl text-sm z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email || 'User'}</p>
                          </div>
                          <button onClick={() => { setIsMenuOpen(false); onEditProfile(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-gray-400" /> Edit Profile
                          </button>
                          <button onClick={() => { setIsMenuOpen(false); onLogout(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">
                 {isToday ? "Today" : "Selected Date"}
              </p>
              <h3 className="text-xl font-bold text-gray-900">{formattedDate}</h3>
            </div>
            <div className="mt-4">
               <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getGoalColor(user.goal)}`}>
                 {user.goal}
               </span>
               <p className="text-xs text-gray-400 mt-2 font-medium">Your progress at a glance</p>
            </div>
          </div>

          {/* Card 2: Calories In (Ring) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
            <div className="shrink-0">
               <ProgressRing radius={36} stroke={6} progress={eatenPercent} color="#f97316" />
            </div>
            <div>
               <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-0.5">Calories In</p>
               <div className="text-2xl font-bold text-gray-900 leading-none">
                 {currentTracking.totalEstimatedCaloriesConsumed.toLocaleString()}
               </div>
               <p className="text-xs text-gray-400 mt-1 font-medium">
                 {currentTarget > 0 ? `of ${currentTarget.toLocaleString()} target` : "No target set"}
               </p>
            </div>
          </div>

          {/* Card 3: Calories Out (Ring) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
            <div className="shrink-0">
               <ProgressRing radius={36} stroke={6} progress={burnPercent} color="#10b981" />
            </div>
            <div>
               <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-0.5">Calories Out</p>
               <div className="text-2xl font-bold text-gray-900 leading-none">
                 {burnedToday.toLocaleString()}
               </div>
               <p className="text-xs text-gray-400 mt-1 font-medium">
                 {plannedBurnToday > 0 ? `of ${plannedBurnToday} kcal planned` : "No workout planned yet"}
               </p>
            </div>
          </div>

          {/* Card 4: Net */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Net Calories</p>
               </div>
               <div className={`text-3xl font-bold ${currentNet > currentTarget ? 'text-red-600' : 'text-gray-900'}`}>
                 {currentNet > 0 ? '+' : ''}{currentNet.toLocaleString()} 
               </div>
            </div>
            <p className={`text-xs font-medium ${currentNet <= currentTarget ? 'text-emerald-600' : 'text-red-500'}`}>
               {netVerdict}
            </p>
          </div>
        </div>

        {/* Weekly Summary (Stacked for readability on all screens) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">This week so far</h3>
              <p className="text-xs text-gray-500">{weeklyVerdict}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 text-sm">
               <div className="text-center sm:text-right">
                  <span className="block text-xs text-gray-400 font-medium">In</span>
                  <span className="font-bold text-gray-900">{weeklyStats.totalConsumed.toLocaleString()}</span>
               </div>
               <div className="text-center sm:text-right">
                  <span className="block text-xs text-gray-400 font-medium">Out</span>
                  <span className="font-bold text-gray-900">{weeklyStats.totalBurned.toLocaleString()}</span>
               </div>
               <div className="text-center sm:text-right">
                  <span className="block text-xs text-gray-400 font-medium">Net</span>
                  <span className={`font-bold ${weeklyStats.net > weeklyStats.totalTarget ? 'text-red-600' : 'text-emerald-600'}`}>
                    {weeklyStats.net > 0 ? '+' : ''}{weeklyStats.net.toLocaleString()}
                  </span>
               </div>
            </div>
          </div>
        </div>

        {/* Badges & Stats Section (Always Visible) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
               <Flame className="w-5 h-5 text-orange-600" />
             </div>
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Streak</p>
               <p className="text-sm font-bold text-gray-900">{badgeStats.streak} day{badgeStats.streak !== 1 ? 's' : ''}</p>
             </div>
           </div>
           
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
               <Utensils className="w-5 h-5 text-emerald-600" />
             </div>
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meals Tracked</p>
               <p className="text-sm font-bold text-gray-900">{badgeStats.mealsCount} this week</p>
             </div>
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
               <Zap className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Time</p>
               <p className="text-sm font-bold text-gray-900">{badgeStats.activeMinutes} mins</p>
             </div>
           </div>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden flex gap-2 p-1 bg-gray-200/50 rounded-xl mb-6">
           <button 
             onClick={() => setActiveMobileSection('meals')}
             className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeMobileSection === 'meals' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
           >
             Meals
           </button>
           <button 
             onClick={() => setActiveMobileSection('workout')}
             className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeMobileSection === 'workout' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
           >
             Workout
           </button>
           <button 
             onClick={() => setActiveMobileSection('coach')}
             className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeMobileSection === 'coach' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
           >
             Coach
           </button>
        </div>

        {/* 3-Column Layout (Desktop Side-by-Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Diet Section */}
          <div className={`${activeMobileSection === 'meals' ? 'block' : 'hidden'} lg:block flex flex-col h-full`}>
             <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h2 className="font-bold text-gray-800 flex items-center gap-2">
                     <Utensils className="w-4 h-4 text-orange-500" />
                     Your Meals
                   </h2>
                   <button onClick={() => window.confirm('Regenerate Diet Plan?') && handleGenerateDiet()} disabled={loadingDiet} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition">
                     <RefreshCw className={`w-4 h-4 ${loadingDiet ? 'animate-spin' : ''}`} />
                   </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto">
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
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <p className="mb-4">No diet plan generated.</p>
                      <button onClick={handleGenerateDiet} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Generate Plan</button>
                    </div>
                  )}
                </div>
             </section>
          </div>

          {/* Workout Section */}
          <div className={`${activeMobileSection === 'workout' ? 'block' : 'hidden'} lg:block flex flex-col h-full`}>
             <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <h2 className="font-bold text-gray-800 flex items-center gap-2">
                     <Dumbbell className="w-4 h-4 text-blue-500" />
                     Your Workout
                   </h2>
                   <button onClick={handleGenerateWorkout} disabled={loadingWorkout} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition">
                     <RefreshCw className={`w-4 h-4 ${loadingWorkout ? 'animate-spin' : ''}`} />
                   </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto">
                   {loadingWorkout ? (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                        <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                        <p>Training AI is preparing...</p>
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
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <p className="mb-4">No workout plan generated.</p>
                      <button onClick={handleGenerateWorkout} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Generate Workout</button>
                    </div>
                  )}
                </div>
             </section>
          </div>

          {/* Coach Section */}
          <div className={`${activeMobileSection === 'coach' ? 'block' : 'hidden'} lg:block flex flex-col h-full`}>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px] lg:h-full">
                <div className="p-3 border-b border-gray-100 bg-gray-50/50 font-bold text-gray-700 text-sm flex items-center gap-2">
                   <Award className="w-4 h-4 text-yellow-500" /> Ask Guru-ji
                </div>
                <div className="flex-1 overflow-hidden">
                   <ChatCoach user={user} />
                </div>
             </div>
          </div>
        </div>

        {/* FAB (Floating Action Button) */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
           {isFabOpen && (
              <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
                 <button onClick={() => { setActiveModal('meal'); setIsFabOpen(false); }} className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-100 font-medium hover:bg-gray-50 transition">
                    <Utensils className="w-4 h-4 text-orange-500" /> Log Food
                 </button>
                 <button onClick={() => { setActiveModal('workout'); setIsFabOpen(false); }} className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-100 font-medium hover:bg-gray-50 transition">
                    <Dumbbell className="w-4 h-4 text-blue-500" /> Log Workout
                 </button>
              </div>
           )}
           <button 
             onClick={() => setIsFabOpen(!isFabOpen)}
             className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-all transform hover:scale-105 ${isFabOpen ? 'bg-gray-800 rotate-45' : 'bg-indigo-600'}`}
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
