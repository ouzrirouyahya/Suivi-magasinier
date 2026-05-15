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
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
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
      opacity: 1, // Full opacity for the dots themselves, controlled by container
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.z = 5;

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', onResize);

    let frameId: number;
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

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
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
