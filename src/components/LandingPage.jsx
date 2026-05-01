import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../landing.css';

/**
 * Landing page for Kirimly — SEO-friendly, neobrutalist design.
 * Headline in English, descriptions in Indonesian.
 */
export default function LandingPage() {
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-in').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing" id="landing-page">
      {/* ── Navbar ── */}
      <nav className="landing-nav" id="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-nav-brand">
            <span className="landing-nav-logo">Kirimly</span>
          </a>
          <Link to="/app" className="landing-nav-cta" id="nav-cta">
            Buka App
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero" id="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bolt</span>
            Peer-to-Peer · Tanpa Upload
          </div>
          <h1 className="hero-title">
            Share Files & Text<br />
            <span className="hero-highlight">Instantly.</span>
          </h1>
          <p className="hero-subtitle">
            Kirim file dan teks langsung antar perangkat — tanpa upload ke server, tanpa instalasi.
            Cukup buka browser di jaringan yang sama.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="hero-cta-primary" id="hero-cta">
              <span className="material-symbols-outlined">rocket_launch</span>
              Mulai Kirim
            </Link>
            <a href="#features" className="hero-cta-secondary" id="hero-learn-more">
              <span className="material-symbols-outlined">expand_more</span>
              Pelajari Lebih
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-icon material-symbols-outlined">lock</span>
              <div>
                <strong>100% Privat</strong>
                <span>Tidak ada data ke server</span>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon material-symbols-outlined">speed</span>
              <div>
                <strong>Transfer Instan</strong>
                <span>Langsung peer-to-peer</span>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon material-symbols-outlined">install_mobile</span>
              <div>
                <strong>Tanpa Install</strong>
                <span>Buka browser, langsung pakai</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-mockup">
            <div className="mockup-window">
              <div className="mockup-titlebar">
                <span className="mockup-dot"></span>
                <span className="mockup-dot"></span>
                <span className="mockup-dot"></span>
                <span className="mockup-url">kirimly.my.id/app</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-card">
                  <div className="mockup-avatar">
                    <span className="material-symbols-outlined">laptop_mac</span>
                  </div>
                  <div className="mockup-card-info">
                    <span className="mockup-card-name">MacBook Pro</span>
                    <span className="mockup-card-detail">macOS • Chrome</span>
                  </div>
                  <div className="mockup-card-status">Tersedia</div>
                </div>
                <div className="mockup-card active">
                  <div className="mockup-avatar phone">
                    <span className="material-symbols-outlined">phone_android</span>
                  </div>
                  <div className="mockup-card-info">
                    <span className="mockup-card-name">Galaxy S24</span>
                    <span className="mockup-card-detail">Android • Firefox</span>
                  </div>
                  <div className="mockup-card-actions">
                    <span className="mockup-btn">File</span>
                    <span className="mockup-btn alt">Teks</span>
                  </div>
                </div>
                <div className="mockup-transfer">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                  <span>photo.jpg</span>
                  <div className="mockup-progress">
                    <div className="mockup-progress-fill"></div>
                  </div>
                  <span className="mockup-percent">73%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="features" ref={featuresRef}>
        <div className="landing-section-inner">
          <h2 className="landing-section-title animate-in">
            <span className="material-symbols-outlined">star</span>
            Why Kirimly?
          </h2>
          <p className="landing-section-subtitle animate-in">
            Berbagi file dan teks semudah drag & drop — aman, cepat, dan tanpa ribet.
          </p>
          <div className="features-grid">
            <div className="feature-card animate-in">
              <div className="feature-icon-wrap">
                <span className="material-symbols-outlined">swap_horiz</span>
              </div>
              <h3>File Transfer</h3>
              <p>Kirim file apapun langsung ke perangkat lain. Drag & drop atau klik untuk memilih file.</p>
            </div>
            <div className="feature-card animate-in">
              <div className="feature-icon-wrap alt">
                <span className="material-symbols-outlined">content_paste</span>
              </div>
              <h3>Share Teks & Clipboard</h3>
              <p>Kirim teks, link, atau konten clipboard instan ke perangkat tujuan. Langsung salin dengan satu klik.</p>
            </div>
            <div className="feature-card animate-in">
              <div className="feature-icon-wrap green">
                <span className="material-symbols-outlined">shield</span>
              </div>
              <h3>Privasi Terjaga</h3>
              <p>Data dikirim langsung antar perangkat (peer-to-peer). Tidak ada yang melewati server — 100% privat.</p>
            </div>
            <div className="feature-card animate-in">
              <div className="feature-icon-wrap yellow">
                <span className="material-symbols-outlined">devices</span>
              </div>
              <h3>Multi-Platform</h3>
              <p>Bekerja di semua perangkat — laptop, HP, tablet. Cukup buka browser, tanpa perlu install apapun.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-steps" id="how-it-works" ref={stepsRef}>
        <div className="landing-section-inner">
          <h2 className="landing-section-title animate-in">
            <span className="material-symbols-outlined">route</span>
            How It Works
          </h2>
          <p className="landing-section-subtitle animate-in">
            Tiga langkah sederhana, tanpa registrasi, tanpa instalasi.
          </p>
          <div className="steps-grid">
            <div className="step-card animate-in">
              <div className="step-number">01</div>
              <div className="step-icon-wrap">
                <span className="material-symbols-outlined">language</span>
              </div>
              <h3>Buka Kirimly</h3>
              <p>Buka <strong>kirimly.my.id</strong> di browser pada semua perangkat yang ingin dihubungkan.</p>
            </div>
            <div className="step-connector animate-in">
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
            <div className="step-card animate-in">
              <div className="step-number">02</div>
              <div className="step-icon-wrap">
                <span className="material-symbols-outlined">radar</span>
              </div>
              <h3>Temukan Perangkat</h3>
              <p>Perangkat di jaringan yang sama terdeteksi otomatis. Tidak perlu pairing manual.</p>
            </div>
            <div className="step-connector animate-in">
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
            <div className="step-card animate-in">
              <div className="step-number">03</div>
              <div className="step-icon-wrap">
                <span className="material-symbols-outlined">send</span>
              </div>
              <h3>Kirim!</h3>
              <p>Pilih file atau ketik teks, lalu kirim langsung. Transfer instan, aman, dan tanpa batas ukuran.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="landing-cta-section" id="landing-cta">
        <div className="landing-section-inner">
          <div className="cta-card animate-in">
            <h2>Ready to Share?</h2>
            <p>Mulai kirim file dan teks sekarang — gratis, tanpa batas, tanpa registrasi.</p>
            <Link to="/app" className="hero-cta-primary" id="bottom-cta">
              <span className="material-symbols-outlined">rocket_launch</span>
              Mulai Kirim Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer" id="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo">Kirimly</span>
            <span className="landing-footer-tagline">Share Files & Text Instantly</span>
          </div>
          <div className="landing-footer-links">
            <Link to="/app">Buka App</Link>
            <a href="#features">Fitur</a>
            <a href="#how-it-works">Cara Kerja</a>
          </div>
          <div className="landing-footer-bottom">
            <p>Ditenagai oleh WebRTC · Peer-to-Peer</p>
            <p>Made with ❤️ by Faizal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
