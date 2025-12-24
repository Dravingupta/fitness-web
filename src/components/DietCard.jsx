import React, { useState } from 'react';
import { ChefHat, X, Clock, CheckCircle, Circle, Utensils, RefreshCw } from 'lucide-react';

// --- Recipe Modal Component ---
const RecipeModal = ({ meal, onClose }) => {
    if (!meal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                <div className="bg-indigo-600 dark:bg-indigo-700 p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <span className="text-xs uppercase opacity-80 font-bold tracking-wider">{meal.type}</span>
                        <h3 className="text-xl font-bold">{meal.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto text-gray-900 dark:text-gray-100">
                    <div className="flex justify-between mb-6 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <div className="text-center">
                            <span className="block text-xl font-bold text-indigo-700 dark:text-indigo-300">{meal.calories}</span>
                            <span className="text-[10px] uppercase font-bold text-indigo-400 dark:text-indigo-400">kcal</span>
                        </div>
                        <div className="w-px bg-indigo-200 dark:bg-indigo-700"></div>
                        <div className="text-center">
                            <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">{meal.proteinGrams || '-'}g</span>
                            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Protein</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">{meal.carbsGrams || '-'}g</span>
                            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Carbs</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">{meal.fatsGrams || '-'}g</span>
                            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Fats</span>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-6 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            <span>Prep: <strong>{meal.recipeDetail.prepTime}</strong></span>
                        </div>
                        <div className="w-px bg-gray-300 dark:bg-slate-600"></div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                            <span>Cook: <strong>{meal.recipeDetail.cookTime}</strong></span>
                        </div>
                    </div>
                    <div className="mb-6">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-3 border-b dark:border-slate-700 pb-1">Ingredients</h4>
                        <ul className="space-y-2">
                            {meal.recipeDetail.ingredients.map((ing, idx) => (
                                <li key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300">{ing.name}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{ing.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-3 border-b dark:border-slate-700 pb-1">Instructions</h4>
                        <ol className="space-y-4">
                            {meal.recipeDetail.steps.map((step, idx) => (
                                <li key={idx} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs">
                                        {idx + 1}
                                    </span>
                                    <p className="pt-0.5">{step}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AddMealModal = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [calories, setCalories] = useState('');
    const [type, setType] = useState('snack');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !calories) return;
        onSave({
            id: "manual_" + Math.random().toString(36).substr(2, 9),
            source: 'manual',
            name,
            calories: parseInt(calories),
            timeOfDay: type,
        });
        onClose();
    };

    const inputClass = "w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors duration-200 bg-white text-gray-900 border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-gray-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[60]">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Log Food</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Food Name</label>
                        <input
                            className={inputClass}
                            value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. 2 Bananas"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Calories</label>
                        <input
                            type="number" className={inputClass}
                            value={calories} onChange={e => setCalories(e.target.value)} required placeholder="e.g. 200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meal Type</label>
                        <select
                            className={inputClass}
                            value={type} onChange={e => setType(e.target.value)}
                        >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 py-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition">Cancel</button>
                        <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">Add</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DietCard = ({ plan, manualMeals, completedMealIds, onToggleMeal, onAddManualMeal, onSwapMeal, swappingMealId }) => {
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 space-y-4">

                <div className="space-y-3">
                    {plan.meals.map((meal) => {
                        const isCompleted = completedMealIds.includes(meal.id);
                        const isSwapping = swappingMealId === meal.id;

                        return (
                            <div
                                key={meal.id}
                                className={`
                  rounded-2xl border transition-all duration-200 
                  bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col gap-2 relative overflow-hidden
                  ${isCompleted ? 'border-green-200 bg-emerald-50/40 dark:bg-emerald-900/10 dark:border-green-900/30' : 'border-gray-100 dark:border-slate-700 hover:shadow-md'}
                  ${isSwapping ? 'opacity-50 pointer-events-none' : ''}
                `}
                            >
                                {isSwapping && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px]">
                                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 uppercase tracking-wide">
                                        {meal.type}
                                    </span>

                                    <button
                                        onClick={() => onToggleMeal(meal.id, meal.calories)}
                                        className={`shrink-0 transition-colors ${isCompleted ? 'text-green-600 dark:text-green-500' : 'text-gray-300 dark:text-slate-600 hover:text-green-500 dark:hover:text-green-500'}`}
                                    >
                                        {isCompleted ? <CheckCircle className="w-6 h-6 fill-green-100 dark:fill-green-900/20" /> : <Circle className="w-6 h-6" />}
                                    </button>
                                </div>

                                <div>
                                    <h4 className={`text-base font-bold text-gray-900 dark:text-white leading-tight mb-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                        {meal.name}
                                    </h4>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {meal.shortDescription}
                                    </p>
                                </div>

                                <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs md:text-sm">
                                    <span className="font-semibold bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-full px-2.5 py-0.5">
                                        {meal.calories} kcal
                                    </span>
                                    <div className="hidden sm:flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                                        {meal.proteinGrams && <span>{meal.proteinGrams}g P</span>}
                                        {meal.carbsGrams && <span>{meal.carbsGrams}g C</span>}
                                        {meal.fatsGrams && <span>{meal.fatsGrams}g F</span>}
                                    </div>

                                    <div className="ml-auto flex items-center gap-4">
                                        <button
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-medium flex items-center gap-1 transition"
                                            onClick={() => setSelectedMeal(meal)}
                                        >
                                            <ChefHat className="w-3 h-3" /> Recipe
                                        </button>
                                        <button
                                            className="text-gray-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 text-xs transition"
                                            onClick={() => onSwapMeal && onSwapMeal(meal.id)}
                                            disabled={isCompleted}
                                        >
                                            Swap
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3 border-t border-gray-100 dark:border-slate-800 pt-4">
                        <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Utensils className="w-4 h-4" />
                            Manual Food Log
                        </h4>
                    </div>

                    {manualMeals.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-600 italic pl-1">No extra food logged today.</p>
                    ) : (
                        <div className="space-y-3">
                            {manualMeals.map((meal) => {
                                const isCompleted = completedMealIds.includes(meal.id);
                                return (
                                    <div key={meal.id} className={`rounded-xl border p-3 flex justify-between items-center transition-colors ${isCompleted
                                            ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-green-200 dark:border-green-900/30'
                                            : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-700'
                                        }`}>
                                        <div>
                                            <div className="flex gap-2 items-center mb-1">
                                                <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded uppercase font-bold">{meal.timeOfDay}</span>
                                                <h4 className={`text-sm font-bold text-gray-800 dark:text-gray-200 ${isCompleted ? 'line-through opacity-70' : ''}`}>{meal.name}</h4>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{meal.calories} kcal</span>
                                        </div>
                                        <button
                                            onClick={() => onToggleMeal(meal.id, meal.calories)}
                                            className={`shrink-0 transition ${isCompleted ? 'text-green-600 dark:text-green-500' : 'text-gray-300 dark:text-slate-600 hover:text-green-500'}`}
                                        >
                                            {isCompleted ? <CheckCircle className="w-6 h-6 fill-green-100 dark:fill-green-900/20" /> : <Circle className="w-6 h-6" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {plan.tips && plan.tips.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30 mt-4">
                        <h5 className="text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-2">Coach's Tips</h5>
                        <ul className="space-y-1">
                            {plan.tips.map((tip, idx) => (
                                <li key={idx} className="text-xs text-yellow-900 dark:text-yellow-200 flex gap-2">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 dark:bg-yellow-600 shrink-0"></span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {selectedMeal && (
                <RecipeModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
            )}

            {showAddModal && (
                <AddMealModal onClose={() => setShowAddModal(false)} onSave={onAddManualMeal} />
            )}
        </div>
    );
};

export default DietCard;
