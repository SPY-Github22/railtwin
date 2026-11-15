import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DADAR_PLATFORMS } from '../domain/station.ts';
import { ActiveTrainState } from '../domain/trainRakeEngine.ts';
import {
  RotateCcw,
  Plus,
  Minus,
  Navigation,
} from 'lucide-react';

interface DadarStationCanvasProps {
  trains?: ActiveTrainState[];
  selectedPlatform?: number | null;
  onSelectPlatform?: (platformNumber: number) => void;
  selectedCoachPosition?: number | null;
}

/**
 * Creates 2D canvas texture for floating 3D coach locator badge
 */
function createCoachPinTexture(
  coachTitle: string,
  classTitle: string,
  colorHex: string = '#ec4899'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background rounded pill
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 28);
  ctx.fill();

  ctx.lineWidth = 8;
  ctx.strokeStyle = colorHex;
  ctx.stroke();

  // Pin circle icon
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.arc(60, 80, 24, 0, Math.PI * 2);
  ctx.fill();

  // Coach text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(coachTitle, 105, 60);

  ctx.fillStyle = colorHex;
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(classTitle.toUpperCase(), 105, 105);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates high-resolution 2D dynamic canvas textures for crisp 3D platform signboards
 */
function createPlatformLabelTexture(
  title: string,
  subtitle: string,
  accentColor: string = '#2563eb'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Card background with rounded corners
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 224, 32);
  ctx.fill();

  // Header accent bar
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 48, [32, 32, 0, 0]);
  ctx.fill();

  // Accent border
  ctx.lineWidth = 10;
  ctx.strokeStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 224, 32);
  ctx.stroke();

  // Large Platform Title (e.g. "PF 3")
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 84px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 120);

  // Subtitle (e.g. "WR FAST")
  ctx.fillStyle = accentColor;
  ctx.font = '800 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitle.toUpperCase(), 256, 185);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates bridge banner texture
 */
function createBridgeBannerTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(8, 8, 1008, 112, 16);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), 512, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const DadarStationCanvas: React.FC<DadarStationCanvasProps> = ({
  trains = [],
  selectedPlatform,
  onSelectPlatform,
  selectedCoachPosition,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<'OVERVIEW' | 'WESTERN' | 'CENTRAL' | 'NORTH_VIEW'>(() => {
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('view');
      if (v === 'NORTH') return 'NORTH_VIEW';
      if (v === 'WESTERN') return 'WESTERN';
      if (v === 'CENTRAL') return 'CENTRAL';
    }
    return 'OVERVIEW';
  });

  // References to keep Three.js alive
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const platformMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const platformSignsRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const billboardSignsRef = useRef<THREE.Mesh[]>([]);
  const trainGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const coachPinRef = useRef<THREE.Group | null>(null);

  // Calculates exact X position for platforms and tracks
  const getPlatformX = useCallback((pfNum: number): number => {
    if (pfNum <= 7) {
      // Western Line: Platforms 1 to 7
      return -32 + (pfNum - 1) * 4.6;
    } else {
      // Central Line: Platforms 8 to 14
      return 6 + (pfNum - 8) * 4.6;
    }
  }, []);

  // Camera Presets (Only triggered when user clicks preset buttons)
  const setCameraPreset = (preset: 'OVERVIEW' | 'WESTERN' | 'CENTRAL' | 'NORTH_VIEW') => {
    setActivePreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'OVERVIEW':
        camera.position.set(0, 62, 78);
        controls.target.set(0, 0, 0);
        break;
      case 'NORTH_VIEW':
        camera.position.set(0, 62, -78);
        controls.target.set(0, 0, 0);
        break;
      case 'WESTERN':
        camera.position.set(-18, 32, 42);
        controls.target.set(-18, 0, 0);
        break;
      case 'CENTRAL':
        camera.position.set(20, 32, 42);
        controls.target.set(20, 0, 0);
        break;
    }
    controls.update();
  };

  const handleZoom = (inOut: 'IN' | 'OUT') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, inOut === 'IN' ? 12 : -12);
    controlsRef.current.update();
  };

  const handleResetCamera = () => {
    setCameraPreset('OVERVIEW');
  };

  // 1. Initial Scene, Camera, Lighting, and Geometry Mount
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // A. Clean Daylight Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#f1f5f9'); // Clean slate daylight
    scene.fog = new THREE.FogExp2('#f1f5f9', 0.0035);

    // B. Perspective Camera
    const width = mount.clientWidth > 0 ? mount.clientWidth : window.innerWidth;
    const height = mount.clientHeight > 0 ? mount.clientHeight : window.innerHeight;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 450);
    if (activePreset === 'NORTH_VIEW') {
      camera.position.set(0, 62, -78);
    } else if (activePreset === 'WESTERN') {
      camera.position.set(-18, 32, 42);
    } else if (activePreset === 'CENTRAL') {
      camera.position.set(20, 32, 42);
    } else {
      camera.position.set(0, 62, 78);
    }
    cameraRef.current = camera;

    // C. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // D. OrbitControls: 100% Free, Smooth, Non-Interfering Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true; // Natural screen-space panning
    controls.panSpeed = 1.3;
    controls.rotateSpeed = 0.8;
    controls.maxPolarAngle = Math.PI / 2.05; // Do not go below ground
    controls.minDistance = 8;
    controls.maxDistance = 160;
    controls.target.set(0, 0, 0);

    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    // E. Realistic Daylight Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.8);
    sunLight.position.set(45, 80, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const skyLight = new THREE.DirectionalLight('#e0f2fe', 0.8);
    skyLight.position.set(-40, 60, -40);
    scene.add(skyLight);

    // F. Ground Foundation (Clean Urban Ballast & Plaza)
    const groundGeo = new THREE.PlaneGeometry(240, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.95,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.02;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Ground Grid Helper for subtle spatial depth
    const grid = new THREE.GridHelper(220, 44, '#cbd5e1', '#e2e8f0');
    grid.position.y = 0.01;
    scene.add(grid);

    // G. Realistic Platforms & Rail Tracks
    const platformLength = 100;
    const platformWidth = 3.4;
    const platformHeight = 1.0;

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.7,
      metalness: 0.1,
    });
    const yellowTileMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    const steelRailMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 });
    const woodSleeperMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.9 });
    const ballastMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.95 });

    DADAR_PLATFORMS.forEach((pf) => {
      const pfGroup = new THREE.Group();
      const px = getPlatformX(pf.number);
      const isWestern = pf.number <= 7;
      const accentColor = isWestern ? '#2563eb' : '#dc2626';

      // 1. Concrete Platform Slab
      const slabGeo = new THREE.BoxGeometry(platformWidth, platformHeight, platformLength);
      const slabMesh = new THREE.Mesh(slabGeo, concreteMat.clone());
      slabMesh.position.set(px, platformHeight / 2, 0);
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      slabMesh.userData = { type: 'PLATFORM', number: pf.number };
      pfGroup.add(slabMesh);
      platformMeshesRef.current.set(pf.number, slabMesh);

      // 2. Yellow Tactile Edge Safety Lines (Left & Right Platform Edges)
      const edgeGeo = new THREE.BoxGeometry(0.18, 0.03, platformLength);
      const leftEdge = new THREE.Mesh(edgeGeo, yellowTileMat);
      leftEdge.position.set(px - platformWidth / 2 + 0.12, platformHeight + 0.02, 0);
      const rightEdge = new THREE.Mesh(edgeGeo, yellowTileMat);
      rightEdge.position.set(px + platformWidth / 2 - 0.12, platformHeight + 0.02, 0);
      pfGroup.add(leftEdge);
      pfGroup.add(rightEdge);

      // 3. Realistic Railway Track Bed & Double Rails (Alongside platform)
      const trackX = px + platformWidth / 2 + 0.9;
      const ballastGeo = new THREE.BoxGeometry(1.6, 0.15, platformLength);
      const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
      ballastMesh.position.set(trackX, 0.08, 0);
      pfGroup.add(ballastMesh);

      // Double Steel Rails
      const railGeo = new THREE.BoxGeometry(0.06, 0.12, platformLength);
      const leftRail = new THREE.Mesh(railGeo, steelRailMat);
      leftRail.position.set(trackX - 0.45, 0.22, 0);
      const rightRail = new THREE.Mesh(railGeo, steelRailMat);
      rightRail.position.set(trackX + 0.45, 0.22, 0);
      pfGroup.add(leftRail);
      pfGroup.add(rightRail);

      // Wooden / Concrete Sleepers
      const sleeperGeo = new THREE.BoxGeometry(1.3, 0.08, 0.22);
      for (let sz = -platformLength / 2 + 1; sz <= platformLength / 2 - 1; sz += 1.2) {
        const sleeper = new THREE.Mesh(sleeperGeo, woodSleeperMat);
        sleeper.position.set(trackX, 0.16, sz);
        pfGroup.add(sleeper);
      }

      // 4. Station Canopy Pillars & Modern Light Canopy
      const canopyPillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: '#64748b' });
      for (let pz = -36; pz <= 36; pz += 18) {
        const pillar = new THREE.Mesh(canopyPillarGeo, pillarMat);
        pillar.position.set(px, 2.8, pz);
        pillar.castShadow = true;
        pfGroup.add(pillar);
      }

      // Transparent / Lightweight Roof Canopy
      const roofGeo = new THREE.BoxGeometry(platformWidth + 0.6, 0.1, 76);
      const roofMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.3,
        metalness: 0.2,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(px, 4.8, 0);
      roof.castShadow = true;
      pfGroup.add(roof);

      // 5. Crisp, High-Visibility Platform Signboards (Auto-Faces Camera)
      const labelText = `PF ${pf.number}`;
      const lineSubtext = isWestern ? 'Western' : 'Central';
      const labelTexture = createPlatformLabelTexture(labelText, lineSubtext, accentColor);
      const signGeo = new THREE.PlaneGeometry(3.6, 1.8);
      const signMat = new THREE.MeshBasicMaterial({
        map: labelTexture,
        side: THREE.FrontSide,
        transparent: true,
      });

      // Signboards placed at North, Center, and South of platform
      [-32, 0, 32].forEach((sz) => {
        const signMesh = new THREE.Mesh(signGeo, signMat);
        signMesh.position.set(px, 5.8, sz);
        pfGroup.add(signMesh);
        billboardSignsRef.current.push(signMesh);
        if (sz === 0) {
          platformSignsRef.current.set(pf.number, signMesh);
        }
      });

      scene.add(pfGroup);
    });

    // H. Realistic Architectural Foot Overbridges (North, Middle, South)
    // Real pedestrian walkways with realistic truss frameworks and staircases down to platforms!
    const fobConfigs = [
      { id: 'north-fob', name: 'North Foot Overbridge', zPos: -24 },
      { id: 'middle-fob', name: 'Central Interchange Overbridge', zPos: 0 },
      { id: 'south-fob', name: 'South Foot Overbridge', zPos: 24 },
    ];

    const bridgeHeight = 6.4;
    const bridgeSpan = 74;
    const bridgeWidth = 3.6;

    const bridgeFrameMat = new THREE.MeshStandardMaterial({
      color: '#334155', // Slate structural steel
      metalness: 0.5,
      roughness: 0.4,
    });
    const bridgeDeckMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0', // Walkway concrete
      roughness: 0.8,
    });
    const bridgeGlassMat = new THREE.MeshStandardMaterial({
      color: '#93c5fd', // Translucent blue safety glass
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    fobConfigs.forEach((fob) => {
      const fobGroup = new THREE.Group();

      // Main Walkway Deck
      const deckGeo = new THREE.BoxGeometry(bridgeSpan, 0.4, bridgeWidth);
      const deck = new THREE.Mesh(deckGeo, bridgeDeckMat);
      deck.position.set(0, bridgeHeight, fob.zPos);
      deck.castShadow = true;
      deck.receiveShadow = true;
      fobGroup.add(deck);

      // Overhead Roof Canopy
      const roofGeo = new THREE.BoxGeometry(bridgeSpan + 1, 0.2, bridgeWidth + 0.6);
      const roof = new THREE.Mesh(roofGeo, bridgeFrameMat);
      roof.position.set(0, bridgeHeight + 2.8, fob.zPos);
      roof.castShadow = true;
      fobGroup.add(roof);

      // Glass Safety Guard Rails (North & South edges of bridge)
      const railGeo = new THREE.BoxGeometry(bridgeSpan, 1.4, 0.1);
      const northRail = new THREE.Mesh(railGeo, bridgeGlassMat);
      northRail.position.set(0, bridgeHeight + 0.8, fob.zPos - bridgeWidth / 2 + 0.05);
      const southRail = new THREE.Mesh(railGeo, bridgeGlassMat);
      southRail.position.set(0, bridgeHeight + 0.8, fob.zPos + bridgeWidth / 2 - 0.05);
      fobGroup.add(northRail);
      fobGroup.add(southRail);

      // Structural Support Pillars down to ground
      const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, bridgeHeight, 12);
      [-32, -18, -4, 10, 24, 34].forEach((colX) => {
        const pillar = new THREE.Mesh(pillarGeo, bridgeFrameMat);
        pillar.position.set(colX, bridgeHeight / 2, fob.zPos);
        pillar.castShadow = true;
        fobGroup.add(pillar);
      });

      // Staircases Connecting Down to Platforms
      const stairGeo = new THREE.BoxGeometry(1.6, 0.25, 5.2);
      const stairMat = new THREE.MeshStandardMaterial({ color: '#64748b' });
      // Alternate staircase ramps to platforms
      [1, 3, 5, 8, 10, 12, 14].forEach((pfNum) => {
        const px = getPlatformX(pfNum);
        const stair = new THREE.Mesh(stairGeo, stairMat);
        stair.rotation.x = Math.PI / 6;
        stair.position.set(px, bridgeHeight / 2 + 0.8, fob.zPos + (bridgeWidth / 2 + 2.2));
        stair.castShadow = true;
        fobGroup.add(stair);
      });

      // Overhead Banner Signs for the Bridge (Dual-Sided: Never Mirrored)
      const bannerTexture = createBridgeBannerTexture(fob.name);
      const bannerGeo = new THREE.PlaneGeometry(18, 2.2);
      const bannerMat = new THREE.MeshBasicMaterial({
        map: bannerTexture,
        side: THREE.FrontSide,
        transparent: true,
      });

      // South-facing banner (visible when looking North)
      const bannerSouth = new THREE.Mesh(bannerGeo, bannerMat);
      bannerSouth.position.set(0, bridgeHeight + 3.8, fob.zPos + bridgeWidth / 2 + 0.1);
      bannerSouth.rotation.y = 0;
      fobGroup.add(bannerSouth);

      // North-facing banner (flipped 180° so text reads correctly when looking South from the backside!)
      const bannerNorth = new THREE.Mesh(bannerGeo, bannerMat);
      bannerNorth.position.set(0, bridgeHeight + 3.8, fob.zPos - bridgeWidth / 2 - 0.1);
      bannerNorth.rotation.y = Math.PI;
      fobGroup.add(bannerNorth);

      scene.add(fobGroup);
    });

    // I. Tilak Flyover (Crossing at the South end of the station)
    const flyoverGroup = new THREE.Group();
    const flyoverGeo = new THREE.BoxGeometry(bridgeSpan + 20, 1.2, 8.0);
    const flyoverMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 });
    const flyover = new THREE.Mesh(flyoverGeo, flyoverMat);
    flyover.position.set(0, 9.2, 44);
    flyover.castShadow = true;
    flyoverGroup.add(flyover);

    // Flyover Pillars
    const flyoverPillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 9.2, 16);
    [-24, 0, 24].forEach((fx) => {
      const p = new THREE.Mesh(flyoverPillarGeo, bridgeFrameMat);
      p.position.set(fx, 4.6, 44);
      p.castShadow = true;
      flyoverGroup.add(p);
    });
    scene.add(flyoverGroup);

    // J. Interactive Raycasting: 1-Click Platform Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects.find((i) => i.object.userData && i.object.userData.type === 'PLATFORM');
        if (hit && onSelectPlatform) {
          onSelectPlatform(hit.object.userData.number);
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // K. ResizeObserver for responsive canvas
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(mount);

    // L. Render Animation Loop: Dynamically Rotates Signs to Always Face User
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update(); // Smooth damping

      // Cylindrical Billboarding: Rotate all platform signboards to always face the camera
      // Prevents text mirroring from any orbit angle!
      if (billboardSignsRef.current.length > 0) {
        const camX = camera.position.x;
        const camZ = camera.position.z;
        for (let i = 0; i < billboardSignsRef.current.length; i++) {
          const sign = billboardSignsRef.current[i];
          sign.rotation.y = Math.atan2(camX - sign.position.x, camZ - sign.position.z);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      billboardSignsRef.current = [];

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
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [getPlatformX, onSelectPlatform]);

  // 2. Synchronize Trains Telemetry (EMU Rakes on Tracks)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

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

          // Main Coach Body (Clean aluminum body)
          const bodyGeo = new THREE.BoxGeometry(1.6, 1.4, coachLength);
          const bodyMat = new THREE.MeshStandardMaterial({
            color: train.isAC ? '#0284c7' : '#ffffff',
            metalness: 0.3,
            roughness: 0.2,
          });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.castShadow = true;
          bodyMesh.receiveShadow = true;
          bodyMesh.userData = {
            type: 'COACH',
            trainId: train.id,
            coachPosition: coach.position,
            colorHex: coach.colorHex,
          };
          coachGroup.add(bodyMesh);

          // Coach Class Livery Stripe
          const stripeGeo = new THREE.BoxGeometry(1.62, 0.35, coachLength);
          const stripeMat = new THREE.MeshBasicMaterial({ color: coach.colorHex });
          const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
          stripeMesh.position.y = 0.15;
          coachGroup.add(stripeMesh);

          // Windows
          const windowGeo = new THREE.BoxGeometry(1.64, 0.4, 0.8);
          const windowMat = new THREE.MeshBasicMaterial({ color: '#1e293b' });
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

      // Position train on its platform track
      const trackX = getPlatformX(train.platformNumber) + 2.6;
      trainGroup.position.set(trackX, 0.9, train.positionZ);
      trainGroup.visible = train.lifecycle !== 'CLEAR';
    });
  }, [trains, getPlatformX]);

  // 4. Synchronize Selected Coach Highlight & Floating 3D Beacon Pin
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Emissive highlight on the selected coach mesh
    trains.forEach((train) => {
      const trainGroup = trainGroupsRef.current.get(train.id);
      if (!trainGroup) return;

      const isSelectedPlatform = train.platformNumber === selectedPlatform;

      trainGroup.children.forEach((coachGroup) => {
        coachGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.userData && child.userData.type === 'COACH') {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (isSelectedPlatform && child.userData.coachPosition === selectedCoachPosition) {
              mat.emissive.set(child.userData.colorHex || '#3b82f6');
              mat.emissiveIntensity = 0.85;
            } else {
              mat.emissive.set('#000000');
              mat.emissiveIntensity = 0.0;
            }
          }
        });
      });
    });

    // 3D Floating Pin directly hovering above the selected coach
    const activeTrain = trains.find((t) => t.platformNumber === selectedPlatform);

    if (activeTrain && selectedCoachPosition && activeTrain.lifecycle !== 'CLEAR') {
      const coachSpacing = 4.6;
      const totalCoaches = activeTrain.coaches.length;
      const startZ = -((totalCoaches * coachSpacing) / 2);
      const coachIdx = activeTrain.coaches.findIndex((c) => c.position === selectedCoachPosition);

      if (coachIdx !== -1) {
        const coach = activeTrain.coaches[coachIdx];
        const trackX = getPlatformX(activeTrain.platformNumber) + 2.6;
        const coachZ = activeTrain.positionZ + (startZ + coachIdx * coachSpacing);

        if (!coachPinRef.current) {
          const pinGroup = new THREE.Group();

          // Vertical glowing line
          const lineGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2);
          const lineMat = new THREE.MeshBasicMaterial({ color: coach.colorHex });
          const lineMesh = new THREE.Mesh(lineGeo, lineMat);
          lineMesh.position.y = 1.6;
          pinGroup.add(lineMesh);

          // Glowing Sphere tip
          const sphereGeo = new THREE.SphereGeometry(0.24, 16, 16);
          const sphereMat = new THREE.MeshBasicMaterial({ color: coach.colorHex });
          const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
          sphereMesh.position.y = 3.2;
          pinGroup.add(sphereMesh);

          // Floating Billboard Badge
          const badgeGeo = new THREE.PlaneGeometry(4.0, 1.25);
          const badgeTex = createCoachPinTexture(`Coach ${coach.position}`, coach.displayName, coach.colorHex);
          const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex, side: THREE.FrontSide, transparent: true });
          const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
          badgeMesh.position.y = 4.2;
          badgeMesh.userData = { type: 'COACH_BADGE' };
          pinGroup.add(badgeMesh);

          scene.add(pinGroup);
          coachPinRef.current = pinGroup;
          billboardSignsRef.current.push(badgeMesh);
        } else {
          // Update texture on existing badge
          const badgeMesh = coachPinRef.current.children.find((c) => c.userData?.type === 'COACH_BADGE') as THREE.Mesh;
          if (badgeMesh) {
            const badgeTex = createCoachPinTexture(`Coach ${coach.position}`, coach.displayName, coach.colorHex);
            badgeMesh.material = new THREE.MeshBasicMaterial({ map: badgeTex, side: THREE.FrontSide, transparent: true });
          }
        }

        coachPinRef.current.position.set(trackX, 1.8, coachZ);
        coachPinRef.current.visible = true;
      } else if (coachPinRef.current) {
        coachPinRef.current.visible = false;
      }
    } else if (coachPinRef.current) {
      coachPinRef.current.visible = false;
    }
  }, [selectedPlatform, selectedCoachPosition, trains, getPlatformX]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-100 font-sans">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Camera Preset Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1.5 bg-white/95 px-3 py-2 rounded-2xl border border-slate-200/90 shadow-md backdrop-blur">
        <button
          type="button"
          onClick={() => setCameraPreset('OVERVIEW')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            activePreset === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          South (Front)
        </button>
        <button
          type="button"
          onClick={() => setCameraPreset('NORTH_VIEW')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            activePreset === 'NORTH_VIEW'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          North (Back)
        </button>
        <button
          type="button"
          onClick={() => setCameraPreset('WESTERN')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            activePreset === 'WESTERN'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Western (PF 1–7)
        </button>
        <button
          type="button"
          onClick={() => setCameraPreset('CENTRAL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            activePreset === 'CENTRAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Central (PF 8–14)
        </button>
      </div>

      {/* Minimal Bottom-Left Controls: Zoom & Reset */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col space-y-1.5 bg-white/95 p-1.5 rounded-2xl border border-slate-200/90 shadow-md backdrop-blur">
        <button
          type="button"
          onClick={() => handleZoom('IN')}
          title="Zoom In"
          aria-label="Zoom In"
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom('OUT')}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset View"
          aria-label="Reset View"
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Helpful Navigation Prompt at the Top Center */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center space-x-2 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur pointer-events-none">
        <Navigation className="w-3.5 h-3.5 text-blue-500" />
        <span>Drag to rotate · Right-click drag to pan · Scroll to zoom</span>
      </div>
    </div>
  );
};
