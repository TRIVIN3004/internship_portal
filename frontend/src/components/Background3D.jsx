import React, { useEffect, useRef } from 'react';

export default function Background3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse Parallax Tracking
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- 3D Particle Field & Network Nodes ---
    const PARTICLE_COUNT = 65;
    const particles = [];
    const FOV = 400; // Field of view for 3D perspective projection

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 - 400,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        vz: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1.5,
        color: i % 3 === 0 ? 'rgba(59, 130, 246, ' : i % 3 === 1 ? 'rgba(6, 182, 212, ' : 'rgba(16, 185, 129, '
      });
    }

    // --- 3D Rotating Geometries (Cube & Octahedron Wireframes) ---
    const createWireframeCube = (size) => [
      { x: -size, y: -size, z: -size }, { x: size, y: -size, z: -size },
      { x: size, y: size, z: -size },   { x: -size, y: size, z: -size },
      { x: -size, y: -size, z: size },  { x: size, y: -size, z: size },
      { x: size, y: size, z: size },    { x: -size, y: size, z: size },
    ];

    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    const cubeVertices = createWireframeCube(90);
    let rotX = 0;
    let rotY = 0;
    let rotZ = 0;

    // --- Render Loop ---
    const render = () => {
      // Smooth mouse interpolation for parallax
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;
      const offsetX = (mouse.x - width / 2) * 0.15;
      const offsetY = (mouse.y - height / 2) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle connecting neural 3D lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        // Move particle in 3D
        p1.x += p1.vx;
        p1.y += p1.vy;
        p1.z += p1.vz;

        // Wrap boundaries in 3D
        if (p1.x < -width / 1.2) p1.x = width / 1.2;
        if (p1.x > width / 1.2) p1.x = -width / 1.2;
        if (p1.y < -height / 1.2) p1.y = height / 1.2;
        if (p1.y > height / 1.2) p1.y = -height / 1.2;
        if (p1.z < -400) p1.z = 400;
        if (p1.z > 400) p1.z = -400;

        // Project 3D to 2D
        const scale1 = FOV / (FOV + p1.z + 500);
        const projX1 = (p1.x + offsetX) * scale1 + width / 2;
        const projY1 = (p1.y + offsetY) * scale1 + height / 2;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 180) {
            const scale2 = FOV / (FOV + p2.z + 500);
            const projX2 = (p2.x + offsetX) * scale2 + width / 2;
            const projY2 = (p2.y + offsetY) * scale2 + height / 2;

            const alpha = (1 - dist / 180) * 0.15 * scale1;
            ctx.beginPath();
            ctx.moveTo(projX1, projY1);
            ctx.lineTo(projX2, projY2);
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 1 * scale1;
            ctx.stroke();
          }
        }

        // Draw particle dot with glow
        const alpha = Math.min(1, Math.max(0.1, (scale1 - 0.3) * 1.5));
        ctx.beginPath();
        ctx.arc(projX1, projY1, p1.radius * scale1, 0, Math.PI * 2);
        ctx.fillStyle = `${p1.color}${alpha})`;
        ctx.shadowBlur = 8 * scale1;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 2. Draw Rotating Floating 3D Wireframe Cube
      rotX += 0.005;
      rotY += 0.007;
      rotZ += 0.003;

      const projectedCube = cubeVertices.map((v) => {
        // Rotate around X
        let y1 = v.y * Math.cos(rotX) - v.z * Math.sin(rotX);
        let z1 = v.y * Math.sin(rotX) + v.z * Math.cos(rotX);
        
        // Rotate around Y
        let x2 = v.x * Math.cos(rotY) + z1 * Math.sin(rotY);
        let z2 = -v.x * Math.sin(rotY) + z1 * Math.cos(rotY);
        
        // Rotate around Z
        let x3 = x2 * Math.cos(rotZ) - y1 * Math.sin(rotZ);
        let y3 = x2 * Math.sin(rotZ) + y1 * Math.cos(rotZ);

        // Position in scene
        const cx = x3 + (width > 768 ? width * 0.35 : 0) + offsetX * 0.5;
        const cy = y3 - height * 0.1 + offsetY * 0.5;
        const cz = z2 + 200;

        const scale = FOV / (FOV + cz);
        return {
          x: cx * scale + width / 2,
          y: cy * scale + height / 2,
          scale
        };
      });

      // Draw edges of 3D Wireframe Cube
      cubeEdges.forEach(([start, end]) => {
        const pStart = projectedCube[start];
        const pEnd = projectedCube[end];

        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.3)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Dynamic 3D HTML5 Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />

      {/* Ambient Glowing 3D Glass Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-cyan-400/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-emerald-400/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 to-blue-400/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '10s' }} />
    </div>
  );
}
