import React, { useEffect, useRef, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ViewerTrackerProps {
  currentPage: string;
  user?: any;
  isAdmin?: boolean;
}

export function ViewerTracker({ currentPage, user, isAdmin }: ViewerTrackerProps) {
  const sessionIdRef = useRef<string>('');
  const entryTimeRef = useRef<number>(Date.now());
  const previousPageRef = useRef<string>(currentPage);
  const clickCountRef = useRef<number>(0);
  const scrollRatioRef = useRef<number>(0);
  const loginTimeRef = useRef<string>(new Date().toISOString());
  const recentActionsRef = useRef<any[]>([]);

  // Watchdog telemetry triggers
  const [status, setStatus] = useState<'active' | 'idle' | 'offline'>('active');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [inspectAttemptsReason, setInspectAttemptsReason] = useState<string>('');
  const [keyCombosAttempted, setKeyCombosAttempted] = useState<number>(0);
  const [rightClicksAttempted, setRightClicksAttempted] = useState<number>(0);

  // Keep references to access inside listeners without triggering extra effect cycles
  const isInspectingRef = useRef(false);
  const inspectReasonRef = useRef('');
  const keyCombosRef = useRef(0);
  const rightClicksRef = useRef(0);

  useEffect(() => {
    isInspectingRef.current = isInspecting;
  }, [isInspecting]);

  useEffect(() => {
    inspectReasonRef.current = inspectAttemptsReason;
  }, [inspectAttemptsReason]);

  useEffect(() => {
    keyCombosRef.current = keyCombosAttempted;
  }, [keyCombosAttempted]);

  useEffect(() => {
    rightClicksRef.current = rightClicksAttempted;
  }, [rightClicksAttempted]);

  // 1. Passive Inactivity Tracking (Idle detection) & Interactive Click / Input Selector Logger
  useEffect(() => {
    let idleTimeout: any;
    const resetIdle = () => {
      setStatus('active');
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        setStatus('idle');
      }, 30000); // 30 seconds inactivity
    };

    const handleInteraction = () => {
      resetIdle();
      clickCountRef.current += 1;
    };

    const handleScroll = () => {
      resetIdle();
      const st = window.scrollY || document.documentElement.scrollTop;
      const sh = document.documentElement.scrollHeight - window.innerHeight;
      if (sh > 0) {
        const ratio = Math.min(1, st / sh);
        if (ratio > scrollRatioRef.current) {
          scrollRatioRef.current = parseFloat(ratio.toFixed(2));
        }
      }
    };

    // Track detailed interaction context
    const handleGlobalClickForLog = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target) return;
      
      let depth = 0;
      let label = "";
      let elementId = "";
      let elementType = "";
      
      while (target && depth < 4) {
        elementId = target.id || elementId;
        const tagName = target.tagName.toUpperCase();
        
        if (tagName === 'BUTTON') {
          label = target.innerText || target.getAttribute('title') || target.getAttribute('aria-label') || "";
          elementType = "Bouton";
          break;
        } else if (tagName === 'A') {
          label = target.innerText || target.getAttribute('href') || "";
          elementType = "Lien";
          break;
        } else if (target.getAttribute('role') === 'button' || target.classList.contains('cursor-pointer')) {
          label = target.innerText || "";
          elementType = "Option Cliquable";
          break;
        } else if (tagName === 'INPUT') {
          label = target.getAttribute('placeholder') || target.getAttribute('name') || target.id || "";
          elementType = `Saisie (${target.getAttribute('type') || 'text'})`;
          break;
        } else if (tagName === 'SELECT') {
          label = target.id || target.getAttribute('name') || "";
          elementType = "Sélecteur";
          break;
        }
        
        target = target.parentElement;
        depth++;
      }
      
      if (elementType || label) {
        const cleanLabel = (label || "").trim().substring(0, 80).replace(/\s+/g, ' ');
        const actionStr = `${elementType || "Action"}${cleanLabel ? ` : "${cleanLabel}"` : ""}${elementId ? ` [ID: ${elementId}]` : ""}`;
        
        const newAction = {
          timestamp: new Date().toISOString(),
          action: actionStr,
          page: previousPageRef.current
        };
        
        recentActionsRef.current = [newAction, ...recentActionsRef.current].slice(0, 40);
      }
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('click', handleGlobalClickForLog, true);
    window.addEventListener('scroll', handleScroll);

    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('click', handleGlobalClickForLog, true);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(idleTimeout);
    };
  }, []);

  // 2. Advanced Inspect & DevTools Watchdog Listeners
  useEffect(() => {
    // A. Resize Discrepancy (Docked Console check)
    const checkDevToolsResize = () => {
      const threshold = 165;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      
      if (widthDiff || heightDiff) {
        setIsInspecting(true);
        setInspectAttemptsReason(prev => {
          const reason = "Console Développeur Dockée Détectée (Redimensionnement)";
          return prev.includes(reason) ? prev : prev ? `${prev} | ${reason}` : reason;
        });
      }
    };

    // B. Security Key Combos Watcher (F12, Inspect, View Source, JS Console)
    const handleKeyDownSecurity = (e: KeyboardEvent) => {
      let triggered = false;
      let comboName = "";
      
      const keyLower = e.key?.toLowerCase();

      if (e.key === 'F12') {
        triggered = true;
        comboName = "F12 (Console)";
      }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && keyLower === 'i') {
        triggered = true;
        comboName = "Ctrl+Shift+I / Cmd+Opt+I (Inspecter Éléments)";
      }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && keyLower === 'c') {
        triggered = true;
        comboName = "Ctrl+Shift+C / Cmd+Opt+C (Sélecteur d'Éléments)";
      }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && keyLower === 'j') {
        triggered = true;
        comboName = "Ctrl+Shift+J / Cmd+Opt+J (Console Javascript)";
      }
      else if ((e.ctrlKey || e.metaKey) && (keyLower === 'u' || (e.altKey && keyLower === 'u'))) {
        triggered = true;
        comboName = "Ctrl+U / Cmd+Opt+U (Voir le code source)";
      }

      if (triggered) {
        setKeyCombosAttempted(prev => prev + 1);
        setIsInspecting(true);
        setInspectAttemptsReason(prev => {
          const reason = `Raccourci inspecteur : ${comboName}`;
          return prev.includes(reason) ? prev : prev ? `${prev} | ${reason}` : reason;
        });
        console.warn(`[WATCHDOG SÉCURITÉ] Tentative d'inspection interceptée : ${comboName}`);
      }
    };

    // C. Right-Click Context Menu Watchdog (Inspect / Inspecter element)
    const handleContextMenuSecurity = (e: MouseEvent) => {
      setRightClicksAttempted(prev => prev + 1);
      setIsInspecting(true);
      setInspectAttemptsReason(prev => {
        const reason = "Clic-droit menu contextuel déclenché (Inspecter)";
        return prev.includes(reason) ? prev : prev ? `${prev} | ${reason}` : reason;
      });
    };

    window.addEventListener('resize', checkDevToolsResize);
    window.addEventListener('keydown', handleKeyDownSecurity, true);
    window.addEventListener('contextmenu', handleContextMenuSecurity, true);

    const initialTimer = setTimeout(checkDevToolsResize, 2000);

    return () => {
      window.removeEventListener('resize', checkDevToolsResize);
      window.removeEventListener('keydown', handleKeyDownSecurity, true);
      window.removeEventListener('contextmenu', handleContextMenuSecurity, true);
      clearTimeout(initialTimer);
    };
  }, []);

  // 3. Initialize/Load Telemetry Details and Write to Firestore
  useEffect(() => {
    let localSessId = sessionStorage.getItem('hydromines_viewer_session_id');
    if (!localSessId) {
      localSessId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      sessionStorage.setItem('hydromines_viewer_session_id', localSessId);
    }
    sessionIdRef.current = localSessId;

    const initSession = async () => {
      const ua = navigator.userAgent;
      
      // Determine device category
      let device_type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        device_type = 'tablet';
      } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) {
        device_type = 'mobile';
      }

      // Determine precise phone model if possible
      let device_model = 'Modèle Inconnu';
      try {
        const parenthesisMatch = ua.match(/\(([^)]+)\)/);
        if (parenthesisMatch && parenthesisMatch[1]) {
          const parts = parenthesisMatch[1].split(';');
          if (parts.length > 2) {
            if (/Android/i.test(ua)) {
              const modelPart = parts.find(p => p.includes('Build/') || /SM-|GT-|Pixel|HTC|LG-|REDMI|XIAOMI|POCO|ONEPLUS|HUAWEI|OPPO|VIVO/i.test(p));
              if (modelPart) {
                device_model = modelPart.split('Build/')[0].trim();
              } else {
                device_model = parts[parts.length - 1].trim();
              }
            } else if (/iPhone|iPad|iPod/i.test(ua)) {
              device_model = 'Apple iPhone / iPad';
            } else {
              device_model = parts[0].trim();
            }
          } else {
            device_model = parenthesisMatch[1].trim();
          }
        }
      } catch (e) {}

      // Get Battery data Safely
      let battery_level = 'Inconnu';
      let battery_charging = 'Inconnu';
      try {
        if ((navigator as any).getBattery) {
          const bat = await (navigator as any).getBattery();
          battery_level = `${Math.round(bat.level * 100)}%`;
          battery_charging = bat.charging ? 'En charge' : 'Sur batterie';
        }
      } catch (e) {}

      // Determine precise operating system
      let OS = 'Système Inconnu';
      if (/Windows/i.test(ua)) OS = 'Windows';
      else if (/Android/i.test(ua)) {
        OS = 'Android';
        if (/Linux/i.test(ua)) {
          const match = ua.match(/Android\s([0-9\.]+)/);
          if (match) OS = `Android ${match[1]}`;
        }
      }
      else if (/iPhone|iPad|iPod/i.test(ua)) {
        OS = 'iOS';
        const match = ua.match(/OS\s([0-9_]+)/);
        if (match) OS = `iOS ${match[1].replace(/_/g, '.')}`;
      }
      else if (/Macintosh|Mac OS X/i.test(ua)) {
        OS = 'macOS';
        const match = ua.match(/Mac OS X\s([0-9_]+)/);
        if (match) OS = `macOS ${match[1].replace(/_/g, '.')}`;
      }
      else if (/Linux/i.test(ua)) OS = 'Linux';

      // Parse browser
      let browser = 'Navigateur Inconnu';
      if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
      else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
      else if (/edg/i.test(ua)) browser = 'Edge';

      const screen_resolution = `${window.screen.width}x${window.screen.height}`;
      const viewport_resolution = `${window.innerWidth}x${window.innerHeight}`;
      const language = navigator.language || 'fr-FR';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const device_pixel_ratio = window.devicePixelRatio || 1;

      // Extract system hardware components (Memory, Cores, WebGL Graphic cards)
      let cores = navigator.hardwareConcurrency || 2;
      let memory_gb = (navigator as any).deviceMemory || 'Normal';
      let gpu_vendor = 'Inconnu';
      let gpu_renderer = 'Inconnu';

      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            gpu_vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Inconnu';
            gpu_renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_RENDERER_WEBGL || debugInfo.UNMASKED_RENDERER_WEBGL) || 'Inconnu';
          }
        }
      } catch (e) {}

      // Network statistics info
      let network_type = 'Inconnu';
      let network_downlink = 'Inconnu';
      let connection_rtt = 'Inconnu';
      let connection_save_data = 'Inactif';
      
      if ((navigator as any).connection) {
        const conn = (navigator as any).connection;
        network_type = conn.effectiveType || 'Inconnu';
        network_downlink = conn.downlink ? `${conn.downlink} Mbps` : 'Inconnu';
        connection_rtt = conn.rtt ? `${conn.rtt} ms` : 'Inconnu';
        connection_save_data = conn.saveData ? 'Actif' : 'Inactif';
      }

      // Geo-IP Fetch details with fallbacks to guarantee exact localization
      let ip_public = 'Inconnue';
      let country = 'Inconnu';
      let city = 'Inconnu';
      let country_code = '';
      let ip_isp = 'Inconnu';
      let ip_asn = 'Inconnu';
      let postal_code = 'Inconnu';
      let region_name = 'Inconnu';
      let gps_coordinates = 'Inconnu';
      let country_calling_code = '';
      let currency = '';

      const tryFetchGeo = async (url: string) => {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tId);
        if (res.ok) {
          return await res.json();
        }
        throw new Error('IP lookup failure');
      };

      try {
        const geoData = await tryFetchGeo('https://ipapi.co/json/');
        ip_public = geoData.ip || 'Inconnue';
        country = geoData.country_name || 'Inconnu';
        city = geoData.city || 'Inconnu';
        country_code = geoData.country_code || '';
        ip_isp = geoData.org || 'Inconnu';
        ip_asn = geoData.asn || 'Inconnu';
        postal_code = geoData.postal || 'Inconnu';
        region_name = geoData.region || 'Inconnu';
        if (geoData.latitude !== undefined && geoData.longitude !== undefined) {
          gps_coordinates = `${geoData.latitude}, ${geoData.longitude}`;
        }
        country_calling_code = geoData.country_calling_code || '';
        currency = geoData.currency || '';
      } catch (e1) {
        try {
          const geoData = await tryFetchGeo('https://ip-api.com/json/');
          ip_public = geoData.query || 'Inconnue';
          country = geoData.country || 'Inconnu';
          city = geoData.city || 'Inconnu';
          country_code = geoData.countryCode || '';
          ip_isp = geoData.isp || geoData.org || 'Inconnu';
          ip_asn = geoData.as || 'Inconnu';
          postal_code = geoData.zip || 'Inconnu';
          region_name = geoData.regionName || 'Inconnu';
          if (geoData.lat !== undefined && geoData.lon !== undefined) {
            gps_coordinates = `${geoData.lat}, ${geoData.lon}`;
          }
        } catch (e2) {
          console.warn("Visitor IP geolocation lookup timed out or failed passively.");
        }
      }

      // Compute precise identity & roles context
      let computedRole = 'GUEST_ANONYMOUS';
      let computedEmail = 'anonymous_visitor@hydromines.local';
      let computedName = 'Visiteur Anonyme';

      const isViewer = localStorage.getItem('hydromines_viewer_mode') === 'true';
      if (user) {
        computedEmail = user.email || computedEmail;
        computedName = user.displayName || user.email?.split('@')[0] || computedName;
        if (isViewer) {
          computedRole = 'VIEWER';
        } else if (isAdmin) {
          computedRole = 'ADMIN';
        } else {
          computedRole = 'OPERATOR';
        }
      }

      const sessionObj = {
        session_id: localSessId!,
        user_role: computedRole,
        user_email: computedEmail,
        user_name: computedName,
        status: 'active',
        login_timestamp: loginTimeRef.current,
        last_seen: new Date().toISOString(),
        logout_timestamp: null,
        current_page: currentPage,
        session_duration_seconds: 0,
        device_type,
        device_model,
        max_touch_points: navigator.maxTouchPoints || 0,
        battery_level,
        battery_charging,
        OS,
        browser,
        screen_resolution,
        viewport_resolution,
        device_pixel_ratio,
        language,
        timezone,
        ip_public,
        country,
        country_code,
        city,
        ip_isp,
        ip_asn,
        postal_code,
        region_name,
        gps_coordinates,
        country_calling_code,
        currency,
        hardware_cores: cores,
        hardware_memory: typeof memory_gb === 'number' ? `${memory_gb} GB` : memory_gb,
        gpu_vendor,
        gpu_renderer,
        network_type,
        network_downlink,
        connection_rtt,
        connection_save_data,
        is_inspecting: isInspectingRef.current,
        inspect_attempts_reason: inspectReasonRef.current,
        key_combos_count: keyCombosRef.current,
        right_click_count: rightClicksRef.current,
        raw_user_agent: ua,
        actions_log: recentActionsRef.current
      };

      try {
        await setDoc(doc(db, 'viewer_sessions', localSessId!), sessionObj, { merge: true });
      } catch (err) {
        console.error("Auditor error saving observer connection:", err);
      }
    };

    initSession();

    const handleBeforeUnload = () => {
      const sessId = sessionIdRef.current;
      if (sessId) {
        try {
          const sessionRef = doc(db, 'viewer_sessions', sessId);
          setDoc(sessionRef, {
            status: 'offline',
            logout_timestamp: new Date().toISOString(),
            actions_log: recentActionsRef.current
          }, { merge: true });
        } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, isAdmin]);

  // 4. Double Heartbeat Keepalive Synchronizer (syncs every 8 seconds with telemetry updates)
  useEffect(() => {
    const interval = setInterval(async () => {
      const sessId = sessionIdRef.current;
      if (!sessId) return;

      const durationSec = Math.round((Date.now() - new Date(loginTimeRef.current).getTime()) / 1000);

      // Re-evaluate role in case they logged in or toggled viewer modes dynamically
      let computedRole = 'GUEST_ANONYMOUS';
      let computedEmail = 'anonymous_visitor@hydromines.local';
      let computedName = 'Visiteur Anonyme';

      const isViewer = localStorage.getItem('hydromines_viewer_mode') === 'true';
      if (user) {
        computedEmail = user.email || computedEmail;
        computedName = user.displayName || user.email?.split('@')[0] || computedName;
        if (isViewer) {
          computedRole = 'VIEWER';
        } else if (isAdmin) {
          computedRole = 'ADMIN';
        } else {
          computedRole = 'OPERATOR';
        }
      }

      try {
        await setDoc(doc(db, 'viewer_sessions', sessId), {
          last_seen: new Date().toISOString(),
          status: status,
          current_page: currentPage,
          session_duration_seconds: durationSec,
          user_role: computedRole,
          user_email: computedEmail,
          user_name: computedName,
          is_inspecting: isInspectingRef.current,
          inspect_attempts_reason: inspectReasonRef.current,
          key_combos_count: keyCombosRef.current,
          right_click_count: rightClicksRef.current,
          actions_log: recentActionsRef.current
        }, { merge: true });
      } catch (err) {
        console.error("Viewer telemetry heartbeat synchronization failed:", err);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [currentPage, status, user, isAdmin]);

  // 5. Page Navigation Transition Listener
  useEffect(() => {
    if (previousPageRef.current !== currentPage) {
      const sessId = sessionIdRef.current;
      const prevPage = previousPageRef.current;
      const now = Date.now();
      const spentMs = now - entryTimeRef.current;
      const durationSeconds = Math.round(spentMs / 1000);
      const enterISO = new Date(entryTimeRef.current).toISOString();

      if (sessId && durationSeconds > 0) {
        const activityId = `act_${sessId.substring(5, 12)}_${Date.now()}`;
        const activityObj = {
          activity_id: activityId,
          session_id: sessId,
          page_name: prevPage,
          enter_time: enterISO,
          exit_time: new Date().toISOString(),
          duration_seconds: durationSeconds,
          click_count: clickCountRef.current,
          scroll_depth: scrollRatioRef.current
        };

        setDoc(doc(db, 'viewer_activity', activityId), activityObj)
          .catch(e => console.error("Telemetry activities logger error:", e));
          
        // Log page change as a user action as well
        const navigationAction = {
          timestamp: new Date().toISOString(),
          action: `Navigation : Passage vers la page "${currentPage}" (depuis "${prevPage}" après ${durationSeconds}s)`,
          page: currentPage
        };
        recentActionsRef.current = [navigationAction, ...recentActionsRef.current].slice(0, 40);
      }

      entryTimeRef.current = now;
      previousPageRef.current = currentPage;
      clickCountRef.current = 0;
      scrollRatioRef.current = 0;
    }
  }, [currentPage]);

  return null;
}

