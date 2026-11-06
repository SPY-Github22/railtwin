import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DADAR_PLATFORMS, DADAR_FOBS, CongestionLevel } from '../domain/station.ts';
import { ActiveTrainState } from '../domain/trainRakeEngine.ts';
import { Eye, Layers, Compass, ZoomIn } from 'lucide-react';

export type CameraViewPreset = 'OVERVIEW' | 'WESTERN' | 'CENTRAL' | 'BRIDGES';

interface DadarStationCanvasProps {
  trains?: ActiveTrainState[];
  selectedPlatform?: number | null;
  onSelectPlatform?: (platformNumber: number) => void;
  selectedFobId?: string | null;
  onSelectFob?: (fobId: string) => void;
}

export const DadarStationCanvas: React.FC<DadarStationCanvasProps> = ({
  trains = [],
  selectedPlatform,
  onSelectPlatform,
  selectedFobId,
  onSelectFob,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<CameraViewPreset>('OVERVIEW');
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  // References to keep Three.js instances alive without re-creating
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const platformMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const fobMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const trainGroupsRef = useRef<Map<string, THREE.Group>>(new Map());

  // Camera preset handler with smooth lerp
  const applyCameraPreset = useCallback((preset: CameraViewPreset) => {
    setActiveView(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'OVERVIEW':
        camera.position.set(0, 48, 64);
        controls.target.set(0, 0, 0);
        break;
      case 'WESTERN':
        camera.position.set(-18, 28, 36);
        controls.target.set(-18, 0, 0);
        break;
      case 'CENTRAL':
        camera.position.set(18, 28, 36);
        controls.target.set(18, 0, 0);
        break;
      case 'BRIDGES':
        camera.position.set(0, 60, 8);
        controls.target.set(0, 5, 0);
        break;
    }
    controls.update();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#080c14');
    scene.fog = new THREE.FogExp2('#080c14', 0.007);

    // 2. Camera setup
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    camera.position.set(0, 48, 64);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.15; // Don't allow camera under ground
    controls.minDistance = 15;
    controls.maxDistance = 120;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#93c5fd', 1.4);
    dirLight.position.set(30, 50, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const groundGrid = new THREE.GridHelper(140, 70, '#1e293b', '#0f172a');
    groundGrid.position.y = -0.05;
    scene.add(groundGrid);

    // 6. Procedural Station Geometry Construction
    const platformLength = 70;
    const platformWidth = 3.2;
    const platformHeight = 1.0;

    const getPlatformX = (pfNum: number): number => {
      if (pfNum <= 7) {
        return -28 + (pfNum - 1) * 3.8;
      } else {
        return 5 + (pfNum - 8) * 3.8;
      }
    };

    const platformMaterial = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.8,
      metalness: 0.1,
    });

    const yellowLineMaterial = new THREE.MeshBasicMaterial({ color: '#facc15' });

    DADAR_PLATFORMS.forEach((pf) => {
      const pfGroup = new THREE.Group();
      const posX = getPlatformX(pf.number);

      // Main concrete platform slab
      const slabGeo = new THREE.BoxGeometry(platformWidth, platformHeight, platformLength);
      const slabMesh = new THREE.Mesh(slabGeo, platformMaterial.clone());
      slabMesh.position.set(posX, platformHeight / 2, 0);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      slabMesh.userData = { type: 'PLATFORM', number: pf.number, line: pf.line };
      pfGroup.add(slabMesh);
      platformMeshesRef.current.set(pf.number, slabMesh);

      // Yellow safety edge lines
      const edgeGeo = new THREE.BoxGeometry(0.12, 0.04, platformLength);
      const leftEdge = new THREE.Mesh(edgeGeo, yellowLineMaterial);
      leftEdge.position.set(posX - platformWidth / 2 + 0.1, platformHeight + 0.02, 0);
      const rightEdge = new THREE.Mesh(edgeGeo, yellowLineMaterial);
      rightEdge.position.set(posX + platformWidth / 2 - 0.1, platformHeight + 0.02, 0);
      pfGroup.add(leftEdge);
      pfGroup.add(rightEdge);

      // Tracks on sides
      const trackBedGeo = new THREE.BoxGeometry(0.8, 0.15, platformLength);
      const trackMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 });
      const trackBed = new THREE.Mesh(trackBedGeo, trackMat);
      trackBed.position.set(posX + platformWidth / 2 + 0.6, 0.08, 0);
      pfGroup.add(trackBed);

      // Platform Pillar Labels (1 to 24 along length)
      const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.2, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: '#64748b' });
      for (let pz = -28; pz <= 28; pz += 14) {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(posX, 1.6 + platformHeight / 2, pz);
        pfGroup.add(pillar);
      }

      scene.add(pfGroup);
    });

    // 7. Elevated Foot Overbridges (North, Middle, South)
    const fobElev = 5.2;
    const fobZPositions: Record<string, number> = {
      'north-fob': -22,
      'middle-fob': 0,
      'south-fob': 22,
    };

    const getFobColor = (congestion: CongestionLevel): string => {
      switch (congestion) {
        case 'FREE_FLOW':
          return '#10b981';
        case 'MODERATE':
          return '#f59e0b';
        case 'CHOKED':
          return '#ef4444';
      }
    };

    DADAR_FOBS.forEach((fob) => {
      const fobGroup = new THREE.Group();
      const zPos = fobZPositions[fob.id] ?? 0;
      const spanX = 64;

      // Bridge Deck
      const bridgeGeo = new THREE.BoxGeometry(spanX, 0.6, fob.widthMeters * 0.5);
      const bridgeMat = new THREE.MeshStandardMaterial({
        color: getFobColor(fob.congestion),
        roughness: 0.4,
        metalness: 0.3,
        emissive: new THREE.Color(getFobColor(fob.congestion)),
        emissiveIntensity: 0.25,
      });

      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridgeMesh.position.set(0, fobElev, zPos);
      bridgeMesh.castShadow = true;
      bridgeMesh.userData = { type: 'FOB', id: fob.id, name: fob.name };
      fobGroup.add(bridgeMesh);
      fobMeshesRef.current.set(fob.id, bridgeMesh);

      // Support Columns down to ground
      const colGeo = new THREE.CylinderGeometry(0.35, 0.35, fobElev, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: '#475569' });
      [-26, -12, 0, 14, 26].forEach((cx) => {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx, fobElev / 2, zPos);
        fobGroup.add(col);
      });

      // Staircase ramps landing on platform intersections
      const stairGeo = new THREE.BoxGeometry(1.6, 0.3, 4.5);
      const stairMat = new THREE.MeshStandardMaterial({ color: '#64748b' });
      fob.connectedPlatforms.forEach((pfNum) => {
        if (pfNum % 2 === 0) {
          const stair = new THREE.Mesh(stairGeo, stairMat);
          const px = getPlatformX(pfNum);
          stair.rotation.x = Math.PI / 6;
          stair.position.set(px, fobElev / 2 + 0.6, zPos + 3.2);
          fobGroup.add(stair);
        }
      });

      scene.add(fobGroup);
    });

    // 8. Raycasting for Commuter Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects.find((i) => i.object.userData && i.object.userData.type);
        if (hit) {
          const data = hit.object.userData;
          if (data.type === 'PLATFORM') {
            setHoveredEntity(`Platform ${data.number} (${data.line === 'WESTERN' ? 'Western' : 'Central'})`);
            mount.style.cursor = 'pointer';
            return;
          } else if (data.type === 'FOB') {
            setHoveredEntity(data.name);
            mount.style.cursor = 'pointer';
            return;
          }
        }
      }
      setHoveredEntity(null);
      mount.style.cursor = 'default';
    };

    const handleClick = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects.find((i) => i.object.userData && i.object.userData.type);
        if (hit) {
          const data = hit.object.userData;
          if (data.type === 'PLATFORM' && onSelectPlatform) {
            onSelectPlatform(data.number);
          } else if (data.type === 'FOB' && onSelectFob) {
            onSelectFob(data.id);
          }
        }
      }
    };

    mount.addEventListener('mousemove', handlePointerMove);
    mount.addEventListener('click', handleClick);

    // 9. Resize handler
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 11. Complete Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousemove', handlePointerMove);
      mount.removeEventListener('click', handleClick);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      platformMeshesRef.current.clear();
      fobMeshesRef.current.clear();
      trainGroupsRef.current.clear();
    };
  }, [applyCameraPreset, onSelectFob, onSelectPlatform]);

  // Synchronize 3D train meshes with active train roster telemetry
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const getPlatformX = (pfNum: number): number => {
      if (pfNum <= 7) {
        return -28 + (pfNum - 1) * 3.8;
      } else {
        return 5 + (pfNum - 8) * 3.8;
      }
    };

    trains.forEach((train) => {
      let trainGroup = trainGroupsRef.current.get(train.id);

      if (!trainGroup) {
        // Construct new 3D Suburban Train Rake
        const newGroup = new THREE.Group();
        const coachLength = 4.4;
        const coachSpacing = 4.6;
        const totalCoaches = train.coaches.length;
        const startZ = -((totalCoaches * coachSpacing) / 2);

        train.coaches.forEach((coach, idx) => {
          const coachGroup = new THREE.Group();
          const localZ = startZ + idx * coachSpacing;

          // Main Coach Body
          const bodyGeo = new THREE.BoxGeometry(1.6, 1.4, coachLength);
          const bodyMat = new THREE.MeshStandardMaterial({
            color: train.isAC ? '#0284c7' : '#1e293b',
            metalness: 0.4,
            roughness: 0.3,
          });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.castShadow = true;
          bodyMesh.receiveShadow = true;
          coachGroup.add(bodyMesh);

          // Coach Class Livery Stripe
          const stripeGeo = new THREE.BoxGeometry(1.62, 0.35, coachLength);
          const stripeMat = new THREE.MeshBasicMaterial({ color: coach.colorHex });
          const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
          stripeMesh.position.y = 0.15;
          coachGroup.add(stripeMesh);

          // Windows
          const windowGeo = new THREE.BoxGeometry(1.64, 0.4, 0.8);
          const windowMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
          [-1.2, 0, 1.2].forEach((wz) => {
            const win = new THREE.Mesh(windowGeo, windowMat);
            win.position.set(0, 0.25, wz);
            coachGroup.add(win);
          });

          coachGroup.position.set(0, 0, localZ);
          newGroup.add(coachGroup);
        });

        scene.add(newGroup);
        trainGroupsRef.current.set(train.id, newGroup);
        trainGroup = newGroup;
      }

      // Update position and visibility based on train telemetry
      const trackX = getPlatformX(train.platformNumber) + 2.2;
      trainGroup.position.set(trackX, 0.9, train.positionZ);
      trainGroup.visible = train.lifecycle !== 'CLEAR';
    });
  }, [trains]);

  // Synchronize selection highlight for platforms and FOBs
  useEffect(() => {
    platformMeshesRef.current.forEach((mesh, pfNum) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedPlatform === pfNum) {
        mat.color.set('#3b82f6');
        mat.emissive.set('#1d4ed8');
        mat.emissiveIntensity = 0.4;
      } else {
        mat.color.set('#334155');
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });

    fobMeshesRef.current.forEach((mesh, fobId) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedFobId === fobId) {
        mat.emissiveIntensity = 0.65;
      } else {
        mat.emissiveIntensity = 0.25;
      }
    });
  }, [selectedPlatform, selectedFobId]);

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden bg-gray-950">
      {/* 3D WebGL Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Camera Control Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 bg-gray-900/85 p-1.5 rounded-xl border border-gray-800 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => applyCameraPreset('OVERVIEW')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
            activeView === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Full Station</span>
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('WESTERN')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
            activeView === 'WESTERN'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Western (PF 1-7)</span>
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('CENTRAL')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
            activeView === 'CENTRAL'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Central (PF 8-14)</span>
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('BRIDGES')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
            activeView === 'BRIDGES'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Bridges Top-Down</span>
        </button>
      </div>

      {/* Hover tooltip / Status indicator */}
      {hoveredEntity && (
        <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-blue-500/40 text-xs font-semibold text-blue-300 shadow-xl backdrop-blur flex items-center space-x-2">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>{hoveredEntity}</span>
          <span className="text-[10px] text-gray-400 font-normal">(Click to inspect)</span>
        </div>
      )}

      {/* Spatial Legend */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-gray-800 text-[11px] text-gray-300 shadow-lg backdrop-blur">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
          <span>Ladies</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>1st Class</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>General</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <span>AC Local</span>
        </div>
      </div>
    </div>
  );
};
