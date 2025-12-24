import React, { useState, useEffect } from 'react';
import { DietaryPreference, Goal, ActivityLevel, BodyType } from '../constants';
import { analyzeBodyImage } from '../services/backendService';
import { Loader2, Camera, Upload, ChevronLeft, ChevronRight, Check, User, Target, Utensils, AlertCircle, Dumbbell } from 'lucide-react';

const ProfileForm = ({ uid, mode, initialData, onSave }) => {
    const [step, setStep] = useState(1);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        uid,
        dietaryPreference: DietaryPreference.Vegetarian,
        goal: Goal.FatLoss,
        activityLevel: ActivityLevel.Sedentary,
        bodyType: BodyType.Unsure,
        region: 'North India',
        gender: 'Male',
        budgetLevel: 'medium',
        workoutPreference: 'Home',
        macroMode: 'auto',
        name: '',
        email: '',
        notes: '',
        ...initialData,
    });

    const [customMacros, setCustomMacros] = useState({
        protein: initialData?.customMacros?.protein || 0,
        carbs: initialData?.customMacros?.carbs || 0,
        fats: initialData?.customMacros?.fats || 0,
    });

    const [selectedAllergies, setSelectedAllergies] = useState(initialData?.allergies || []);
    const [allergyNotes, setAllergyNotes] = useState(initialData?.allergyNotes || '');

    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(initialData?.bodyAnalysis || '');

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
            if (initialData.bodyAnalysis) setAnalysisResult(initialData.bodyAnalysis);
            if (initialData.allergies) setSelectedAllergies(initialData.allergies);
            if (initialData.allergyNotes) setAllergyNotes(initialData.allergyNotes);
            if (initialData.customMacros) setCustomMacros(initialData.customMacros);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let finalValue = value;

        if (type === 'number') {
            finalValue = value === '' ? undefined : Number(value);
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if (error) setError(null);
    };

    const handleMacroChange = (e) => {
        const { name, value } = e.target;
        setCustomMacros(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleSelect = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleAllergy = (label) => {
        if (label === 'None') {
            if (selectedAllergies.includes('None')) {
                setSelectedAllergies([]);
            } else {
                setSelectedAllergies(['None']);
            }
        } else {
            let current = selectedAllergies.filter(a => a !== 'None');
            if (current.includes(label)) {
                current = current.filter(a => a !== label);
            } else {
                current.push(label);
            }
            setSelectedAllergies(current);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                try {
                    const result = await analyzeBodyImage(base64String);
                    setFormData(prev => ({
                        ...prev,
                        bodyType: result.bodyType,
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

    const handleNext = (e) => {
        e?.preventDefault();
        setError(null);

        if (step === 1) {
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

    const handleBack = (e) => {
        e?.preventDefault();
        if (step > 1) setStep(prev => prev - 1);
    };

    const handleSubmit = (e) => {
        e?.preventDefault();

        if (formData.macroMode === 'custom') {
            if (!customMacros.protein || !customMacros.carbs || !customMacros.fats) {
                setError("Please enter all macro targets (Protein, Carbs, Fats) or switch to Auto.");
                return;
            }
        }

        const finalProfile = {
            ...formData,
            allergies: selectedAllergies.filter(a => a !== 'None'),
            allergyNotes: allergyNotes,
            customMacros: formData.macroMode === 'custom' ? customMacros : undefined
        };
        onSave(finalProfile);
    };

    const isEdit = mode === 'edit';
    const inputClass = "w-full rounded-xl px-3 py-3 text-sm outline-none border transition-colors duration-200 bg-white text-gray-900 border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-gray-100 dark:border-slate-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";
    const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

    const StepIndicator = ({ num, label, active }) => (
        <div className={`flex items-center gap-2 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${active ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500' : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
                {num}
            </div>
            <span className={`text-sm font-medium hidden sm:block transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-600'}`}>{label}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-4 sm:py-10 px-4 flex items-center justify-center transition-colors">
            <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors h-[90vh] sm:h-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 sm:p-8 text-white shrink-0">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold">
                            {isEdit ? 'Update Your Profile' : 'Let’s Personalize Your Plan'}
                        </h2>
                        <div className="bg-white/20 p-2 rounded-full hidden sm:block">
                            {step === 1 ? <User className="w-6 h-6" /> : step === 2 ? <Target className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
                        </div>
                    </div>
                    <p className="text-indigo-100 text-sm sm:text-lg">
                        {step === 1 ? "Tell us about yourself so we can get started." : step === 2 ? "What are your fitness goals?" : "Refine your food preferences."}
                    </p>
                </div>

                <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
                    <StepIndicator num={1} label="Basic Info" active={step >= 1} />
                    <div className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-colors ${step >= 2 ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700'}`}></div>
                    <StepIndicator num={2} label="Goals & Workout" active={step >= 2} />
                    <div className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-colors ${step >= 3 ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700'}`}></div>
                    <StepIndicator num={3} label="Diet & Macros" active={step >= 3} />
                </div>

                <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex items-center animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className={labelClass}>Full Name</label>
                                <input name="name" type="text" value={formData.name} onChange={handleChange} className={inputClass} placeholder="e.g. Rahul Kumar" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Age</label>
                                    <input name="age" type="number" value={formData.age === undefined ? '' : formData.age} onChange={handleChange} className={inputClass} placeholder="25" />
                                </div>
                                <div>
                                    <label className={labelClass}>Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Height (cm)</label>
                                    <input name="height" type="number" value={formData.height === undefined ? '' : formData.height} onChange={handleChange} className={inputClass} placeholder="175" />
                                </div>
                                <div>
                                    <label className={labelClass}>Weight (kg)</label>
                                    <input name="weight" type="number" value={formData.weight === undefined ? '' : formData.weight} onChange={handleChange} className={inputClass} placeholder="70" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className={labelClass}>What is your main goal?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {Object.values(Goal).map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => handleSelect('goal', g)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${formData.goal === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Activity Level</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.values(ActivityLevel).map(a => (
                                        <button
                                            key={a}
                                            type="button"
                                            onClick={() => handleSelect('activityLevel', a)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${formData.activityLevel === a ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'}`}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Where do you prefer to workout?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleSelect('workoutPreference', 'Home')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.workoutPreference === 'Home' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                    >
                                        <User className="w-6 h-6" />
                                        <span className="font-semibold text-sm">Home Workout</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect('workoutPreference', 'Gym')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.workoutPreference === 'Gym' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                    >
                                        <Dumbbell className="w-6 h-6" />
                                        <span className="font-semibold text-sm">Gym / Fitness Center</span>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    {formData.workoutPreference === 'Gym' ? 'We will generate a structured 6-day split (e.g. Chest, Back, Legs).' : 'We will generate effective bodyweight or minimal equipment routines.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className={labelClass}>Dietary Preference</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {Object.values(DietaryPreference).map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => handleSelect('dietaryPreference', d)}
                                            className={`p-2 rounded-xl border text-xs sm:text-sm font-medium transition-all ${formData.dietaryPreference === d ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Nutrition Targets</label>
                                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                                    <button
                                        type="button"
                                        onClick={() => handleSelect('macroMode', 'auto')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.macroMode === 'auto' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        Auto (AI Calculated)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect('macroMode', 'custom')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.macroMode === 'custom' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        Custom Macros
                                    </button>
                                </div>
                                {formData.macroMode === 'custom' && (
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Protein (g)</label>
                                            <input type="number" name="protein" value={customMacros.protein} onChange={handleMacroChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Carbs (g)</label>
                                            <input type="number" name="carbs" value={customMacros.carbs} onChange={handleMacroChange} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Fats (g)</label>
                                            <input type="number" name="fats" value={customMacros.fats} onChange={handleMacroChange} className={inputClass} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Allergies & Sensitivities</label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Gluten', 'Soy', 'Seafood', 'None'].map(label => {
                                        const active = selectedAllergies.includes(label);
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => toggleAllergy(label)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                            ${active
                                                        ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-200 shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <textarea
                                    className={`${inputClass} h-16 resize-none`}
                                    rows={2}
                                    value={allergyNotes}
                                    onChange={(e) => setAllergyNotes(e.target.value)}
                                    placeholder="Other allergy details..."
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Region</label>
                                    <select name="region" value={formData.region} onChange={handleChange} className={inputClass}>
                                        <option value="North India">North India</option>
                                        <option value="South India">South India</option>
                                        <option value="West India">West India</option>
                                        <option value="East India">East India</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Budget</label>
                                    <select name="budgetLevel" value={formData.budgetLevel} onChange={handleChange} className={inputClass}>
                                        <option value="low">Low (Budget Friendly)</option>
                                        <option value="medium">Medium</option>
                                        <option value="flexible">Flexible</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                                        <Camera className="w-4 h-4" /> AI Body Analysis
                                    </h3>
                                    <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full font-bold">OPTIONAL</span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                    <label className="cursor-pointer bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition w-full sm:w-auto justify-center">
                                        <Upload className="w-4 h-4 mr-2" />
                                        {analyzing ? 'Analyzing...' : 'Upload Photo'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={analyzing} />
                                    </label>
                                    <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">
                                        Upload a photo to let AI estimate your body type.
                                    </p>
                                </div>
                                {analysisResult && (
                                    <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-300">
                                        <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs uppercase mb-1">Result:</p>
                                        {analysisResult}
                                    </div>
                                )}
                                <div className="mt-4">
                                    <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Selected Body Type</label>
                                    <select name="bodyType" value={formData.bodyType} onChange={handleChange} className={inputClass}>
                                        {Object.values(BodyType).map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    {step > 1 ? (
                        <button type="button" onClick={handleBack} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium px-4 py-2 transition">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back
                        </button>
                    ) : (
                        <div></div>
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
