import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { AppleBarChart, AppleWebChart, AppleBarChartDark, AppleWebChartDark } from '../components/ui/AppleStyleCharts';
import { Table } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Progress from '../components/ui/Progress';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Server } from '../Constants';
import axios from 'axios';
import { motion, useAnimation } from 'framer-motion';
import DashboardHeader from '../components/DashboardHeader';
import { BUSINESS_TARGET } from '../config/constants';

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);

      if (progress < 1) {
        setCount(Math.floor(value * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count}</>;
};

// Animated Network Background Component
const NetworkBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)'; // sky-400
        ctx.fill();
      }
    }

    // Create particles
    const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.4 }}
    />
  );
};

const HODDashboardPage = () => {
  const { currentUser, getCurrentDepartment, isAdmin } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChartModal, setShowChartModal] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('[HOD Dashboard] Starting to fetch dashboard data...');
        setLoading(true);
        setError(null);
        
        // Get current department ID
        const currentDepartment = getCurrentDepartment();
        console.log('[HOD Dashboard] Current department:', currentDepartment);
        console.log('[HOD Dashboard] Is admin:', isAdmin());
        
        if (!currentDepartment && !isAdmin()) {
          console.log('[HOD Dashboard] No department selected and not admin');
          const errorMsg = "No department selected. Please select a department first.";
          setError(errorMsg);
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Use current department ID
        const departmentId = currentDepartment?._id;
        
        if (!departmentId) {
          const errorMsg = "Department ID not found. Please contact support.";
          setError(errorMsg);
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log('[HOD Dashboard] Fetching data for department ID:', departmentId);
        
        // Fetch dashboard data from API
        const response = await axios.get(
          `${Server}/hod-dashboard/${departmentId}`,
          { withCredentials: true }
        );

        console.log('[HOD Dashboard] API Response:', response.data);

        if (response.data.success) {
          setDashboardData(response.data.data);
          console.log('[HOD Dashboard] Dashboard data loaded successfully');
        } else {
          throw new Error(response.data.message || 'Failed to fetch dashboard data');
        }
        
      } catch (error) {
        console.error('[HOD Dashboard] Error fetching dashboard data:', error);
        const errorMsg = error.response?.data?.message || error.message || "Failed to load dashboard data";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, getCurrentDepartment, isAdmin, toast]);

  // Remove global body background image only on this page and restore on exit
  useEffect(() => {
    const prevBgImage = document.body.style.backgroundImage;
    const prevBgAttachment = document.body.style.backgroundAttachment;
    const prevBgPosition = document.body.style.backgroundPosition;
    const prevBgRepeat = document.body.style.backgroundRepeat;
    const prevBgSize = document.body.style.backgroundSize;

    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundAttachment = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundSize = '';

    return () => {
      document.body.style.backgroundImage = prevBgImage;
      document.body.style.backgroundAttachment = prevBgAttachment;
      document.body.style.backgroundPosition = prevBgPosition;
      document.body.style.backgroundRepeat = prevBgRepeat;
      document.body.style.backgroundSize = prevBgSize;
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && showChartModal) {
        setShowChartModal(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [showChartModal]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'passive': return 'warning';
      case 'promoter': return 'success';
      case 'detractor': return 'danger';
      default: return 'default';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-slate-200 border-t-slate-900 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg font-light tracking-wide">Loading Dashboard</p>
        </motion.div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-md mx-auto px-6"
          >
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light text-slate-800 mb-3">Unable to Load Dashboard</h2>
            <p className="text-slate-600 mb-6">{error || "No data available. Please try again later."}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-light"
            >
              Reload Page
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Navigation Header */}
      <DashboardHeader />
      
      {/* Premium Animated Background with Network */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
        
        {/* Animated Network Canvas */}
        <NetworkBackground />
        
        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-r from-sky-500/5 to-blue-500/5 rounded-full blur-3xl"
        ></motion.div>
        
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gradient-to-r from-violet-500/5 to-purple-500/5 rounded-full blur-3xl"
        ></motion.div>
        
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl"
        ></motion.div>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(56,189,248,0.05),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(167,139,250,0.05),transparent_50%),radial-gradient(circle_at_40%_20%,rgba(59,130,246,0.03),transparent_40%)]"></div>
      </div>
      
      {/* Premium Header with Department Info */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-12 pb-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 backdrop-blur-sm border border-sky-400/20">
                  <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
                    Performance Analytics
                  </h1>
                  <p className="text-sm text-slate-400 mt-1 font-medium">{(getCurrentDepartment()?.name || 'Department').toUpperCase()} Dashboard</p>
                </div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-base text-slate-400 max-w-2xl leading-relaxed"
              >
                Comprehensive insights into your department's customer satisfaction metrics and performance benchmarks
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 relative overflow-hidden"
            >
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute w-2 h-2 rounded-full bg-emerald-400"
              ></motion.div>
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-sm text-slate-300 font-medium">Live Data</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-20">
        {/* Key Metrics Grid - Premium Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {/* Overall ICSQ Score - Hero Metric */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative h-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/10 to-transparent rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Overall Performance</p>
                    <h2 className="text-lg text-slate-300 font-medium">ICSQ Score</h2>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-400/20">
                    <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-end gap-4 mb-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6, type: "spring" }}
                    className="text-6xl font-bold bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent"
                  >
                    <AnimatedCounter value={dashboardData.overallScore.value} duration={2.5} />%
                  </motion.div>
                  <div className={`mb-2 px-3 py-1 rounded-lg text-sm font-semibold ${
                    dashboardData.overallScore.status === 'Promoter' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    dashboardData.overallScore.status === 'Passive' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {dashboardData.overallScore.status}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`flex items-center gap-1 ${
                    dashboardData.overallScore.value >= BUSINESS_TARGET ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dashboardData.overallScore.value >= BUSINESS_TARGET ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                    </svg>
                    <span className="font-medium">
                      {dashboardData.overallScore.value >= BUSINESS_TARGET ? 'Above' : 'Below'} Target
                    </span>
                  </div>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Target: {BUSINESS_TARGET}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Business Average */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative h-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Business Average</p>
                    <h2 className="text-lg text-slate-300 font-medium">Organization-wide Score</h2>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-400/20">
                    <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-end gap-4 mb-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6, type: "spring" }}
                    className="text-6xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent"
                  >
                    <AnimatedCounter value={dashboardData.icsqScores.businessAvg} duration={2.5} />%
                  </motion.div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {/* <span className="text-slate-400">Company-wide benchmark</span> */}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Analytics Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-gradient-to-b from-sky-500 to-blue-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-slate-100">Performance Analytics</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* ICSQ Score Comparison */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-400/20">
                        <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">Score Comparison</h3>
                        <p className="text-xs text-slate-400">Target vs Actual Performance</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-[420px] mt-4 flex items-center justify-center">
                    <AppleBarChartDark 
                      data={[
                        { name: 'Business Target', score: dashboardData.icsqScores.businessTarget },
                        { name: 'Business Avg', score: dashboardData.icsqScores.businessAvg },
                        { name: 'Department Avg', score: dashboardData.icsqScores.departmentAvg }
                      ]}
                      height={380}
                      showReferenceLine={true}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Category Performance Radar */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-400/20">
                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">Category Analysis</h3>
                        <p className="text-xs text-slate-400">Performance by Category</p>
                      </div>
                    </div>
                    {/* Expand/Zoom Button */}
                    <div className="relative group/expand">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowChartModal(true)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 hover:border-violet-400/50 transition-all duration-300 pointer-events-auto cursor-pointer shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20"
                      >
                        <svg className="w-5 h-5 text-violet-300 group-hover/expand:text-violet-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </motion.button>
                      {/* Custom Tooltip */}
                      <div className="absolute -bottom-10 right-0 opacity-0 group-hover/expand:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-1.5 shadow-xl">
                          <p className="text-xs text-slate-200 whitespace-nowrap font-medium">Expand Chart</p>
                          <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-800 border-l border-t border-slate-700/50 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-[420px] mt-4 flex items-center justify-center">
                    <AppleWebChartDark 
                      detailedScores={dashboardData.categoryScores}
                      businessAvg={dashboardData.icsqScores.businessAvg}
                      businessTarget={dashboardData.icsqScores.businessTarget}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Survey Engagement Metrics */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-400/20">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">Survey Engagement</h3>
                      <p className="text-xs text-slate-400">Participation & Response Metrics</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-400/20">
                      <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-400 mb-1">Surveys Given</p>
                      <p className="text-3xl font-bold text-slate-100"><AnimatedCounter value={dashboardData.surveyEngagement.surveyGiven} duration={1.5} />%</p>
                      <p className="text-xs text-slate-500 mt-1">Participation rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-400/20">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-400 mb-1">Surveys Received</p>
                      <p className="text-3xl font-bold text-slate-100"><AnimatedCounter value={dashboardData.surveyEngagement.surveyReceived} duration={1.5} />%</p>
                      <p className="text-xs text-slate-500 mt-1">Cross-department participation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Department Performance Comparison Table */}
        {dashboardData.departmentScores && dashboardData.departmentScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative group"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-100">Cross-Department Comparison</h2>
            </div>

            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
              <div className="p-6">
                {/* Table Header Info */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-400/20">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">Department Metrics</h3>
                      <p className="text-xs text-slate-400">Scroll horizontally to view all departments</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <span className="text-xs font-medium text-slate-400">{dashboardData.departmentScores.length} Departments</span>
                  </div>
                </div>
                
                {/* Scrollable Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-slate-700/50">
                      <thead className="bg-slate-900/60">
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-900/90 backdrop-blur-sm text-left py-4 px-6 text-xs font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <span>Metric</span>
                            </div>
                          </th>
                          {dashboardData.departmentScores.map((dept, index) => (
                            <th key={index} className="text-center py-4 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                              <div className="flex flex-col items-center gap-1">
                                <span>{dept.code}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30 bg-slate-900/20">
                        {/* ICSQ Score Row */}
                        <tr className="hover:bg-slate-800/30 transition-colors duration-200">
                          <td className="sticky left-0 z-10 bg-slate-900/80 backdrop-blur-sm py-4 px-6 text-sm font-medium text-slate-100 whitespace-nowrap border-r border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                              <span>ICSQ Score</span>
                            </div>
                          </td>
                          {dashboardData.departmentScores.map((dept, index) => (
                            <td key={index} className="text-center py-4 px-4 whitespace-nowrap">
                              {dept.icsqScore === null ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700/50 text-xs font-medium">
                                  N/A
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className={`text-sm font-bold ${
                                    dept.isLowScore 
                                      ? 'text-red-400' 
                                      : dept.icsqScore >= 80
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                  }`}>
                                    {dept.icsqScore}%
                                  </span>
                                  {dept.icsqScore >= 80 && (
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                          
                        {/* Response Rate Row */}
                        <tr className="hover:bg-slate-800/30 transition-colors duration-200">
                          <td className="sticky left-0 z-10 bg-slate-900/80 backdrop-blur-sm py-4 px-6 text-sm font-medium text-slate-100 whitespace-nowrap border-r border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                              <span>Response Rate</span>
                            </div>
                          </td>
                          {dashboardData.departmentScores.map((dept, index) => (
                            <td key={index} className="text-center py-4 px-4 whitespace-nowrap">
                              {dept.responseRate === null ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800/50 text-slate-400 border border-slate-700/50 text-xs font-medium">
                                  N/A
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-sm font-bold ${
                                    dept.responseRate === 100 
                                      ? 'text-emerald-400' 
                                      : dept.responseRate === 0 
                                        ? 'text-slate-500' 
                                        : 'text-slate-300'
                                  }`}>
                                    {dept.responseRate}%
                                  </span>
                                  <div className="w-full max-w-[60px] h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        dept.responseRate === 100 ? 'bg-emerald-400' :
                                        dept.responseRate === 0 ? 'bg-slate-700' :
                                        'bg-violet-400'
                                      }`}
                                      style={{ width: `${dept.responseRate}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    <span className="text-slate-400">Promoter (80%+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <span className="text-slate-400">Passive (60-79%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <span className="text-slate-400">Detractor (Below 60%)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Category Analysis Modal - Full Screen View */}
      {showChartModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowChartModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-6xl my-auto bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden max-h-[95vh] md:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="hidden sm:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-400/20 flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-100 truncate">Category Analysis - Detailed View</h2>
                  <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Comprehensive performance breakdown across all categories</p>
                </div>
              </div>
              
              {/* Close Button */}
              <div className="relative group/close flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowChartModal(false)}
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-800/50 hover:bg-red-500/20 border border-slate-600/50 hover:border-red-500/50 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover/close:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
                {/* Custom Tooltip - Hidden on small screens */}
                <div className="hidden sm:block absolute -bottom-10 right-0 opacity-0 group-hover/close:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-1.5 shadow-xl">
                    <p className="text-xs text-slate-200 whitespace-nowrap font-medium">Close (ESC)</p>
                    <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-800 border-l border-t border-slate-700/50 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body - Large Chart - Scrollable */}
            <div className="overflow-y-auto overflow-x-hidden md:overflow-visible">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="h-[400px] sm:h-[500px] md:h-[600px] flex items-center justify-center">
                  <AppleWebChartDark 
                    detailedScores={dashboardData.categoryScores}
                    businessAvg={dashboardData.icsqScores.businessAvg}
                    businessTarget={dashboardData.icsqScores.businessTarget}
                  />
                </div>
                
                {/* Legend Info */}
                <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-orange-500 flex-shrink-0"></div>
                    <span className="text-slate-300 font-medium whitespace-nowrap">Business Target ({BUSINESS_TARGET}%)</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500 flex-shrink-0"></div>
                    <span className="text-slate-300 font-medium whitespace-nowrap">Business Avg ({dashboardData.icsqScores.businessAvg}%)</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-cyan-500 flex-shrink-0"></div>
                    <span className="text-slate-300 font-medium whitespace-nowrap">Dept Avg ({dashboardData.icsqScores.departmentAvg}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-700/50 bg-slate-900/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  <span className="hidden sm:inline">Click outside or press ESC to close • Department values shown • Hover for all metrics</span>
                  <span className="sm:hidden">Tap outside or press ESC to close</span>
                </p>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(139, 92, 246, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowChartModal(false)}
                  className="group relative px-6 sm:px-8 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 overflow-hidden w-full sm:w-auto"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <span className="relative flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default HODDashboardPage;

