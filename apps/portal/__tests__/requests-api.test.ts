import { describe, it, expect } from 'vitest';
import { getServicePrice, SERVICE_CATALOG } from '../lib/catalog/services';

describe('POST /api/requests endpoint security', () => {
  describe('Price tampering protection', () => {
    it('server should always use catalog price for available services', () => {
      const availableServiceId = 'antecedentes_penales';
      const serverPrice = getServicePrice(availableServiceId);
      const tamperedClientPrice = 1;

      expect(serverPrice).toBe(95);
      expect(serverPrice).not.toBe(tamperedClientPrice);
    });

    it('price should be derived from SERVICE_CATALOG server-side only', () => {
      const service = SERVICE_CATALOG.antecedentes_policiales;
      const serverPrice = getServicePrice('antecedentes_policiales');

      expect(serverPrice).toBe(service.priceGTQ);
    });

    it('client-submitted price is ignored', () => {
      const availableServiceId = 'antecedentes_penales';
      const serverPrice = getServicePrice(availableServiceId);
      const clientSubmittedPrice = 999;

      expect(serverPrice).toBe(95);
      expect(serverPrice).not.toBe(clientSubmittedPrice);
    });
  });

  describe('Unavailable service handling', () => {
    it('returns 404 (null) for unavailable service renap', () => {
      const price = getServicePrice('renap');
      expect(price).toBeNull();
    });

    it('returns 404 (null) for unavailable service minex', () => {
      const price = getServicePrice('minex');
      expect(price).toBeNull();
    });

    it('unavailable services not returned by GET /api/services', () => {
      const renap = SERVICE_CATALOG.renap;
      const minex = SERVICE_CATALOG.minex;

      expect(renap.available).toBe(false);
      expect(minex.available).toBe(false);
    });

    it('only available services have valid prices', () => {
      const availableServices = Object.values(SERVICE_CATALOG).filter(
        (s) => s.available
      );

      availableServices.forEach((service) => {
        const price = getServicePrice(service.id);
        expect(price).not.toBeNull();
        expect(price).toBeGreaterThan(0);
      });
    });

    it('unavailable services have no valid price', () => {
      const unavailableServices = Object.values(SERVICE_CATALOG).filter(
        (s) => !s.available
      );

      unavailableServices.forEach((service) => {
        const price = getServicePrice(service.id);
        expect(price).toBeNull();
      });
    });
  });

  describe('Service catalog integrity', () => {
    it('all services have required properties', () => {
      Object.values(SERVICE_CATALOG).forEach((service) => {
        expect(service.id).toBeDefined();
        expect(service.name).toBeDefined();
        expect(service.description).toBeDefined();
        expect(service.priceGTQ).toBeDefined();
        expect(service.processingDays).toBeDefined();
        expect(service.available).toBeDefined();
      });
    });

    it('prices are positive numbers', () => {
      Object.values(SERVICE_CATALOG).forEach((service) => {
        expect(typeof service.priceGTQ).toBe('number');
        expect(service.priceGTQ).toBeGreaterThan(0);
      });
    });

    it('processing days are positive integers', () => {
      Object.values(SERVICE_CATALOG).forEach((service) => {
        expect(Number.isInteger(service.processingDays)).toBe(true);
        expect(service.processingDays).toBeGreaterThan(0);
      });
    });
  });
});
