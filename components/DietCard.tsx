
import React, { useState } from 'react';
import { DietPlan, MealItem, ManualMeal } from '../types';
import { ChefHat, X, Clock, CheckCircle, Circle, Plus, Utensils, RefreshCw, AlertCircle } from 'lucide-react';

interface DietCardProps {
  plan: DietPlan;
  manualMeals: ManualMeal[];
  completedMealIds: string[];
  onToggleMeal: (id: string, calories: number) => void;
  onAddManualMeal: (meal: ManualMeal) => void;
  onSwapMeal?: (mealId: string) => void;
  swappingMealId?: string | null;
}

// --- Recipe Modal Component ---
const RecipeModal: React.FC<{ meal: MealItem | null; onClose: () => void }> = ({ meal, onClose }) => {
  if (!meal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
          <div>
            <span className="text-xs uppercase opacity-80 font-bold tracking-wider">{meal.type}</span>
            <h3 className="text-xl font-bold">{meal.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {/* Macros Header in Recipe */}
          <div className="flex justify-between mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <div className="text-center">
               <span className="block text-xl font-bold text-indigo-700">{meal.calories}</span>
               <span className="text-[10px] uppercase font-bold text-indigo-400">kcal</span>
             </div>
             <div className="w-px bg-indigo-200"></div>
             <div className="text-center">
               <span className="block text-sm font-bold text-gray-800">{meal.proteinGrams || '-'}g</span>
               <span className="text-[10px] uppercase font-bold text-gray-500">Protein</span>
             </div>
             <div className="text-center">
               <span className="block text-sm font-bold text-gray-800">{meal.carbsGrams || '-'}g</span>
               <span className="text-[10px] uppercase font-bold text-gray-500">Carbs</span>
             </div>
             <div className="text-center">
               <span className="block text-sm font-bold text-gray-800">{meal.fatsGrams || '-'}g</span>
               <span className="text-[10px] uppercase font-bold text-gray-500">Fats</span>
             </div>
          </div>

          <div className="flex gap-4 mb-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Prep: <strong>{meal.recipeDetail.prepTime}</strong></span>
            </div>
            <div className="w-px bg-gray-300"></div>
             <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Cook: <strong>{meal.recipeDetail.cookTime}</strong></span>
            </div>
          </div>
          <div className="mb-6">
            <h4 className="font-bold text-gray-800 mb-3 border-b pb-1">Ingredients</h4>
            <ul className="space-y-2">
              {meal.recipeDetail.ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">{ing.name}</span>
                  <span className="font-medium text-gray-900">{ing.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-3 border-b pb-1">Instructions</h4>
            <ol className="space-y-4">
              {meal.recipeDetail.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">
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

// --- Add Manual Meal Modal (Exported for Dashboard FAB) ---
export const AddMealModal: React.FC<{ onClose: () => void; onSave: (m: ManualMeal) => void }> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [type, setType] = useState('snack');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !calories) return;
    onSave({
      id: "manual_" + Math.random().toString(36).substr(2, 9),
      source: 'manual',
      name,
      calories: parseInt(calories),
      timeOfDay: type as any,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[60]">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-5 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Log Food</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Name</label>
            <input 
              className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. 2 Bananas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
            <input 
              type="number" className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
              value={calories} onChange={e => setCalories(e.target.value)} required placeholder="e.g. 200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
            <select 
               className="w-full border rounded p-2 bg-white"
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
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main Diet Card ---

const DietCard: React.FC<DietCardProps> = ({ plan, manualMeals, completedMealIds, onToggleMeal, onAddManualMeal, onSwapMeal, swappingMealId }) => {
  const [selectedMeal, setSelectedMeal] = useState<MealItem | null>(null);
  // We keep this purely for internal "Add Manual" clicks from the list, though Dashboard also invokes the Modal
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex flex-col h-full relative">
      <div className="overflow-y-auto flex-1 p-4 space-y-6">
        
        {/* AI Meals Section */}
        <div className="space-y-4">
          {plan.meals.map((meal) => {
            const isCompleted = completedMealIds.includes(meal.id);
            const isSwapping = swappingMealId === meal.id;

            return (
              <div 
                key={meal.id} 
                className={`relative border rounded-xl p-4 transition-all ${
                  isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                } ${isSwapping ? 'opacity-50 pointer-events-none' : ''}`}
              >
                 {isSwapping && (
                   <div className="absolute inset-0 flex items-center justify-center z-10">
                     <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                   </div>
                 )}

                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isCompleted ? 'bg-green-200 text-green-800' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {meal.type}
                    </span>
                  </div>
                  <button 
                    onClick={() => onToggleMeal(meal.id, meal.calories)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition ${
                      isCompleted ? 'text-green-600' : 'text-gray-400 hover:text-indigo-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                </div>

                <h4 className={`text-base font-bold text-gray-900 mb-1 ${isCompleted ? 'line-through opacity-70' : ''}`}>
                  {meal.name}
                </h4>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{meal.shortDescription}</p>

                {/* Macro Footer */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium mb-3 bg-gray-50 p-2 rounded-lg">
                   <span className="text-gray-900 font-bold">{meal.calories} kcal</span>
                   {meal.proteinGrams && <span>• {meal.proteinGrams}g P</span>}
                   {meal.carbsGrams && <span>• {meal.carbsGrams}g C</span>}
                   {meal.fatsGrams && <span>• {meal.fatsGrams}g F</span>}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                   <button 
                      onClick={() => onSwapMeal && onSwapMeal(meal.id)}
                      className="text-xs font-medium text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition"
                      disabled={isCompleted}
                   >
                      <RefreshCw className="w-3 h-3" />
                      Swap
                   </button>
                  <button 
                    onClick={() => setSelectedMeal(meal)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <ChefHat className="w-3 h-3" />
                    Recipe
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Manual Meals Section */}
        <div>
           <div className="flex items-center justify-between mb-3 border-t pt-4">
              <h4 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                 <Utensils className="w-4 h-4" />
                 Manual Food Log
              </h4>
           </div>

           {manualMeals.length === 0 ? (
             <p className="text-xs text-gray-400 italic pl-1">No extra food logged today.</p>
           ) : (
             <div className="space-y-3">
               {manualMeals.map((meal) => {
                 const isCompleted = completedMealIds.includes(meal.id);
                 return (
                    <div key={meal.id} className={`border rounded-xl p-3 flex justify-between items-center ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                       <div>
                          <div className="flex gap-2 items-center mb-0.5">
                             <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase font-bold">{meal.timeOfDay}</span>
                             <h4 className={`text-sm font-bold text-gray-800 ${isCompleted ? 'line-through opacity-70' : ''}`}>{meal.name}</h4>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{meal.calories} kcal</span>
                       </div>
                       <button 
                          onClick={() => onToggleMeal(meal.id, meal.calories)}
                          className={`shrink-0 transition ${isCompleted ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`}
                        >
                          {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                    </div>
                 );
               })}
             </div>
           )}
        </div>

        {/* Tips Section */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-4">
            <h5 className="text-xs font-bold text-yellow-800 uppercase mb-2">Coach's Tips</h5>
            <ul className="space-y-1">
              {plan.tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-yellow-900 flex gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"></span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recipe Modal */}
      {selectedMeal && (
        <RecipeModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      )}
      
      {/* Add Manual Meal Modal (For list usage) */}
      {showAddModal && (
        <AddMealModal onClose={() => setShowAddModal(false)} onSave={onAddManualMeal} />
      )}
    </div>
  );
};

export default DietCard;
