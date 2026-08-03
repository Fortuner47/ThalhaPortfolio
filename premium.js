(function() {
  'use strict';

  // Make sure GSAP is loaded for 3D transforms
  if (typeof gsap === 'undefined') {
    console.warn('GSAP is not loaded. Premium JS requires GSAP.');
    return;
  }

  /* ========================================================
     15. CUSTOM CURSOR
     ======================================================== */
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let outlineX = mouseX;
  let outlineY = mouseY;
  
  if (cursorDot && cursorOutline && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
    });
    
    const renderCursor = () => {
      outlineX += (mouseX - outlineX) * 0.15;
      outlineY += (mouseY - outlineY) * 0.15;
      cursorOutline.style.transform = `translate(calc(${outlineX}px - 50%), calc(${outlineY}px - 50%))`;
      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);
    
    document.querySelectorAll('a, button, .magnetic, .project-showcase').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorOutline.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        cursorOutline.classList.remove('hovering');
      });
    });
  }

  /* ========================================================
     16. BUTTON RIPPLE EFFECT
     ======================================================== */
  document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', function(e) {
      let x = e.clientX - e.target.getBoundingClientRect().left;
      let y = e.clientY - e.target.getBoundingClientRect().top;
      
      let ripples = document.createElement('span');
      ripples.style.left = x + 'px';
      ripples.style.top = y + 'px';
      ripples.classList.add('ripple');
      this.appendChild(ripples);
      
      setTimeout(() => {
        ripples.remove();
      }, 600);
    });
  });

  /* ========================================================
     17. 3D PERSPECTIVE ON PROJECT CARDS
     ======================================================== */
  document.querySelectorAll('.project-showcase, .case-hero-image').forEach(card => {
    const wrapper = card.classList.contains('project-showcase') 
      ? card.querySelector('.project-image-wrapper') 
      : card;
    if (!wrapper) return;
    
    // Add required CSS for perspective
    if (card.classList.contains('case-hero-image')) {
      card.style.perspective = '1200px';
      card.style.transformStyle = 'preserve-3d';
    }
    
    card.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const rotateX = (y / rect.height) * -15; // Max 15deg
      const rotateY = (x / rect.width) * 15;
      
      gsap.to(wrapper, {
        rotationX: rotateX,
        rotationY: rotateY,
        transformPerspective: 1200,
        ease: 'power1.out',
        duration: 0.4
      });
    });
    
    card.addEventListener('mouseleave', () => {
      gsap.to(wrapper, {
        rotationX: 0,
        rotationY: 0,
        ease: 'power3.out',
        duration: 0.8
      });
    });
  });

})();
