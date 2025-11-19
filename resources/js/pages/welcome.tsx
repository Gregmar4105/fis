import { dashboard, login } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { 
    Plane, 
    Calendar, 
    MapPin, 
    Clock, 
    Shield, 
    BarChart3,
    Users,
    Settings,
    ArrowRight,
    CheckCircle2
} from 'lucide-react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    const features = [
        {
            icon: Calendar,
            title: 'Flight Schedules',
            description: 'Real-time flight schedules for arrivals, departures, and connections',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        },
        {
            icon: Plane,
            title: 'Flight Management',
            description: 'Comprehensive CRUD operations for managing flight operations',
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        },
        {
            icon: Clock,
            title: 'Quick Updates',
            description: 'Rapid status updates for gates, baggage belts, and flight status',
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-950/20',
        },
        {
            icon: MapPin,
            title: 'Resource Management',
            description: 'Manage terminals, gates, and baggage belts efficiently',
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-950/20',
        },
        {
            icon: Shield,
            title: 'Secure & Reliable',
            description: 'Enterprise-grade security with role-based access control',
            color: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
        },
        {
            icon: BarChart3,
            title: 'Analytics Dashboard',
            description: 'Comprehensive insights and statistics for flight operations',
            color: 'text-cyan-600 dark:text-cyan-400',
            bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
        },
    ];

    const benefits = [
        'Real-time flight tracking and updates',
        'Integrated terminal and gate management',
        'Automated baggage belt assignments',
        'Connection flight management',
        'Comprehensive reporting and analytics',
        'Multi-airport support',
    ];

    return (
        <>
            <Head title="Flight Information System">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=inter:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
                {/* Navigation */}
                <nav className="border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500">
                                    <Plane className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">FIS</h1>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Flight Information System</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                            >
                                        <BarChart3 className="w-4 h-4" />
                                Dashboard
                            </Link>
                        ) : (
                                <Link
                                    href={login()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                                >
                                        Log In
                                </Link>
                                )}
                            </div>
                        </div>
                    </div>
                    </nav>

                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
                    <div className="absolute inset-0 opacity-30 dark:opacity-20 -z-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.15) 1px, transparent 0)`,
                            backgroundSize: '20px 20px'
                        }}></div>
                    </div>
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
                                <Plane className="w-4 h-4" />
                                <span>Professional Flight Information Management</span>
                            </div>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                Flight Information
                                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    System
                                </span>
                            </h1>
                            <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                                Comprehensive flight operations management platform for modern airports.
                                Track, manage, and optimize your flight operations with real-time updates and intelligent resource allocation.
                            </p>
                            {auth.user && (
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                                    <Link
                                        href={dashboard()}
                                        className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                                    >
                                        Go to Dashboard
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                                Powerful Features
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                                Everything you need to manage flight operations efficiently
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <div
                                        key={index}
                                        className={`group relative p-6 rounded-2xl ${feature.bgColor} border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                                    >
                                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bgColor} ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                            {feature.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {feature.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                                    Why Choose FIS?
                                </h2>
                                <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                                    Our Flight Information System provides comprehensive solutions for modern airport operations,
                                    ensuring efficiency, accuracy, and seamless integration with your existing infrastructure.
                                </p>
                                <ul className="space-y-4">
                                    {benefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                            <span className="text-lg text-slate-700 dark:text-slate-300">{benefit}</span>
                                </li>
                                    ))}
                            </ul>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl blur-3xl"></div>
                                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                            <Calendar className="w-8 h-8 text-white mb-3" />
                                            <div className="text-3xl font-bold text-white mb-1">24/7</div>
                                            <div className="text-white/80 text-sm">Real-time Updates</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                            <Users className="w-8 h-8 text-white mb-3" />
                                            <div className="text-3xl font-bold text-white mb-1">100%</div>
                                            <div className="text-white/80 text-sm">Reliability</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                            <Settings className="w-8 h-8 text-white mb-3" />
                                            <div className="text-3xl font-bold text-white mb-1">Fast</div>
                                            <div className="text-white/80 text-sm">Performance</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                            <Shield className="w-8 h-8 text-white mb-3" />
                                            <div className="text-3xl font-bold text-white mb-1">Secure</div>
                                            <div className="text-white/80 text-sm">Enterprise</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                                    <Plane className="w-6 h-6 text-white" />
                                </div>
                                <div className="font-bold text-slate-900 dark:text-white text-lg">Flight Information System</div>
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                © 2025 AVIATORS. All rights reserved.
                            </div>
                        </div>
                </div>
                </footer>
            </div>
        </>
    );
}
