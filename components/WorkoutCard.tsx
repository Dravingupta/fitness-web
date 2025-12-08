
import React, { useState } from 'react';
import { WorkoutPlan, ManualWorkout } from '../types';
import { Clock, TrendingUp, CheckSquare, Square, Dumbbell, Plus } from 'lucide-react';

interface WorkoutCardProps {
  plan: WorkoutPlan;
  manualWorkouts: ManualWorkout[];
  completedExerciseIds: string[];
  onToggleExercise: (id: string, calories: number) => void;
  onAddManualWorkout: (workout: ManualWorkout) => void;
  userWeight: number;
}

// --- Add Manual Workout Modal ---
export const AddWorkoutModal: React.FC<{ onClose: () => void; onSave: (w: ManualWorkout) => void; weight: number }> = ({ onClose, onSave, weight }) => {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !duration) return;
    
    // Simple estimation: 
    // Light: ~3-4 kcal/min
    // Moderate: ~6-8 kcal/min
    // Intense: ~10-12 kcal/min
    // Adjusted slightly by weight relative to standard 70kg
    const baseRates = { light: 3.5, moderate: 7, intense: 11 };
    const rate = baseRates[intensity as keyof typeof baseRates] || 7;
    const weightFactor = weight / 70; // normalize
    const estBurn = Math.round(parseInt(duration) * rate * weightFactor);

    onSave({
      id: "manual_wo_" + Math.random().toString(36).substr(2, 9),
      source: 'manual',
      name,
      durationMinutes: parseInt(duration),
      intensity: intensity as any,
      estimatedCaloriesBurned: estBurn
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[60]">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Log Extra Activity</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
            <input 
              className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Evening Jog"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input 
              type="number" className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={duration} onChange={e => setDuration(e.target.value)} required placeholder="e.g. 30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
            <select 
               className="w-full border rounded p-2 bg-white"
               value={intensity} onChange={e => setIntensity(e.target.value)}
            >
              <option value="light">Light (Walking, Yoga)</option>
              <option value="moderate">Moderate (Jogging, Cycling)</option>
              <option value="intense">Intense (Sprinting, HIIT)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Add Log</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main Workout Card ---

const WorkoutCard: React.FC<WorkoutCardProps> = ({ 
  plan, manualWorkouts, completedExerciseIds, onToggleExercise, onAddManualWorkout, userWeight 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Calculate completion percentage for AI plan
  const total = plan.exercises.length;
  const done = completedExerciseIds.filter(id => !id.startsWith('manual_')).length; // simplistic filter if using same list
  const aiExerciseIds = plan.exercises.map(e => e.id);
  const doneAI = completedExerciseIds.filter(id => aiExerciseIds.includes(id)).length;
  const progress = total > 0 ? Math.round((doneAI / total) * 100) : 0;
  
  // Default burn for AI exercise if missing
  const DEFAULT_AI_BURN = 40; 

  return (
    <div className="flex flex-col h-full bg-gray-50/50 relative">
      
      {/* Summary Header */}
      <div className="p-4 grid grid-cols-2 gap-3 bg-white border-b border-gray-100">
        <div className="bg-indigo-50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
          <Clock className="w-4 h-4 text-indigo-600 mb-1" />
          <span className="text-sm font-bold text-gray-800">{plan.duration}</span>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-4 h-4 text-orange-600 mb-1" />
          <span className="text-sm font-bold text-gray-800 capitalize">{plan.difficulty}</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-6">
         
         {/* Warmup (No tracking usually, just info) */}
         <div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Warm Up</h3>
           <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
             <ul className="space-y-2">
               {plan.warmup.map((w, i) => (
                 <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                   <span className="text-indigo-400 font-bold">•</span>
                   {w}
                 </li>
               ))}
             </ul>
           </div>
         </div>

         {/* Main Circuit */}
         <div>
           <div className="flex justify-between items-end mb-2 pl-1">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Main Circuit</h3>
             <span className="text-xs text-indigo-600 font-medium">{progress}% Complete</span>
           </div>
           
           <div className="space-y-3">
             {plan.exercises.map((ex) => {
               const isDone = completedExerciseIds.includes(ex.id);
               return (
                 <div 
                   key={ex.id} 
                   className={`p-3 rounded-xl border transition-all ${
                     isDone ? 'bg-green-50 border-green-200 opacity-80' : 'bg-white border-gray-200 shadow-sm'
                   }`}
                 >
                   <div className="flex gap-3">
                     <button 
                       onClick={() => onToggleExercise(ex.id, ex.estimatedCalories || DEFAULT_AI_BURN)}
                       className={`mt-0.5 shrink-0 transition-colors ${isDone ? 'text-green-600' : 'text-gray-300 hover:text-indigo-600'}`}
                     >
                       {isDone ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                     </button>
                     
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-sm font-bold ${isDone ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                            {ex.name}
                          </h4>
                          <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                            {ex.sets} x {ex.reps}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{ex.description}</p>
                        {ex.notes && <p className="text-xs text-indigo-600 mt-1 italic">Tip: {ex.notes}</p>}
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         </div>

         {/* Manual Workouts Section */}
         <div>
            <div className="flex items-center justify-between mb-3 border-t pt-4">
              <h4 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                 <Dumbbell className="w-4 h-4" />
                 Extra Activity Log
              </h4>
           </div>

           {manualWorkouts.length === 0 ? (
             <p className="text-xs text-gray-400 italic pl-1">No extra workouts today.</p>
           ) : (
             <div className="space-y-3">
               {manualWorkouts.map((wo) => {
                 const isDone = completedExerciseIds.includes(wo.id);
                 return (
                    <div key={wo.id} className={`border rounded-xl p-3 flex justify-between items-center ${isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                       <div>
                          <div className="flex gap-2 items-center mb-0.5">
                             <h4 className={`text-sm font-bold text-gray-800 ${isDone ? 'line-through opacity-70' : ''}`}>{wo.name}</h4>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500 font-medium">
                            <span>{wo.durationMinutes} mins</span>
                            <span>•</span>
                            <span>~{wo.estimatedCaloriesBurned} kcal</span>
                          </div>
                       </div>
                       <button 
                          onClick={() => onToggleExercise(wo.id, wo.estimatedCaloriesBurned)}
                          className={`shrink-0 transition ${isDone ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`}
                        >
                          {isDone ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                        </button>
                    </div>
                 );
               })}
             </div>
           )}
         </div>

         {/* Cooldown */}
         <div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Cooldown</h3>
           <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
             <ul className="space-y-2">
               {plan.cooldown.map((w, i) => (
                 <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-400 font-bold">•</span>
                   {w}
                 </li>
               ))}
             </ul>
           </div>
         </div>
       </div>

       {/* Add Manual Workout Modal */}
       {showAddModal && (
         <AddWorkoutModal onClose={() => setShowAddModal(false)} onSave={onAddManualWorkout} weight={userWeight} />
       )}
    </div>
  );
};

export default WorkoutCard;
