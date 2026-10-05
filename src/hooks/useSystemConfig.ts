import { useEffect, useState } from 'react';
import {
  SYSTEM_CONFIG_EVENT,
  SYSTEM_CONFIG_CACHE_KEY,
  getSystemConfig,
  loadSystemConfig,
  type SystemConfig,
} from '../services/system-config/system-config.service';

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig>(() => getSystemConfig());

  useEffect(() => {
    let active = true;

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<SystemConfig>).detail;
      if (active) setConfig(detail || getSystemConfig());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SYSTEM_CONFIG_CACHE_KEY) return;
      if (active) setConfig(getSystemConfig());
    };

    window.addEventListener(SYSTEM_CONFIG_EVENT, onChanged);
    window.addEventListener('storage', onStorage);

    loadSystemConfig()
      .then((next) => {
        if (active) setConfig(next);
      })
      .catch((error) => {
        // La identidad no debe impedir usar el sistema si el endpoint está temporalmente caído.
        console.warn('No fue posible cargar la identidad del sistema:', error);
      });

    return () => {
      active = false;
      window.removeEventListener(SYSTEM_CONFIG_EVENT, onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return config;
};

export default useSystemConfig;
