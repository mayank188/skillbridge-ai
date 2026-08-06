import { useState, useRef } from 'react';
import api from '../lib/axios';

const ACCEPT = '.pdf,application/pdf';
const MAX_SIZE_MB = 5;

// Broad list of common tech skills for local detection.
const KNOWN_SKILLS = [
  'javascript','typescript','react','react native','vue','vuejs','angular','svelte',
  'nextjs','next.js','html','html5','css','css3','scss','sass','less','tailwind',
  'tailwind css','tailwindcss','bootstrap','material ui','redux','webpack','vite','babel',
  'jquery','graphql','node','node.js','nodejs','express','express.js','python','django',
  'flask','fastapi','java','spring','spring boot','c','c++','c#','csharp','.net','asp.net',
  'php','laravel','ruby','rails','ruby on rails','go','golang','rust','kotlin','swift','rest',
  'rest api','restful','microservices','sql','mysql','postgresql','postgres','mongodb','mongo',
  'redis','sqlite','mariadb','dynamodb','elasticsearch','firebase','prisma','sequelize',
  'typeorm','mongoose','aws','amazon web services','azure','gcp','google cloud','docker',
  'kubernetes','terraform','ansible','jenkins','github actions','ci/cd','linux','ubuntu',
  'bash','shell','nginx','apache','prometheus','grafana','cloud computing','git','github',
  'gitlab','jira','postman','swagger','vscode','visual studio code','intellij','tensorflow',
  'pytorch','keras','scikit-learn','pandas','numpy','machine learning','data science',
  'deep learning','nlp','natural language processing','computer vision','excel','agile',
  'scrum','unit testing','jest','mocha','cypress','selenium'
];

/**
 * Extract known technical skills from resume text (case-insensitive, multi-word aware).
 */
function extractKeyTerms(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = ` ${text.toLowerCase()} `;
  const found = [];
  const seen = new Set();
  const sorted = [...KNOWN_SKILLS].sort((a, b) => b.length - a.length);
  for (const skill of sorted) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.##]|$)`, 'i');
    if (re.test(lower)) {
      const key = skill.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(skill);
      if (found.length >= 24) break;
    }
  }
  return found;
}

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    setError('');
    setResult(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB.`);
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await api.post('/resume/upload', formData);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const keyTerms = result?.text ? extractKeyTerms(result.text) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-800 mb-4">Resume upload</h2>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Choose PDF
          </label>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
          {(file || result) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-gray-600">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Extracting text from PDF...</span>
        </div>
      )}

      {error && (
        <div
          className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {result.filename} · {result.pages} page{result.pages !== 1 ? 's' : ''}
          </p>

          {keyTerms.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Extracted skills / key terms
              </h3>
              <div className="flex flex-wrap gap-2">
                {keyTerms.map((term) => (
                  <span
                    key={term}
                    className="px-2.5 py-1 bg-gray-100 text-gray-800 text-sm rounded-md"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Extracted text
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                {result.text || 'No text extracted.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
