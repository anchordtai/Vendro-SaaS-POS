"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const businessTypes = [
    {
      icon: "💊",
      title: "Pharmacy",
      description: "Track expiry dates, manage prescriptions, and ensure compliance with medical regulations.",
      features: ["Expiry tracking", "Batch management", "Prescription mode", "Low stock alerts"]
    },
    {
      icon: "🍸",
      title: "Hotel Bar",
      description: "Manage tabs, track staff sales, and handle age verification for alcoholic beverages.",
      features: ["Open tabs", "Fast checkout", "Age verification", "Table management"]
    },
    {
      icon: "🎵",
      title: "Nightclub",
      description: "Process high-volume sales quickly, manage cover charges, and handle VIP customer management.",
      features: ["Fast checkout", "Cover charges", "VIP management", "Staff tracking"]
    },
    {
      icon: "🛒",
      title: "Grocery Store",
      description: "Scan barcodes, manage bulk inventory, and organize products by categories efficiently.",
      features: ["Barcode scanning", "Bulk inventory", "Category management", "Weight-based pricing"]
    },
    {
      icon: "🏪",
      title: "Retail Store",
      description: "Handle customer loyalty programs, manage returns, and implement seasonal pricing strategies.",
      features: ["Barcode scanning", "Loyalty programs", "Returns management", "Promotions"]
    }
  ];

  const features = [
    {
      icon: "🛒",
      title: "Smart Inventory Management",
      description: "Real-time stock tracking, automated reordering, and intelligent forecasting to never run out of popular items."
    },
    {
      icon: "📊",
      title: "Advanced Analytics",
      description: "Deep insights into sales patterns, customer behavior, and product performance with customizable reports."
    },
    {
      icon: "👥",
      title: "Multi-User Support",
      description: "Role-based access control, staff performance tracking, and seamless shift management."
    },
    {
      icon: "🔒",
      title: "Secure & Compliant",
      description: "Bank-level security, data encryption, and compliance with industry regulations including medical standards."
    },
    {
      icon: "📈",
      title: "Scalable Growth",
      description: "From single store to multi-location empire. Vendro grows with your business without missing a beat."
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description: "Optimized for speed and reliability. Process sales in seconds, even during peak hours."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          transform: `translateY(${scrollY * 0.5}px)`
        }} />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-black/20 backdrop-blur-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-purple-900 font-bold">V</span>
              </div>
              <span className="text-white font-bold text-xl">Vendro</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-white/80 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#industries" className="text-white/80 hover:text-white transition-colors">
                Industries
              </Link>
              <Link href="/pricing" className="text-white/80 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-white/80 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-white text-purple-900 rounded-lg hover:bg-purple-50 transition-all font-semibold"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white"
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden bg-black/20 backdrop-blur-lg rounded-lg mt-2 p-4">
              <div className="flex flex-col space-y-4">
                <Link href="#features" className="text-white/80 hover:text-white transition-colors">
                  Features
                </Link>
                <Link href="#industries" className="text-white/80 hover:text-white transition-colors">
                  Industries
                </Link>
                <Link href="/pricing" className="text-white/80 hover:text-white transition-colors">
                  Pricing
                </Link>
                <Link href="/login" className="text-white/80 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-white text-purple-900 rounded-lg hover:bg-purple-50 transition-all font-semibold text-center"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              One POS for Every Business
            </h1>
            <p className="text-2xl md:text-3xl text-purple-200 mb-4">
              From Pharmacies to Nightclubs
            </p>
            <p className="text-lg text-purple-300 max-w-3xl mx-auto">
              Vendro adapts to your industry with specialized features, intelligent automation, and seamless multi-location management.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-purple-900 font-bold rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Start Free Trial</span>
              <span>→</span>
            </Link>
            <button className="px-8 py-4 bg-white/20 backdrop-blur-lg border-2 border-white/30 font-semibold rounded-xl hover:bg-white/30 transition-all flex items-center justify-center space-x-2">
              <span>▶</span>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Product Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg border-2 border-white/20 rounded-2xl p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="font-semibold mb-1">Real-time Analytics</h3>
                  <p className="text-sm text-purple-200">Track sales, inventory, and performance</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl mb-2">🏪</div>
                  <h3 className="font-semibold mb-1">Multi-Location</h3>
                  <p className="text-sm text-purple-200">Manage all your outlets from one dashboard</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-semibold mb-1">Lightning Fast</h3>
                  <p className="text-sm text-purple-200">Process sales in seconds, not minutes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for Your Industry
            </h2>
            <p className="text-xl text-purple-200 max-w-3xl mx-auto">
              Specialized features that understand your unique business needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {businessTypes.map((type, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg border-2 border-white/20 rounded-2xl p-6 hover:scale-105 transition-all duration-300">
                <div className="text-4xl mb-4">{type.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{type.title}</h3>
                <p className="text-purple-200 mb-4">{type.description}</p>
                <ul className="space-y-2">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <span className="text-green-400">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features for Modern Business
            </h2>
            <p className="text-xl text-purple-200 max-w-3xl mx-auto">
              Everything you need to run your business efficiently, nothing you don't
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-purple-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start Selling Smarter Today
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Join the businesses that have already transformed their operations with Vendro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-purple-900 font-bold rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Start Your 14-Day Free Trial</span>
              <span>→</span>
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white/20 backdrop-blur-lg border-2 border-white/30 font-semibold rounded-xl hover:bg-white/30 transition-all"
            >
              View Pricing Plans
            </Link>
          </div>
          <p className="mt-6 text-purple-300 text-sm">
            No credit card required • Cancel anytime • Full access to all features
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-lg border-t border-white/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-purple-900 font-bold">V</span>
                </div>
                <span className="text-white font-bold text-xl">Vendro</span>
              </div>
              <p className="text-purple-300 text-sm">
                The intelligent POS platform that adapts to your business.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#industries" className="hover:text-white transition-colors">Industries</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-purple-300 text-sm">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">System Status</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Contact Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-purple-300 text-sm">
            <p>&copy; 2024 Vendro. All rights reserved. | 
              <Link href="/privacy" className="hover:text-white transition-colors ml-2">Privacy Policy</Link> | 
              <Link href="/terms" className="hover:text-white transition-colors ml-2">Terms of Service</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
