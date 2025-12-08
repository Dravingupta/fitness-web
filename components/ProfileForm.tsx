
import React, { useState, useEffect } from 'react';
import { UserProfile, DietaryPreference, Goal, ActivityLevel, BodyType } from '../types';
import { analyzeBodyImage } from '../services/geminiService';
import { Loader2, Camera, Upload, ChevronLeft, ChevronRight, Check, User, Target, Utensils, AlertCircle } from 'lucide-react';

interface ProfileFormProps {
  uid: string;
  mode: 'setup' | 'edit';
  initialData?: Partial<UserProfile>;
  onSave: (profile: UserProfile) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ uid, mode, initialData, onSave }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    uid,
    dietaryPreference: DietaryPreference.Vegetarian,
    goal: Goal.FatLoss,
    activityLevel: ActivityLevel.Sedentary,
    bodyType: BodyType.Unsure,
    region: 'North India',
    gender: 'Male',
    budgetLevel: 'medium',
    name: '',
    email: '',
    notes: '',
    ...initialData,
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>(initialData?.bodyAnalysis || '');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      if (initialData.bodyAnalysis) setAnalysisResult(initialData.bodyAnalysis);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    // Properly handle number inputs to avoid string/number mismatch issues
    if (type === 'number') {
       // If empty, set to undefined so input clears, otherwise parse
       finalValue = value === '' ? undefined : Number(value);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (error) setError(null); // Clear error on user interaction
  };

  const handleSelect = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const result = await analyzeBodyImage(base64String);
          setFormData(prev => ({ 
             ...prev, 
             bodyType: result.bodyType as BodyType,
             bodyAnalysis: result.analysis
          }));
          setAnalysisResult(result.analysis);
        } catch (error) {
          alert('Failed to analyze image. Please try again or select manually.');
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setAnalyzing(false);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setError(null);

    if (step === 1) {
      // Validate Step 1
      if (!formData.name?.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!formData.age || formData.age < 10 || formData.age > 100) {
        setError("Please enter a valid age (10-100).");
        return;
      }
      if (!formData.height || formData.height < 50 || formData.height > 300) {
        setError("Please enter a valid height in cm.");
        return;
      }
      if (!formData.weight || formData.weight < 20 || formData.weight > 300) {
        setError("Please enter a valid weight in kg.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (step > 1) setStep(prev => (prev - 1) as any);
  };

  const handleSubmit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    onSave(formData as UserProfile);
  };

  const isEdit = mode === 'edit';

  const StepIndicator = ({ num, label, active }: { num: number; label: string; active: boolean }) => (
    <div className={`flex items-center gap-2 ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${active ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
        {num}
      </div>
      <span className={`text-sm font-medium hidden sm:block transition-colors ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">
              {isEdit ? 'Update Your Profile' : 'Let’s Personalize Your Plan'}
            </h2>
            <div className="bg-white/20 p-2 rounded-full hidden sm:block">
              {step === 1 ? <User className="w-6 h-6" /> : step === 2 ? <Target className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
            </div>
          </div>
          <p className="text-indigo-100 text-lg">
             {step === 1 ? "Tell us about yourself so we can get started." : step === 2 ? "What are your fitness goals?" : "Refine your food preferences."}
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <StepIndicator num={1} label="Basic Info" active={step >= 1} />
          <div className={`h-0.5 flex-1 mx-4 transition-colors ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <StepIndicator num={2} label="Goals" active={step >= 2} />
          <div className={`h-0.5 flex-1 mx-4 transition-colors ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <StepIndicator num={3} label="Preferences" active={step >= 3} />
        </div>

        {/* Form Content */}
        <div className="p-8 flex-1 overflow-y-auto">
          
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input name="name" type="text" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="e.g. Rahul Kumar" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                 <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                  <input name="age" type="number" value={formData.age === undefined ? '' : formData.age} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="25" />
                </div>
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                   <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                   </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm)</label>
                  <input name="height" type="number" value={formData.height === undefined ? '' : formData.height} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="175" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
                  <input name="weight" type="number" value={formData.weight === undefined ? '' : formData.weight} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="70" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GOALS & LIFESTYLE */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Goal */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-3">What is your main goal?</label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   {Object.values(Goal).map(g => (
                     <button 
                       key={g} 
                       type="button"
                       onClick={() => handleSelect('goal', g)}
                       className={`p-3 rounded-xl border text-sm font-medium transition-all ${formData.goal === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                     >
                       {g}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Activity */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-3">Activity Level</label>
                 <div className="grid grid-cols-2 gap-3">
                    {Object.values(ActivityLevel).map(a => (
                      <button 
                       key={a} 
                       type="button"
                       onClick={() => handleSelect('activityLevel', a)}
                       className={`p-3 rounded-xl border text-sm font-medium transition-all ${formData.activityLevel === a ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                     >
                       {a}
                     </button>
                    ))}
                 </div>
               </div>

               {/* Region */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Region (for food recommendations)</label>
                 <select name="region" value={formData.region} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="North India">North India (Roti/Paratha dominant)</option>
                    <option value="South India">South India (Rice/Idli/Dosa dominant)</option>
                    <option value="West India (Gujarati/Marathi)">West India</option>
                    <option value="East India (Bengali/Odia)">East India</option>
                 </select>
               </div>
               
               {/* Budget */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-3">Monthly Food Budget</label>
                 <div className="grid grid-cols-3 gap-3">
                   {['low', 'medium', 'flexible'].map((b) => (
                      <button 
                       key={b} 
                       type="button"
                       onClick={() => handleSelect('budgetLevel', b)}
                       className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${formData.budgetLevel === b ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 hover:bg-green-50 border-gray-200'}`}
                     >
                       {b}
                     </button>
                   ))}
                 </div>
               </div>
            </div>
          )}

          {/* STEP 3: PREFERENCES & AI */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               
               {/* Dietary */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-3">Dietary Preference</label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {Object.values(DietaryPreference).map(d => (
                      <button 
                       key={d} 
                       type="button"
                       onClick={() => handleSelect('dietaryPreference', d)}
                       className={`p-2 rounded-xl border text-xs sm:text-sm font-medium transition-all ${formData.dietaryPreference === d ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-600 hover:bg-orange-50 border-gray-200'}`}
                     >
                       {d}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Body Analysis */}
               <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                       <Camera className="w-4 h-4" /> AI Body Analysis
                     </h3>
                     <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full font-bold">OPTIONAL</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                     <label className="cursor-pointer bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-indigo-50 transition">
                        <Upload className="w-4 h-4 mr-2" />
                        {analyzing ? 'Analyzing...' : 'Upload Photo'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={analyzing} />
                     </label>
                     <p className="text-xs text-indigo-700/70">
                        Upload a photo to let AI estimate your body type (Ecto/Meso/Endo).
                     </p>
                  </div>

                  {analysisResult && (
                    <div className="mt-4 p-3 bg-white rounded-xl border border-indigo-200 text-sm text-gray-700">
                       <p className="font-bold text-indigo-600 text-xs uppercase mb-1">Result:</p>
                       {analysisResult}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Selected Body Type</label>
                    <select name="bodyType" value={formData.bodyType} onChange={handleChange} className="w-full p-2 border border-indigo-200 rounded-lg bg-white text-sm">
                      {Object.values(BodyType).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
               </div>

               {/* Notes */}
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes (Optional)</label>
                  <textarea 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleChange} 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-24 resize-none" 
                    placeholder="E.g. I dislike dairy, or I have a knee injury..."
                  />
               </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          {step > 1 ? (
             <button type="button" onClick={handleBack} className="flex items-center text-gray-500 hover:text-gray-800 font-medium px-4 py-2 transition">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
             </button>
          ) : (
            <div></div> // Spacer
          )}

          {step < 3 ? (
             <button type="button" onClick={handleNext} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition">
                Next <ChevronRight className="w-4 h-4 ml-1" />
             </button>
          ) : (
             <button type="button" onClick={handleSubmit} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition animate-in zoom-in-95">
                Save Profile <Check className="w-4 h-4 ml-1" />
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
