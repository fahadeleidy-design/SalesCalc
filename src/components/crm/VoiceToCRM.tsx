import { useState } from 'react';
import {
    Mic,
    Square,
    RotateCcw,
    Sparkles,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoiceToCRM() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [identifiedFields, setIdentifiedFields] = useState<Record<string, string>>({});

    const startRecording = () => {
        setIsRecording(true);
        toast.success('Listening... Start speaking your notes.');
        // Simulated speech detection start
    };

    const stopRecording = () => {
        setIsRecording(false);
        setIsProcessing(true);

        // Simulate AI processing of the voice note
        setTimeout(() => {
            setTranscript("Customer is interested in the Enterprise plan next quarter. Budget is around 150k. Needs integration with SAP.");
            setIdentifiedFields({
                'Next Action': 'Send SAP Integration Docs',
                'Timeline': 'Q3 2026',
                'Budget Estimate': '$150,000',
                'Key Interest': 'Enterprise Support'
            });
            setIsProcessing(false);
        }, 2000);
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden font-inter shadow-xl max-w-2xl mx-auto border-t-4 border-t-indigo-600">
            <div className="p-8 text-center bg-slate-50/50 border-b border-slate-100">
                <div className="bg-white px-4 py-1 rounded-full border border-slate-200 w-fit mx-auto mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Mobile Enablement</span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Voice-to-CRM Capture</h3>
                <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto"> Dictate your meeting notes and let AI parse them into fields automatically.</p>

                <div className="mt-10 relative">
                    {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-32 w-32 bg-indigo-100 rounded-full animate-ping opacity-20" />
                        </div>
                    )}

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-indigo-600 shadow-indigo-600/40' : 'bg-white border-2 border-slate-100 hover:border-indigo-600 text-slate-400 hover:text-indigo-600'
                            }`}
                    >
                        {isRecording ? (
                            <Square className="h-8 w-8 text-white fill-current" />
                        ) : (
                            <Mic className="h-10 w-10" />
                        )}
                    </button>

                    <p className="mt-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                        {isRecording ? 'Recording in progress...' : 'Click to dictate notes'}
                    </p>
                </div>
            </div>

            {(transcript || isProcessing) && (
                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transcript Output</h4>
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                        </div>

                        {isProcessing ? (
                            <div className="flex items-center gap-3 text-slate-400 italic text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                AI is parsing sentiment and fields...
                            </div>
                        ) : (
                            <p className="text-slate-700 font-bold leading-relaxed">{transcript}</p>
                        )}
                    </div>

                    {!isProcessing && Object.keys(identifiedFields).length > 0 && (
                        <div className="space-y-4 pt-8 border-t border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Identified Key Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(identifiedFields).map(([key, value]) => (
                                    <div key={key} className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 group hover:border-indigo-300 transition-colors">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">{key}</p>
                                        <p className="text-sm font-black text-indigo-900 group-hover:scale-105 transition-transform origin-left">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isProcessing && (
                        <div className="flex gap-4 pt-8 border-t border-slate-100">
                            <button className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Save to CRM Record
                            </button>
                            <button
                                onClick={() => setTranscript('')}
                                className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                                <RotateCcw className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
