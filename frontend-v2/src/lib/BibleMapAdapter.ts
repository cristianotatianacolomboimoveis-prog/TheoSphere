/**
 * BIBLE MAP INTEGRATION ADAPTER (FACADE)
 * 
 * Este módulo atua como a única ponte entre o Motor 3D (Black Box)
 * e o Dashboard Logos. Implementa um padrão Mediator com Event Bus.
 */

export type MapEventType = 'onLocationSelected' | 'onRegionChanged' | 'onMapReady' | 'onError';
export type MapCommandType = 'flyTo' | 'updateTimeline' | 'filterLayers';

export interface MapEventData {
  type: MapEventType;
  payload: any;
  timestamp: number;
}

class BibleMapEventBus {
  private listeners: Map<MapEventType, Function[]> = new Map();

  public subscribe(event: MapEventType, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
    return () => this.unsubscribe(event, callback);
  }

  public unsubscribe(event: MapEventType, callback: Function) {
    const funcs = this.listeners.get(event);
    if (funcs) {
      this.listeners.set(event, funcs.filter(f => f !== callback));
    }
  }

  public publish(event: MapEventType, payload: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[BibleMap:Output] Event: ${event}`, payload);
    }
    const funcs = this.listeners.get(event);
    funcs?.forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[BibleMap:EventBus] Error in subscriber for ${event}:`, err);
      }
    });
  }
}

class BibleMapIntegrationFacade {
  public events = new BibleMapEventBus();
  private mapInstance: any = null;

  /**
   * Registro da "Caixa Preta" (TheoSphere3D)
   * Chamado uma única vez no mount do componente 3D.
   */
  public registerMap(instance: any) {
    this.mapInstance = instance;
    this.events.publish('onMapReady', { status: 'connected' });
  }

  /**
   * COMANDOS (Inputs para o Mapa)
   */
  
  public flyTo(lat: number, lng: number, zoom: number = 10) {
    this.executeSafe('flyTo', () => {
      if (!this.mapInstance?.flyTo) {
        throw new Error("Motor 3D ainda não está pronto para navegação.");
      }
      this.mapInstance.flyTo(lat, lng, zoom);
    });
  }

  public updateTimeline(year: number) {
    this.executeSafe('updateTimeline', () => {
      this.mapInstance?.setTime(year);
    });
  }

  /**
   * Utilitário para execução segura com Graceful Degradation
   */
  private executeSafe(command: MapCommandType, action: Function) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[BibleMap:Input] Command: ${command}`);
      }
      action();
    } catch (err) {
      console.error(`[BibleMap:Facade] Fallback ativado para comando ${command}:`, err);
      this.events.publish('onError', { command, error: err });
    }
  }
}

// Injeção no escopo Global (Protegida)
declare global {
  interface Window {
    BibleMapIntegration: BibleMapIntegrationFacade;
  }
}

if (typeof window !== 'undefined') {
  if (!window.BibleMapIntegration) {
    window.BibleMapIntegration = new BibleMapIntegrationFacade();
  }
}

export const MapAdapter = typeof window !== 'undefined' ? window.BibleMapIntegration : null;
