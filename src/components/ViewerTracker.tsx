import React, { useEffect, useRef, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ViewerTrackerProps {
  currentPage: string;
}

export function ViewerTracker({ currentPage }: ViewerTrackerProps) {
  const isViewer = localStorage.getItem('hydromines_viewer_mode') === 'true';
  const sessionIdRef = useRef<string>('');
  const entryTimeRef = useRef<number>(Date.now());
  const previousPageRef = useRef<string>(currentPage);
  const clickCountRef = useRef<number>(0);
  const scrollRatioRef = useRef<number>(0);
  const [status, setStatus] = useState<'active' | 'idle' | 'offline'>('active');
  const loginTimeRef = useRef<string>(new Date().toISOString());

  // 1. Passive Inactivity Tracking (Idle detection)
  useEffect(() => {
    if (!isViewer) return;
    
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

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleScroll);

    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(idleTimeout);
    };
  }, [isViewer]);

  // 2. Initialize Session and capture exact Tech environments
  useEffect(() => {
    if (!isViewer) return;

    let localSessId = sessionStorage.getItem('hydromines_viewer_session_id');
    if (!localSessId) {
      localSessId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      sessionStorage.setItem('hydromines_viewer_session_id', localSessId);
    }
    sessionIdRef.current = localSessId;

    const initSession = async () => {
      const ua = navigator.userAgent;
      
      let device_type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        device_type = 'tablet';
      } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) {
        device_type = 'mobile';
      }

      let OS = 'Unknown OS';
      if (/Windows/i.test(ua)) OS = 'Windows';
      else if (/Android/i.test(ua)) OS = 'Android';
      else if (/iPhone|iPad|iPod/i.test(ua)) OS = 'iOS';
      else if (/Macintosh|Mac OS X/i.test(ua)) OS = 'macOS';
      else if (/Linux/i.test(ua)) OS = 'Linux';

      let browser = 'Unknown Browser';
      if (/chrome|crios/i.test(ua)) browser = 'Chrome';
      else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
      else if (/edg/i.test(ua)) browser = 'Edge';

      const screen_resolution = `${window.screen.width}x${window.screen.height}`;
      const language = navigator.language || 'fr-FR';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      let ip_public = 'Inconnue';
      let country = 'Inconnu';
      let city = 'Inconnu';

      // Safe non-blocking GeoIP request with timeout
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 3500);
        const geoRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(tId);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          ip_public = geoData.ip || 'Inconnue';
          country = geoData.country_name || 'Inconnu';
          city = geoData.city || 'Inconnu';
        }
      } catch (e) {
        console.warn("GeoIP fetch failed/aborted passively:", e);
      }

      const sessionObj = {
        session_id: localSessId!,
        user_role: 'VIEWER',
        status: 'active',
        login_timestamp: loginTimeRef.current,
        last_seen: new Date().toISOString(),
        logout_timestamp: null,
        current_page: currentPage,
        session_duration_seconds: 0,
        device_type,
        OS,
        browser,
        screen_resolution,
        language,
        timezone,
        ip_public,
        country,
        city
      };

      try {
        await setDoc(doc(db, 'viewer_sessions', localSessId!), sessionObj, { merge: true });
      } catch (err) {
        console.error("Viewer session trace start error:", err);
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
            logout_timestamp: new Date().toISOString()
          }, { merge: true });
        } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isViewer]);

  // 3. Keepalive Heartbeat Sync every 8 seconds
  useEffect(() => {
    if (!isViewer) return;

    const interval = setInterval(async () => {
      const sessId = sessionIdRef.current;
      if (!sessId) return;

      const durationSec = Math.round((Date.now() - new Date(loginTimeRef.current).getTime()) / 1000);

      try {
        await setDoc(doc(db, 'viewer_sessions', sessId), {
          last_seen: new Date().toISOString(),
          status: status,
          current_page: currentPage,
          session_duration_seconds: durationSec
        }, { merge: true });
      } catch (err) {
        console.error("Viewer telemetry heartbeat write failed:", err);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isViewer, currentPage, status]);

  // 4. Trace Page Navigation Transitions
  useEffect(() => {
    if (!isViewer) return;

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
          .catch(e => console.error("Telemetry activity log error:", e));
      }

      entryTimeRef.current = now;
      previousPageRef.current = currentPage;
      clickCountRef.current = 0;
      scrollRatioRef.current = 0;
    }
  }, [isViewer, currentPage]);

  return null;
}
