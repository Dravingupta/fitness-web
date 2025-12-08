
import React from 'react';
import { Chrome, ArrowRight, Utensils, Dumbbell, MessageSquare, TrendingUp, CheckCircle, Smartphone } from 'lucide-react';

interface LandingPageProps {
  onGoogleLogin: () => void;
  onEmailLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGoogleLogin, onEmailLoginClick }) => {
  return (
    <div className="min-h-screen bg-white font-inter text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
               I
             </div>
             <span className="font-bold text-xl tracking-tight text-gray-900">Indian AI Coach</span>
          </div>
          <button 
            onClick={onEmailLoginClick}
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition"
          >
            Log in
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
             Powered by Gemini 3 Pro
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
            Your Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Indian Fitness Coach</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Get personalized diet plans with local Indian foods, home workouts, and real-time coaching—all powered by advanced AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
            <button 
              onClick={onGoogleLogin}
              className="flex items-center justify-center gap-3 bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-8 py-4 rounded-xl font-bold shadow-sm transition-all transform hover:-translate-y-1"
            >
              <Chrome className="w-5 h-5 text-red-500" />
              Continue with Google
            </button>
            <button 
              onClick={onEmailLoginClick}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-1"
            >
              Use Email <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            No credit card required. Free preview access.
          </p>

        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
         <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                 { 
                   icon: <Utensils className="w-6 h-6 text-orange-600" />, 
                   title: "Indian Diet Plans", 
                   desc: "Roti, Dal, Idli, Dosa. We prioritize local, home-cooked meals tailored to your macros.",
                   bg: "bg-orange-50" 
                 },
                 { 
                   icon: <Dumbbell className="w-6 h-6 text-blue-600" />, 
                   title: "Home Workouts", 
                   desc: "No gym? No problem. Get effective bodyweight routines customized for your level.",
                   bg: "bg-blue-50"
                 },
                 { 
                   icon: <MessageSquare className="w-6 h-6 text-indigo-600" />, 
                   title: "AI Guru-ji Coach", 
                   desc: "Chat with your AI coach anytime to swap meals, adjust workouts, or get motivation.",
                   bg: "bg-indigo-50"
                 },
                 { 
                   icon: <TrendingUp className="w-6 h-6 text-emerald-600" />, 
                   title: "Smart Tracking", 
                   desc: "Track calories, macros, and workout consistency with beautiful interactive charts.",
                   bg: "bg-emerald-50"
                 }
               ].map((feature, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                      {feature.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
           <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-8">
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Smart analysis for <br />
                    <span className="text-indigo-600">Real Results.</span>
                 </h2>
                 <ul className="space-y-4">
                    {[
                      "Personalized calorie & macro targets",
                      "Visual body type estimation via Gemini Vision",
                      "Daily habit tracking & streaks",
                      "Weekly progress reports"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                        <CheckCircle className="w-5 h-5 text-green-500" /> {item}
                      </li>
                    ))}
                 </ul>
                 <button onClick={onEmailLoginClick} className="text-indigo-600 font-bold hover:underline">
                    Start your journey today &rarr;
                 </button>
              </div>
              
              <div className="flex-1 relative">
                 {/* Abstract UI representation */}
                 <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm mx-auto transform rotate-[-2deg] hover:rotate-0 transition duration-500">
                    <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-3">
                       <div className="w-10 h-10 rounded-full bg-indigo-100"></div>
                       <div className="flex-1">
                          <div className="h-2 w-24 bg-gray-200 rounded mb-1"></div>
                          <div className="h-2 w-16 bg-gray-100 rounded"></div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <div className="h-24 bg-orange-50 rounded-xl border border-orange-100 p-3">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-6 h-6 bg-orange-200 rounded-full"></div>
                             <div className="h-2 w-20 bg-orange-200 rounded"></div>
                          </div>
                          <div className="h-2 w-full bg-orange-100/50 rounded mb-1"></div>
                          <div className="h-2 w-2/3 bg-orange-100/50 rounded"></div>
                       </div>
                       <div className="h-24 bg-blue-50 rounded-xl border border-blue-100 p-3">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-6 h-6 bg-blue-200 rounded-full"></div>
                             <div className="h-2 w-20 bg-blue-200 rounded"></div>
                          </div>
                          <div className="h-2 w-full bg-blue-100/50 rounded mb-1"></div>
                          <div className="h-2 w-2/3 bg-blue-100/50 rounded"></div>
                       </div>
                    </div>
                 </div>
                 
                 {/* Decorative elements */}
                 <div className="absolute top-10 -right-4 w-24 h-24 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
                 <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-orange-400 rounded-full blur-3xl opacity-20"></div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-10 border-t border-gray-100">
         <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm mb-2">
              Made with ❤️ using <span className="font-semibold text-gray-800">Gemini 3 Pro</span>
            </p>
            <p className="text-gray-400 text-xs">
              © {new Date().getFullYear()} Indian AI Fitness Coach. All rights reserved.
            </p>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
