// Performance Monitoring & Debugging Utility for Electron + React
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      memory: [],
      render: [],
      ipc: [],
      network: [],
      errors: []
    };
    
    this.observers = new Map();
    this.isMonitoring = false;
    this.maxMetrics = 1000; // Prevent memory leaks
    
    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    
    // Initialize if in browser environment
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  // ============================================================================
  // INITIALIZATION & SETUP
  // ============================================================================

  init() {
    // Setup error tracking
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    // Setup performance observers
    this.setupPerformanceObservers();
    
    // Setup memory monitoring
    this.setupMemoryMonitoring();
    
    // Setup React DevTools integration
    this.setupReactDevTools();
    
    console.log('🔍 Performance Monitor initialized');
  }

  // ============================================================================
  // PERFORMANCE OBSERVERS
  // ============================================================================

  setupPerformanceObservers() {
    try {
      // Measure navigation timing
      if ('PerformanceObserver' in window) {
        // Navigation timing
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              this.addMetric('render', {
                type: 'navigation',
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                domInteractive: entry.domInteractive - entry.fetchStart,
                timestamp: Date.now()
              });
            }
          });
        });
        
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);

        // Measure resource loading
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 100) { // Only track slow resources
              this.addMetric('network', {
                type: 'resource',
                name: entry.name,
                duration: entry.duration,
                size: entry.transferSize || 0,
                timestamp: Date.now()
              });
            }
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);

        // Measure long tasks (blocking main thread)
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.addMetric('render', {
              type: 'long-task',
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: Date.now()
            });
            
            // Warn about long tasks
            if (entry.duration > 50) {
              console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`);
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);

        // Measure layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.value > 0.1) { // Only track significant shifts
              this.addMetric('render', {
                type: 'layout-shift',
                value: entry.value,
                sources: entry.sources?.length || 0,
                timestamp: Date.now()
              });
            }
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', clsObserver);
      }
    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  // ============================================================================
  // MEMORY MONITORING
  // ============================================================================

  setupMemoryMonitoring() {
    // DISABLED: Memory monitoring (CPU optimization)
    // this.memoryInterval = setInterval(() => {
    //   this.collectMemoryMetrics();
    // }, 10000);
    console.log('📊 Memory monitoring disabled for performance');
  }

  async collectMemoryMetrics() {
    try {
      const metrics = {
        timestamp: Date.now()
      };

      // Browser memory API
      if ('memory' in performance) {
        metrics.jsHeap = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
        };
      }

      // Electron memory metrics
      if (window.electronAPI?.getPerformanceMetrics) {
        try {
          const electronMetrics = await window.electronAPI.getPerformanceMetrics();
          metrics.electron = electronMetrics;
        } catch (error) {
          console.warn('Failed to get Electron metrics:', error);
        }
      }

      // DOM node count
      metrics.domNodes = document.querySelectorAll('*').length;

      // Event listeners count (approximation)
      metrics.eventListeners = this.estimateEventListeners();

      this.addMetric('memory', metrics);

      // Warn about high memory usage
      if (metrics.jsHeap?.used > 100) { // 100MB
        console.warn(`⚠️ High memory usage: ${metrics.jsHeap.used}MB`);
      }

      if (metrics.domNodes > 5000) {
        console.warn(`⚠️ High DOM node count: ${metrics.domNodes}`);
      }

    } catch (error) {
      console.error('Memory monitoring error:', error);
    }
  }

  estimateEventListeners() {
    // This is an approximation - actual count is hard to get
    const elements = document.querySelectorAll('*');
    let count = 0;
    
    elements.forEach(el => {
      // Check for common event properties
      const events = ['onclick', 'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup'];
      events.forEach(event => {
        if (el[event]) count++;
      });
    });
    
    return count;
  }

  // ============================================================================
  // REACT DEVTOOLS INTEGRATION
  // ============================================================================

  setupReactDevTools() {
    // Hook into React DevTools profiler
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Monitor React renders
      hook.onCommitFiberRoot = (id, root, priorityLevel) => {
        this.addMetric('render', {
          type: 'react-commit',
          rootId: id,
          priorityLevel,
          timestamp: Date.now()
        });
      };
    }
  }

  // ============================================================================
  // IPC MONITORING
  // ============================================================================

  monitorIPC() {
    if (!window.electronAPI) return;

    // Wrap IPC calls to monitor performance
    const originalAPI = { ...window.electronAPI };
    
    Object.keys(originalAPI).forEach(method => {
      if (typeof originalAPI[method] === 'function') {
        window.electronAPI[method] = async (...args) => {
          const startTime = performance.now();
          
          try {
            const result = await originalAPI[method](...args);
            const duration = performance.now() - startTime;
            
            this.addMetric('ipc', {
              method,
              duration,
              success: true,
              timestamp: Date.now()
            });
            
            if (duration > 100) {
              console.warn(`⚠️ Slow IPC call: ${method} took ${duration.toFixed(2)}ms`);
            }
            
            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            
            this.addMetric('ipc', {
              method,
              duration,
              success: false,
              error: error.message,
              timestamp: Date.now()
            });
            
            throw error;
          }
        };
      }
    });
  }

  // ============================================================================
  // ERROR TRACKING
  // ============================================================================

  handleError(event) {
    this.addMetric('errors', {
      type: 'javascript',
      message: event.error?.message || event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now()
    });
  }

  handleUnhandledRejection(event) {
    this.addMetric('errors', {
      type: 'promise',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: Date.now()
    });
  }

  // ============================================================================
  // METRICS MANAGEMENT
  // ============================================================================

  addMetric(category, data) {
    if (!this.metrics[category]) {
      this.metrics[category] = [];
    }
    
    this.metrics[category].push(data);
    
    // Prevent memory leaks by limiting stored metrics
    if (this.metrics[category].length > this.maxMetrics) {
      this.metrics[category] = this.metrics[category].slice(-this.maxMetrics);
    }
  }

  getMetrics(category, limit = 100) {
    if (category) {
      return this.metrics[category]?.slice(-limit) || [];
    }
    
    // Return all metrics with limits
    const result = {};
    Object.keys(this.metrics).forEach(key => {
      result[key] = this.metrics[key].slice(-limit);
    });
    return result;
  }

  // ============================================================================
  // ANALYSIS & REPORTING
  // ============================================================================

  analyzePerformance() {
    const analysis = {
      timestamp: Date.now(),
      summary: {},
      recommendations: []
    };

    // Memory analysis
    const memoryMetrics = this.getMetrics('memory', 10);
    if (memoryMetrics.length > 0) {
      const latest = memoryMetrics[memoryMetrics.length - 1];
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + (m.jsHeap?.used || 0), 0) / memoryMetrics.length;
      
      analysis.summary.memory = {
        current: latest.jsHeap?.used || 0,
        average: Math.round(avgMemory),
        domNodes: latest.domNodes || 0
      };
      
      if (avgMemory > 100) {
        analysis.recommendations.push('High memory usage detected. Consider implementing virtualization for large lists.');
      }
      
      if (latest.domNodes > 3000) {
        analysis.recommendations.push('High DOM node count. Consider lazy loading or component cleanup.');
      }
    }

    // Render performance analysis
    const renderMetrics = this.getMetrics('render', 50);
    const longTasks = renderMetrics.filter(m => m.type === 'long-task');
    
    if (longTasks.length > 0) {
      const avgLongTask = longTasks.reduce((sum, t) => sum + t.duration, 0) / longTasks.length;
      analysis.summary.longTasks = {
        count: longTasks.length,
        averageDuration: Math.round(avgLongTask)
      };
      
      if (avgLongTask > 100) {
        analysis.recommendations.push('Long tasks detected. Consider code splitting or using Web Workers.');
      }
    }

    // IPC performance analysis
    const ipcMetrics = this.getMetrics('ipc', 50);
    if (ipcMetrics.length > 0) {
      const avgDuration = ipcMetrics.reduce((sum, i) => sum + i.duration, 0) / ipcMetrics.length;
      const failureRate = ipcMetrics.filter(i => !i.success).length / ipcMetrics.length;
      
      analysis.summary.ipc = {
        averageDuration: Math.round(avgDuration),
        failureRate: Math.round(failureRate * 100)
      };
      
      if (avgDuration > 50) {
        analysis.recommendations.push('Slow IPC calls detected. Consider batching requests or caching.');
      }
    }

    // Error analysis
    const errorMetrics = this.getMetrics('errors', 20);
    if (errorMetrics.length > 0) {
      analysis.summary.errors = {
        count: errorMetrics.length,
        types: [...new Set(errorMetrics.map(e => e.type))]
      };
      
      if (errorMetrics.length > 5) {
        analysis.recommendations.push('High error rate detected. Check console for details.');
      }
    }

    return analysis;
  }

  generateReport() {
    const analysis = this.analyzePerformance();
    
    console.group('📊 Performance Report');
    console.log('Summary:', analysis.summary);
    
    if (analysis.recommendations.length > 0) {
      console.group('💡 Recommendations');
      analysis.recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }
    
    console.groupEnd();
    
    return analysis;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  startMonitoring() {
    this.isMonitoring = true;
    this.monitorIPC();
    console.log('🔍 Performance monitoring started');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    // Clear intervals
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    
    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    console.log('🔍 Performance monitoring stopped');
  }

  clearMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    console.log('🧹 Performance metrics cleared');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup() {
    this.stopMonitoring();
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleError);
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
    
    // Clear metrics
    this.clearMetrics();
    
    console.log('🧹 Performance monitor cleaned up');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.startMonitoring();
  
  // Expose to window for debugging
  window.performanceMonitor = performanceMonitor;
  
  // DISABLED: Auto-generate reports (CPU optimization)
  // setInterval(() => {
  //   performanceMonitor.generateReport();
  // }, 30000);
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}

export default performanceMonitor;
