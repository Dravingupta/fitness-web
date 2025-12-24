import React, { useState } from 'react';
import { Clock, TrendingUp, CheckSquare, Square, Dumbbell, Target } from 'lucide-react';

export const AddWorkoutModal = ({ onClose, onSave, weight }) => {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState('');
    const [intensity, setIntensity] = useState('moderate');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !duration) return;

       
        const baseRates = { light: 3.5, moderate: 7, intense: 11 };
        const rate = baseRates[intensity] || 7;
        const weightFactor = weight / 70; // normalize
        const estBurn = Math.round(parseInt(duration) * rate * weightFactor);

        onSave({
            id: "manual_wo_" + Math.random().toString(36).substr(2, 9),
            source: 'manual',
            name,
            durationMinutes: parseInt(duration),
            intensity,
            estimatedCaloriesBurned: estBurn
        });
        onClose();
    };

    const inputClass = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors duration-200 bg-white text-gray-900 border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-gray-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[60]">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Log Extra Activity</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Name</label>
                        <input
                            className={inputClass}
                            value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Evening Jog"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                        <input
                            type="number" className={inputClass}
                            value={duration} onChange={e => setDuration(e.target.value)} required placeholder="e.g. 30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intensity</label>
                        <select
                            className={inputClass}
                            value={intensity} onChange={e => setIntensity(e.target.value)}
                        >
                            <option value="light">Light (Walking, Yoga)</option>
                            <option value="moderate">Moderate (Jogging, Cycling)</option>
                            <option value="intense">Intense (Sprinting, HIIT)</option>
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 py-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition">Cancel</button>
                        <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Add Log</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const WorkoutCard = ({
    plan, manualWorkouts, completedExerciseIds, onToggleExercise, onAddManualWorkout, userWeight
}) => {
    const [showAddModal, setShowAddModal] = useState(false);

    const total = plan.exercises.length;
    const doneAI = completedExerciseIds.filter(id => {
        return plan.exercises.some(ex => ex.id === id);
    }).length;

    const progress = total > 0 ? Math.round((doneAI / total) * 100) : 0;

    const DEFAULT_AI_BURN = 40;

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-slate-900/50 relative">

            <div className="p-4 grid grid-cols-3 gap-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">

                <div className="col-span-3 sm:col-span-1 bg-indigo-100 dark:bg-indigo-900/40 p-3 rounded-lg flex flex-col items-center justify-center text-center border border-indigo-200 dark:border-indigo-800/50">
                    <Target className="w-4 h-4 text-indigo-700 dark:text-indigo-300 mb-1" />
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100 line-clamp-1">
                        {plan.focus || "Full Body"}
                    </span>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg flex flex-col items-center justify-center text-center border border-gray-100 dark:border-slate-700">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 mb-1" />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{plan.duration}</span>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg flex flex-col items-center justify-center text-center border border-orange-100 dark:border-orange-800/30">
                    <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400 mb-1" />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{plan.difficulty}</span>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-6">

                <div>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 pl-1">Warm Up</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
                        <ul className="space-y-2">
                            {plan.warmup.map((w, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span className="text-indigo-400 font-bold">•</span>
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-2 pl-1">
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Main Circuit</h3>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{progress}% Complete</span>
                    </div>

                    <div className="space-y-3">
                        {plan.exercises.map((ex) => {
                            const isDone = completedExerciseIds.includes(ex.id);
                            return (
                                <div
                                    key={ex.id}
                                    className={`p-3 rounded-xl border transition-all ${isDone
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 opacity-80'
                                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-sm'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => onToggleExercise(ex.id, ex.estimatedCalories || DEFAULT_AI_BURN)}
                                            className={`mt-0.5 shrink-0 transition-colors ${isDone ? 'text-green-600 dark:text-green-500' : 'text-gray-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                        >
                                            {isDone ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                        </button>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-bold ${isDone ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {ex.name}
                                                </h4>
                                                <span className="text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                                                    {ex.sets} x {ex.reps}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ex.description}</p>
                                            {ex.notes && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 italic">Tip: {ex.notes}</p>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3 border-t border-gray-100 dark:border-slate-800 pt-4">
                        <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" />
                            Extra Activity Log
                        </h4>
                    </div>

                    {manualWorkouts.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-600 italic pl-1">No extra workouts today.</p>
                    ) : (
                        <div className="space-y-3">
                            {manualWorkouts.map((wo) => {
                                const isDone = completedExerciseIds.includes(wo.id);
                                return (
                                    <div key={wo.id} className={`border rounded-xl p-3 flex justify-between items-center transition-colors ${isDone ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30' : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>
                                        <div>
                                            <div className="flex gap-2 items-center mb-0.5">
                                                <h4 className={`text-sm font-bold text-gray-800 dark:text-gray-200 ${isDone ? 'line-through opacity-70' : ''}`}>{wo.name}</h4>
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                <span>{wo.durationMinutes} mins</span>
                                                <span>•</span>
                                                <span>~{wo.estimatedCaloriesBurned} kcal</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onToggleExercise(wo.id, wo.estimatedCaloriesBurned)}
                                            className={`shrink-0 transition ${isDone ? 'text-green-600 dark:text-green-500' : 'text-gray-300 dark:text-slate-600 hover:text-green-500'}`}
                                        >
                                            {isDone ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 pl-1">Cooldown</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
                        <ul className="space-y-2">
                            {plan.cooldown.map((w, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span className="text-green-400 font-bold">•</span>
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddWorkoutModal onClose={() => setShowAddModal(false)} onSave={onAddManualWorkout} weight={userWeight} />
            )}
        </div>
    );
};

export default WorkoutCard;
