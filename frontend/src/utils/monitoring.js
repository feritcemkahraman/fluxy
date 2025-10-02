// Monitoring utility for tracking app performance and errors
class MonitoringService {
  constructor() {
    this.metrics = {
      voiceConnections: 0,
      socketConnections: 0,
      errors: [],
      performance: {}
    };

    this.init();
  }

  init() {
    // Track page visibility for connection monitoring
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.trackEvent('visibility_change', {
          hidden: document.hidden,
          timestamp: Date.now()
        });
      });
    }

    // Track page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.trackEvent('page_unload', {
          timestamp: Date.now()
        });
      });
    }

    // Monitor WebRTC connection quality
    this.startConnectionMonitoring();
  }

  // Track voice connection events
  trackVoiceConnection(action, data = {}) {
    this.metrics.voiceConnections++;

    this.trackEvent('voice_connection', {
      action, // 'join', 'leave', 'error'
      ...data,
      timestamp: Date.now()
    });

    console.log(`📊 Voice ${action}:`, data);
  }

  // Track socket connection events
  trackSocketConnection(action, data = {}) {
    this.metrics.socketConnections++;

    this.trackEvent('socket_connection', {
      action, // 'connect', 'disconnect', 'reconnect'
      ...data,
      timestamp: Date.now()
    });
  }

  // Track errors
  trackError(error, context = {}) {
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    this.metrics.errors.push(errorData);

    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }

    this.trackEvent('error', errorData);

    console.error('🚨 Tracked error:', errorData);
  }

  // Track performance metrics
  trackPerformance(metric, value, context = {}) {
    this.metrics.performance[metric] = {
      value,
      context,
      timestamp: Date.now()
    };

    this.trackEvent('performance', {
      metric,
      value,
      context,
      timestamp: Date.now()
    });

    console.log(`⚡ Performance ${metric}:`, value);
  }

  // Monitor WebRTC connection quality
  startConnectionMonitoring() {
    if (typeof setInterval === 'undefined') return;

    // DISABLED: Connection monitoring (CPU optimization)
    // setInterval(() => {
    //   const voiceService = typeof window !== 'undefined' ? window.voiceChatService : null;
    //   if (voiceService && voiceService.peers) {
    //     const peerCount = voiceService.peers.size;
    //     const connectionStates = Array.from(voiceService.peers.values()).map(peer => ({
    //       connectionState: peer._pc?.connectionState,
    //       iceConnectionState: peer._pc?.iceConnectionState
    //     }));
    //     this.trackEvent('connection_health', {
    //       peerCount,
    //       connectionStates,
    //       timestamp: Date.now()
    //     });
    //   }
    // }, 30000);
    console.log('🔍 Connection monitoring disabled for performance');
  }

  // Generic event tracking
  trackEvent(eventType, data) {
    // Send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventType, {
        custom_parameter_1: JSON.stringify(data)
      });
    }

    // Store locally for debugging
    try {
      if (typeof localStorage !== 'undefined') {
        const events = JSON.parse(localStorage.getItem('app_events') || '[]');
        events.push({ type: eventType, data, timestamp: Date.now() });

        // Keep only last 100 events
        if (events.length > 100) {
          events.splice(0, events.length - 100);
        }

        localStorage.setItem('app_events', JSON.stringify(events));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      memory: typeof performance !== 'undefined' && performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }

  // Export metrics for debugging
  exportMetrics() {
    if (typeof window === 'undefined') return;

    const data = {
      metrics: this.getMetrics(),
      events: JSON.parse(localStorage.getItem('app_events') || '[]'),
      timestamp: Date.now()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  window.monitoringService = monitoringService;
}

export default monitoringService;