'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SolvioLogo } from '@/components/SolvioLogo';
import { Zap, Users, FileText, CheckCircle, XCircle, ChevronDown, Mail, Twitter, ArrowRight, Menu, X } from 'lucide-react';

const SLIDES = [
  {
    url: '/slide1.jpg',
    alt: 'Friends splitting a restaurant bill with phones',
  },
  {
    url: '/slide2.jpg',
    alt: 'Street market vendor accepting mobile payment via QR code',
  },
  {
    url: '/slide4.jpg',
    alt: 'Freelancer working on invoice in a cafe',
  },
  {
    url: '/slide5.jpg',
    alt: 'Solana payment confirmed on mobile phone',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Request Payment',
    desc: 'Generate a payment link or QR code in seconds. Your client pays with one tap via Phantom. No signup, no bank account.',
    color: 'text-primary-600',
    bg: 'bg-primary-50',
  },
  {
    icon: Users,
    title: 'Split the Bill',
    desc: 'Add your friends, enter amounts, send all payments simultaneously. Watch live status per person — confirmed instantly.',
    color: 'text-secondary-600',
    bg: 'bg-secondary-50',
  },
  {
    icon: FileText,
    title: 'PDF Receipts',
    desc: 'Every transaction generates a professional PDF receipt. Download instantly or share via WhatsApp and email in one tap.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

const COMPARE = [
  { feature: 'No hardware needed', solvio: true, solsplit: true, soltap: false, now: true },
  { feature: 'Works at dinner table', solvio: true, solsplit: false, soltap: false, now: false },
  { feature: 'Mobile-first PWA', solvio: true, solsplit: false, soltap: false, now: false },
  { feature: 'Direct wallet-to-wallet', solvio: true, solsplit: false, soltap: true, now: true },
  { feature: 'PDF receipt', solvio: true, solsplit: false, soltap: false, now: false },
  { feature: 'Split + request + receipt', solvio: true, solsplit: false, soltap: false, now: false },
  { feature: 'Zero setup for merchant', solvio: true, solsplit: false, soltap: false, now: false },
  { feature: 'Works offline (soon)', solvio: true, solsplit: false, soltap: false, now: false },
];

function Tick({ value }: { value: boolean }) {
  return value
    ? <CheckCircle className="text-green-500 mx-auto" size={20} />
    : <XCircle className="text-gray-300 mx-auto" size={20} />;
}

function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#why', label: 'Why Solvio' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <SolvioLogo size={32} wordmarkColor={scrolled ? 'text-gray-900' : 'text-white'} />

        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className={`text-sm font-medium hover:text-primary-400 transition-colors ${scrolled ? 'text-gray-700' : 'text-white/90'}`}>
              {l.label}
            </a>
          ))}
          <Link href="/request"
            className="bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm">
            Launch App
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open
            ? <X className={scrolled ? 'text-gray-700' : 'text-white'} size={22} />
            : <Menu className={scrolled ? 'text-gray-700' : 'text-white'} size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 space-y-1">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block py-3 px-3 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                {l.label}
              </a>
            ))}
            <Link href="/request" onClick={() => setOpen(false)}
              className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white font-bold px-5 py-3 rounded-xl transition-colors mt-2">
              Launch App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setCurrent(c => (c + 1) % SLIDES.length), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current]);

  return (
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {SLIDES.map((slide, i) => {
        const isLast = i === SLIDES.length - 1;
        return (
          <div key={i} className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: current === i ? 1 : 0 }}>
            <img
              src={slide.url}
              alt={slide.alt}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              style={isLast ? { filter: 'blur(1px)', transform: 'scale(1.015)' } : undefined}
            />
            {/* Extra dark overlay for last slide so image text doesn't compete with headline */}
            {isLast && (
              <div className="absolute inset-0 bg-primary-900/65" />
            )}
          </div>
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/70 to-secondary-900/75" />

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="mb-6 flex justify-center">
          <SolvioLogo size={52} showWordmark={false} />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
          The Solana Payment App<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-secondary-300">
            for the Real World
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-xl mx-auto leading-relaxed">
          Request payments, split bills and send receipts — directly from your phone.
          No setup. No bank. Just Solana.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/request"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 active:scale-95 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-primary-900/30">
            Launch App <ArrowRight size={20} />
          </Link>
          <a href="#features"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all border border-white/30">
            Learn More <ChevronDown size={20} />
          </a>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${current === i ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`} />
          ))}
        </div>
      </div>

      <a href="#features"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce">
        <ChevronDown size={28} />
      </a>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Features</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Everything you need</h2>
          <p className="mt-3 text-gray-500 max-w-lg mx-auto text-lg">Solvio handles payments, splits and receipts — all in one mobile-first app.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-5`}>
                <Icon className={color} size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhySolvioSection() {
  return (
    <section id="why" className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="bg-secondary-100 text-secondary-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Comparison</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Built different. Built for real life.</h2>
          <p className="mt-3 text-gray-500 max-w-lg mx-auto text-lg">See how Solvio compares to other Solana payment tools.</p>
        </div>

        <div className="overflow-x-auto rounded-3xl shadow-sm border border-gray-200">
          <table className="w-full bg-white min-w-[520px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-5 px-6 text-left text-sm font-semibold text-gray-500 w-52">Feature</th>
                <th className="py-5 px-4 text-center bg-primary-50 border-x border-primary-100">
                  <div className="flex flex-col items-center gap-1">
                    <SolvioLogo size={22} showWordmark={false} />
                    <span className="text-sm font-extrabold text-primary-700">Solvio</span>
                  </div>
                </th>
                <th className="py-5 px-4 text-center text-sm font-semibold text-gray-400">SolSplit</th>
                <th className="py-5 px-4 text-center text-sm font-semibold text-gray-400">SolTap</th>
                <th className="py-5 px-4 text-center text-sm font-semibold text-gray-400">NOWPayments</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={row.feature} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="py-4 px-6 text-sm text-gray-700 font-medium">{row.feature}</td>
                  <td className="py-4 px-4 text-center bg-primary-50/60 border-x border-primary-100"><Tick value={row.solvio} /></td>
                  <td className="py-4 px-4 text-center"><Tick value={row.solsplit} /></td>
                  <td className="py-4 px-4 text-center"><Tick value={row.soltap} /></td>
                  <td className="py-4 px-4 text-center"><Tick value={row.now} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    const subject = `Message from ${form.name} via Solvio`;
    const body = `From: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.open(`mailto:hello@solviopay.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setSent(true);
    setForm({ name: '', email: '', message: '' });
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="contact" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Contact</span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Get in touch</h2>
          <p className="mt-3 text-gray-500 max-w-md mx-auto text-lg">Questions, feedback or just want to say hello? We're here.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <a href="mailto:hello@solviopay.app"
              className="flex items-center gap-4 p-5 bg-gray-50 hover:bg-primary-50 rounded-2xl transition-colors border border-transparent hover:border-primary-100">
              <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Email</p>
                <p className="text-primary-600 font-bold text-lg">hello@solviopay.app</p>
              </div>
            </a>
            <a href="https://twitter.com/solviopay" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-colors border border-transparent hover:border-blue-100">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Twitter className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Twitter / X</p>
                <p className="text-blue-500 font-bold text-lg">@solviopay</p>
              </div>
            </a>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl border border-primary-100">
                <span className="text-2xl">◎</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Built on Solana</p>
                  <p className="text-xs text-gray-500">Fast, low-fee, wallet-to-wallet payments</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Superteam Georgia Hackathon</p>
                  <p className="text-xs text-gray-500">Version 1.0 MVP · Built for real life</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-3xl p-7 space-y-5 border border-gray-100">
            {sent && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-xl px-4 py-3">
                ✅ Message sent! We'll get back to you soon.
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Name</label>
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-3 focus:outline-none transition-colors bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-3 focus:outline-none transition-colors bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Message</label>
              <textarea required rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Tell us what's on your mind…"
                className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-3 focus:outline-none transition-colors bg-white resize-none" />
            </div>
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all">
              <Mail size={17} /> Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-white py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          <div className="space-y-3">
            <SolvioLogo size={36} wordmarkColor="text-white" />
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              The Solana Payment Hub for the real world. Request, split and receipt — all in one tap.
            </p>
          </div>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Navigation</p>
            <div className="space-y-2">
              {[['#home', 'Home'], ['#features', 'Features'], ['#why', 'Why Solvio'], ['#contact', 'Contact']].map(([href, label]) => (
                <a key={href} href={href}
                  className="block text-gray-300 hover:text-white transition-colors text-sm">{label}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Recognition</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300"><span>◎</span> Built on Solana</div>
              <div className="flex items-center gap-2 text-sm text-gray-300"><span>🏆</span> Superteam Georgia Hackathon</div>
              <div className="flex items-center gap-2 text-sm text-gray-300"><span>📱</span> Mobile-First PWA</div>
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Solvio · Version 1.0 MVP</p>
          <div className="flex items-center gap-4">
            <a href="mailto:hello@solviopay.app" className="hover:text-white transition-colors">hello@solviopay.app</a>
            <a href="https://twitter.com/solviopay" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@solviopay</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="font-sans antialiased">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <WhySolvioSection />
      <ContactSection />
      <LandingFooter />
    </div>
  );
}
