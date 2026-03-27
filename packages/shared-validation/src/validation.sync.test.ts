/**
 * Drift detection test: verifies that the DB pgEnum values match the shared const arrays.
 *
 * If someone adds a new enum value to only one location (shared arrays OR schema.ts),
 * this test will fail and block CI.
 */

import { describe, it, expect } from 'vitest';
import { PLACEMENT_VALUES, COMPONENT_TYPE_VALUES, CATEGORY_VALUES } from './index.js';
import {
	placementEnum,
	componentTypeEnum,
	categoryEnum
} from '../../../src/lib/server/db/schema.js';

describe('enum drift detection: shared arrays match DB pgEnum values', () => {
	it('placementEnum.enumValues matches PLACEMENT_VALUES', () => {
		expect([...placementEnum.enumValues]).toEqual([...PLACEMENT_VALUES]);
	});

	it('componentTypeEnum.enumValues matches COMPONENT_TYPE_VALUES', () => {
		expect([...componentTypeEnum.enumValues]).toEqual([...COMPONENT_TYPE_VALUES]);
	});

	it('categoryEnum.enumValues matches CATEGORY_VALUES', () => {
		expect([...categoryEnum.enumValues]).toEqual([...CATEGORY_VALUES]);
	});
});
