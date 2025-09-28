
const { UUIDUtils } = require('../index');

describe('UUID Utilities', () => {
  test('should validate correct UUID', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    expect(UUIDUtils.isValidUUID(validUUID)).toBe(true);
  });

  test('should reject invalid UUID', () => {
    expect(UUIDUtils.isValidUUID('not-a-uuid')).toBe(false);
    expect(UUIDUtils.isValidUUID('12345')).toBe(false);
    expect(UUIDUtils.isValidUUID('')).toBe(false);
    expect(UUIDUtils.isValidUUID(null)).toBe(false);
    expect(UUIDUtils.isValidUUID(undefined)).toBe(false);
  });

  test('should convert non-UUID to valid UUID', () => {
    const userId = 'user123';
    const result = UUIDUtils.ensureValidUUID(userId);
    expect(UUIDUtils.isValidUUID(result)).toBe(true);
    
    // Should be deterministic
    const result2 = UUIDUtils.ensureValidUUID(userId);
    expect(result).toBe(result2);
  });

  test('should generate new UUID', () => {
    const uuid1 = UUIDUtils.generateUUID();
    const uuid2 = UUIDUtils.generateUUID();
    
    expect(UUIDUtils.isValidUUID(uuid1)).toBe(true);
    expect(UUIDUtils.isValidUUID(uuid2)).toBe(true);
    expect(uuid1).not.toBe(uuid2);
  });

  test('should handle edge cases in ensureValidUUID', () => {
    // Should return null for null/undefined input
    expect(UUIDUtils.ensureValidUUID(null)).toBe(null);
    expect(UUIDUtils.ensureValidUUID(undefined)).toBe(null);
    expect(UUIDUtils.ensureValidUUID('')).toBe(null);
    
    // Should pass through valid UUIDs unchanged
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    expect(UUIDUtils.ensureValidUUID(validUUID)).toBe(validUUID);
  });

  test('should generate deterministic UUIDs for same input', () => {
    const testInputs = ['user123', 'test@example.com', 'another-id'];
    
    testInputs.forEach(input => {
      const result1 = UUIDUtils.ensureValidUUID(input);
      const result2 = UUIDUtils.ensureValidUUID(input);
      
      expect(result1).toBe(result2);
      expect(UUIDUtils.isValidUUID(result1)).toBe(true);
    });
  });

  test('should handle various UUID formats', () => {
    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      '12345678-1234-1234-1234-123456789abc',
      'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      '00000000-0000-0000-0000-000000000000'
    ];

    validUUIDs.forEach(uuid => {
      expect(UUIDUtils.isValidUUID(uuid)).toBe(true);
    });

    const invalidUUIDs = [
      '123e4567-e89b-12d3-a456-42661417400', // too short
      '123e4567-e89b-12d3-a456-4266141740000', // too long
      '123e4567-e89b-12d3-a456-42661417400g', // invalid character
      '123e4567e89b12d3a456426614174000', // missing hyphens
      '123e4567-e89b-12d3-a456' // incomplete
    ];

    invalidUUIDs.forEach(uuid => {
      expect(UUIDUtils.isValidUUID(uuid)).toBe(false);
    });
  });
});
