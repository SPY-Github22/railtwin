import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DADAR_PLATFORMS, DADAR_FOBS, CongestionLevel } from '../domain/station.ts';
import { ActiveTrainState } from '../domain/trainRakeEngine.ts';
import { DetailedRoute } from '../domain/interchangeRouter.ts';
import { Layers, Compass, ZoomIn, Plus, Minus, RotateCcw } from 'lucide-react';

export type CameraViewPreset = 'OVERVIEW' | 'WESTERN' | 'CENTRAL' | 'BRIDGES';

interface DadarStationCanvasProps {
  trains?: ActiveTrainState[];
  selectedPlatform?: number | null;
  onSelectPlatform?: (platformNumber: number) => void;
  selectedFobId?: string | null;
  onSelectFob?: (fobId: string) => void;
  activeRoute?: DetailedRoute | null;
}

export const DadarStationCanvas: React.FC<DadarStationCanvasProps> = ({
  trains = [],
  selectedPlatform,
  onSelectPlatform,
  selectedFobId,
  onSelectFob,
  activeRoute,
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
  const routeGroupRef = useRef<THREE.Group | null>(null);

  // Camera preset handler with smooth camera target
  const applyCameraPreset = useCallback((preset: CameraViewPreset) => {
    setActiveView(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'OVERVIEW':
        camera.position.set(0, 52, 68);
        controls.target.set(0, 0, 0);
        break;
      case 'WESTERN':
        camera.position.set(-18, 30, 36);
        controls.target.set(-18, 0, 0);
        break;
      case 'CENTRAL':
        camera.position.set(18, 30, 36);
        controls.target.set(18, 0, 0);
        break;
      case 'BRIDGES':
        camera.position.set(0, 65, 8);
        controls.target.set(0, 5, 0);
        break;
    }
    controls.update();
  }, []);

  // Zoom helpers
  const handleZoom = (delta: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, delta);
    controlsRef.current.update();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene setup: Clean White / Daylight Architectural Palette
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#f8fafc'); // Clean off-white daylight
    scene.fog = new THREE.FogExp2('#f8fafc', 0.004);

    // 2. Camera setup
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 350);
    camera.position.set(0, 52, 68);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // 4. OrbitControls: Full Screen-Space Free Panning & Orbit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.screenSpacePanning = true; // Enables moving around freely in 3D
    controls.panSpeed = 1.2;
    controls.maxPolarAngle = Math.PI / 2.08; // Clamp right above horizon
    controls.minDistance = 8;
    controls.maxDistance = 140;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Daylight Lighting & Soft Sunlight Shadows
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.05);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.6);
    sunLight.position.set(40, 60, 45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Secondary fill light for soft contrast
    const fillLight = new THREE.DirectionalLight('#e0f2fe', 0.6);
    fillLight.position.set(-30, 40, -30);
    scene.add(fillLight);

    // 6. Ground Plaza & Urban Canvas
    const groundGeo = new THREE.PlaneGeometry(180, 140);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#edf2f7',
      roughness: 0.9,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.02;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Subtle modern architectural grid
    const architecturalGrid = new THREE.GridHelper(180, 90, '#cbd5e1', '#e2e8f0');
    architecturalGrid.position.y = 0.01;
    scene.add(architecturalGrid);

    // 7. Station Concourse Buildings (West & East Facades)
    // West Concourse (Dadar West / Senapati Bapat Marg)
    const westBldgGeo = new THREE.BoxGeometry(8, 9, 75);
    const bldgMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.1,
    });
    const westBldg = new THREE.Mesh(westBldgGeo, bldgMat);
    westBldg.position.set(-37, 4.5, 0);
    westBldg.castShadow = true;
    westBldg.receiveShadow = true;
    scene.add(westBldg);

    // East Concourse (Dadar East / Lakhamsi Nappu Road)
    const eastBldgGeo = new THREE.BoxGeometry(8, 9, 75);
    const eastBldg = new THREE.Mesh(eastBldgGeo, bldgMat);
    eastBldg.position.set(37, 4.5, 0);
    eastBldg.castShadow = true;
    eastBldg.receiveShadow = true;
    scene.add(eastBldg);

    // Tilak Road Flyover Bridge at South End
    const roadBridgeGeo = new THREE.BoxGeometry(85, 1.2, 10);
    const roadMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8 });
    const roadBridge = new THREE.Mesh(roadBridgeGeo, roadMat);
    roadBridge.position.set(0, 6.2, 36);
    roadBridge.castShadow = true;
    roadBridge.receiveShadow = true;
    scene.add(roadBridge);

    // 8. Procedural Station Platforms & Canopies
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

    const platformConcreteMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.6,
      metalness: 0.05,
    });

    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#eab308' });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    DADAR_PLATFORMS.forEach((pf) => {
      const pfGroup = new THREE.Group();
      const posX = getPlatformX(pf.number);

      // Main concrete platform slab
      const slabGeo = new THREE.BoxGeometry(platformWidth, platformHeight, platformLength);
      const slabMesh = new THREE.Mesh(slabGeo, platformConcreteMat.clone());
      slabMesh.position.set(posX, platformHeight / 2, 0);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      slabMesh.userData = { type: 'PLATFORM', number: pf.number, line: pf.line };
      pfGroup.add(slabMesh);
      platformMeshesRef.current.set(pf.number, slabMesh);

      // Yellow safety edge lines
      const edgeGeo = new THREE.BoxGeometry(0.12, 0.03, platformLength);
      const leftEdge = new THREE.Mesh(edgeGeo, yellowLineMat);
      leftEdge.position.set(posX - platformWidth / 2 + 0.1, platformHeight + 0.02, 0);
      const rightEdge = new THREE.Mesh(edgeGeo, yellowLineMat);
      rightEdge.position.set(posX + platformWidth / 2 - 0.1, platformHeight + 0.02, 0);
      pfGroup.add(leftEdge);
      pfGroup.add(rightEdge);

      // Track bed ballast on adjacent side
      const trackBedGeo = new THREE.BoxGeometry(0.85, 0.12, platformLength);
      const trackMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.9 });
      const trackBed = new THREE.Mesh(trackBedGeo, trackMat);
      trackBed.position.set(posX + platformWidth / 2 + 0.6, 0.06, 0);
      pfGroup.add(trackBed);

      // Curved Corrugated Station Canopy / Shed overhead
      const canopyGeo = new THREE.BoxGeometry(platformWidth + 0.4, 0.12, platformLength * 0.75);
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(posX, 4.4, 0);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      pfGroup.add(canopy);

      // Canopy support pillars
      const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: '#94a3b8' });
      for (let pz = -24; pz <= 24; pz += 12) {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(posX, 2.7, pz);
        pillar.castShadow = true;
        pfGroup.add(pillar);
      }

      scene.add(pfGroup);
    });

    // 9. Elevated Foot Overbridges (North, Middle, South)
    const fobElev = 5.2;
    const fobZPositions: Record<string, number> = {
      'north-fob': -22,
      'middle-fob': 0,
      'south-fob': 22,
    };

    const getFobColor = (congestion: CongestionLevel): string => {
      switch (congestion) {
        case 'FREE_FLOW':
          return '#10b981'; // Modern Emerald
        case 'MODERATE':
          return '#f59e0b'; // Amber
        case 'CHOKED':
          return '#ef4444'; // Red
      }
    };

    DADAR_FOBS.forEach((fob) => {
      const fobGroup = new THREE.Group();
      const zPos = fobZPositions[fob.id] ?? 0;
      const spanX = 72; // Spanning Western concourse to Central concourse

      // Modern Bridge Deck
      const bridgeGeo = new THREE.BoxGeometry(spanX, 0.6, fob.widthMeters * 0.5);
      const bridgeMat = new THREE.MeshStandardMaterial({
        color: getFobColor(fob.congestion),
        roughness: 0.3,
        metalness: 0.1,
      });

      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridgeMesh.position.set(0, fobElev, zPos);
      bridgeMesh.castShadow = true;
      bridgeMesh.receiveShadow = true;
      bridgeMesh.userData = { type: 'FOB', id: fob.id, name: fob.name };
      fobGroup.add(bridgeMesh);
      fobMeshesRef.current.set(fob.id, bridgeMesh);

      // Structural steel columns down to ground
      const colGeo = new THREE.CylinderGeometry(0.3, 0.3, fobElev, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: '#64748b' });
      [-28, -14, 0, 14, 28].forEach((cx) => {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx, fobElev / 2, zPos);
        col.castShadow = true;
        fobGroup.add(col);
      });

      // Staircases down to platforms
      const stairGeo = new THREE.BoxGeometry(1.6, 0.25, 4.5);
      const stairMat = new THREE.MeshStandardMaterial({ color: '#94a3b8' });
      fob.connectedPlatforms.forEach((pfNum) => {
        if (pfNum % 2 === 0) {
          const stair = new THREE.Mesh(stairGeo, stairMat);
          const px = getPlatformX(pfNum);
          stair.rotation.x = Math.PI / 6;
          stair.position.set(px, fobElev / 2 + 0.6, zPos + 3.2);
          stair.castShadow = true;
          fobGroup.add(stair);
        }
      });

      scene.add(fobGroup);
    });

    // 10. Raycasting for Interaction
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

    // 11. Resize handler
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 12. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 13. Complete Cleanup on Unmount
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
      if (routeGroupRef.current) {
        scene.remove(routeGroupRef.current);
        routeGroupRef.current = null;
      }
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
        const newGroup = new THREE.Group();
        const coachLength = 4.4;
        const coachSpacing = 4.6;
        const totalCoaches = train.coaches.length;
        const startZ = -((totalCoaches * coachSpacing) / 2);

        train.coaches.forEach((coach, idx) => {
          const coachGroup = new THREE.Group();
          const localZ = startZ + idx * coachSpacing;

          // Main Coach Body (Clean modern aluminum / white livery)
          const bodyGeo = new THREE.BoxGeometry(1.6, 1.4, coachLength);
          const bodyMat = new THREE.MeshStandardMaterial({
            color: train.isAC ? '#0284c7' : '#ffffff',
            metalness: 0.3,
            roughness: 0.2,
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
          const windowMat = new THREE.MeshBasicMaterial({ color: '#0284c7' });
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

  // Synchronize 3D Waypoint Path Vector for Interchange Route
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (routeGroupRef.current) {
      scene.remove(routeGroupRef.current);
      routeGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      routeGroupRef.current = null;
    }

    if (!activeRoute || activeRoute.waypoints3D.length < 2) return;

    const routeGroup = new THREE.Group();

    // 1. Build smooth 3D Catmull-Rom spline through waypoints
    const points = activeRoute.waypoints3D.map(
      (w) => new THREE.Vector3(w.x, w.y + 0.35, w.z)
    );
    const curve = new THREE.CatmullRomCurve3(points);

    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.32, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: '#2563eb',
      emissive: new THREE.Color('#3b82f6'),
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.castShadow = true;
    routeGroup.add(tubeMesh);

    // 2. Start Beacon Pin on Source Platform
    const startW = activeRoute.waypoints3D[0];
    const pinGeo = new THREE.CylinderGeometry(0.5, 0.1, 2.0, 16);
    const startPinMat = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#10b981',
      emissiveIntensity: 0.5,
    });
    const startPin = new THREE.Mesh(pinGeo, startPinMat);
    startPin.position.set(startW.x, startW.y + 1.2, startW.z);
    routeGroup.add(startPin);

    // 3. Finish Beacon Pin on Target Platform
    const endW = activeRoute.waypoints3D[activeRoute.waypoints3D.length - 1];
    const endPinMat = new THREE.MeshStandardMaterial({
      color: '#8b5cf6',
      emissive: '#8b5cf6',
      emissiveIntensity: 0.5,
    });
    const endPin = new THREE.Mesh(pinGeo, endPinMat);
    endPin.position.set(endW.x, endW.y + 1.2, endW.z);
    routeGroup.add(endPin);

    scene.add(routeGroup);
    routeGroupRef.current = routeGroup;
  }, [activeRoute]);

  // Synchronize selection highlight and smooth camera glide
  useEffect(() => {
    platformMeshesRef.current.forEach((mesh, pfNum) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedPlatform === pfNum) {
        mat.color.set('#3b82f6');
      } else {
        mat.color.set('#f8fafc');
      }
    });

    fobMeshesRef.current.forEach((mesh, fobId) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedFobId === fobId) {
        mat.emissiveIntensity = 0.5;
      } else {
        mat.emissiveIntensity = 0.1;
      }
    });
  }, [selectedPlatform, selectedFobId]);

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden bg-slate-100">
      {/* 3D WebGL Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Modern Camera & Navigation Pill Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1.5 bg-white/95 px-2 py-1.5 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 backdrop-blur">
        <button
          type="button"
          onClick={() => applyCameraPreset('OVERVIEW')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Station</span>
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('WESTERN')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'WESTERN'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          <span>Western</span>
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('CENTRAL')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'CENTRAL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-500" />
          <span>Central</span>
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('BRIDGES')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeView === 'BRIDGES'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5 text-amber-500" />
          <span>Bridges</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

        {/* Free Zoom & Reset Buttons */}
        <button
          type="button"
          onClick={() => handleZoom(8)}
          title="Zoom In"
          aria-label="Zoom In"
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-8)}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition active:scale-95"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('OVERVIEW')}
          title="Recenter Camera"
          aria-label="Recenter Camera"
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Hover Badge */}
      {hoveredEntity && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-xs font-bold text-slate-800 shadow-md backdrop-blur flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>{hoveredEntity}</span>
          <span className="text-[10px] text-slate-400 font-normal">· Click to focus</span>
        </div>
      )}

      {/* Clean Modern Spatial Legend */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-[11px] font-semibold text-slate-600 shadow-md backdrop-blur">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Clear Bridge</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Moderate</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>Choked</span>
        </div>
        <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-2">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>3D Route</span>
        </div>
      </div>
    </div>
  );
};
