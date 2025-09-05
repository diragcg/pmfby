import { secureDB } from './database.js';

class PerformanceManager {
    constructor() {
        this.loadingStates = new Map();
        this.debounceTimers = new Map();
        this.observers = new Map();
        this.batchQueue = [];
        this.batchTimer = null;
        this.init();
    }

    init() {
        this.setupLazyLoading();
        this.setupVirtualScrolling();
        // REMOVED: this.preloadCriticalData(); - Don't preload before auth
    }

    // LOADING STATES MANAGEMENT
    showLoading(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <span class="loading-text">${message}</span>
            </div>
        `;

        // Add CSS if not exists
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    backdrop-filter: blur(2px);
                }
                .loading-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-text {
                    font-size: 14px;
                    color: #666;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(style);
        }

        // Make parent relative if not already
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }

        element.appendChild(loadingOverlay);
        this.loadingStates.set(elementId, loadingOverlay);
    }

    hideLoading(elementId) {
        const loadingOverlay = this.loadingStates.get(elementId);
        if (loadingOverlay && loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
            this.loadingStates.delete(elementId);
        }
    }

    // DEBOUNCED INPUT HANDLING
    debounce(func, delay, key) {
        // Clear existing timer
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }

        // Set new timer
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);

        this.debounceTimers.set(key, timer);
    }

    // BATCH DATABASE OPERATIONS
    addToBatch(operation) {
        this.batchQueue.push(operation);

        // Clear existing timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        // Process batch after 100ms of inactivity
        this.batchTimer = setTimeout(() => {
            this.processBatch();
        }, 100);
    }

    async processBatch() {
        if (this.batchQueue.length === 0) return;

        console.log('⚡ Processing batch of', this.batchQueue.length, 'operations');

        const batch = [...this.batchQueue];
        this.batchQueue = [];

        try {
            // Group operations by type
            const grouped = batch.reduce((acc, op) => {
                if (!acc[op.type]) acc[op.type] = [];
                acc[op.type].push(op);
                return acc;
            }, {});

            // Process each group in parallel
            const promises = Object.entries(grouped).map(([type, operations]) => {
                return this.processBatchGroup(type, operations);
            });

            await Promise.all(promises);
            console.log('✅ Batch processing completed');

        } catch (error) {
            console.error('❌ Batch processing failed:', error);
        }
    }

    async processBatchGroup(type, operations) {
        switch (type) {
            case 'validation':
                return this.batchValidation(operations);
            case 'calculation':
                return this.batchCalculation(operations);
            default:
                console.warn('Unknown batch operation type:', type);
        }
    }

    // LAZY LOADING FOR DROPDOWNS
    setupLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const loadFunction = element.dataset.lazyLoad;
                    
                    if (loadFunction && window[loadFunction]) {
                        console.log('⚡ Lazy loading:', loadFunction);
                        window[loadFunction](element);
                        observer.unobserve(element);
                    }
                }
            });
        }, { threshold: 0.1 });

        this.observers.set('lazy', observer);
    }

    // VIRTUAL SCROLLING FOR LARGE LISTS
    setupVirtualScrolling() {
        const containers = document.querySelectorAll('[data-virtual-scroll]');
        
        containers.forEach(container => {
            this.initVirtualScroll(container);
        });
    }

    initVirtualScroll(container) {
        const itemHeight = parseInt(container.dataset.itemHeight) || 50;
        const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        let allItems = [];
        let startIndex = 0;

        const virtualScroll = {
            setData: (data) => {
                allItems = data;
                this.renderVirtualItems(container, allItems, startIndex, visibleItems, itemHeight);
            },
            
            handleScroll: () => {
                const scrollTop = container.scrollTop;
                const newStartIndex = Math.floor(scrollTop / itemHeight);
                
                if (newStartIndex !== startIndex) {
                    startIndex = newStartIndex;
                    this.renderVirtualItems(container, allItems, startIndex, visibleItems, itemHeight);
                }
            }
        };

        container.addEventListener('scroll', virtualScroll.handleScroll);
        container.virtualScroll = virtualScroll;
    }

    renderVirtualItems(container, items, startIndex, visibleCount, itemHeight) {
        const endIndex = Math.min(startIndex + visibleCount, items.length);
        const totalHeight = items.length * itemHeight;
        
        container.innerHTML = `
            <div style="height: ${totalHeight}px; position: relative;">
                ${items.slice(startIndex, endIndex).map((item, index) => `
                    <div style="position: absolute; top: ${(startIndex + index) * itemHeight}px; height: ${itemHeight}px; width: 100%;">
                        ${this.renderVirtualItem(item)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderVirtualItem(item) {
        // Override this method for custom item rendering
        return `<div class="virtual-item">${JSON.stringify(item)}</div>`;
    }

    // PRELOAD CRITICAL DATA (Only call after authentication)
    async preloadCriticalData() {
        console.log('⚡ Preloading critical data...');
        
        const criticalData = [
            'districts',
            'schemes',
            'input_types'
        ];

        try {
            const promises = criticalData.map(async (dataType) => {
                switch (dataType) {
                    case 'districts':
                        return secureDB.getDistricts();
                    case 'schemes':
                        return secureDB.getSchemes();
                    case 'input_types':
                        return secureDB.getInputTypes();
                }
            });

            await Promise.all(promises);
            console.log('✅ Critical data preloaded');

        } catch (error) {
            console.error('❌ Failed to preload data:', error);
        }
    }

    // SMART FORM VALIDATION (Debounced)
    setupSmartValidation(formElement) {
        if (!formElement) return;
        
        const inputs = formElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.debounce(() => {
                    this.validateField(input);
                }, 300, `validate_${input.id || input.name || Math.random()}`);
            });

            // Immediate validation on blur
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    validateField(input) {
        this.addToBatch({
            type: 'validation',
            element: input,
            value: input.value
        });
    }

    async batchValidation(operations) {
        operations.forEach(op => {
            const { element, value } = op;
            
            // Remove previous error styling
            element.classList.remove('error', 'valid');
            
            let isValid = true;
            
            // Basic validation
            if (element.hasAttribute('required') && !value.trim()) {
                isValid = false;
            } else if (element.type === 'number' && (isNaN(value) || value < 0)) {
                isValid = false;
            } else if (element.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                isValid = false;
            }
            
            // Apply styling
            element.classList.add(isValid ? 'valid' : 'error');
        });
    }

    // AUTO-CALCULATION WITH BATCHING
    setupAutoCalculation(formElement) {
        if (!formElement) return;
        
        const calculationInputs = formElement.querySelectorAll('[data-calculate]');
        
        calculationInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.debounce(() => {
                    this.addToBatch({
                        type: 'calculation',
                        target: input.dataset.calculate,
                        source: input.id,
                        value: input.value
                    });
                }, 100, `calc_${input.id}`);
            });
        });
    }

    async batchCalculation(operations) {
        // Group by calculation target
        const grouped = operations.reduce((acc, op) => {
            if (!acc[op.target]) acc[op.target] = [];
            acc[op.target].push(op);
            return acc;
        }, {});

        Object.entries(grouped).forEach(([target, ops]) => {
            this.performCalculation(target, ops);
        });
    }

    performCalculation(target, operations) {
        switch (target) {
            case 'totalFarmers':
                const maleInput = document.getElementById('maleFarmers');
                const femaleInput = document.getElementById('femaleFarmers');
                const totalInput = document.getElementById('totalFarmers');
                
                if (maleInput && femaleInput && totalInput) {
                    const male = parseInt(maleInput.value) || 0;
                    const female = parseInt(femaleInput.value) || 0;
                    totalInput.value = male + female;
                }
                break;
                
            case 'totalOfficers':
                const officers = ['distAdminCount', 'deptOfficersCount', 'alliedDeptCount', 'kvkCount', 'igkvCount'];
                const total = officers.reduce((sum, id) => {
                    const element = document.getElementById(id);
                    return sum + (parseInt(element?.value) || 0);
                }, 0);
                
                const totalOfficersInput = document.getElementById('totalOfficers');
                if (totalOfficersInput) {
                    totalOfficersInput.value = total;
                }
                break;
                
            case 'cashSubsidy':
                let totalSubsidy = 0;
                document.querySelectorAll('.subsidy-amount').forEach(input => {
                    totalSubsidy += parseFloat(input.value) || 0;
                });
                
                const cashSubsidyInput = document.getElementById('cashSubsidyAmountTotal');
                if (cashSubsidyInput) {
                    cashSubsidyInput.value = totalSubsidy.toFixed(2);
                }
                break;
        }
    }

    // MEMORY MANAGEMENT
    cleanup() {
        // Clear all timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        // Clear loading states
        this.loadingStates.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        this.loadingStates.clear();

        console.log('🧹 Performance manager cleaned up');
    }

    // PERFORMANCE MONITORING
    measurePerformance(name, fn) {
        return async (...args) => {
            const start = performance.now();
            const result = await fn(...args);
            const end = performance.now();
            
            console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
            return result;
        };
    }
}

// Export singleton
const performanceManager = new PerformanceManager();
export { performanceManager };
