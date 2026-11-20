import './resume.css';
import { lazy, Suspense, useEffect, useState } from 'react';
const ResumePage = lazy(() => import('../../../client/src/App.jsx'));
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ApplicationsPage from './pages/ApplicationsPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import CreateApplicationPage from './pages/CreateApplicationPage';
import { apiFetch, setCsrf } from './session';
import './shell.css';

type User = { id: number; name: string; email: string };
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    apiFetch('/api/auth/me').then(async r => {
      if (!r.ok) throw new Error('Could not load your session.');
      const data = await r.json(); setUser(data.user); setCsrf(data.csrf_token); setConfigured(data.google_configured);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  async function logout() {
    try {
      const r = await apiFetch('/api/auth/logout', { method: 'POST' });
      if (!r.ok) throw new Error('Could not sign out. Please try again.');
      window.location.assign('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); }
  }
  if (loading) return <main className="welcome" role="status">Loading ApplyPilot…</main>;
  if (!user) return <main className="welcome"><span className="eyebrow">APPLYPILOT / YOUR NEXT CHAPTER</span><h1>A little more prepared.<br/>A lot more you.</h1><p>Keep your applications, tailored resumes, and interview research together.</p>{error && <p role="alert">{error}</p>}{new URLSearchParams(location.search).has('auth_error') && <p role="alert">Google sign-in could not finish. Try again or contact the project administrator if your email already has a local account.</p>}{configured ? <a className="primary" href="/api/auth/google">Continue with Google</a> : <p role="status">Google sign-in needs to be configured by the project administrator.</p>}<p className="muted">Your account is linked to Google. No separate password needed.</p></main>;
  return <BrowserRouter><header className="app-nav"><NavLink className="brand" to="/">ApplyPilot<span>Make your next move.</span></NavLink><nav aria-label="Main navigation"><NavLink to="/" end>Applications</NavLink><NavLink to="/create">Add application</NavLink><NavLink to="/resume">Resume studio</NavLink></nav><div className="account"><span>{user.name}</span><button onClick={logout}>Sign out</button></div></header>{error && <p role="alert">{error}</p>}<Routes><Route path="/" element={<ApplicationsPage/>}/><Route path="/applications/:id" element={<ApplicationDetailPage/>}/><Route path="/create" element={<CreateApplicationPage/>}/><Route path="/resume" element={<div className="resume-workspace"><Suspense fallback={<p role="status">Loading resume studio…</p>}><ResumePage/></Suspense></div>}/><Route path="*" element={<main className="welcome"><h1>Page not found</h1><NavLink to="/">Return to applications</NavLink></main>}/></Routes></BrowserRouter>;
}
