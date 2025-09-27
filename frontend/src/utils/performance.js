// Performance optimization utilities for Electron app
import React from 'react';

// Debounce function for scroll events
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for frequent events
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Optimize scroll performance
export const optimizeScrollPerformance = () => {
  // Add passive event listeners for better scroll performance
  const scrollElements = document.querySelectorAll('.scroll-optimized');
  
  scrollElements.forEach(element => {
    // Enable hardware acceleration
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'scroll-position';
    
    // Add passive scroll listener
    element.addEventListener('scroll', throttle(() => {
      // Scroll event handling
    }, 16), { passive: true });
  });
};

// Optimize hover performance
export const optimizeHoverPerformance = () => {
  const hoverElements = document.querySelectorAll('.hover-optimized');
  
  hoverElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      element.style.willChange = 'transform, background-color, border-color, box-shadow';
    }, { passive: true });
    
    element.addEventListener('mouseleave', () => {
      element.style.willChange = 'auto';
    }, { passive: true });
  });
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeScrollPerformance();
      optimizeHoverPerformance();
    });
  } else {
    optimizeScrollPerformance();
    optimizeHoverPerformance();
  }
  
  // Re-run when new elements are added
  const observer = new MutationObserver(debounce(() => {
    optimizeScrollPerformance();
    optimizeHoverPerformance();
  }, 100));
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// React component optimization helpers
export const memoizeComponent = (Component, areEqual) => {
  return React.memo(Component, areEqual);
};

// Performance monitoring
export const performanceMonitor = {
  startMeasure: (name) => {
    performance.mark(`${name}-start`);
  },
  
  endMeasure: (name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    if (measure.duration > 16) { // Longer than 1 frame at 60fps
      console.warn(`Performance warning: ${name} took ${measure.duration.toFixed(2)}ms`);
    }
    
    // Clean up
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  }
};
