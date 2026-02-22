import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Zap, X, Plus } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

const ACCEPT = '.pdf,application/pdf';
const MAX_SIZE_MB = 5;

// Simple local skill extractor fallback
function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const tokens = text.replace(/[^\w\s]/g, ' ').split(/\s+/).map((t) => t.trim()).filter(Boolean);
  const common = [
    'JavaScript','React','Node','Python','Java','C++','C#','PHP','Ruby','Go','Rust','TypeScript','HTML','CSS','SQL','MongoDB','PostgreSQL','MySQL','AWS','Azure','GCP','Docker','Kubernetes','Git','GraphQL','TensorFlow','PyTorch'
  ];
  const found = Array.from(new Set(tokens.map(t=>t.toLowerCase()).filter(t=>common.includes(t)))).slice(0,10);
  return found.map(s => ({ name: s }));
}

export default function ResumeAndTest() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [resumeResult, setResumeResult] = useState(null);
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');

  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');

  const [step, setStep] = useState(1);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    setResumeError('');
    if (!selected) return setFile(null);
    if (selected.type !== 'application/pdf') {
      setResumeError('Please select a PDF file.');
      return setFile(null);
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setResumeError(`File must be under ${MAX_SIZE_MB} MB.`);
      return setFile(null);
    }
    setFile(selected);
  }

  async function handleUploadResume() {
    if (!file) return;
    setResumeError('');
    setResumeLoading(true);
    setSaveMsg('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await api.post('/resume/upload', formData, { headers: { 'Content-Type': undefined } });
      setResumeResult(data);

      // Prefer server-provided skills, otherwise local extraction
      const skillsFromServer = data.skills && Array.isArray(data.skills) ? data.skills : null;
      const local = extractSkillsFromText(data.text);
      const skills = skillsFromServer && skillsFromServer.length > 0
        ? skillsFromServer.map(s => (typeof s === 'string' ? { name: s } : { name: s.name || String(s) }))
        : local;

      setExtractedSkills(skills);
      setQuizError('');
      setStep(2);

      // Auto-start quiz generation using extracted skills; if server generation fails, fall back to client-side generator
      setQuizLoading(true);
      try {
        await handleStartQuiz(skills);
      } catch (e) {
        // fallback: generate simple local questions so test always starts
        const localGen = (skillObjs, n) => {
          const names = skillObjs.map((s) => (s.name ? s.name : String(s)));
          const qs = [];
          let i = 0;
          while (qs.length < n) {
            const skill = names[i % names.length];
            qs.push({
              id: qs.length,
              question: `What is ${skill} primarily used for?`,
              options: [`Web development with ${skill}`, `Database management`, `System programming`, `Mobile apps`],
              correctAnswer: `Web development with ${skill}`,
              skill,
            });
            i += 1;
          }
          return qs.slice(0, n);
        };

        const fallbackQuestions = localGen(skills, numQuestions);
        navigate('/test', { state: { questions: fallbackQuestions } });
        return;
      } finally {
        setQuizLoading(false);
      }
    } catch (err) {
      setResumeError(err.response?.data?.error ?? 'Upload failed. Please try again.');
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleStartQuiz(skillsParam) {
    const skillsToSend = Array.isArray(skillsParam) && skillsParam.length > 0 ? skillsParam : extractedSkills;
    if (!skillsToSend || skillsToSend.length === 0) {
      setQuizError('Please upload resume and extract skills first.');
      return;
    }
    setQuizLoading(true);
    setQuizError('');
    try {
      const bodySkills = skillsToSend.map(s => (s.name ? s.name : String(s)));
      const { data } = await api.post('/quiz/generate', { numQuestions: parseInt(numQuestions), difficulty, skills: bodySkills });
      navigate('/test', { state: { questions: data.questions } });
    } catch (err) {
      setQuizError(err.response?.data?.error || 'Failed to generate quiz');
      setQuizLoading(false);
      throw err;
    }
  }

  function removeSkill(name) {
    setExtractedSkills(prev => prev.filter(s => s.name !== name));
  }

  function addSkill(value) {
    const v = String(value).trim();
    if (!v) return;
    setExtractedSkills(prev => [{ name: v }, ...prev]);
  }

  async function handleSaveSkills() {
    try {
      setSaveMsg('');
      const body = extractedSkills.map(s => (s.name ? s.name : String(s)));
      const { data } = await api.post('/resume/save-skills', { skills: body });
      setSaveMsg('Saved');
    } catch (err) {
      setSaveMsg(err.response?.data?.error || 'Save failed');
    }
  }

  function handleReset() {
    setFile(null);
    setResumeResult(null);
    setExtractedSkills([]);
    setResumeError('');
    setStep(1);
    setSaveMsg('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <DashboardLayout role="candidate">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                1
              </motion.div>
              <div className={`h-1 w-24 mx-3 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`} />
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                2
              </motion.div>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Upload Resume</span>
            <span className="text-slate-300">Take Test</span>
          </div>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-slate-800 rounded-lg border border-slate-700 p-8">
            <div className="text-center mb-8">
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Upload Your Resume</h2>
              <p className="text-slate-400">We'll analyze your resume and generate a personalized test based on your skills</p>
            </div>

            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition">
                <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFileChange} disabled={resumeLoading} className="hidden" id="resume-input" />
                <label htmlFor="resume-input" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 mb-1">{file ? file.name : 'Click to upload or drag and drop'}</p>
                  <p className="text-xs text-slate-500">PDF up to 5 MB</p>
                </label>
              </div>

              {resumeError && <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">{resumeError}</div>}

              <div className="flex gap-3">
                <button onClick={handleUploadResume} disabled={!file || resumeLoading} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50">{resumeLoading ? 'Uploading...' : 'Upload Resume'}</button>
                {file && <button onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} disabled={resumeLoading} className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg">Clear</button>}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-900/30 border border-green-500/50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Resume Uploaded Successfully</h3>
                  <p className="text-sm text-slate-400 mb-3">{resumeResult?.filename}</p>

                  {extractedSkills && extractedSkills.length > 0 ? (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Detected Skills:</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {extractedSkills.map((s) => (
                          <div key={s.name} className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/50 text-blue-300 text-xs rounded-md px-2 py-1">
                            <span>{s.name}</span>
                            <button onClick={() => removeSkill(s.name)} className="p-1 rounded hover:bg-blue-800"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <input id="add-skill" placeholder="Add skill" onKeyDown={(e) => { if (e.key === 'Enter') { addSkill(e.target.value); e.target.value=''; } }} className="px-2 py-1 rounded bg-slate-700 text-sm text-slate-200" />
                          <button onClick={(e) => { const el = document.getElementById('add-skill'); addSkill(el?.value); if (el) el.value=''; }} className="px-2 py-1 bg-slate-700 rounded text-sm">Add</button>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-3">
                        <button onClick={handleSaveSkills} className="px-4 py-2 bg-green-600 text-white rounded">Save Skills</button>
                        {saveMsg && <span className="text-sm text-slate-300">{saveMsg}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No skills detected.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl font-bold text-white">Configure Your Test</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Number of Questions</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[5,10,20].map(num => (
                      <button key={num} onClick={() => setNumQuestions(num)} className={`py-3 rounded-lg font-semibold ${numQuestions===num ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{num} Questions</button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Estimated time: {numQuestions * 1.5} minutes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[{value:'beginner',label:'Beginner'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}].map(level => (
                      <button key={level.value} onClick={() => setDifficulty(level.value)} className={`py-3 rounded-lg font-semibold ${difficulty===level.value ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{level.label}</button>
                    ))}
                  </div>
                </div>

                {quizError && <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">{quizError}</div>}

                <div className="flex gap-3 pt-4">
                  <button onClick={() => handleStartQuiz()} disabled={quizLoading} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50">{quizLoading ? 'Generating...' : 'Start Test'}</button>
                  <button onClick={handleReset} disabled={quizLoading} className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg">Back</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
