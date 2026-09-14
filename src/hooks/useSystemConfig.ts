import { useEffect, useState } from 'react';
import {
  SYSTEM_CONFIG_EVENT,
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

    window.addEventListener(SYSTEM_CONFIG_EVENT, onChanged);

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
    };
  }, []);

  return config;
};

export default useSystemConfig;
