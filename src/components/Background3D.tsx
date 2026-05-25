import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Background3DProps {
  count?: number;
  opacity?: number;
  mouseSensitivity?: number;
  rotationSpeed?: number;
  size?: number;
}

export const Background3D: React.FC<Background3DProps> = ({
  count = 1000,
  opacity = 0.6,
  mouseSensitivity = 0.8,
  rotationSpeed = 1,
  size = 0.05
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    let frameId: number;
    let fallbackCleanup: (() => void) | null = null;
    let threeCleanup: (() => void) | null = null;

    try {
      // Test WebGL context accessibility on a dummy canvas first to fail-gracefully
      // and avoid creating a conflicting context type on the target canvas before ThreeJS initializes.
      const dummyCanvas = document.createElement('canvas');
      const gl = dummyCanvas.getContext('webgl') || dummyCanvas.getContext('experimental-webgl');
      if (!gl) {
         throw new Error("WebGL capability is unavailable or blocked on this device.");
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        alpha: true, 
        antialias: true 
      });
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const palette = [
        new THREE.Color('#0ea5e9'), // Sky Blue
        new THREE.Color('#ef4444'), // Red
      ];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        
        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: size,
        vertexColors: true,
        transparent: true,
        opacity: 1, 
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      camera.position.z = 5;

      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      };
      window.addEventListener('resize', onResize);

      const animate = () => {
        frameId = requestAnimationFrame(animate);
        points.rotation.y += 0.0008 * rotationSpeed;
        points.rotation.x += 0.0004 * rotationSpeed;
        
        camera.position.x += (mouseX * mouseSensitivity - camera.position.x) * 0.03;
        camera.position.y += (-mouseY * mouseSensitivity - camera.position.y) * 0.03;
        camera.lookAt(scene.position);
        
        renderer.render(scene, camera);
      };

      animate();

      threeCleanup = () => {
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        geometry.dispose();
        material.dispose();
      };

    } catch (e) {
      console.warn("WebGL blocked or unsupported on this device. Activating beautiful Canvas 2D fallback perspective engine...", e);

      let width = window.innerWidth;
      let height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      interface Particle2D {
        x: number;
        y: number;
        z: number;
        color: string;
      }

      const particles: Particle2D[] = [];
      const colorsPalette = ['#0ea5e9', '#ef4444'];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: (Math.random() - 0.5) * 1200,
          y: (Math.random() - 0.5) * 1200,
          z: (Math.random() - 0.5) * 1200,
          color: colorsPalette[Math.floor(Math.random() * colorsPalette.length)]
        });
      }

      const ctx = canvas.getContext('2d');

      const onResizeFallback = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
      };
      window.addEventListener('resize', onResizeFallback);

      let currentCamX = 0;
      let currentCamY = 0;

      const animateFallback = () => {
        frameId = requestAnimationFrame(animateFallback);
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const angleY = 0.0008 * rotationSpeed;
        const angleX = 0.0004 * rotationSpeed;

        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);

        const targetCamX = mouseX * mouseSensitivity * 150;
        const targetCamY = -mouseY * mouseSensitivity * 150;
        currentCamX += (targetCamX - currentCamX) * 0.03;
        currentCamY += (targetCamY - currentCamY) * 0.03;

        for (const p of particles) {
          const x1 = p.x * cosY - p.z * sinY;
          const z1 = p.z * cosY + p.x * sinY;

          const y2 = p.y * cosX - z1 * sinX;
          const z2 = z1 * cosX + p.y * sinX;

          p.x = x1;
          p.y = y2;
          p.z = z2;

          const fov = 500;
          const distance = 800;
          const projectedZ = p.z + distance;

          if (projectedZ <= 0) continue;

          const scale = fov / projectedZ;
          const projX = (p.x - currentCamX) * scale + width / 2;
          const projY = (p.y - currentCamY) * scale + height / 2;

          if (projX >= 0 && projX <= width && projY >= 0 && projY <= height) {
            const baseSizeMultiplier = size * 100;
            const finalSize = Math.max(0.6, baseSizeMultiplier * scale);
            const alphaVal = Math.min(1.0, Math.max(0.15, scale * 1.5));
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alphaVal;
            ctx.beginPath();
            ctx.arc(projX, projY, finalSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1.0;
      };

      animateFallback();

      fallbackCleanup = () => {
        window.removeEventListener('resize', onResizeFallback);
      };
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frameId);
      if (threeCleanup) {
        threeCleanup();
      }
      if (fallbackCleanup) {
        fallbackCleanup();
      }
    };
  }, [count, opacity, mouseSensitivity, rotationSpeed]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ opacity: opacity }}
    />
  );
};
