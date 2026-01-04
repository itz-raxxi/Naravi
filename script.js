// --- DOM ELEMENTS ---
const fileInput = document.getElementById('file-input');
const canvas = document.getElementById('image-canvas');
const ctx = canvas.getContext('2d');
const downloadButton = document.getElementById('download-button');
const menuIcon = document.getElementById('menu-icon');
const navMenu = document.getElementById('nav-menu');
const closeMenu = document.getElementById('close-menu');
const loadingText = document.getElementById('loading-text');

// --- 1. MOBILE NAVIGATION ---
// Open Menu
menuIcon.addEventListener('click', () => {
    navMenu.classList.add('show');
});

// Close Menu (X button)
closeMenu.addEventListener('click', () => {
    navMenu.classList.remove('show');
});

// Close Menu (Click Outside)
document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuIcon.contains(e.target)) {
        navMenu.classList.remove('show');
    }
});

// --- 2. SCROLL ANIMATION ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
});

// --- 3. IMAGE PROCESSING ---
const MAX_WIDTH = 1080; // Performance cap for mobile
let scale = 1, imageX = 0, imageY = 0;
let isDragging = false, startX, startY, initialDistance = 0;
let userImage = new Image();
let maskImage = new Image();

// Load the Mask Image
maskImage.src = 'mask.png'; 

maskImage.onload = () => {
    loadingText.style.display = 'none';
    const aspect = maskImage.height / maskImage.width;
    canvas.width = Math.min(maskImage.width, MAX_WIDTH);
    canvas.height = canvas.width * aspect;
    drawImages();
    downloadButton.classList.add('active');
    downloadButton.disabled = false;
};

maskImage.onerror = () => {
    loadingText.innerHTML = "Mask not found!";
    // Dummy setup so you can still see how it works
    canvas.width = 500; canvas.height = 500;
    ctx.fillStyle = "#eee"; ctx.fillRect(0,0,500,500);
    ctx.fillStyle = "red"; ctx.textAlign = "center";
    ctx.fillText("Please upload mask.png", 250, 250);
};

// Handle User Photo Upload
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        userImage = new Image();
        userImage.onload = () => {
            resetImagePosition();
            drawImages();
        };
        userImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Center the uploaded image
function resetImagePosition() {
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = userImage.width / userImage.height;

    // "Cover" style fit
    if (imgRatio > canvasRatio) {
        scale = canvas.height / userImage.height;
    } else {
        scale = canvas.width / userImage.width;
    }

    imageX = (canvas.width - userImage.width * scale) / 2;
    imageY = (canvas.height - userImage.height * scale) / 2;
}

// Draw Loop
function drawImages() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw User Image
    if (userImage.src) {
        ctx.drawImage(userImage, imageX, imageY, userImage.width * scale, userImage.height * scale);
    }
    
    // 2. Draw Mask on Top
    if (maskImage.complete && maskImage.naturalHeight !== 0) {
        ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
    }
}

// --- 4. TOUCH & MOUSE EVENTS (ZOOM/DRAG) ---

// Helper to convert screen coordinates to canvas scale
function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Handle both touch and mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// Start Interaction
const startAction = (e) => {
    if (e.touches && e.touches.length === 2) {
        // Pinch Zoom Start
        isDragging = false;
        initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    } else {
        // Drag Start
        isDragging = true;
        const coords = getCoords(e);
        startX = coords.x - imageX;
        startY = coords.y - imageY;
    }
};

// Move Interaction
const moveAction = (e) => {
    // IMPORTANT: Prevent page scrolling when touching canvas
    e.preventDefault(); 

    if (e.touches && e.touches.length === 2) {
        // Pinch Zooming
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const zoomFactor = dist / initialDistance;
        scale *= zoomFactor;
        
        // Limit Zoom
        scale = Math.max(0.1, Math.min(scale, 5));
        
        initialDistance = dist;
        drawImages();
    } else if (isDragging) {
        // Dragging
        const coords = getCoords(e);
        imageX = coords.x - startX;
        imageY = coords.y - startY;
        drawImages();
    }
};

const endAction = () => { isDragging = false; };

// Event Listeners (Mouse)
canvas.addEventListener('mousedown', startAction);
canvas.addEventListener('mousemove', (e) => { if(isDragging) moveAction(e); });
canvas.addEventListener('mouseup', endAction);
canvas.addEventListener('mouseleave', endAction);

// Event Listeners (Touch) - Passive: false allows us to stop scrolling
canvas.addEventListener('touchstart', startAction, { passive: false });
canvas.addEventListener('touchmove', moveAction, { passive: false });
canvas.addEventListener('touchend', endAction);

// --- 5. DOWNLOAD ---
downloadButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'temple-profile.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
});
