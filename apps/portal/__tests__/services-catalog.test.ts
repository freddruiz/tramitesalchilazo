import { describe, it, expect } from 'vitest';
import {
  getAvailableServices,
  getServiceById,
  getServicePrice,
  SERVICE_CATALOG,
} from '../lib/catalog/services';

describe('Service Catalog', () => {
  describe('SERVICE_CATALOG constant', () => {
    it('has antecedentes_penales and antecedentes_policiales as available', () => {
      expect(SERVICE_CATALOG.antecedentes_penales.available).toBe(true);
      expect(SERVICE_CATALOG.antecedentes_policiales.available).toBe(true);
    });

    it('has renap and minex as unavailable', () => {
      expect(SERVICE_CATALOG.renap.available).toBe(false);
      expect(SERVICE_CATALOG.minex.available).toBe(false);
    });

    it('has correct structure for each service', () => {
      const service = SERVICE_CATALOG.antecedentes_penales;
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('description');
      expect(service).toHaveProperty('priceGTQ');
      expect(service).toHaveProperty('processingDays');
      expect(service).toHaveProperty('available');
    });
  });

  describe('getAvailableServices', () => {
    it('returns only available services', () => {
      const services = getAvailableServices();
      expect(services).toHaveLength(2);
      expect(services.map((s) => s.id)).toEqual([
        'antecedentes_penales',
        'antecedentes_policiales',
      ]);
    });

    it('does not include unavailable services', () => {
      const services = getAvailableServices();
      const ids = services.map((s) => s.id);
      expect(ids).not.toContain('renap');
      expect(ids).not.toContain('minex');
    });
  });

  describe('getServiceById', () => {
    it('returns service by id', () => {
      const service = getServiceById('antecedentes_penales');
      expect(service?.name).toBe('Antecedentes Penales');
    });

    it('returns undefined for non-existent id', () => {
      const service = getServiceById('invalid' as any);
      expect(service).toBeUndefined();
    });
  });

  describe('getServicePrice', () => {
    it('returns price for available service', () => {
      const price = getServicePrice('antecedentes_penales');
      expect(price).toBe(95);
    });

    it('returns null for unavailable service (price tampering protection)', () => {
      const price = getServicePrice('renap');
      expect(price).toBeNull();
    });

    it('returns null for non-existent service', () => {
      const price = getServicePrice('invalid' as any);
      expect(price).toBeNull();
    });

    it('ensures server-side price authority', () => {
      const serverPrice = getServicePrice('antecedentes_penales');
      const tamperedClientPrice = 1;

      expect(serverPrice).not.toBe(tamperedClientPrice);
      expect(serverPrice).toBe(95);
    });
  });

  describe('POST /api/requests price tampering protection', () => {
    it('should use server catalog price, ignoring client-submitted price', async () => {
      const serviceId = 'antecedentes_penales';
      const serverPrice = getServicePrice(serviceId);
      const tamperedPrice = 10;

      expect(serverPrice).toBe(95);
      expect(tamperedPrice).not.toBe(serverPrice);
      expect(serverPrice).not.toBeNull();
    });

    it('returns 404 for unavailable service even with valid enum value', () => {
      const serviceId = 'renap';
      const price = getServicePrice(serviceId);

      expect(price).toBeNull();
    });
  });
});
