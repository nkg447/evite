// Function to get URL parameters
function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to personalize the invitation
function personalizeInvitation() {
    const guestName = atob(getURLParameter('_'));
    const guestNameElement = document.getElementById('guestName');
    
    if (guestName && guestNameElement) {
        // Decode URL encoding and capitalize first letter of each word
        const decodedName = decodeURIComponent(guestName)
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        guestNameElement.textContent = `Dear ${decodedName}`;
    }
}

// Function to initialize background audio
function initializeBackgroundAudio() {
    const audio = document.getElementById('backgroundAudio');
    
    // Set volume to a comfortable level (0.3 = 30%)
    audio.volume = 0.3;
    
    // Try to play audio immediately
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Background audio started playing');
        }).catch(error => {
            console.log('Auto-play was prevented, will try to play on first user interaction');
            // If autoplay is blocked, try to play on first user interaction
            const playOnInteraction = () => {
                audio.play().then(() => {
                    console.log('Background audio started after user interaction');
                }).catch(e => console.log('Audio play failed:', e));
                
                // Remove listeners after successful play
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
            };
            
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('touchstart', playOnInteraction);
            document.addEventListener('keydown', playOnInteraction);
        });
    }
}

// Resource loader to track all assets
class ResourceLoader {
    constructor() {
        this.totalResources = 0;
        this.loadedResources = 0;
        this.onAllLoadedCallback = null;
        this.resources = new Set();
        this.progressBar = null;
        this.loadingIndicator = null;
    }
    
    init() {
        this.progressBar = document.getElementById('loadingBar');
        this.loadingIndicator = document.getElementById('loadingIndicator');
    }
    
    addResource(resource) {
        if (!this.resources.has(resource)) {
            this.resources.add(resource);
            this.totalResources++;
        }
    }
    
    markResourceLoaded(resource) {
        if (this.resources.has(resource)) {
            this.loadedResources++;
            console.log(`Resource loaded: ${resource} (${this.loadedResources}/${this.totalResources})`);
            
            // Update progress bar
            this.updateProgress();
            
            if (this.loadedResources >= this.totalResources && this.onAllLoadedCallback) {
                console.log('All resources loaded, starting application...');
                // Small delay to show 100% completion
                setTimeout(() => {
                    this.hideLoadingIndicator();
                    this.onAllLoadedCallback();
                }, 300);
            }
        }
    }
    
    updateProgress() {
        const progress = this.getProgress();
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
    }
    
    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
        const imageContainer = document.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.style.display = 'block';
        }
        document.body.classList.add('images-loaded');
    }
    
    onAllLoaded(callback) {
        this.onAllLoadedCallback = callback;
        // If already loaded, call immediately
        if (this.loadedResources >= this.totalResources && this.totalResources > 0) {
            this.hideLoadingIndicator();
            callback();
        }
    }
    
    getProgress() {
        return this.totalResources > 0 ? (this.loadedResources / this.totalResources) * 100 : 0;
    }
}

// Global resource loader instance
const resourceLoader = new ResourceLoader();

// Function to load all images
function loadAllImages() {
    const imageUrls = [
        'pages/p1.jpg',
        'pages/p2.jpg',
        'pages/p3.jpg',
        'pages/p4.jpg',
        'pages/p5.jpg',
        'pages/p6.jpg'
    ];
    
    imageUrls.forEach(url => {
        resourceLoader.addResource(url);
        const img = new Image();
        
        img.onload = () => {
            resourceLoader.markResourceLoaded(url);
        };
        
        img.onerror = () => {
            console.warn(`Failed to load image: ${url}`);
            resourceLoader.markResourceLoaded(url); // Mark as loaded even on error to prevent hanging
        };
        
        img.src = url;
    });
}

// Function to load audio
function loadAudio() {
    const audio = document.getElementById('backgroundAudio');
    if (audio) {
        resourceLoader.addResource('backgroundAudio');
        
        const onAudioLoaded = () => {
            console.log('Background audio loaded successfully');
            resourceLoader.markResourceLoaded('backgroundAudio');
            cleanup();
        };
        
        const onAudioError = () => {
            console.warn('Failed to load background audio');
            resourceLoader.markResourceLoaded('backgroundAudio'); // Mark as loaded even on error
            cleanup();
        };
        
        const onAudioTimeout = () => {
            console.warn('Audio loading timed out');
            resourceLoader.markResourceLoaded('backgroundAudio');
            cleanup();
        };
        
        const cleanup = () => {
            audio.removeEventListener('canplaythrough', onAudioLoaded);
            audio.removeEventListener('loadeddata', onAudioLoaded);
            audio.removeEventListener('error', onAudioError);
            clearTimeout(timeoutId);
        };
        
        // Set up event listeners
        audio.addEventListener('canplaythrough', onAudioLoaded, { once: true });
        audio.addEventListener('loadeddata', onAudioLoaded, { once: true });
        audio.addEventListener('error', onAudioError, { once: true });
        
        // Set a timeout as a fallback
        const timeoutId = setTimeout(onAudioTimeout, 10000); // 10 second timeout
        
        // If audio is already loaded
        if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or greater
            onAudioLoaded();
        } else {
            // Force load
            audio.load();
        }
    }
}

// Initialize personalization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    personalizeInvitation();
    
    // Initialize resource loader
    resourceLoader.init();
    
    // Start loading all resources
    loadAllImages();
    loadAudio();
    
    // Wait for all resources to load before initializing the gallery and audio
    resourceLoader.onAllLoaded(() => {
        initializeBackgroundAudio();
        new ImageGallery();
    });
});

class ImageGallery {
    constructor() {
        this.images = document.querySelectorAll('.gallery-image');
        this.dots = document.querySelectorAll('.dot');
        this.container = document.querySelector('.image-container');
        this.currentIndex = 0;
        this.intervalId = null;
        this.transitionTime = 5000; // Hardcoded to 5 seconds
        
        this.attachEventListeners();
        this.setTransitionType('fade'); // Hardcoded to fade transition
        this.updateDisplay(); // Initial display update
        this.startSlideshow(); // Start slideshow after everything is loaded
    }
    
    attachEventListeners() {
        // Dot indicators event listeners (only if dots exist)
        if (this.dots.length > 0) {
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.goToSlide(index));
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextImage();
                    break;
            }
        });
        
        // Touch/swipe support for mobile
        this.addTouchSupport();
    }
    
    addTouchSupport() {
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let isScrolling = undefined;
        
        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            isScrolling = undefined;
        }, { passive: true });
        
        this.container.addEventListener('touchmove', (e) => {
            // Determine if scrolling test has run - one time test
            if (isScrolling === undefined) {
                const diffX = Math.abs(e.touches[0].clientX - startX);
                const diffY = Math.abs(e.touches[0].clientY - startY);
                isScrolling = diffY > diffX;
            }
            
            // If user is trying to scroll vertically, allow it
            if (isScrolling) {
                return;
            }
            
            // Prevent default horizontal scrolling
            e.preventDefault();
        }, { passive: false });
        
        this.container.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            const timeDiff = endTime - startTime;
            
            // Check if this was a valid swipe (not a scroll and sufficient movement)
            if (!isScrolling && Math.abs(diffX) > 50 && timeDiff < 500) {
                // Pause slideshow during manual navigation
                this.pauseSlideshow();
                
                if (diffX > 0) {
                    // Swipe left - next image
                    this.nextImage();
                } else {
                    // Swipe right - previous image
                    this.previousImage();
                }
                
                // Resume slideshow after a delay
                setTimeout(() => this.startSlideshow(), 3000);
            }
        }, { passive: true });
        
        // Add tap to pause/resume functionality
        this.container.addEventListener('click', (e) => {
            // Only handle clicks on the image area, not dots
            if (e.target.classList.contains('gallery-image') || e.target === this.container) {
                if (this.intervalId) {
                    this.pauseSlideshow();
                    // Show a subtle indicator that slideshow is paused
                    this.showPauseIndicator();
                } else {
                    this.startSlideshow();
                }
            }
        });
    }
    
    showPauseIndicator() {
        // Create a temporary pause indicator
        const indicator = document.createElement('div');
        indicator.className = 'pause-indicator';
        indicator.innerHTML = '⏸️';
        indicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            color: rgba(255, 255, 255, 0.8);
            pointer-events: none;
            z-index: 1000;
            animation: fadeInOut 1.5s ease-in-out;
        `;
        
        this.container.appendChild(indicator);
        
        // Remove after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 1500);
        
        // Add the animation to CSS if not already present
        if (!document.querySelector('#pause-animation-style')) {
            const style = document.createElement('style');
            style.id = 'pause-animation-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setTransitionType(type) {
        // Remove all transition classes
        this.container.classList.remove('fade', 'slide-left', 'slide-right', 'zoom', 'flip');
        
        // Add new transition class
        this.container.classList.add(type);
    }
    
    updateDisplay() {
        // Update images
        this.images.forEach((img, index) => {
            img.classList.remove('active');
            if (index === this.currentIndex) {
                img.classList.add('active');
            }
        });
        
        // Update dots (only if they exist)
        if (this.dots.length > 0) {
            this.dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === this.currentIndex);
            });
        }
        
        // Mark container as loaded for first image
        if (!this.container.classList.contains('loaded')) {
            this.container.classList.add('loaded');
        }
    }
    
    getPreviousIndex() {
        return this.currentIndex === 0 ? this.images.length - 1 : this.currentIndex - 1;
    }
    
    getNextIndex() {
        return this.currentIndex === this.images.length - 1 ? 0 : this.currentIndex + 1;
    }
    
    nextImage() {
        this.currentIndex = this.getNextIndex();
        this.updateDisplay();
    }
    
    previousImage() {
        this.currentIndex = this.getPreviousIndex();
        this.updateDisplay();
    }
    
    goToSlide(index) {
        if (index >= 0 && index < this.images.length) {
            this.currentIndex = index;
            this.updateDisplay();
        }
    }
    
    startSlideshow() {
        this.stopSlideshow();
        this.intervalId = setInterval(() => {
            this.nextImage();
        }, this.transitionTime);
    }
    
    pauseSlideshow() {
        this.stopSlideshow();
    }
    
    stopSlideshow() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

// Add some visual feedback for loading images
document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('.gallery-image');
    let loadedImages = 0;
    
    const checkAllImagesLoaded = () => {
        loadedImages++;
        if (loadedImages === images.length) {
            document.body.classList.add('images-loaded');
        }
    };
    
    images.forEach(img => {
        if (img.complete) {
            checkAllImagesLoaded();
        } else {
            img.addEventListener('load', checkAllImagesLoaded);
            img.addEventListener('error', checkAllImagesLoaded);
        }
    });
});

// Add some smooth scrolling and focus management
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll to top when page loads
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Add focus management for better accessibility
    const focusableElements = document.querySelectorAll(
        'button, input, select, .dot, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => {
            element.style.outline = '2px solid rgba(255, 255, 255, 0.8)';
            element.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', () => {
            element.style.outline = '';
            element.style.outlineOffset = '';
        });
    });
});